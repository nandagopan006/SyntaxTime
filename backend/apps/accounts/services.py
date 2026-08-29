"""
Registration by email verification, and the Brevo call that makes it possible.

The rule this file exists to enforce: no Django User is created until a code
sent to the address comes back correctly.
"""

import logging
import secrets

import requests
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .models import (
    MAX_OTP_ATTEMPTS,
    OTP_LIFETIME,
    PENDING_LIFETIME,
    PendingRegistration,
)

logger = logging.getLogger(__name__)

BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"
VERIFY_EMAIL_SUBJECT = "Verify your SyntaxTime email"
PASSWORD_RESET_SUBJECT = "Reset your SyntaxTime password"

# Time between password reset emails for one address, so the endpoint cannot be
# used to post mail at somebody. Held in the cache rather than a table: there is
# no reset row to hang it off, and it does not need to outlive a restart.
PASSWORD_RESET_COOLDOWN_SECONDS = 60

# Brevo is a third party over the network; a hung request must not hold a web
# worker open indefinitely.
BREVO_TIMEOUT_SECONDS = 10


class EmailDeliveryError(Exception):
    """Raised when the verification email could not be handed to Brevo."""


def generate_email_otp():
    """Generate a secure six-digit email verification code."""
    # secrets, not random: this code is the only thing standing between a
    # stranger and an account on someone else's address.
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(otp):
    """Hashes a code for storage, so the table never holds a usable one."""
    return make_password(otp)


def otp_matches(otp, otp_hash):
    """Checks a submitted code against the stored hash."""
    return check_password(otp, otp_hash)


def send_email(to_email, subject, html_content, text_content):
    """
    Hand one message to Brevo.

    Every SyntaxTime email goes through here, so there is one place that knows
    the API key, one timeout, and one set of rules about what may be logged.

    Raises EmailDeliveryError if Brevo will not take it, so the caller can tell
    the user honestly rather than claiming something is on its way.
    """
    api_key = settings.BREVO_API_KEY

    # Without a key there is nothing to send through. In development the email
    # goes to the console instead so a flow can be walked end to end; nothing
    # secret leaves the server in a response either way.
    if not api_key:
        if settings.DEBUG:
            logger.warning(
                "BREVO_API_KEY is not set. Printing the email for %s instead "
                "of sending it:\n%s",
                to_email,
                text_content,
            )
            return
        raise EmailDeliveryError("Brevo is not configured.")

    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
        "textContent": text_content,
    }

    try:
        response = requests.post(
            BREVO_ENDPOINT,
            json=payload,
            headers={"api-key": api_key, "accept": "application/json"},
            timeout=BREVO_TIMEOUT_SECONDS,
        )
    except requests.RequestException as error:
        # The address and the failure, never the contents or the key.
        logger.error("Could not reach Brevo for %s: %s", to_email, error)
        raise EmailDeliveryError("Could not reach the email provider.") from error

    if response.status_code >= 400:
        logger.error(
            "Brevo refused the message for %s: %s %s",
            to_email,
            response.status_code,
            response.text[:300],
        )
        raise EmailDeliveryError("The email provider rejected the message.")


