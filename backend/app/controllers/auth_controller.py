from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required, set_access_cookies, set_refresh_cookies, unset_jwt_cookies

from ..errors import ApiError
from ..rbac import admin_required, auth_required
from ..repositories.repos import UserRepository
from ..schemas import (
    AcademicStatusSchema,
    AdminAcademicOverrideSchema,
    LoginSchema,
    ProfileSchema,
    RegisterSchema,
)
from ..services import auth_service
from ..models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

# This module is the one controller that contributes TWO blueprints. The admin
# override lives under /api/v1/admin rather than /api/v1/auth, and the name is
# deliberately public: as `_admin_bp` it read as module-private, which is why it
# was left out of ALL_BLUEPRINTS and the endpoint 404'd.
admin_auth_bp = Blueprint("admin_auth", __name__, url_prefix="/api/v1/admin")


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
@jwt_required(refresh=True, skip_revocation_check=True, locations=["cookies"])
def refresh():
    # CSRF is enforced by flask_jwt_extended because JWT_CSRF_IN_COOKIES=True.
    # Revocation is skipped explicitly by the decorator and performed inside
    # auth_service.refresh, which needs to *act* on a replayed token (revoke the
    # family) rather than merely deny it — the loader is a predicate and raises
    # during decode, before this view body could run.
    # Pinning locations to cookies keeps the client's stale Authorization header
    # from shadowing the valid refresh cookie.
    jwt_payload = get_jwt()
    res, new_refresh = auth_service.refresh(jwt_payload)
    resp = jsonify(res)
    set_refresh_cookies(resp, new_refresh)
    return resp, 200


@auth_bp.post("/logout")
@jwt_required(refresh=True, locations=["cookies"])
def logout():
    # No skip_revocation_check here: revoking an already revoked token is
    # correctly a 401, so letting the loader deny it is the wanted behaviour.
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


@auth_bp.patch("/me/profile")
@auth_required
def update_profile():
    data = ProfileSchema().load(request.get_json() or {})
    return jsonify(auth_service.update_profile(g.current_user.id, data.get("city"))), 200


@auth_bp.patch("/academic-status")
@auth_required
def update_academic_status():
    data = AcademicStatusSchema().load(request.get_json() or {})
    auth_service.confirm_academic_status(
        g.current_user, data["academic_level"], data["academic_status"]
    )
    return jsonify({"message": "Academic status updated"}), 200


@admin_auth_bp.patch("/users/<user_id>/academic-status")
@admin_required
def admin_update_academic_status(user_id):
    data = AdminAcademicOverrideSchema().load(request.get_json() or {})

    target = UserRepository.by_id(user_id)
    if not target:
        raise ApiError("User not found", "not_found", 404)

    auth_service.admin_override_academic_status(
        g.current_user,
        target,
        data["academic_level"],
        data["academic_status"],
        data.get("reason"),
    )
    return jsonify({"message": "User academic status updated by admin"}), 200


@auth_bp.get("/por-audit")
@admin_required
def por_audit():
    """Report the POR assignments whose `por_type` no permission check matches (D-14).

    The column is free text by decision, and every authorization predicate
    compares it against the POR sets by exact string. A value in neither set is
    therefore invisible to all of them: it grants nothing, silently, and reaches
    an admin as "this organiser lost their access" rather than as an error.
    Listing only those rows is what makes the defect legible — reporting every
    assignment would bury it, and would turn a diagnostic into a bulk export of
    the whole table.
    """
    return jsonify(auth_service.unrecognised_por_assignments()), 200
