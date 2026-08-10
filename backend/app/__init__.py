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
from .extensions import db, jwt


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)
    app.json.sort_keys = False

    # Extensions
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

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

    # Blueprints (one per PRD module)
    for bp in ALL_BLUEPRINTS:
        app.register_blueprint(bp)
        
    from .controllers.config_controller import config_bp
    app.register_blueprint(config_bp)
    from .controllers.collaboration_controller import collaboration_bp
    app.register_blueprint(collaboration_bp)

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
