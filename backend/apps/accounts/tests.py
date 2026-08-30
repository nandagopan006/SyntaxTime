from datetime import timedelta
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase

from .models import MAX_OTP_ATTEMPTS, PendingRegistration
from .services import EmailDeliveryError, generate_email_otp

VALID_PASSWORD = "StudyFocus2026!"
NEW_PASSWORD = "DeepWorkHours2026!"


class RegistrationTestCase(APITestCase):
    """
    Shared helpers. Brevo is stubbed throughout: these tests are about the
    registration rules, not about the network.
    """

    def setUp(self):
        # Nothing here should ever reach the real API.
        self.send_patcher = patch("apps.accounts.services.send_verification_email")
        self.mock_send = self.send_patcher.start()
        self.addCleanup(self.send_patcher.stop)

        # Throttling counts across tests through the cache, so it is cleared.
        from django.core.cache import cache

        cache.clear()

    def register(self, **overrides):
        payload = {
            "username": "nandhu",
            "email": "nandhu@example.com",
            "password": VALID_PASSWORD,
            "password_confirm": VALID_PASSWORD,
        }
        payload.update(overrides)
        return self.client.post(reverse("register"), payload, format="json")

    def sent_otp(self):
        """The code handed to the email service on the most recent send."""
        return self.mock_send.call_args.args[1]

    def verify(self, otp, email="nandhu@example.com"):
        return self.client.post(
            reverse("verify-email"), {"email": email, "otp": otp}, format="json"
        )


class OtpGenerationTests(RegistrationTestCase):
    def test_a_code_is_always_six_digits(self):
        for _ in range(200):
            otp = generate_email_otp()
            self.assertEqual(len(otp), 6)
            self.assertTrue(otp.isdigit())

    def test_codes_are_not_all_the_same(self):
        codes = {generate_email_otp() for _ in range(50)}
        self.assertGreater(len(codes), 40)


class RegisterTests(RegistrationTestCase):
    def test_registering_does_not_create_an_account(self):
        response = self.register()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # The whole point of the phase: no account until the code comes back.
        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(PendingRegistration.objects.count(), 1)

    def test_the_response_never_carries_the_code(self):
        response = self.register()
        body = str(response.data)

        self.assertNotIn(self.sent_otp(), body)
        self.assertNotIn(VALID_PASSWORD, body)
        self.assertNotIn("otp", body.lower().replace("otp_", ""))

    def test_the_password_is_stored_hashed(self):
        self.register()
        pending = PendingRegistration.objects.get()

        self.assertNotEqual(pending.password_hash, VALID_PASSWORD)
        self.assertTrue(check_password(VALID_PASSWORD, pending.password_hash))

    def test_the_code_is_stored_hashed(self):
        self.register()
        pending = PendingRegistration.objects.get()

        self.assertNotEqual(pending.otp_hash, self.sent_otp())
        self.assertTrue(check_password(self.sent_otp(), pending.otp_hash))

    def test_an_email_is_sent_to_the_address_given(self):
        self.register(email="someone@example.com")
        self.assertEqual(self.mock_send.call_args.args[0], "someone@example.com")

    def test_mismatched_passwords_are_rejected(self):
        response = self.register(password_confirm="SomethingElse2026!")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(PendingRegistration.objects.count(), 0)

    def test_a_weak_password_is_rejected(self):
        response = self.register(password="12345", password_confirm="12345")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_an_existing_email_is_rejected(self):
        User.objects.create_user(
            username="someone", email="nandhu@example.com", password=VALID_PASSWORD
        )
        response = self.register()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already registered", str(response.data))

    def test_an_existing_username_is_rejected(self):
        User.objects.create_user(
            username="nandhu", email="other@example.com", password=VALID_PASSWORD
        )
        response = self.register()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already in use", str(response.data))

    def test_the_email_is_normalised(self):
        self.register(email="  Nandhu@Example.COM  ")
        self.assertEqual(PendingRegistration.objects.get().email, "nandhu@example.com")

    def test_registering_twice_updates_one_row(self):
        self.register()
        self.register(username="nandhu2")

        self.assertEqual(PendingRegistration.objects.count(), 1)
        self.assertEqual(PendingRegistration.objects.get().username, "nandhu2")

    def test_a_failed_send_reports_failure_and_creates_nothing(self):
        self.mock_send.side_effect = EmailDeliveryError("Brevo said no")

        response = self.register()

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("couldn't send", str(response.data))
        self.assertEqual(User.objects.count(), 0)


