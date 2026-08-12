"""POR-based RBAC — permissions follow PORs, not the login role (PRD P3).

`admin_required` gates governance endpoints. `organiser_required` allows any
user who holds an active organiser POR (or an admin). Denies by default."""
from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from .constants import ORGANISER_PORS, ROLE_ADMIN
from .errors import ApiError
from .models import User


def _load_current_user() -> User:
    verify_jwt_in_request()
    user = User.query.get(get_jwt_identity())
    if not user:
        raise ApiError("Account not found", "unauthorized", 401)
    g.current_user = user
    return user


def is_organiser(user: User) -> bool:
    if user.role == ROLE_ADMIN:
        return True
    for m in user.memberships:
        for p in m.pors:
            if p.active and p.por_type in ORGANISER_PORS:
                return True
    return False


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        _load_current_user()
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _load_current_user()
        if user.role != ROLE_ADMIN:
            raise ApiError("Admin privileges required", "forbidden", 403)
        return fn(*args, **kwargs)

    return wrapper


def organiser_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _load_current_user()
        if not is_organiser(user):
            raise ApiError("An organiser POR is required for this action", "forbidden", 403)
        return fn(*args, **kwargs)

    return wrapper


def can_manage_org(user: User, org) -> bool:
    """True if user has an active organiser POR in the specified organisation."""
    if user.role == ROLE_ADMIN:
        return True
    for m in user.memberships:
        if m.org_id == org.id:
            for p in m.pors:
                if p.active and p.por_type in ORGANISER_PORS:
                    return True
    return False


def can_manage_activity(user: User, activity) -> bool:
    """True if user is admin, or holds a POR for the activity's org/collaborators."""
    if user.role == ROLE_ADMIN:
        return True
    if can_manage_org(user, activity.org):
        return True
    
    if hasattr(activity, "proposal") and getattr(activity, "proposal", None):
        for collab in activity.proposal.collaborators:
            if collab.status == "accepted" and can_manage_org(user, collab.org):
                return True
                
    return False


def can_participate_in_activity(user: User, activity) -> bool:
    """True if user is a confirmed/waitlisted registrant or a team member."""
    if user.role == ROLE_ADMIN:
        return True
        
    for reg in activity.registrations:
        if reg.student_id == user.id and reg.status in ("confirmed", "waitlisted"):
            return True
            
    for tm in activity.team_members:
        if tm.user_id == user.id:
            return True
            
    return False


def is_meetup_head(user: User, activity) -> bool:
    """True if user is specifically designated as Meetup Head in team members."""
    if user.role == ROLE_ADMIN:
        return True
        
    for tm in activity.team_members:
        if tm.user_id == user.id and tm.role == "Meetup Head":
            return True
            
    return False
