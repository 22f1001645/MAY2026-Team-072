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
@admin_required
def list_users():
    """Returns list of student users for admin role assignment, supporting search by email or name."""
    from ..models import User
    from ..extensions import db
    
    q = request.args.get("q") or request.args.get("email")
    academic_level = request.args.get("academic_level")
    academic_status = request.args.get("academic_status")
    city = request.args.get("city")
    
    query = User.query.filter(User.role == "student")
    
    if q:
        search = f"%{q.strip().lower()}%"
        query = query.filter((db.func.lower(User.email).like(search)) | (db.func.lower(User.name).like(search)))
        
    if academic_level:
        query = query.filter(User.academic_level == academic_level)
    if academic_status:
        query = query.filter(User.academic_status == academic_status)
    if city:
        query = query.filter(User.city == city)
        
    users = query.all()
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
    """FR-A2 — List POR assignments with pagination and filtering.
    Query params: page (int), limit (int), active (bool), org_type (str)
    """
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 50)), 200)  # cap at 200
    active_filter = request.args.get("active")
    org_type_filter = request.args.get("org_type")

    all_pors = org_service.list_pors()

    # Apply optional filters
    if active_filter is not None:
        active_bool = active_filter.lower() == "true"
        all_pors = [p for p in all_pors if p.active == active_bool]
    if org_type_filter:
        all_pors = [p for p in all_pors
                    if p.membership and p.membership.org
                    and p.membership.org.type == org_type_filter]

    total = len(all_pors)
    start = (page - 1) * limit
    end = start + limit
    page_items = all_pors[start:end]

    return jsonify({
        "items": [p.to_dict() for p in page_items],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit else 1,
    }), 200


@community_bp.patch("/pors/<por_id>/deactivate")
@admin_required
def deactivate_por(por_id):
    """FR-A5 — Deactivate a POR assignment during term handover."""
    por = org_service.deactivate_por(por_id, g.current_user)
    return jsonify(por.to_dict()), 200


@community_bp.route("/orgs/<org_id>/progression", methods=["GET"])
@auth_required
def get_org_progression(org_id):
    from ..repositories.repos import ActivityRepository
    from ..services import config_service
    city = request.args.get("city", "")
    local_count = ActivityRepository.count_completed_by_scale(org_id, city, "local_meetup")
    regional_count = ActivityRepository.count_completed_by_scale(org_id, city, "regional_meetup")
    fest_eligible = local_count >= 1 and regional_count >= 1
    fest_unlocked = config_service.get_flag(f"fest_unlocked:{org_id}:{city}", False)
    missing = []
    if local_count < 1: missing.append("local_meetup")
    if regional_count < 1: missing.append("regional_meetup")
    return jsonify({
        "org_id": org_id,
        "city": city,
        "local_meetup_count": local_count,
        "regional_meetup_count": regional_count,
        "fest_eligible": fest_eligible,
        "fest_unlocked": fest_unlocked,
        "missing": missing,
    }), 200