class VerifyTests(RegistrationTestCase):
    def test_the_right_code_creates_the_account(self):
        self.register()
        response = self.verify(self.sent_otp())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(PendingRegistration.objects.count(), 0)

    def test_the_new_account_can_sign_in_with_the_original_password(self):
        # Guards the double-hashing trap: the stored hash is assigned to the
        # user rather than hashed a second time.
        self.register()
        self.verify(self.sent_otp())

        response = self.client.post(
            reverse("login"),
            {"username": "nandhu", "password": VALID_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_the_account_keeps_the_verified_address(self):
        self.register()
        self.verify(self.sent_otp())

        user = User.objects.get()
        self.assertEqual(user.email, "nandhu@example.com")
        self.assertEqual(user.username, "nandhu")

    def test_a_wrong_code_creates_nothing(self):
        self.register()
        response = self.verify("000000")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

    def test_a_wrong_code_says_how_many_tries_are_left(self):
        self.register()
        response = self.verify("000000")

        self.assertIn("Attempts remaining: 4", str(response.data))
        self.assertEqual(PendingRegistration.objects.get().otp_attempts, 1)

    def test_a_failed_attempt_is_recorded_even_though_the_request_errors(self):
        # The counter is committed outside the rolled-back work, or a wrong
        # code would cost nothing and the limit would mean nothing.
        self.register()
        for _ in range(3):
            self.verify("000000")

        self.assertEqual(PendingRegistration.objects.get().otp_attempts, 3)

    def test_the_code_stops_working_after_five_wrong_tries(self):
        self.register()
        correct = self.sent_otp()

        for _ in range(MAX_OTP_ATTEMPTS):
            self.verify("000000")

        response = self.verify(correct)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Too many incorrect attempts", str(response.data))
        self.assertEqual(User.objects.count(), 0)

    def test_an_expired_code_creates_nothing(self):
        self.register()
        pending = PendingRegistration.objects.get()
        pending.otp_expires_at = timezone.now() - timedelta(seconds=1)
        pending.save()

        response = self.verify(self.sent_otp())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", str(response.data))
        self.assertEqual(User.objects.count(), 0)

    def test_an_abandoned_registration_expires_entirely(self):
        self.register()
        pending = PendingRegistration.objects.get()
        PendingRegistration.objects.filter(pk=pending.pk).update(
            created_at=timezone.now() - timedelta(hours=2)
        )

        response = self.verify(self.sent_otp())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)
        self.assertEqual(PendingRegistration.objects.count(), 0)

    def test_verifying_an_unknown_email_creates_nothing(self):
        response = self.verify("123456", email="nobody@example.com")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

    def test_a_malformed_code_is_rejected_before_anything_else(self):
        self.register()
        for bad_code in ("12345", "abcdef", "1234567", ""):
            with self.subTest(code=bad_code):
                response = self.verify(bad_code)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 0)

    def test_the_same_code_cannot_be_used_twice(self):
        self.register()
        otp = self.sent_otp()

        self.assertEqual(self.verify(otp).status_code, status.HTTP_200_OK)
        second = self.verify(otp)

        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.count(), 1)

    def test_a_username_taken_during_verification_is_caught(self):
        self.register()
        otp = self.sent_otp()

        # Somebody else finished registering that name while this code sat in
        # an inbox.
        User.objects.create_user(
            username="nandhu", email="other@example.com", password=VALID_PASSWORD
        )

        response = self.verify(otp)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(User.objects.filter(email="nandhu@example.com").count(), 0)


class ResendTests(RegistrationTestCase):
    def resend(self, email="nandhu@example.com"):
        return self.client.post(
            reverse("resend-otp"), {"email": email}, format="json"
        )

    def allow_resend(self):
        """Moves the cooldown into the past so a resend is permitted."""
        pending = PendingRegistration.objects.get()
        pending.last_sent_at = timezone.now() - timedelta(minutes=5)
        pending.save()

    def test_a_resend_too_soon_is_refused(self):
        self.register()
        response = self.resend()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("wait", str(response.data).lower())

    def test_a_resend_after_the_cooldown_is_allowed(self):
        self.register()
        self.allow_resend()

        response = self.resend()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_a_new_code_retires_the_previous_one(self):
        self.register()
        first_code = self.sent_otp()
        self.allow_resend()
        self.resend()
        second_code = self.sent_otp()

        self.assertNotEqual(first_code, second_code)
        self.assertEqual(self.verify(first_code).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.verify(second_code).status_code, status.HTTP_200_OK)

    def test_a_new_code_clears_previous_wrong_attempts(self):
        self.register()
        self.verify("000000")
        self.verify("000000")
        self.allow_resend()
        self.resend()

        self.assertEqual(PendingRegistration.objects.get().otp_attempts, 0)

    def test_resending_for_an_unknown_email_is_refused(self):
        response = self.resend(email="nobody@example.com")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_failed_send_does_not_replace_the_working_code(self):
        self.register()
        working_code = self.sent_otp()
        self.allow_resend()

        self.mock_send.side_effect = EmailDeliveryError("Brevo said no")
        response = self.resend()

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        # The old code still works, so a provider hiccup does not strand anyone.
        self.mock_send.side_effect = None
        self.assertEqual(self.verify(working_code).status_code, status.HTTP_200_OK)


