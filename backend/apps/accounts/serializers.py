from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UserSerializer(serializers.ModelSerializer):
    """The safe account fields the frontend is allowed to see."""

    class Meta:
        model = User
        fields = ("id", "username", "email")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "password_confirm")
        extra_kwargs = {
            "username": {
                "error_messages": {"unique": "That username is already in use."}
            },
            # Django's User model allows a blank email, but SyntaxTime needs one.
            "email": {"required": True, "allow_blank": False},
        }

    def validate_email(self, value):
        # Django does not enforce unique emails, so we check it ourselves.
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("That email is already registered.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        # create_user hashes the password. Never use User.objects.create here.
        return User.objects.create_user(**validated_data)


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
