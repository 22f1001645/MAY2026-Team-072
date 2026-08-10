from flask import Blueprint, g, jsonify, request

from ..rbac import admin_required, auth_required
from ..schemas import LoginSchema, RegisterSchema
from ..services import auth_service

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


@auth_bp.post("/register")
def register():
    data = RegisterSchema().load(request.get_json() or {})
    return jsonify(auth_service.register(**data)), 201


@auth_bp.post("/login")
def login():
    data = LoginSchema().load(request.get_json() or {})
    return jsonify(auth_service.login(**data)), 200


@auth_bp.get("/me")
@auth_required
def me():
    return jsonify(g.current_user.to_dict()), 200


@auth_bp.patch("/users/<user_id>/academic-status")
@admin_required
def set_academic_status(user_id):
    """AUTH-04 — Admin overrides a student's self-declared academic status."""
    from ..models import User
    from ..repositories.repos import AuditRepository
    from ..extensions import db

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found", "code": "not_found"}), 404

    data = request.get_json() or {}
    valid_levels = ("foundation", "diploma", "degree")
    valid_statuses = ("active", "on-break", "withdrawn")

    academic_level = data.get("academic_level")
    academic_status = data.get("academic_status")

    if academic_level and academic_level not in valid_levels:
        return jsonify({"error": f"academic_level must be one of {valid_levels}", "code": "invalid_value"}), 422
    if academic_status and academic_status not in valid_statuses:
        return jsonify({"error": f"academic_status must be one of {valid_statuses}", "code": "invalid_value"}), 422

    if academic_level:
        user.academic_level = academic_level
    if academic_status:
        user.academic_status = academic_status

    AuditRepository.record(
        "user", user.id,
        f"Academic status overridden: level={user.academic_level}, status={user.academic_status}",
        g.current_user
    )
    db.session.commit()
    return jsonify(user.to_dict()), 200

