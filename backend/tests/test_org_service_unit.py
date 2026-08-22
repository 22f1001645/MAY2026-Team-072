import pytest
from app.services import org_service
from app.models import Organisation, User, PORAssignment
from app.errors import ApiError
from app.extensions import db


def test_create_org(app):
    admin = User.query.filter_by(role="admin").first()
    data = {"name": "Test Org", "type": "society", "city": "Test City"}
    org = org_service.create_org(data, admin)
    
    assert org.id is not None
    assert org.name == "Test Org"
    assert org.type == "society"
    assert org.city == "Test City"


def test_create_society_with_all_fields(app):
    admin = User.query.filter_by(role="admin").first()
    data = {
        "name": "Rhythm Dance Society",
        "type": "society",
        "category": "Dance",
        "tagline": "Expressing through movement",
        "description": "A vibrant society for classical and modern dance enthusiasts.",
        "logo_url": "/api/v1/uploads/logo123.png",
        "banner_url": "/api/v1/uploads/banner123.png",
    }
    org = org_service.create_org(data, admin)
    assert org.id is not None
    assert org.name == "Rhythm Dance Society"
    assert org.category == "Dance"
    assert org.tagline == "Expressing through movement"
    assert org.bio == "A vibrant society for classical and modern dance enthusiasts."
    assert org.logo_url == "/api/v1/uploads/logo123.png"
    assert org.banner_url == "/api/v1/uploads/banner123.png"

    d = org.to_dict()
    assert d["category"] == "Dance"
    assert d["tagline"] == "Expressing through movement"
    assert d["description"] == "A vibrant society for classical and modern dance enthusiasts."
    assert d["banner_url"] == "/api/v1/uploads/banner123.png"


def test_create_society_duplicate_name_rejected(app):
    admin = User.query.filter_by(role="admin").first()
    data = {"name": "Unique Tech Society", "type": "society", "category": "Tech"}
    org_service.create_org(data, admin)

    with pytest.raises(ApiError) as exc:
        org_service.create_org({"name": "unique tech society", "type": "society"}, admin)
    assert exc.value.code == "name_taken"
    assert exc.value.status == 409


def test_create_society_empty_name_rejected(app):
    admin = User.query.filter_by(role="admin").first()
    with pytest.raises(ApiError) as exc:
        org_service.create_org({"name": "   ", "type": "society"}, admin)
    assert exc.value.code == "name_required"
    assert exc.value.status == 400


def test_assign_por_success(app):
    admin = User.query.filter_by(role="admin").first()
    house = Organisation.query.filter_by(type="house").first()
    student = User.query.filter_by(role="student").first()
    
    por = org_service.assign_por(
        org_id=house.id,
        user_id=student.id,
        por_type="House Secretary",
        term="May 2026",
        admin=admin
    )
    
    assert por.id is not None
    assert por.por_type == "House Secretary"
    assert por.term == "May 2026"
    assert por.active is True
    assert por.council_tier == "upper_house_council"


def test_assign_por_invalid_org_or_user(app):
    admin = User.query.filter_by(role="admin").first()
    house = Organisation.query.filter_by(type="house").first()
    student = User.query.filter_by(role="student").first()

    with pytest.raises(ApiError) as exc:
        org_service.assign_por("invalid_org_id", student.id, "House Secretary", "May 2026", admin)
    assert exc.value.code == "org_not_found"

    with pytest.raises(ApiError) as exc:
        org_service.assign_por(house.id, "invalid_user_id", "House Secretary", "May 2026", admin)
    assert exc.value.code == "user_not_found"


def test_assign_por_invalid_org_type(app):
    admin = User.query.filter_by(role="admin").first()
    society = Organisation(name="Coding Club", type="society", city="Chennai")
    db.session.add(society)
    db.session.commit()
    student = User.query.filter_by(role="student").first()

    with pytest.raises(ApiError) as exc:
        org_service.assign_por(
            org_id=society.id,
            user_id=student.id,
            por_type="House Secretary",
            term="May 2026",
            admin=admin
        )
    assert exc.value.code == "invalid_org_type_for_por"


def test_assign_por_rc_missing_region(app):
    admin = User.query.filter_by(role="admin").first()
    house = Organisation.query.filter_by(type="house").first()
    student = User.query.filter_by(role="student").first()

    with pytest.raises(ApiError) as exc:
        org_service.assign_por(
            org_id=house.id,
            user_id=student.id,
            por_type="Regional Coordinator",
            term="May 2026",
            admin=admin,
            region_id=None
        )
    assert exc.value.code == "region_required"


def test_list_pors(app):
    pors = org_service.list_pors()
    assert isinstance(pors, list)
    assert len(pors) > 0


def test_deactivate_por_success(app):
    admin = User.query.filter_by(role="admin").first()
    house = Organisation.query.filter_by(type="house").first()
    student = User.query.filter_by(role="student").first()
    
    por = org_service.assign_por(
        org_id=house.id,
        user_id=student.id,
        por_type="Web Admin",
        term="May 2026",
        admin=admin
    )
    assert por.active is True
    
    deactivated = org_service.deactivate_por(por.id, admin)
    assert deactivated.active is False


def test_deactivate_por_invalid(app):
    admin = User.query.filter_by(role="admin").first()
    with pytest.raises(ApiError) as exc:
        org_service.deactivate_por("invalid_por_id", admin)
    assert exc.value.code == "por_not_found"