class ExistingUserTests(RegistrationTestCase):
    def test_an_existing_account_still_signs_in(self):
        User.objects.create_user(
            username="existing", email="existing@example.com", password=VALID_PASSWORD
        )

        response = self.client.post(
            reverse("login"),
            {"username": "existing", "password": VALID_PASSWORD},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_the_current_user_endpoint_still_works(self):
        user = User.objects.create_user(
            username="existing", email="existing@example.com", password=VALID_PASSWORD
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("current-user"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "existing")


class PasswordResetTestCase(APITestCase):
    """Shared setup: one real account, and Brevo stubbed out."""

    def setUp(self):
        self.send_patcher = patch("apps.accounts.services.send_password_reset_email")
        self.mock_send = self.send_patcher.start()
        self.addCleanup(self.send_patcher.stop)

        from django.core.cache import cache

        # Both the throttles and the resend cooldown live in the cache.
        cache.clear()

        self.user = User.objects.create_user(
            username="nandhu", email="nandhu@example.com", password=VALID_PASSWORD
        )

    def forgot(self, email="nandhu@example.com"):
        return self.client.post(
            reverse("forgot-password"), {"email": email}, format="json"
        )

    def sent_link(self):
        """The reset URL handed to the email service on the most recent send."""
        return self.mock_send.call_args.args[1]

    def link_parts(self):
        """The uid and token out of the most recent reset link."""
        uid, token = self.sent_link().rstrip("/").split("/")[-2:]
        return uid, token

    def reset(self, uid, token, password=NEW_PASSWORD, confirm=None):
        payload = {"uid": uid, "token": token, "new_password": password}
        if confirm is not None:
            payload["confirm_password"] = confirm
        return self.client.post(reverse("reset-password"), payload, format="json")

    def can_sign_in_with(self, password):
        response = self.client.post(
            reverse("login"),
            {"username": "nandhu", "password": password},
            format="json",
        )
        return response.status_code == status.HTTP_200_OK


class ForgotPasswordTests(PasswordResetTestCase):
    def test_a_known_address_is_sent_a_link(self):
        response = self.forgot()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.mock_send.call_count, 1)
        self.assertEqual(self.mock_send.call_args.args[0], self.user)

    def test_an_unknown_address_is_sent_nothing(self):
        response = self.forgot(email="nobody@example.com")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.mock_send.call_count, 0)

    def test_both_answers_are_word_for_word_identical(self):
        # The whole point: this endpoint must not reveal who has an account.
        known = self.forgot()
        self.mock_send.reset_mock()
        unknown = self.forgot(email="nobody@example.com")

        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data, unknown.data)

    def test_the_response_carries_no_link_or_token(self):
        response = self.forgot()
        body = str(response.data)

        uid, token = self.link_parts()
        self.assertNotIn(token, body)
        self.assertNotIn(uid, body)
        self.assertNotIn("reset-password", body)

    def test_an_address_is_matched_whatever_its_case(self):
        self.forgot(email="  NANDHU@Example.com  ")
        self.assertEqual(self.mock_send.call_count, 1)

    def test_a_malformed_address_is_rejected(self):
        response = self.forgot(email="not-an-email")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.mock_send.call_count, 0)

    def test_a_second_request_within_the_minute_sends_nothing(self):
        self.forgot()
        response = self.forgot()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Still only the first one, so this cannot be used to post mail at
        # somebody, and the answer gives no sign that anything was skipped.
        self.assertEqual(self.mock_send.call_count, 1)

    def test_the_cooldown_is_per_address(self):
        User.objects.create_user(
            username="other", email="other@example.com", password=VALID_PASSWORD
        )
        self.forgot()
        self.forgot(email="other@example.com")

        self.assertEqual(self.mock_send.call_count, 2)

    def test_someone_mid_registration_cannot_reset(self):
        # A pending registration is not an account and has no password yet.
        PendingRegistration.objects.create(
            email="pending@example.com",
            username="pending",
            password_hash="unused",
            otp_hash="unused",
            otp_expires_at=timezone.now() + timedelta(minutes=10),
            last_sent_at=timezone.now(),
        )

        response = self.forgot(email="pending@example.com")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.mock_send.call_count, 0)

    def test_an_inactive_account_is_sent_nothing(self):
        self.user.is_active = False
        self.user.save()

        self.forgot()
        self.assertEqual(self.mock_send.call_count, 0)

    def test_a_failed_send_is_reported(self):
        self.mock_send.side_effect = EmailDeliveryError("Brevo said no")

        response = self.forgot()
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)

    def test_the_link_points_at_the_frontend(self):
        self.forgot()
        link = self.sent_link()

        self.assertTrue(link.startswith(settings.FRONTEND_URL))
        self.assertIn("/reset-password/", link)
        # Nothing about the account travels in the URL beyond the token itself.
        self.assertNotIn(VALID_PASSWORD, link)
        self.assertNotIn(self.user.email, link)


