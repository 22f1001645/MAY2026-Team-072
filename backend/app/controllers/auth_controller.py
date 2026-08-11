from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required, set_access_cookies, set_refresh_cookies, unset_jwt_cookies

from ..rbac import admin_required, auth_required
from ..schemas import LoginSchema, RegisterSchema
from ..services import auth_service
from ..models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")
_admin_bp = Blueprint("admin_auth", __name__, url_prefix="/api/v1/admin")


@auth_bp.post("/register")
def register():
    data = RegisterSchema().load(request.get_json() or {})
    res = auth_service.register(**data)
    resp = jsonify(res)
    # Register sets cookies too if we wanted to auto-login completely, but for now we'll just return the token
    return resp, 201


@auth_bp.post("/login")
def login():
    data = LoginSchema().load(request.get_json() or {})
    res, refresh_token = auth_service.login(**data)
    resp = jsonify(res)
    set_refresh_cookies(resp, refresh_token)
    return resp, 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True, verify_type=False)
def refresh():
    # Verify CSRF is handled automatically by flask_jwt_extended if JWT_CSRF_IN_COOKIES=True
    # Skip revocation check implicitly since we handle family logic inside auth_service
    jwt_payload = get_jwt()
    res, new_refresh = auth_service.refresh(jwt_payload)
    resp = jsonify(res)
    set_refresh_cookies(resp, new_refresh)
    return resp, 200


@auth_bp.post("/logout")
@jwt_required(refresh=True, verify_type=False)
def logout():
    jwt_payload = get_jwt()
    auth_service.logout(jwt_payload)
    resp = jsonify({"message": "Successfully logged out"})
    unset_jwt_cookies(resp)
    return resp, 200


@auth_bp.get("/me")
@auth_required
def me():
    user = g.current_user
    data = user.to_dict()
    data["capabilities"] = auth_service.get_capabilities(user)
    data["academic_status_stale"] = auth_service.is_academic_status_stale(user)
    return jsonify(data), 200


@auth_bp.patch("/academic-status")
@auth_required
def update_academic_status():
    data = request.get_json() or {}
    level = data.get("academic_level")
    status = data.get("academic_status")
    auth_service.confirm_academic_status(g.current_user, level, status)
    return jsonify({"message": "Academic status updated"}), 200


@_admin_bp.patch("/users/<user_id>/academic-status")
@admin_required
def admin_update_academic_status(user_id):
    data = request.get_json() or {}
    level = data.get("academic_level")
    status = data.get("academic_status")
    reason = data.get("reason")
    
    from ..repositories.repos import UserRepository
    target = UserRepository.by_id(user_id)
    if not target:
        return jsonify({"error": "User not found", "code": "not_found"}), 404
        
    auth_service.admin_override_academic_status(g.current_user, target, level, status, reason)
    return jsonify({"message": "User academic status updated by admin"}), 200


@auth_bp.get("/por-audit")
@admin_required
def por_audit():
    # D-14 audit
    from ..repositories.repos import PORAssignment
    from ..extensions import db
    from sqlalchemy.orm import joinedload
    
    pors = PORAssignment.query.options(
        joinedload(PORAssignment.membership)
    ).all()
    
    return jsonify([p.to_dict() for p in pors]), 200
