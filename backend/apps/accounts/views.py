from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResendOtpSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from .services import (
    EmailDeliveryError,
    VerificationError,
    clear_expired_registrations,
    request_password_reset,
    resend_otp,
    start_registration,
    verify_pending_registration_otp,
)

# Shown whenever Brevo will not take the message. The real reason is logged for
# whoever is running the server; the visitor gets something they can act on.
EMAIL_FAILURE_MESSAGE = (
    "We couldn't send the verification email. Please try again."
)


class RegisterView(APIView):
    """
    Starts a registration by emailing a verification code.

    No account is created here. The details are held aside until the code that
    was emailed comes back, which is what proves the address belongs to whoever
    filled in the form.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "registration"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Swept on the way past rather than on a schedule, which keeps the
        # project free of a task queue it does not otherwise need.
        clear_expired_registrations()

        try:
            start_registration(
                username=serializer.validated_data["username"],
                email=serializer.validated_data["email"],
                raw_password=serializer.validated_data["password"],
            )
        except EmailDeliveryError:
            # Saying "code sent" when nothing was sent would leave someone
            # waiting on an email that is never coming.
            return Response(
                {"detail": EMAIL_FAILURE_MESSAGE},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"message": "Verification code sent."}, status=status.HTTP_201_CREATED
        )


class VerifyEmailView(APIView):
    """Turns a proved registration into a real account."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verification"

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            verify_pending_registration_otp(
                email=serializer.validated_data["email"],
                otp=serializer.validated_data["otp"],
            )
        except VerificationError as error:
            return Response(
                {"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST
            )

        # No token is issued here. The account now exists, so the ordinary
        # login flow takes over and there is still only one way in.
        return Response(
            {"message": "Email verified. Your account has been created."}
        )


class ResendOtpView(APIView):
    """Sends another code for a registration still waiting to be verified."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "verification"

    def post(self, request):
        serializer = ResendOtpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            resend_otp(serializer.validated_data["email"])
        except VerificationError as error:
            return Response(
                {"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST
            )
        except EmailDeliveryError:
            return Response(
                {"detail": EMAIL_FAILURE_MESSAGE},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"message": "Verification code sent."})


class ForgotPasswordView(APIView):
    """
    Emails a password reset link.

    Answers the same way whatever it finds. An address with an account, one
    without, and one that was sent a link a moment ago are indistinguishable
    from out here, so this endpoint cannot be used to find out who has an
    account on SyntaxTime.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    # Said in every case, including the ones where nothing was sent.
    GENERIC_MESSAGE = (
        "If an account exists for that email, a password reset link has been sent."
    )

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            request_password_reset(serializer.validated_data["email"])
        except EmailDeliveryError:
            # Claiming a link is on its way when Brevo refused it would leave
            # somebody waiting on an email that is never coming.
            return Response(
                {"detail": EMAIL_FAILURE_MESSAGE},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"message": self.GENERIC_MESSAGE})


class ResetPasswordView(APIView):
    """
    Sets a new password for whoever is holding a valid reset link.

    The link is the authorisation, so this is open: somebody who has forgotten
    their password cannot sign in first. No token is returned either. The
    account now has a working password, so the ordinary login flow takes over.
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Password updated successfully."})


class LoginView(TokenObtainPairView):
    """Validates credentials and returns access and refresh tokens plus the user."""

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]


class CurrentUserView(generics.RetrieveAPIView):
    """Returns the signed-in user, so React can restore its session on reload."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
