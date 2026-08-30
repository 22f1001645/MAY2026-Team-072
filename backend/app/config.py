import os
from datetime import timedelta


def _normalise_db_url(url: str) -> str:
    # Heroku/Render-style "postgres://" → SQLAlchemy "postgresql://"
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


class Config:
    """Base configuration. Dev defaults to a zero-config SQLite file so the
    project runs out of the box; set DATABASE_URL to target PostgreSQL 15
    (the Milestone 2 design store)."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-ekatva-os-super-secure-key-32bytes")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-ekatva-os-super-secure-key-32bytes")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_SESSION_COOKIE = False
    JWT_TOKEN_LOCATION = ["headers", "cookies"]
    JWT_COOKIE_SECURE = False  # Set True in prod
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_CSRF_IN_COOKIES = True
    JWT_CSRF_CHECK_FORM = False

    SQLALCHEMY_DATABASE_URI = _normalise_db_url(
        os.getenv("DATABASE_URL", "sqlite:///ekatva.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://localhost:5175",
    ).split(",")

    # Upload size caps. Deliberately NOT env-var overrides: they are security
    # controls, not deployment knobs, and TestConfig does not soften them
    # either, because the boundary tests have to exercise the real values.
    #
    # MAX_CONTENT_LENGTH is a single APP-WIDE Flask key, so the two endpoints
    # that accept a file cannot both express their limit through it. Phase 5
    # (CAMPAIGN-03, decision OD-2) raised it from the logo's original 2 MiB to
    # the poster's 5 MiB, which the UI-SPEC's "max 5 MB" copy promises. Flask
    # still refuses anything larger BEFORE buffering the body, which is the
    # whole reason this bound lives here rather than as a length check inside a
    # view — by the time a view can measure a body it has already read it.
    #
    # The logo's stricter 2 MiB therefore moved to a per-endpoint check in
    # org_profile_service.store_logo, so raising the shared key did not quietly
    # relax the logo rule (T-05-52).
    POSTER_MAX_BYTES = 5 * 1024 * 1024
    LOGO_MAX_BYTES = 2 * 1024 * 1024
    MAX_CONTENT_LENGTH = POSTER_MAX_BYTES

    # AI-drafted brand kit (ORG-04, decision D-04). Server-side only: this must
    # never be re-exposed as a VITE_* name, because Vite inlines those into the
    # client bundle. An unset key means the feature is simply off — the endpoint
    # degrades to 503 rather than failing at import time.
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # Venue autocomplete (Mappls Autosuggest). Same posture as GEMINI_API_KEY:
    # server-side only, never a VITE_* name, and an unset key means the feature
    # is off — /venues/autocomplete answers 501 and the picker falls back to a
    # plain text input rather than the app breaking.
    MAPPLS_API_KEY = os.getenv("MAPPLS_API_KEY")


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret-ekatva-os-super-secure-key-32bytes"
