from datetime import datetime, timedelta

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
    Term,
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
        db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


def _seed_minimal():
    org = Organisation(name="Hyderabad Regional Chapter", type="region", city="Hyderabad")
    house = Organisation(name="Nilgiri House", type="house", city="Pan-India")
    db.session.add_all([org, house])
    db.session.flush()

    # "Org B" for the cross-org authorization tests (01-05). Appended after the
    # two originals so Organisation.query.first() still returns the region org,
    # which several existing tests rely on. Deliberately a different type, name
    # and city from both, so a cross-org denial can only be about id identity.
    society = Organisation(name="Shutterbugs Society", type="society", city="Bengaluru")
    db.session.add(society)
    db.session.flush()

    # City scoped to the Hyderabad region
    db.session.add(City(name="Hyderabad", region_id=org.id))

    admin = User(name="Admin", email="admin@ekatva.os",
                 password_hash=generate_password_hash("admin123"), role="admin", city="Chennai")
    rc = User(name="Sai Teja", email="rc@ekatva.os",
              password_hash=generate_password_hash("rc12345"), role="student",
              city="Hyderabad", region_id=org.id)
    student = User(name="Arav", email="arav@ekatva.os",
                   password_hash=generate_password_hash("student123"), role="student",
                   city="Hyderabad", region_id=org.id)
    db.session.add_all([admin, rc, student])
    db.session.flush()

    # Two users holding NO POR at all (01-05). Their only route to authority is
    # an ActivityTeamMember row, which is what makes them the right subjects for
    # testing that team membership is Activity-scoped and nothing more (TEAM-03).
    # region_id is left unset so they never shift a regional analytics count.
    crew = User(name="Divya", email="crew@ekatva.os",
                password_hash=generate_password_hash("crew12345"), role="student",
                city="Hyderabad")
    head = User(name="Nikhil", email="head@ekatva.os",
                password_hash=generate_password_hash("head12345"), role="student",
                city="Hyderabad")
    db.session.add_all([crew, head])
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


@pytest.fixture
def crew_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'crew@ekatva.os', 'crew12345')}"}


@pytest.fixture
def meetup_head_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'head@ekatva.os', 'head12345')}"}


@pytest.fixture
def second_org(app):
    """The society organisation — "org B" in the cross-org authorization tests."""
    return other_org()


def org_id():
    return Organisation.query.first().id


# --- Lookup helpers for the seeded rows (01-05) -----------------------------
# Fetch by email or type rather than by insertion position, so a later addition
# to _seed_minimal cannot silently repoint one of these at a different row.


def admin_user():
    return User.query.filter_by(email="admin@ekatva.os").first()


def rc_user():
    return User.query.filter_by(email="rc@ekatva.os").first()


def student_user():
    return User.query.filter_by(email="arav@ekatva.os").first()


def crew_user():
    return User.query.filter_by(email="crew@ekatva.os").first()


def meetup_head_user():
    return User.query.filter_by(email="head@ekatva.os").first()


def region_org():
    return Organisation.query.filter_by(type="region").first()


def other_org():
    return Organisation.query.filter_by(type="society").first()


# --- Cookie-aware session fixtures (02-01) ----------------------------------
# The refresh flow is cookie-borne, so the header-only fixtures above cannot
# drive it. Flask's test_client() already persists cookies across calls within
# one instance; this wrapper adds the two things every session test needs — the
# current csrf_refresh_token value and a one-line login — so that no test has to
# hand-roll cookie parsing.


class CookieClient:
    """A cookie-retaining test client with CSRF and login helpers.

    One instance is one browser: separate instances have separate cookie jars,
    which is what makes them two devices for the D-04 logout-scope test."""

    REFRESH_COOKIE = "refresh_token_cookie"
    CSRF_COOKIE = "csrf_refresh_token"

    def __init__(self, client):
        self.client = client

    def __getattr__(self, name):
        # Anything not defined here falls through to the real test client.
        return getattr(self.client, name)

    def cookie(self, name):
        """Current value of a cookie in this client's jar, or None."""
        found = self.client.get_cookie(name)
        return found.value if found else None

    @property
    def csrf_token(self):
        return self.cookie(self.CSRF_COOKIE)

    @property
    def refresh_cookie(self):
        return self.cookie(self.REFRESH_COOKIE)

    def csrf_headers(self, extra=None):
        headers = {"X-CSRF-TOKEN": self.csrf_token or ""}
        if extra:
            headers.update(extra)
        return headers

    def login_as(self, email, password):
        return self.client.post(
            "/api/v1/auth/login", json={"email": email, "password": password}
        )

    def post_refresh(self, extra_headers=None):
        return self.client.post(
            "/api/v1/auth/refresh", headers=self.csrf_headers(extra_headers)
        )

    def post_logout(self, extra_headers=None):
        return self.client.post(
            "/api/v1/auth/logout", headers=self.csrf_headers(extra_headers)
        )


@pytest.fixture
def cookie_client(app):
    return CookieClient(app.test_client())


@pytest.fixture
def current_term(app):
    """One current Term row whose window contains now.

    _seed_minimal creates no terms, and auth_service.is_academic_status_stale
    returns False when no current term exists — so every staleness assertion
    needs this row to be meaningful at all."""
    now = datetime.now()
    term = Term(
        name="May 2026",
        start_date=now - timedelta(days=30),
        end_date=now + timedelta(days=120),
        is_current=True,
    )
    db.session.add(term)
    db.session.commit()
    return term
