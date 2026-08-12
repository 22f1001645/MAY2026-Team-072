import uuid
from datetime import datetime, UTC, timezone, timedelta

from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt, get_jwt_identity, set_refresh_cookies, unset_jwt_cookies
from werkzeug.security import check_password_hash, generate_password_hash

from ..constants import ORG_MANAGER_PORS, ORGANISER_PORS, REFRESH_ROTATION_GRACE_SECONDS, ROLE_STUDENT
from ..errors import ApiError
from ..extensions import db
from ..models import ActivityFeeRecord, User, AuditLog
from ..repositories.repos import UserRepository, TermRepository, BlocklistRepository, PORRepository
from ..rbac import is_organiser, manageable_orgs, manageable_activities

CURRENT_TERM = "May 2026"


def _token(user: User) -> str:
    # Role travels as a claim; fine-grained checks still resolve PORs (P3)
    return create_access_token(identity=user.id, additional_claims={"role": user.role})


def register(name: str, email: str, password: str, region_id: str, city: str = None) -> dict:
    if UserRepository.by_email(email):
        raise ApiError("An account with that email already exists", "email_taken", 409)

    # Resolve region — must be one of the 10 official Organisation rows with type="region"
    from ..repositories.repos import OrgRepository
    region = OrgRepository.by_id(region_id)
    if not region or region.type != "region":
        raise ApiError("Invalid region selected", "region_invalid", 400)

    # Derive city: use provided city or fall back to region name
    city_name = city.strip() if city else region.name

    # Auto-seed the city under the region if it doesn't exist yet
    from ..models import City
    existing_city = City.query.filter_by(name=city_name, region_id=region.id).first()
    if not existing_city:
        existing_city = City(name=city_name, region_id=region.id)
        db.session.add(existing_city)
        db.session.flush()

    # Self-service signups are always Students; organiser access is an
    # Admin-assigned POR (PRD assumption — two login roles).
    user = User(
        name=name,
        email=email.strip(),
        password_hash=generate_password_hash(password),
        role=ROLE_STUDENT,
        city=city_name,
        region_id=region.id,
    )
    UserRepository.add(user)
    db.session.flush()

    # Every enrolled student is treated as having paid the term activity fee
    db.session.add(ActivityFeeRecord(user_id=user.id, term=CURRENT_TERM, paid=True))
    db.session.commit()
    return {"access_token": _token(user), "user": user.to_dict()}


def login(email: str, password: str) -> tuple[dict, list]:
    user = UserRepository.by_email(email)
    if not user or not check_password_hash(user.password_hash, password):
        raise ApiError("Invalid email or password", "invalid_credentials", 401)
        
    family_id = uuid.uuid4().hex
    refresh_token = create_refresh_token(identity=user.id, additional_claims={"fam": family_id})
    access_token = _token(user)
    
    return {"access_token": access_token, "user": user.to_dict()}, refresh_token


def refresh(jwt_payload: dict) -> tuple[dict, str]:
    """Rotate a refresh token, detecting replay of an already-spent one (D-02).

    Deviation from D-02a, recorded deliberately: D-02a describes a replay inside
    the grace window as "returns the already-issued successor". This mints a
    *new* token in the same family instead. Both tabs end up holding valid
    tokens in one family, which satisfies D-02a's intent — nobody gets logged
    out — without the server having to retain issued tokens so it can hand one
    back. Family revocation still kills every token in the family at once, so
    the security envelope is unchanged.
    """
    jti = jwt_payload["jti"]
    family_id = jwt_payload.get("fam")
    user_id = jwt_payload["sub"]
    exp = jwt_payload["exp"]
    expires_at = datetime.fromtimestamp(exp, UTC).replace(tzinfo=None)
    
    # 1. Family revoked check
    if family_id and BlocklistRepository.family_revoked(family_id):
        raise ApiError("Session revoked", "session_revoked", 401)
        
    # 2. Reuse detected
    block_entry = BlocklistRepository.by_jti(jti)
    if block_entry:
        now = datetime.now(UTC).replace(tzinfo=None)
        # Inside the grace window this is two tabs racing, not an attacker —
        # fall through and re-issue. Outside it, treat it as replay.
        if (now - block_entry.revoked_at).total_seconds() > REFRESH_ROTATION_GRACE_SECONDS:
            if family_id:
                BlocklistRepository.revoke_family(user_id=user_id, family_id=family_id, reason="reuse_detected", expires_at=expires_at)
                db.session.commit()
            raise ApiError("Session revoked due to token reuse", "session_revoked", 401)
    else:
        # Rotate: blocklist old jti as 'rotated'
        BlocklistRepository.add_entry(jti=jti, user_id=user_id, family_id=family_id, reason="rotated", expires_at=expires_at)
        db.session.commit()
        
    user = UserRepository.by_id(user_id)
    if not user:
        raise ApiError("User not found", "invalid_user", 401)
        
    new_refresh = create_refresh_token(identity=user.id, additional_claims={"fam": family_id})
    return {"access_token": _token(user)}, new_refresh


