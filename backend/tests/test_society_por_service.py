import pytest
from app.services import org_service, auth_service
from app.models import Organisation, User, PORAssignment
from app.errors import ApiError
from app.extensions import db


@pytest.fixture
def society_setup(app):
    with app.app_context():
        admin = User.query.filter_by(role="admin").first()
        student1 = User.query.filter(User.role == "student", User.email != "admin@ekatva.os").first()
        student2 = User.query.filter(User.role == "student", User.id != student1.id).first()
        
        # Create a test society
        society = Organisation(
            name="Robotics Society Test",
            type="society",
            category="Tech",
            tagline="Innovating autonomous robotics",
        )
        db.session.add(society)
        db.session.commit()

        # Find a test house
        house = Organisation.query.filter_by(type="house").first()
        
        yield {
            "admin": admin,
            "student1": student1,
            "student2": student2,
            "society": society,
            "house": house,
        }


def test_assign_society_secretary_success(app, society_setup):
    with app.app_context():
        data = society_setup
        por = org_service.assign_por(
            org_id=data["society"].id,
            user_id=data["student1"].id,
            por_type="Society Secretary",
            term="May 2026",
            admin=data["admin"],
        )
        assert por.id is not None
        assert por.por_type == "Society Secretary"
        assert por.council_tier == "society_core"
        assert por.active is True
        assert por.membership.org_id == data["society"].id


def test_assign_society_deputy_secretary_success(app, society_setup):
    with app.app_context():
        data = society_setup
        por = org_service.assign_por(
            org_id=data["society"].id,
            user_id=data["student2"].id,
            por_type="Society Deputy Secretary",
            term="May 2026",
            admin=data["admin"],
        )
        assert por.id is not None
        assert por.por_type == "Society Deputy Secretary"
        assert por.council_tier == "society_core"
        assert por.active is True


def test_assign_society_por_to_house_rejected(app, society_setup):
    with app.app_context():
        data = society_setup
        with pytest.raises(ApiError) as exc_info:
            org_service.assign_por(
                org_id=data["house"].id,
                user_id=data["student1"].id,
                por_type="Society Secretary",
                term="May 2026",
                admin=data["admin"],
            )
        assert exc_info.value.status == 400
        assert exc_info.value.code == "invalid_org_type_for_por"


def test_assign_house_por_to_society_rejected(app, society_setup):
    with app.app_context():
        data = society_setup
        with pytest.raises(ApiError) as exc_info:
            org_service.assign_por(
                org_id=data["society"].id,
                user_id=data["student1"].id,
                por_type="House Secretary",
                term="May 2026",
                admin=data["admin"],
            )
        assert exc_info.value.status == 400
        assert exc_info.value.code == "invalid_org_type_for_por"


def test_duplicate_society_secretary_rejected_409(app, society_setup):
    with app.app_context():
        data = society_setup
        # First assignment succeeds
        org_service.assign_por(
            org_id=data["society"].id,
            user_id=data["student1"].id,
            por_type="Society Secretary",
            term="May 2026",
            admin=data["admin"],
        )
        # Second assignment to same society for another student fails with 409
        with pytest.raises(ApiError) as exc_info:
            org_service.assign_por(
                org_id=data["society"].id,
                user_id=data["student2"].id,
                por_type="Society Secretary",
                term="May 2026",
                admin=data["admin"],
            )
        assert exc_info.value.status == 409
        assert exc_info.value.code == "slot_already_filled"


def test_society_secretary_grants_org_management_capability(app, society_setup):
    with app.app_context():
        data = society_setup
        org_service.assign_por(
            org_id=data["society"].id,
            user_id=data["student1"].id,
            por_type="Society Secretary",
            term="May 2026",
            admin=data["admin"],
        )
        user = User.query.get(data["student1"].id)
        caps = auth_service.get_capabilities(user)
        assert data["society"].id in caps["manageable_org_ids"]
