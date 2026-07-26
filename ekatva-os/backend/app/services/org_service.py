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


def assign_por(org_id: str, user_id: str, por_type: str, term: str, admin) -> PORAssignment:
    org = OrgRepository.by_id(org_id)
    if not org:
        raise ApiError("Organisation not found", "org_not_found", 404)
    user = UserRepository.by_id(user_id)
    if not user:
        raise ApiError("Member not found", "user_not_found", 404)

    # A POR is always scoped to a Membership (create one if needed)
    membership = OrgRepository.membership_for(user_id, org_id)
    if not membership:
        membership = Membership(user_id=user_id, org_id=org_id)
        db.session.add(membership)
        db.session.flush()

    por = PORAssignment(membership_id=membership.id, por_type=por_type, term=term, active=True)
    db.session.add(por)
    AuditRepository.record("por", por.id, f"Assigned {por_type} to {user.name}", admin)
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
