"""Shared extension singletons — imported by the app factory and every layer.

The SQLAlchemy singleton is constructed with an explicit metadata naming
convention. Every constraint and index the models create without an explicit
name gets a deterministic name from this convention, which is what lets SQLite
migrations reflect and recreate those constraints during a batch table-copy.
The convention has to be in place before the first Alembic revision is
generated — retrofitting it later would mean rewriting migration history.
"""
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from sqlalchemy import MetaData

# Alembic's documented recommended set. `ix_%(column_0_label)s` reproduces
# SQLAlchemy's own default index name for `index=True` columns (users.email
# renders as ix_users_email), so adopting the convention introduces no drift
# against the schema the existing dev database already has.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=NAMING_CONVENTION)
db = SQLAlchemy(metadata=metadata)
migrate = Migrate()
jwt = JWTManager()
