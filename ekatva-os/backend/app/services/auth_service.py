from datetime import datetime

from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash, generate_password_hash

from ..constants import ROLE_STUDENT
from ..errors import ApiError
from ..extensions import db
from ..models import ActivityFeeRecord, User
from ..repositories.repos import UserRepository

CURRENT_TERM = "May 2026"


def _token(user: User) -> str:
    # Role travels as a claim; fine-grained checks still resolve PORs (P3)
    return create_access_token(identity=user.id, additional_claims={"role": user.role})


def register(name: str, email: str, password: str, city: str) -> dict:
    if UserRepository.by_email(email):
        raise ApiError("An account with that email already exists", "email_taken", 409)

    # Self-service signups are always Students; organiser access is an
    # Admin-assigned POR (PRD assumption — two login roles).
    user = User(
        name=name,
        email=email.strip(),
        password_hash=generate_password_hash(password),
        role=ROLE_STUDENT,
        city=city,
    )
    UserRepository.add(user)
    db.session.flush()

    # Every enrolled student is treated as having paid the term activity fee
    db.session.add(ActivityFeeRecord(user_id=user.id, term=CURRENT_TERM, paid=True))
    db.session.commit()
    return {"access_token": _token(user), "user": user.to_dict()}


def login(email: str, password: str) -> dict:
    user = UserRepository.by_email(email)
    if not user or not check_password_hash(user.password_hash, password):
        raise ApiError("Invalid email or password", "invalid_credentials", 401)
    return {"access_token": _token(user), "user": user.to_dict()}
