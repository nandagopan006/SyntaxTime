from django.contrib.auth.models import User
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """Creates a new SyntaxTime account."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


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
