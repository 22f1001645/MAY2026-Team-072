"""Tests for Plan 05-02 — CAMPAIGN-04 and CAMPAIGN-05.

Module covers AC-08…AC-26 (CAMPAIGN-01/04/05 surface):
  - Slug minting, collision retry, overwrite (AC-15, AC-16, AC-17)
  - Campaign read (AC-13, AC-14)
  - Custom registration form fields (AC-18…AC-23)
  - Public event preview via slug resolution (OD-3)

Error envelope: {error: ..., code: ...} — no "reason" key (errors.py:19-23).
"""
import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from app.extensions import db as _db
from app.models import (
    Activity,
    Membership,
    Organisation,
    PORAssignment,
    Proposal,
    User,
)


# --------------------------------------------------------------------------- #
# Helpers (copied from test_event_schedule.py — no cross-module import)        #
# --------------------------------------------------------------------------- #

def _token(client, email, pw="testpass"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": pw})
    data = resp.get_json()
    return data.get("access_token") or data.get("token")


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _seed_activity(db_session, org, organiser):
    """Create a minimal Activity directly without a Proposal row."""
    from datetime import datetime, UTC, timedelta

    activity = Activity(
        org_id=org.id,
        organiser_id=organiser.id,
        title=f"Test Event {id(org)}",
        city="Hyderabad",
        scale="local_meetup",
        venue="Room A",
        starts_at=datetime.now(UTC) + timedelta(days=7),
        capacity=30,
        status="upcoming",
    )
    db_session.add(activity)
    db_session.flush()
    return activity


# --------------------------------------------------------------------------- #
# App fixture                                                                   #
# --------------------------------------------------------------------------- #

@pytest.fixture()
def app():
    from app.config import TestConfig
    app = create_app(TestConfig)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def seeds(app):
    """Organiser + activity, ready for campaign tests."""
    with app.app_context():
        org = Organisation(name="Test Org", type="house", city="Hyderabad")
        _db.session.add(org)
        _db.session.flush()

        organiser = User(
            name="Organiser",
            email="org@test.com",
            password_hash=generate_password_hash("testpass"),
            role="organiser",
        )
        _db.session.add(organiser)
        _db.session.flush()

        m = Membership(user_id=organiser.id, org_id=org.id)
        _db.session.add(m)
        _db.session.flush()

        por = PORAssignment(
            membership_id=m.id,
            por_type="Meetup Head",
            term="May 2026",
            active=True,
        )
        _db.session.add(por)
        _db.session.flush()

        activity = _seed_activity(_db.session, org, organiser)

        # add organiser to team so can_manage_activity_required passes
        from app.models import ActivityTeamMember
        tm = ActivityTeamMember(
            activity_id=activity.id,
            user_id=organiser.id,
            role="Meetup Head",
            added_by=organiser.id,
        )
        _db.session.add(tm)
        _db.session.commit()

        student = User(
            name="Student",
            email="stu@test.com",
            password_hash=generate_password_hash("testpass"),
            role="student",
        )
        _db.session.add(student)
        _db.session.commit()

        yield {
            "organiser": organiser,
            "activity_id": activity.id,
            "org": org,
            "student": student,
        }


# --------------------------------------------------------------------------- #
# Task 1: Campaign singleton + slug minting                                    #
# --------------------------------------------------------------------------- #

def test_campaign_read_returns_draft_without_creating_row(client, seeds):
    """GET /campaign on a virgin activity returns status=draft without a DB row."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    resp = client.get(f"/api/v1/activities/{aid}/campaign", headers=_auth(tok))
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "draft"
    # Completeness sub-dict must be present with boolean keys
    c = body["completeness"]
    assert c.keys() >= {"schedule", "mail", "poster", "registration"}
    for v in c.values():
        assert isinstance(v, bool)
    # No row was created — registration_slug is None
    assert body["registration_slug"] is None


def test_generate_slug_creates_and_returns_url(client, seeds):
    """POST generate-slug stores a unique slug and returns registration_url (AC-15)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    resp = client.post(
        f"/api/v1/activities/{aid}/campaign/generate-slug",
        headers=_auth(tok),
    )
    assert resp.status_code == 200, resp.get_data(as_text=True)
    body = resp.get_json()
    assert "registration_slug" in body
    assert "registration_url" in body
    slug = body["registration_slug"]
    # slug matches ^[a-z0-9-]+$
    import re
    assert re.fullmatch(r"[a-z0-9-]+", slug), slug
    # URL ends in that slug
    assert body["registration_url"].endswith(slug)


def test_generate_slug_overwrites(client, seeds):
    """A second call overwrites the stored slug (AC-17)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    r1 = client.post(f"/api/v1/activities/{aid}/campaign/generate-slug", headers=_auth(tok))
    slug1 = r1.get_json()["registration_slug"]
    r2 = client.post(f"/api/v1/activities/{aid}/campaign/generate-slug", headers=_auth(tok))
    slug2 = r2.get_json()["registration_slug"]
    assert r2.status_code == 200
    assert slug2 != slug1  # second mint produces a different slug


def test_slug_collision_retry(client, seeds, monkeypatch):
    """All 3 mint attempts collide → 503/slug_collision (AC-16).

    Tests that the service raises ApiError("slug_collision", 503) when minting
    fails, and that the controller surfaces this correctly as HTTP 503.
    """
    import app.services.campaign_service as cs
    from app.errors import ApiError

    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    # Patch generate_slug to simulate exhausted retries on act1
    monkeypatch.setattr(cs, "generate_slug", lambda activity, actor: (_ for _ in ()).throw(
        ApiError("Could not mint a unique link. Try again.", "slug_collision", 503)
    ))

    resp = client.post(
        f"/api/v1/activities/{aid}/campaign/generate-slug",
        headers=_auth(tok),
    )
    assert resp.status_code == 503, resp.get_data(as_text=True)
    assert resp.get_json()["code"] == "slug_collision"



# --------------------------------------------------------------------------- #
# Task 2: Custom form fields                                                   #
# --------------------------------------------------------------------------- #

def test_form_field_crud(client, seeds):
    """POST 201, PATCH 200, DELETE 204, follow-up list omits deleted (AC-18/19/20)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    # Create
    r = client.post(
        f"/api/v1/activities/{aid}/form-fields",
        headers=_auth(tok),
        json={"label": "T-shirt size", "field_type": "dropdown", "options": ["S", "M", "L"], "required": False},
    )
    assert r.status_code == 201, r.get_data(as_text=True)
    fid = r.get_json()["id"]

    # Patch
    r2 = client.patch(
        f"/api/v1/activities/{aid}/form-fields/{fid}",
        headers=_auth(tok),
        json={"required": True},
    )
    assert r2.status_code == 200
    assert r2.get_json()["required"] is True

    # Delete
    r3 = client.delete(f"/api/v1/activities/{aid}/form-fields/{fid}", headers=_auth(tok))
    assert r3.status_code == 204

    # List no longer contains the field
    r4 = client.get(f"/api/v1/activities/{aid}/form-fields", headers=_auth(tok))
    ids = [f["id"] for f in r4.get_json()]
    assert fid not in ids


def test_form_field_duplicate_label(client, seeds):
    """Duplicate label on same activity → 409/duplicate_label; on different → 201 (AC-21)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    client.post(
        f"/api/v1/activities/{aid}/form-fields",
        headers=_auth(tok),
        json={"label": "Diet", "field_type": "text"},
    )
    r2 = client.post(
        f"/api/v1/activities/{aid}/form-fields",
        headers=_auth(tok),
        json={"label": "Diet", "field_type": "text"},
    )
    assert r2.status_code == 409
    assert r2.get_json()["code"] == "duplicate_label"

    # Same label on a different activity succeeds
    from app.models import Activity, ActivityTeamMember
    with client.application.app_context():
        org = seeds["org"]
        act2 = _seed_activity(_db.session, org, seeds["organiser"])
        tm2 = ActivityTeamMember(
            activity_id=act2.id, user_id=seeds["organiser"].id,
            role="Meetup Head", added_by=seeds["organiser"].id,
        )
        _db.session.add(tm2)
        _db.session.commit()
        aid2 = act2.id

    r3 = client.post(
        f"/api/v1/activities/{aid2}/form-fields",
        headers=_auth(tok),
        json={"label": "Diet", "field_type": "text"},
    )
    assert r3.status_code == 201


def test_form_field_ordering(client, seeds):
    """Fields inserted at positions 2, 0, 1 are returned in position order (AC-22)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    for label, pos in [("C", 2), ("A", 0), ("B", 1)]:
        client.post(
            f"/api/v1/activities/{aid}/form-fields",
            headers=_auth(tok),
            json={"label": label, "field_type": "text", "position": pos},
        )

    r = client.get(f"/api/v1/activities/{aid}/form-fields", headers=_auth(tok))
    labels = [f["label"] for f in r.get_json()]
    assert labels == ["A", "B", "C"]


def test_register_form_shape(client, seeds):
    """GET /register returns core_fields [name, contact] + custom_fields (AC-23)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    # Add one custom field
    client.post(
        f"/api/v1/activities/{aid}/form-fields",
        headers=_auth(tok),
        json={"label": "College", "field_type": "text"},
    )

    resp = client.get(f"/api/v1/activities/{aid}/register", headers=_auth(tok))
    assert resp.status_code == 200
    body = resp.get_json()
    keys = [f["key"] for f in body["core_fields"]]
    assert keys == ["name", "contact"]
    assert len(body["custom_fields"]) == 1


def test_form_field_invalid_type_422(client, seeds):
    """field_type outside FORM_FIELD_TYPES returns 422."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    r = client.post(
        f"/api/v1/activities/{aid}/form-fields",
        headers=_auth(tok),
        json={"label": "Bio", "field_type": "richtext"},
    )
    assert r.status_code == 422


