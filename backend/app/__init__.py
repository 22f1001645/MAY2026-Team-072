"""Application factory — three-tier Flask backend (Milestone 2 §1-2).

Presentation (Blueprints) → application (services) → data (repositories/ORM),
with JWT + POR-RBAC, Marshmallow validation, and a uniform error envelope as
cross-cutting middleware."""
import os

from flask import Flask, jsonify
from flask_cors import CORS

from .config import Config
from .controllers import ALL_BLUEPRINTS
from .errors import register_error_handlers
from .extensions import db, jwt, migrate


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)
    app.json.sort_keys = False
    from .extensions import db, jwt, migrate, scheduler
    from .services.reminder_service import send_24h_reminders

    # Extensions
    db.init_app(app)
    # render_as_batch is what makes ALTER/DROP COLUMN possible on SQLite at all
    # (Alembic rewrites them as a table copy); compare_type makes autogenerate
    # notice column type changes rather than silently ignoring them.
    migrate.init_app(app, db, render_as_batch=True, compare_type=True)
    jwt.init_app(app)
    CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    if not app.testing:
        scheduler.init_app(app)
        if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
            scheduler.start()
            # Run every hour at minute 0
            scheduler.add_job(id='send_24h_reminders', func=send_24h_reminders, trigger='cron', minute=0)

    # JWT error responses use the same envelope shape
    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify({"error": "Missing or invalid token", "code": "unauthorized"}), 401

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        return jsonify({"error": "Invalid token", "code": "unauthorized"}), 401

    @jwt.expired_token_loader
    def _expired_token(header, payload):
        return jsonify({"error": "Token has expired", "code": "token_expired"}), 401

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
        # Short-circuit on access tokens (never hits DB)
        if jwt_payload.get("type") == "access":
            return False
            
        from .repositories.repos import BlocklistRepository
        return BlocklistRepository.is_jti_blocked(jwt_payload["jti"])

    # Blueprints (one per PRD module)
    for bp in ALL_BLUEPRINTS:
        app.register_blueprint(bp)

    register_error_handlers(app)

    @app.get("/")
    def index():
        return jsonify(
            {
                "service": "Ekatva OS API",
                "tagline": "Unite. Inspire. Celebrate.",
                "version": "v1",
                "docs": "See backend/README.md for the endpoint map",
            }
        )

    return app
