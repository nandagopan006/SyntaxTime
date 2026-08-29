"""
Django settings for SyntaxTime.

Values that differ between machines (secret key, database password, debug flag)
are read from the .env file so they are never committed to Git.
"""

from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
DEBUG = os.getenv("DJANGO_DEBUG", "True") == "True"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.accounts",
    "apps.study",
    "apps.friends",
    "apps.leaderboard",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # CORS must come before CommonMiddleware so its headers are added to
    # every response, including redirects.
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Neon supplies one connection URL, while Django wants a settings dict, so
# dj_database_url converts it and keeps the sslmode Neon requires.
# CONN_MAX_AGE reuses a connection between requests, which matters more than
# usual here because the database is across the network rather than local.
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
            ssl_require=True,
        )
    }
else:
    # Fallback for a local PostgreSQL server, using the separate DB_* variables.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME"),
            "USER": os.getenv("DB_USER"),
            "PASSWORD": os.getenv("DB_PASSWORD"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Every API request is identified by a JWT in the Authorization header,
# and endpoints require a signed-in user unless they say otherwise.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    # The registration endpoints are open to anyone, and each one sends an
    # email or guesses at a code, so they are capped per address.
    "DEFAULT_THROTTLE_CLASSES": ("rest_framework.throttling.ScopedRateThrottle",),
    "DEFAULT_THROTTLE_RATES": {
        "registration": "10/hour",
        "verification": "20/hour",
        # Asking for a reset sends mail to somebody else's inbox, so it is the
        # tightest of the three. Answering a link is capped too, against
        # someone working through tokens.
        "password_reset": "5/hour",
        "password_reset_confirm": "20/hour",
    },
}

# Brevo sends the verification email. The key lives here and nowhere else: it
# must never reach the browser, a URL, or a response body.
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "SyntaxTime")

# Where the reset link in an email should point. The React application owns the
# reset screen, so the backend only builds the address; hard-coding localhost
# here would send production users to their own machines.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5180").rstrip("/")

# How long a password reset link works for. Django checks this itself when it
# validates the token, which is why no table of reset tokens is needed.
PASSWORD_RESET_TIMEOUT = 30 * 60

# Django only sets up logging for its own loggers, so anything SyntaxTime logs
# would otherwise go nowhere. That includes the verification email printed to
# the console when Brevo is not configured, which is the whole of the local
# development flow.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "apps": {
            "handlers": ["console"],
            "level": "INFO",
        },
    },
}

SIMPLE_JWT = {
    # A short-lived access token limits the damage if it is ever stolen.
    # The longer refresh token lets the frontend get a new one silently,
    # so a study session is never interrupted by an unexpected logout.
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# The frontend runs on a different port, so the browser treats it as a separate
# origin. Without this, future API calls would be blocked.
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5180",
    "http://127.0.0.1:5180",
]
