from datetime import timedelta

from django.db import models
from django.utils import timezone

# How long a code is usable once sent.
OTP_LIFETIME = timedelta(minutes=10)

# How long someone has to finish a registration before starting over. Longer
# than the code's life, so a second code can be requested without re-typing the
# whole form.
PENDING_LIFETIME = timedelta(minutes=30)

# Wrong codes allowed before the current one is thrown away.
MAX_OTP_ATTEMPTS = 5

# Time between sends, so the endpoint cannot be used to post mail at someone.
RESEND_COOLDOWN = timedelta(seconds=60)


def normalize_email(email):
    """Lower-cases and trims an address, so one inbox means one registration."""
    return (email or "").strip().lower()


class PendingRegistration(models.Model):
    """
    A registration that has been filled in but not yet proved.

    Someone who types an address they cannot open must not end up with an
    account, so nothing is written to auth_user until a code sent to that
    address comes back. This row holds the details in the meantime and is
    deleted the moment the real user is created.

    Neither the password nor the code is stored as typed: both are hashed, so
    this table is not worth stealing.
    """

    # One live registration per address. A second attempt updates this row
    # rather than piling up rows nobody will ever finish.
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150)

    password_hash = models.CharField(max_length=255)
    otp_hash = models.CharField(max_length=255)
    otp_expires_at = models.DateTimeField()
    otp_attempts = models.PositiveSmallIntegerField(default=0)
    last_sent_at = models.DateTimeField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"pending registration for {self.email}"

    def is_expired(self):
        """True once the whole registration attempt is too old to finish."""
        return timezone.now() - self.created_at > PENDING_LIFETIME

    def is_otp_expired(self):
        """True once the current code is past its ten minutes."""
        return timezone.now() > self.otp_expires_at

    def has_attempts_left(self):
        return self.otp_attempts < MAX_OTP_ATTEMPTS

    def seconds_until_resend_allowed(self):
        """Whole seconds left on the cooldown, or zero if another code may be sent."""
        ready_at = self.last_sent_at + RESEND_COOLDOWN
        remaining = (ready_at - timezone.now()).total_seconds()

        return max(0, int(remaining + 0.999))
