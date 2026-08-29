from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CurrentUserView,
    ForgotPasswordView,
    LoginView,
    RegisterView,
    ResendOtpView,
    ResetPasswordView,
    VerifyEmailView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-otp/", ResendOtpView.as_view(), name="resend-otp"),
    path("forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("me/", CurrentUserView.as_view(), name="current-user"),
]
