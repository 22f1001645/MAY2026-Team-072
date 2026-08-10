from flask import Blueprint, request, jsonify
from ..rbac import admin_required
from ..services import config_service

config_bp = Blueprint("config", __name__, url_prefix="/api/v1/config")


@config_bp.route("/points", methods=["GET"])
@admin_required
def get_points():
    return jsonify(config_service.get_points()), 200


@config_bp.route("/points", methods=["PATCH"])
@admin_required
def update_points():
    payload = request.get_json(force=True)
    updated = config_service.update_points(payload)
    return jsonify(updated), 200


@config_bp.route("/constants", methods=["GET"])
def get_constants():
    """Returns standard domain constants (FR-A2)."""
    return jsonify(config_service.get_constants()), 200
