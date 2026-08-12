from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required
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


@auth_bp.patch("/me/profile")
@auth_required
def update_profile():
    data = request.get_json() or {}
    city = data.get("city")
    return jsonify(auth_service.update_profile(g.current_user.id, city)), 200