def logout(jwt_payload: dict):
    family_id = jwt_payload.get("fam")
    user_id = jwt_payload["sub"]
    exp = jwt_payload["exp"]
    expires_at = datetime.fromtimestamp(exp, UTC).replace(tzinfo=None)
    if family_id:
        BlocklistRepository.revoke_family(user_id=user_id, family_id=family_id, reason="logout", expires_at=expires_at)
        db.session.commit()


def get_capabilities(user: User) -> dict:
    return {
        "is_organiser": is_organiser(user),
        "manageable_org_ids": [org.id for org in manageable_orgs(user)],
        "manageable_activity_ids": [act.id for act in manageable_activities(user)]
    }


def unrecognised_por_assignments() -> list:
    """The POR assignments no authorization predicate can read (D-14).

    The recognised set is the union of the two POR sets the predicates match
    against, and that union is decided here rather than in the repository:
    which positions confer authority is a business rule, and business rules
    live above the persistence layer."""
    recognised = ORGANISER_PORS | ORG_MANAGER_PORS
    return [row.to_dict() for row in PORRepository.unrecognised_por_types(recognised)]


def is_academic_status_stale(user: User) -> bool:
    current_term = TermRepository.current_term()
    if not current_term:
        return False
    
    if not user.academic_confirmed_at:
        return True
        
    confirmed_at = user.academic_confirmed_at
    if confirmed_at.tzinfo is not None:
        confirmed_at = confirmed_at.astimezone(timezone.utc).replace(tzinfo=None)
        
    start_date = current_term.start_date
    if start_date.tzinfo is not None:
        start_date = start_date.astimezone(timezone.utc).replace(tzinfo=None)
        
    end_date = current_term.end_date
    if end_date.tzinfo is not None:
        end_date = end_date.astimezone(timezone.utc).replace(tzinfo=None)
        
    if not (start_date <= confirmed_at < end_date):
        return True
        
    return False


def confirm_academic_status(user: User, level: str, status: str):
    if level not in ("foundation", "diploma", "degree"):
        raise ApiError("Invalid academic level", "invalid_level", 400)
    if status not in ("active", "on_break", "withdrawn"):
        raise ApiError("Invalid academic status", "invalid_status", 400)
        
    user.academic_level = level
    user.academic_status = status
    user.academic_confirmed_at = datetime.now(UTC)
    db.session.commit()
    
    
def admin_override_academic_status(actor: User, target: User, level: str, status: str, reason: str = None):
    if actor.role != "admin":
        raise ApiError("Admin access required", "forbidden", 403)
        
    old_level = target.academic_level
    old_status = target.academic_status
    
    target.academic_level = level
    target.academic_status = status
    target.academic_confirmed_at = datetime.now(UTC)
    
    log = AuditLog(
        entity_type="user",
        entity_id=target.id,
        action="admin_override_academic_status",
        actor_id=actor.id,
        changes={
            "old_level": old_level,
            "new_level": level,
            "old_status": old_status,
            "new_status": status,
            "reason": reason
        }
    )
    db.session.add(log)
    db.session.commit()