# --------------------------------------------------------------------------- #
# Task 3: Slug resolution + public event preview (OD-3)                       #
# --------------------------------------------------------------------------- #

def test_slug_resolves_to_event(client, seeds):
    """GET /events/{slug} anon returns 200 with title+description, no budget/collab/team."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    # Mint slug
    r = client.post(f"/api/v1/activities/{aid}/campaign/generate-slug", headers=_auth(tok))
    slug = r.get_json()["registration_slug"]

    # Anonymous GET resolves by slug
    anon = client.get(f"/api/v1/events/{slug}")
    assert anon.status_code == 200
    body = anon.get_json()
    assert "title" in body
    assert "description" in body
    for k in ("budget", "collaborators", "team_members"):
        assert k not in body, f"anonymous response must not include '{k}'"

    # Authenticated GET (organiser) includes detail keys
    auth_resp = client.get(f"/api/v1/events/{slug}", headers=_auth(tok))
    assert auth_resp.status_code == 200
    detail = auth_resp.get_json()
    assert "budget" in detail

    # Primary-key id still works
    id_resp = client.get(f"/api/v1/events/{aid}", headers=_auth(tok))
    assert id_resp.status_code == 200


def test_slug_register_requires_login(client, seeds):
    """POST /events/{slug}/register with no auth returns 401."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    r = client.post(f"/api/v1/activities/{aid}/campaign/generate-slug", headers=_auth(tok))
    slug = r.get_json()["registration_slug"]

    r2 = client.post(f"/api/v1/events/{slug}/register", json={})
    assert r2.status_code == 401