def send_verification_email(email, otp):
    """Send a registration verification code through Brevo."""
    context = {"otp": otp, "expiry_minutes": int(OTP_LIFETIME.total_seconds() // 60)}

    send_email(
        to_email=email,
        subject=VERIFY_EMAIL_SUBJECT,
        html_content=render_to_string("accounts/emails/verify_email.html", context),
        text_content=render_to_string("accounts/emails/verify_email.txt", context),
    )


def issue_otp(pending_registration):
    """
    Puts a fresh code on a pending registration and emails it.

    Replacing the hash is what retires the previous code: only the newest one
    can ever verify. The row is saved only once Brevo has accepted the message,
    so a failed send leaves the previous code working.
    """
    otp = generate_email_otp()
    sent_at = timezone.now()

    send_verification_email(pending_registration.email, otp)

    pending_registration.otp_hash = hash_otp(otp)
    pending_registration.otp_expires_at = sent_at + OTP_LIFETIME
    pending_registration.otp_attempts = 0
    pending_registration.last_sent_at = sent_at
    pending_registration.save()


def start_registration(username, email, raw_password):
    """
    Records a registration attempt and sends the first code.

    Returns the pending registration. No Django User exists at this point and
    none will until the code comes back.
    """
    # A second attempt on the same address updates the waiting row rather than
    # adding another, so the table cannot be filled by retrying.
    pending_registration, _created = PendingRegistration.objects.update_or_create(
        email=email,
        defaults={
            "username": username,
            "password_hash": make_password(raw_password),
            # Replaced immediately by issue_otp; the columns are not nullable.
            "otp_hash": "",
            "otp_expires_at": timezone.now(),
            "otp_attempts": 0,
            "last_sent_at": timezone.now(),
        },
    )

    issue_otp(pending_registration)
    return pending_registration


def create_verified_user(pending_registration):
    """
    Creates the real account from a registration that has been proved.

    The password was hashed when the form was submitted, so it is assigned
    directly. Running it through set_password here would hash the hash and
    lock the user out of their own account.
    """
    user = User(
        username=pending_registration.username,
        email=pending_registration.email,
    )
    user.password = pending_registration.password_hash
    user.save()

    return user


def clear_expired_registrations():
    """
    Removes attempts nobody came back to finish.

    Done on the way past rather than on a schedule: the table is small and this
    keeps the project free of a task queue it does not otherwise need.
    """
    PendingRegistration.objects.filter(
        created_at__lt=timezone.now() - PENDING_LIFETIME
    ).delete()


class VerificationError(Exception):
    """A registration could not be verified, with a message safe to show."""


def verify_pending_registration_otp(email, otp):
    """
    Checks a submitted code and, if it is right, creates the account.

    Returns the new User. Raises VerificationError with a message the user can
    act on for every other outcome.
    """
    failure = None
    user = None

    with transaction.atomic():
        # Locked for the length of the transaction. Two correct codes arriving
        # together would otherwise both pass their checks and create two
        # accounts; the second now waits, finds the row gone, and stops.
        pending_registration = (
            PendingRegistration.objects.select_for_update().filter(email=email).first()
        )

        if pending_registration is None:
            failure = (
                "We have no registration waiting for that email. "
                "Please register again."
            )
        elif pending_registration.is_expired():
            pending_registration.delete()
            failure = "This registration has expired. Please register again."
        elif not pending_registration.has_attempts_left():
            failure = (
                "Too many incorrect attempts. Please request a new verification code."
            )
        elif pending_registration.is_otp_expired():
            failure = "This verification code has expired."
        elif not otp_matches(otp, pending_registration.otp_hash):
            pending_registration.otp_attempts += 1
            pending_registration.save(update_fields=["otp_attempts", "updated_at"])

            attempts_left = MAX_OTP_ATTEMPTS - pending_registration.otp_attempts
            failure = (
                "Too many incorrect attempts. Please request a new verification code."
                if attempts_left <= 0
                else f"Incorrect verification code. Attempts remaining: {attempts_left}"
            )
        else:
            # Checked again here, not only at registration: someone else may
            # have taken the name or the address while this code was in an
            # inbox waiting to be read.
            taken_username = User.objects.filter(
                username__iexact=pending_registration.username
            ).exists()
            taken_email = User.objects.filter(
                email__iexact=pending_registration.email
            ).exists()

            if taken_username:
                failure = (
                    "That username was taken while you were verifying. "
                    "Please register again with a different one."
                )
            elif taken_email:
                failure = "That email is already registered. Please sign in instead."
            else:
                user = create_verified_user(pending_registration)
                pending_registration.delete()

    # Raised after the transaction commits, so a wrong code still counts
    # against the attempt limit instead of being rolled back with the error.
    if failure:
        raise VerificationError(failure)

    return user


def resend_otp(email):
    """
    Sends a fresh code for a waiting registration.

    Raises VerificationError if there is nothing to resend or the cooldown has
    not passed. The cooldown is enforced here, not in the browser, because the
    browser is not what needs convincing.
    """
    pending_registration = PendingRegistration.objects.filter(email=email).first()

    if pending_registration is None:
        raise VerificationError(
            "We have no registration waiting for that email. Please register again."
        )

    if pending_registration.is_expired():
        pending_registration.delete()
        raise VerificationError(
            "This registration has expired. Please register again."
        )

    wait_seconds = pending_registration.seconds_until_resend_allowed()
    if wait_seconds > 0:
        raise VerificationError(
            f"Please wait {wait_seconds} seconds before requesting another code."
        )

    issue_otp(pending_registration)
    return pending_registration


# ---------------------------------------------------------------------------
# Password reset
#
# Deliberately not built on PendingRegistration. That table proves somebody can
# open an address before an account exists; this proves somebody may change the
# password on an account that already exists. Django's own token generator
# signs the user's id, their current password hash and a timestamp, which means
# a link expires on its own and stops working the moment the password changes.
# There is nothing to store, so there is no table and no migration.
# ---------------------------------------------------------------------------


def build_password_reset_link(user):
    """Build the frontend reset URL carrying this user's one-time token."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    # The React application owns the reset screen, so the link points at it
    # rather than at anything Django renders.
    return f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}/"


def send_password_reset_email(user, reset_link):
    """Send a password reset email through Brevo."""
    expiry_minutes = int(settings.PASSWORD_RESET_TIMEOUT // 60)
    context = {"reset_link": reset_link, "expiry_minutes": expiry_minutes}

    send_email(
        to_email=user.email,
        subject=PASSWORD_RESET_SUBJECT,
        html_content=render_to_string("accounts/emails/password_reset.html", context),
        text_content=render_to_string("accounts/emails/password_reset.txt", context),
    )


def request_password_reset(email):
    """
    Email a reset link to this address, if there is an account behind it.

    Says nothing about what it found. An address with no account, and one that
    has already been sent a link in the last minute, both return quietly, so a
    stranger cannot use this endpoint to discover who has an account here.
    """
    user = User.objects.filter(email__iexact=email).first()

    if user is None or not user.is_active:
        # A pending registration is not an account and has no password to
        # reset; that flow has its own code and its own endpoint.
        return

    cooldown_key = f"password-reset-sent:{email}"
    if cache.get(cooldown_key):
        return

    reset_link = build_password_reset_link(user)

    # Only ever the address. The link carries the token, and the token is as
    # good as the password until it is used.
    logger.info("Sending a password reset link to %s", email)
    send_password_reset_email(user, reset_link)

    cache.set(cooldown_key, True, PASSWORD_RESET_COOLDOWN_SECONDS)
