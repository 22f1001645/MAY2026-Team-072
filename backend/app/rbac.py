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
