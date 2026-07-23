from flask import Blueprint, g, jsonify, request

from ..rbac import admin_required, auth_required
from ..repositories.repos import OrgRepository
from ..schemas import OrgSchema, PORSchema
from ..services import org_service

community_bp = Blueprint("community", __name__, url_prefix="/api/v1")


@community_bp.get("/cities")
@auth_required
def cities():
    return jsonify([c.to_dict() for c in OrgRepository.cities()]), 200


@community_bp.get("/orgs")
@auth_required
def orgs():
    return jsonify([o.to_dict() for o in OrgRepository.all()]), 200


@community_bp.post("/orgs")
@admin_required
def create_org():
    data = OrgSchema().load(request.get_json() or {})
    return jsonify(org_service.create_org(data, g.current_user).to_dict()), 201


@community_bp.post("/orgs/<org_id>/pors")
@admin_required
def assign_por(org_id):
    data = PORSchema().load(request.get_json() or {})
    por = org_service.assign_por(
        org_id, data["user_id"], data["por_type"], data["term"], g.current_user
    )
    return jsonify(por.to_dict()), 201


@community_bp.get("/pors")
@admin_required
def list_pors():
    return jsonify([p.to_dict() for p in org_service.list_pors()]), 200
