import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import (
    Activity,
    ActivityFeeRecord,
    BudgetLine,
    City,
    Membership,
    Organisation,
    PORAssignment,
    Proposal,
    User,
)


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        _seed_minimal()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def _seed_minimal():
    db.session.add(City(name="Hyderabad"))
    org = Organisation(name="Hyderabad Regional Chapter", type="region", city="Hyderabad")
    db.session.add(org)

    admin = User(name="Admin", email="admin@ekatva.os",
                 password_hash=generate_password_hash("admin123"), role="admin", city="Chennai")
    rc = User(name="Sai Teja", email="rc@ekatva.os",
              password_hash=generate_password_hash("rc12345"), role="student", city="Hyderabad")
    student = User(name="Arav", email="arav@ekatva.os",
                   password_hash=generate_password_hash("student123"), role="student", city="Hyderabad")
    db.session.add_all([admin, rc, student])
    db.session.flush()

    db.session.add(ActivityFeeRecord(user_id=student.id, term="May 2026", paid=True))

    # Give rc an organiser POR
    m = Membership(user_id=rc.id, org_id=org.id)
    db.session.add(m)
    db.session.flush()
    db.session.add(PORAssignment(membership_id=m.id, por_type="Regional Coordinator",
                                 term="May 2026", active=True))
    db.session.commit()


def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


@pytest.fixture
def admin_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'admin@ekatva.os', 'admin123')}"}


@pytest.fixture
def rc_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'rc@ekatva.os', 'rc12345')}"}


@pytest.fixture
def student_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'arav@ekatva.os', 'student123')}"}


def org_id():
    return Organisation.query.first().id
