from flask import Blueprint, jsonify, request
from ..rbac import admin_required
from ..services import settings_service

settings_bp = Blueprint("settings", __name__, url_prefix="/api/v1")

@settings_bp.get("/admin/settings/points")
@admin_required
def get_points():
    return jsonify(settings_service.get_recognition_points()), 200

@settings_bp.put("/admin/settings/points")
@admin_required
def update_points():
    data = request.json
    return jsonify(settings_service.update_recognition_points(data)), 200
