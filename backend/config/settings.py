"""
Django settings for the Naval Server Console backend.

Deliberately minimal and dependency-light: the "database" for now is a
hardcoded Python module (``fleet/data.py``), so Django's ORM/DB is unused and
migrations are irrelevant. Everything that a real deployment would pull from the
environment is read via ``os.environ`` with sane local defaults, so pointing at
a real DB or locking down CORS later is a config change, not a code change.
"""
from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Core -------------------------------------------------------------------
# In real deployments SECRET_KEY / DEBUG / ALLOWED_HOSTS come from the env.
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", "dev-insecure-key-change-me-in-production"
)
DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.environ.get(
    "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0"
).split(",")

# --- Applications -----------------------------------------------------------
INSTALLED_APPS = [
    # Django contrib is trimmed to the minimum — no admin/auth/sessions needed
    # for a read-only JSON API backed by hardcoded data.
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "corsheaders",
    # Local
    "fleet",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    }
]

# --- "Database" -------------------------------------------------------------
# There is intentionally NO real database yet. The fleet data lives hardcoded in
# fleet/data.py. We still point Django at a throwaway sqlite file so management
# commands that expect a DATABASES setting don't error; nothing writes to it.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# --- REST framework ---------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        # Browsable API kept on in DEBUG for easy manual inspection.
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    # No auth/permissions on a read-only public telemetry demo. Tighten here
    # when this fronts anything real.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
}

# --- CORS -------------------------------------------------------------------
# The Vite dev server (5173/5174) calls this API from a different origin, so the
# browser needs CORS headers. Origins come from the env; defaults cover local
# Vite. In production, set CORS_ALLOWED_ORIGINS explicitly.
CORS_ALLOWED_ORIGINS = os.environ.get(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174",
).split(",")

# --- I18N / static ----------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