class ResetPasswordTests(PasswordResetTestCase):
    def test_a_valid_link_changes_the_password(self):
        self.forgot()
        uid, token = self.link_parts()

        response = self.reset(uid, token)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.can_sign_in_with(NEW_PASSWORD))

    def test_the_old_password_stops_working(self):
        self.forgot()
        uid, token = self.link_parts()
        self.reset(uid, token)

        self.assertFalse(self.can_sign_in_with(VALID_PASSWORD))

    def test_the_new_password_is_stored_hashed(self):
        self.forgot()
        uid, token = self.link_parts()
        self.reset(uid, token)

        self.user.refresh_from_db()
        self.assertNotEqual(self.user.password, NEW_PASSWORD)
        self.assertTrue(check_password(NEW_PASSWORD, self.user.password))

    def test_the_response_carries_nothing_secret(self):
        self.forgot()
        uid, token = self.link_parts()
        response = self.reset(uid, token)
        body = str(response.data)

        self.assertNotIn(NEW_PASSWORD, body)
        self.assertNotIn(token, body)
        self.assertNotIn("access", body)
        self.assertNotIn("refresh", body)

    def test_a_link_only_works_once(self):
        self.forgot()
        uid, token = self.link_parts()

        self.assertEqual(self.reset(uid, token).status_code, status.HTTP_200_OK)
        second = self.reset(uid, token, password="ThirdPassword2026!")

        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        # The password from the first reset is still the one that works.
        self.assertTrue(self.can_sign_in_with(NEW_PASSWORD))

    def test_an_expired_link_is_refused(self):
        self.forgot()
        uid, token = self.link_parts()

        with self.settings(PASSWORD_RESET_TIMEOUT=-1):
            response = self.reset(uid, token)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.can_sign_in_with(VALID_PASSWORD))

    def test_a_tampered_token_is_refused(self):
        self.forgot()
        uid, token = self.link_parts()

        response = self.reset(uid, token[:-2] + "zz")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.can_sign_in_with(VALID_PASSWORD))

    def test_another_users_token_is_refused(self):
        other = User.objects.create_user(
            username="other", email="other@example.com", password=VALID_PASSWORD
        )
        self.forgot()
        _uid, token = self.link_parts()

        other_uid = urlsafe_base64_encode(force_bytes(other.pk))
        response = self.reset(other_uid, token)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.can_sign_in_with(VALID_PASSWORD))

    def test_a_nonsense_uid_is_refused(self):
        self.forgot()
        _uid, token = self.link_parts()

        for bad_uid in ("not-base64", "", urlsafe_base64_encode(b"99999")):
            with self.subTest(uid=bad_uid):
                response = self.reset(bad_uid, token)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_every_bad_link_gives_the_same_message(self):
        self.forgot()
        uid, token = self.link_parts()

        tampered = self.reset(uid, token[:-2] + "zz")
        wrong_user = self.reset(urlsafe_base64_encode(b"99999"), token)

        self.assertEqual(tampered.data, wrong_user.data)
        self.assertIn("invalid or has expired", str(tampered.data))

    def test_a_weak_password_is_refused(self):
        self.forgot()
        uid, token = self.link_parts()

        response = self.reset(uid, token, password="12345")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.can_sign_in_with(VALID_PASSWORD))

    def test_the_reset_policy_matches_the_registration_policy(self):
        # The same weak password, turned away at both doors.
        weak = "password"
        self.forgot()
        uid, token = self.link_parts()

        reset_response = self.reset(uid, token, password=weak)
        register_response = self.client.post(
            reverse("register"),
            {
                "username": "someoneelse",
                "email": "someoneelse@example.com",
                "password": weak,
                "password_confirm": weak,
            },
            format="json",
        )

        self.assertEqual(reset_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(register_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_mismatched_confirmation_is_refused(self):
        self.forgot()
        uid, token = self.link_parts()

        response = self.reset(uid, token, confirm="SomethingElse2026!")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self.can_sign_in_with(VALID_PASSWORD))

    def test_a_matching_confirmation_is_accepted(self):
        self.forgot()
        uid, token = self.link_parts()

        response = self.reset(uid, token, confirm=NEW_PASSWORD)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_resetting_leaves_the_account_otherwise_untouched(self):
        self.forgot()
        uid, token = self.link_parts()
        self.reset(uid, token)

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "nandhu")
        self.assertEqual(self.user.email, "nandhu@example.com")
        self.assertTrue(self.user.is_active)
