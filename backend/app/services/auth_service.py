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


def login(email: str, password: str) -> dict:
    user = UserRepository.by_email(email)
    if not user or not check_password_hash(user.password_hash, password):
        raise ApiError("Invalid email or password", "invalid_credentials", 401)
    return {"access_token": _token(user), "user": user.to_dict()}


def update_profile(user_id: str, city: str) -> dict:
    user = UserRepository.by_id(user_id)
    if not user:
        raise ApiError("User not found", "user_not_found", 404)
    
    if city is not None:
        user.city = city.strip()
        db.session.commit()
    return user.to_dict()
