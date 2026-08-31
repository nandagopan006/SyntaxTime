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
    "apps.coach",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves Django's own static files in production, where there is no web
    # server in front of Django to do it. Directly after SecurityMiddleware is
    # where WhiteNoise has to sit for it to see every response. It does nothing
    # under runserver, which serves static files itself.
    "whitenoise.middleware.WhiteNoiseMiddleware",
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

# Where `collectstatic` gathers the admin's CSS and JavaScript during a
# deployment. Without this the command has nowhere to write and fails, which is
# why it has to exist before the first deploy rather than after it.
# The directory is generated, so it is not committed.
STATIC_ROOT = BASE_DIR / "staticfiles"

# Compresses the collected files and gives each a name containing a hash of its
# contents, so a changed file is never served from a stale cache.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

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
        # Every message to the focus coach costs a request to an AI provider,
        # so it is capped per user. Raised from thirty once the coach became a
        # conversation: one interruption can now be several messages, and a cap
        # that made somebody run out mid-sentence would be worse than no coach.
        # Pausing and finishing still work once it is reached.
        "coach": "120/hour",
    },
}

# The focus coach. Like the Brevo key above, this is a password: it stays in
# the environment, is read only by the backend, and never reaches the browser,
# a URL or a response body.
AI_API_KEY = os.getenv("AI_API_KEY", "")

# Which provider answers. "groq" or "anthropic".
#
# Groq by default because it is free and unusually fast, and speed is what this
# feature needs: the user is mid-session waiting for two sentences, and the
# request gives up after eight. The trade-off is real - a smaller, faster model
# follows the coach's rules about shaming and medical claims less reliably than
# a larger one - so anthropic is one setting away when that matters more.
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")

# A small, fast model on purpose. The coach writes two or three sentences about
# one interruption, which is not work that needs a larger one.
#
# Model names change often on both providers. If a request starts failing,
# check the provider's current list rather than assuming the key is wrong.
DEFAULT_AI_MODELS = {
    "groq": "openai/gpt-oss-120b",
    "anthropic": "claude-haiku-4-5-20251001",
}
AI_MODEL = os.getenv("AI_MODEL") or DEFAULT_AI_MODELS.get(AI_PROVIDER, "")

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
    # The Vite dev server, which is also what the desktop application loads
    # during development.
    "http://localhost:5180",
    "http://127.0.0.1:5180",
    # The installed desktop application. It does not serve from a dev server:
    # Tauri serves the packaged build over its own protocol, which the browser
    # treats as a different origin. Windows uses http://tauri.localhost, and
    # the other platforms use the tauri:// scheme.
    #
    # These stay whatever happens: the installed application uses them on every
    # machine, so they are not deployment-specific and there is nothing to
    # configure per environment.
    "http://tauri.localhost",
    "tauri://localhost",
]

# The deployed web frontend's address, which is only known once it is hosted.
# Kept in the environment rather than here so putting SyntaxTime on a new
# domain does not mean editing code and redeploying the backend.
#
# Comma-separated, and each must be a full origin with its scheme:
#   CORS_ALLOWED_ORIGINS=https://syntaxtime.vercel.app
CORS_ALLOWED_ORIGINS += [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]


# Everything below applies only when DEBUG is off, which is to say only in a
# real deployment. Turning these on locally would redirect http://localhost to
# https://localhost, which nothing is listening on, and development would stop
# working for no benefit.
if not DEBUG:
    # The host terminates HTTPS and forwards plain HTTP inside its network, so
    # Django sees an insecure request and would redirect it to HTTPS forever.
    # This header is how the proxy says "the original request was secure".
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    # Anyone arriving over http:// is sent to https:// instead.
    SECURE_SSL_REDIRECT = True

    # Cookies are only ever sent over HTTPS. SyntaxTime authenticates with JWTs
    # rather than the session cookie, but the admin uses both.
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    # Tells browsers to use HTTPS for this domain from now on, so even a typed
    # http:// address never leaves the machine unencrypted. Set to one hour
    # rather than the usual year on purpose: a long value is remembered by the
    # browser and cannot be taken back, which is painful on a first deployment.
    # Raise it once the domain is settled.
    SECURE_HSTS_SECONDS = 3600

    # `manage.py check --deploy` warns that SECURE_HSTS_INCLUDE_SUBDOMAINS and
    # SECURE_HSTS_PRELOAD are unset. Both are left off on purpose while
    # SyntaxTime runs on a hosting provider's shared domain.
    #
    # Preloading in particular is close to irreversible: the domain is baked
    # into browsers themselves and removal takes months. Neither belongs on a
    # domain that is not ours. Turn both on, and raise SECURE_HSTS_SECONDS to a
    # year, once SyntaxTime has a domain of its own served entirely over HTTPS.

    # The API is read from a browser and from the desktop application, and
    # neither has any reason to guess at a content type.
    SECURE_CONTENT_TYPE_NOSNIFF = True

    # The reset link in an email carries a token in its path, so it must not be
    # handed to another site in a Referer header.
    SECURE_REFERRER_POLICY = "same-origin"
