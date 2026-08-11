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


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret-ekatva-os-super-secure-key-32bytes"
