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

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    SQLALCHEMY_DATABASE_URI = _normalise_db_url(
        os.getenv("DATABASE_URL", "sqlite:///ekatva.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://localhost:5175",
    ).split(",")

    JSON_SORT_KEYS = False


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-jwt-secret"
