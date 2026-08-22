from ..constants import HOUSE_POR_TYPES, SOCIETY_POR_TYPES
from ..errors import ApiError
from ..extensions import db
from ..models import Membership, Organisation, OrganisationSocialLink, PORAssignment
from ..repositories.repos import AuditRepository, OrgRepository, UserRepository
from ..url_safety import check_social_url, check_website_url


def create_org(data: dict, admin) -> Organisation:
    name = (data.get("name") or "").strip()
    if not name:
        raise ApiError("Organisation name is required.", "name_required", 400)

    # Enforce unique organisation / society name
    existing = Organisation.query.filter(db.func.lower(Organisation.name) == name.lower()).first()
    if existing:
        raise ApiError(f"An organisation or society named '{name}' already exists.", "name_taken", 409)

    org_type = data.get("type", "society")
    city = data.get("city") or "Online"
    category = data.get("category")
    tagline = data.get("tagline")
    bio = data.get("description") or data.get("bio")
    logo_url = data.get("logo_url")
    banner_url = data.get("banner_url")

    website = None
    if data.get("website") and str(data.get("website")).strip():
        val, err = check_website_url(str(data.get("website")).strip())
        if err:
            raise ApiError("Invalid website URL.", err, 400, {"field": "website"})
        website = val

    org = Organisation(
        name=name,
        type=org_type,
        city=city,
        category=category,
        tagline=tagline,
        bio=bio,
        logo_url=logo_url,
        banner_url=banner_url,
        website=website,
    )
    db.session.add(org)
    db.session.flush()

    for platform in ["instagram", "linkedin", "x", "youtube", "facebook", "github"]:
        val = data.get(platform)
        if val and str(val).strip():
            url, err = check_social_url(str(val).strip(), platform)
            if err:
                raise ApiError(f"Invalid {platform} URL.", err, 400, {"platform": platform})
            db.session.add(OrganisationSocialLink(org_id=org.id, platform=platform, url=url))

    AuditRepository.record("organisation", org.id, f"Created {org_type}: {org.name}", admin, org.name)
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

    # Guardrail 0a: Entity-scoped POR types must only be assigned to matching org types
    house_only_por_types = set(HOUSE_POR_TYPES)
    society_only_por_types = set(SOCIETY_POR_TYPES)

    if por_type in house_only_por_types and org.type != "house":
        raise ApiError(
            f"'{por_type}' can only be assigned to a Forest House, not a {org.type}.",
            "invalid_org_type_for_por",
            400,
        )
    if por_type in society_only_por_types and org.type != "society":
        raise ApiError(
            f"'{por_type}' can only be assigned to a Society, not a {org.type}.",
            "invalid_org_type_for_por",
            400,
        )

    # Guardrail 0b: Regional Coordinator requires a region selection
    if por_type == "Regional Coordinator" and not region_id:
        raise ApiError("Region selection is required for Regional Coordinator assignment", "region_required", 400)

    # Auto-determine council tier from position type
    upper_positions = {"House Secretary", "Deputy House Secretary"}
    lower_positions = {"Regional Coordinator"}
    society_leadership = {"Society Secretary", "Society Deputy Secretary"}
    if por_type in upper_positions:
        council_tier = "upper_house_council"
    elif por_type in lower_positions:
        council_tier = "lower_house_council"
    elif por_type in society_leadership:
        council_tier = "society_core"
    else:
        council_tier = None

    # Guardrail 1: Single-seat positions uniqueness per Org (House or Society)
    single_seat_positions = upper_positions | society_leadership
    if por_type in single_seat_positions:
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

    # Guardrail 3: A student cannot hold the same PoR type more than once at a
    # time across any org.
    existing_for_user = (
        PORAssignment.query.join(Membership)
        .filter(
            Membership.user_id == user_id,
            PORAssignment.por_type == por_type,
            PORAssignment.active == True,
        )
        .first()
    )
    if existing_for_user:
        raise ApiError(
            f"{user.name} already holds an active '{por_type}' assignment. "
            "Deactivate the existing one before assigning a new one.",
            "user_already_has_por",
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
