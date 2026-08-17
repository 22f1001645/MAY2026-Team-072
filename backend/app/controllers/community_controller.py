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


@community_bp.get("/users")
@auth_required
def list_users():
    """Returns list of student users for admin role assignment, supporting search by email or name."""
    from ..repositories.repos import UserRepository
    q = request.args.get("q") or request.args.get("email")
    if q:
        users = UserRepository.search(q)
    else:
        users = UserRepository.students()
    return jsonify([u.to_dict() for u in users]), 200


@community_bp.get("/houses")
@auth_required
def houses():
    """Returns all 12 Forest Houses."""
    all_orgs = OrgRepository.all()
    return jsonify([o.to_dict() for o in all_orgs if o.type == "house"]), 200


@community_bp.get("/regions")
def regions():
    """Returns all 10 Geographic Regions. Public — needed by the signup form
    before a user has an account."""
    all_orgs = OrgRepository.all()
    return jsonify([o.to_dict() for o in all_orgs if o.type == "region"]), 200


@community_bp.get("/regions/<region_id>/cities")
def cities_for_region(region_id):
    """Returns all cities belonging to a specific Region. Public — needed by
    the signup form before a user has an account."""
    cities = OrgRepository.cities_for_region(region_id)
    return jsonify([c.to_dict() for c in cities]), 200


@community_bp.post("/regions/<region_id>/cities")
@admin_required
def add_city_to_region(region_id):
    """Admin adds a new city under a specific Region."""
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "City name is required", "code": "name_required"}), 400
    city = OrgRepository.add_city_to_region(name, region_id)
    return jsonify(city.to_dict()), 201


@community_bp.get("/councils/upper-house")
@admin_required
def upper_house_council():
    """Returns all active Upper House Council members (Secretaries & Deputy Secretaries)."""
    pors = [p for p in OrgRepository.por_assignments() if p.council_tier == "upper_house_council" and p.active]
    return jsonify([p.to_dict() for p in pors]), 200


@community_bp.get("/councils/lower-house")
@admin_required
def lower_house_council():
    """Returns all active Lower House Council members (Regional Coordinators)."""
    pors = [p for p in OrgRepository.por_assignments() if p.council_tier == "lower_house_council" and p.active]
    return jsonify([p.to_dict() for p in pors]), 200


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
        org_id, data["user_id"], data["por_type"], data["term"], g.current_user,
        region_id=data.get("region_id"),
    )
    return jsonify(por.to_dict()), 201


@community_bp.get("/pors")
@admin_required
def list_pors():
    return jsonify([p.to_dict() for p in org_service.list_pors()]), 200


@community_bp.patch("/pors/<por_id>/deactivate")
@admin_required
def deactivate_por(por_id):
    """FR-A5 — Deactivate a POR assignment during term handover."""
    por = org_service.deactivate_por(por_id, g.current_user)
    return jsonify(por.to_dict()), 200
