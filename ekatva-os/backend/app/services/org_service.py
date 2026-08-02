from ..errors import ApiError
from ..extensions import db
from ..models import Membership, Organisation, PORAssignment
from ..repositories.repos import AuditRepository, OrgRepository, UserRepository


def create_org(data: dict, admin) -> Organisation:
    org = Organisation(name=data["name"], type=data["type"], city=data["city"])
    db.session.add(org)
    AuditRepository.record("organisation", org.id, "Seeded organisation", admin, org.name)
    db.session.commit()
    return org


def assign_por(org_id: str, user_id: str, por_type: str, term: str, admin, region_id: str = None) -> PORAssignment:
    org = OrgRepository.by_id(org_id)
    if not org:
        raise ApiError("Organisation not found", "org_not_found", 404)
    user = UserRepository.by_id(user_id)
    if not user and "@" in user_id:
        user = UserRepository.by_email(user_id)
    if not user:
        raise ApiError("Member not found by ID or email", "user_not_found", 404)
    user_id = user.id

    # Guardrail 0: House-scoped POR types must only be assigned to House orgs
    HOUSE_ONLY_POR_TYPES = {"House Secretary", "Deputy House Secretary", "Regional Coordinator", "Web Admin"}
    if por_type in HOUSE_ONLY_POR_TYPES and org.type != "house":
        raise ApiError(
            f"'{por_type}' can only be assigned to a Forest House, not a {org.type}.",
            "invalid_org_type_for_por",
            400,
        )

    # Auto-determine council tier from position type
    upper_positions = {"House Secretary", "Deputy House Secretary"}
    lower_positions = {"Regional Coordinator"}
    if por_type in upper_positions:
        council_tier = "upper_house_council"
    elif por_type in lower_positions:
        council_tier = "lower_house_council"
    else:
        council_tier = None

    # Guardrail 1: House Secretary / Deputy House Secretary uniqueness per House
    if por_type in upper_positions:
        existing = (
            PORAssignment.query.join(Membership)
            .filter(
                Membership.org_id == org_id,
                PORAssignment.por_type == por_type,
                PORAssignment.active == True,
            )
            .first()
        )
        if existing:
            raise ApiError(
                f"{por_type} is already assigned for {org.name}",
                "slot_already_filled",
                409,
            )

    # Guardrail 2: Regional Coordinator uniqueness per House + Region pair
    if por_type == "Regional Coordinator":
        if not region_id:
            raise ApiError("Region selection is required for Regional Coordinator assignment", "region_required", 400)
        existing = (
            PORAssignment.query.join(Membership)
            .filter(
                Membership.org_id == org_id,
                PORAssignment.region_id == region_id,
                PORAssignment.por_type == "Regional Coordinator",
                PORAssignment.active == True,
            )
            .first()
        )
        if existing:
            region_org = OrgRepository.by_id(region_id)
            region_name = region_org.name if region_org else "selected region"
            raise ApiError(
                f"Regional Coordinator is already assigned for {org.name} in {region_name}",
                "rc_slot_already_filled",
                409,
            )

    # A POR is always scoped to a Membership (create one if needed)
    membership = OrgRepository.membership_for(user_id, org_id)
    if not membership:
        membership = Membership(user_id=user_id, org_id=org_id)
        db.session.add(membership)
        db.session.flush()

    por = PORAssignment(
        membership_id=membership.id,
        por_type=por_type,
        term=term,
        active=True,
        region_id=region_id,
        council_tier=council_tier,
    )
    db.session.add(por)
    council_label = f" [{council_tier}]" if council_tier else ""
    AuditRepository.record("por", por.id, f"Assigned {por_type}{council_label} to {user.name}", admin)
    db.session.commit()
    return por


def list_pors():
    return OrgRepository.por_assignments()


def deactivate_por(por_id: str, admin) -> PORAssignment:
    """FR-A5 — Deactivate a POR assignment during leadership handover."""
    por = PORAssignment.query.get(por_id)
    if not por:
        raise ApiError("POR assignment not found", "por_not_found", 404)
    por.active = False
    AuditRepository.record("por", por.id, f"Deactivated POR {por.por_type}", admin)
    db.session.commit()
    return por
