from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import PendingRegistration, normalize_email


class UserSerializer(serializers.ModelSerializer):
    """The safe account fields the frontend is allowed to see."""

    class Meta:
        model = User
        fields = ("id", "username", "email")


class RegisterSerializer(serializers.Serializer):
    """
    Checks a registration before any code is sent.

    Deliberately not a ModelSerializer any more: registering no longer creates
    a User. It records what was typed and sends a code, and only the code
    coming back creates the account.
    """

    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    def validate_username(self, value):
        username = value.strip()

        if not username:
            raise serializers.ValidationError("Enter a username.")
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("That username is already in use.")

        return username

    def validate_email(self, value):
        # Django does not enforce unique emails, so we check it ourselves.
        email = normalize_email(value)

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("That email is already registered.")

        return email

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        # Two people mid-registration cannot both be waiting on the same
        # username, or whichever verified second would be turned away after
        # already proving their address.
        taken_by_pending = (
            PendingRegistration.objects.filter(username__iexact=attrs["username"])
            .exclude(email=attrs["email"])
            .exists()
        )
        if taken_by_pending:
            raise serializers.ValidationError(
                {"username": "That username is already in use."}
            )

        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    """The address being verified and the six digits that were emailed to it."""

    email = serializers.EmailField()
    otp = serializers.RegexField(
        r"^\d{6}$",
        error_messages={"invalid": "Enter the six-digit code from your email."},
    )

    def validate_email(self, value):
        return normalize_email(value)


class ResendOtpSerializer(serializers.Serializer):
    """The address waiting on a code."""

    email = serializers.EmailField()

    def validate_email(self, value):
        return normalize_email(value)


class ForgotPasswordSerializer(serializers.Serializer):
    """Just the address asking for a link. Whether it has an account is not
    decided here: answering that in a validation error would tell a stranger
    who is registered."""

    email = serializers.EmailField()

    def validate_email(self, value):
        return normalize_email(value)


class ResetPasswordSerializer(serializers.Serializer):
    """
    Checks a reset link and the new password behind it.

    Everything that decides whether the reset may happen lives here rather than
    in React: the browser is holding the link, so it is in no position to judge
    whether the link is real.
    """

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    # Optional, because the frontend already compares the two fields. Checked
    # here anyway whenever it is sent.
    confirm_password = serializers.CharField(write_only=True, required=False)

    # One message for every way a link can be no good. Saying which part failed
    # would help somebody working through tokens and helps nobody else.
    INVALID_LINK = "This password reset link is invalid or has expired."

    def validate(self, attrs):
        user = self._user_from_uid(attrs["uid"])

        if user is None or not default_token_generator.check_token(
            user, attrs["token"]
        ):
            raise serializers.ValidationError({"token": self.INVALID_LINK})

        confirm_password = attrs.get("confirm_password")
        if confirm_password is not None and attrs["new_password"] != confirm_password:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )

        # The same rules registration uses, from AUTH_PASSWORD_VALIDATORS. The
        # user is passed as well, which lets Django reject a password that
        # merely repeats their username or address.
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"new_password": list(error.messages)})

        attrs["user"] = user
        return attrs

    def _user_from_uid(self, uid):
        """Turn the encoded id from the link back into a user, or None."""
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            return User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return None

    def save(self):
        """
        Set the new password.

        set_password hashes it, so nothing here ever touches a raw hash. The
        hash changing is also what kills the link that was just used: Django's
        token is derived from it, so the same link cannot be replayed.
        """
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """Issues JWT tokens and returns the user, so the frontend needs one request."""

    def validate(self, attrs):
        # Let people sign in with their email address as well as their username.
        login_value = attrs.get(self.username_field, "")
        if "@" in login_value:
            matching_user = User.objects.filter(email__iexact=login_value).first()
            if matching_user:
                attrs[self.username_field] = matching_user.username

        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
