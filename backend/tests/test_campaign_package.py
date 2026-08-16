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


def _add_schedule_item(activity_id, title="Arrival & icebreaker"):
    """Give an activity one schedule item so push-live's unlock check passes."""
    from app.models import EventScheduleItem

    item = EventScheduleItem(activity_id=activity_id, position=0, title=title)
    _db.session.add(item)
    _db.session.commit()
    return item


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

        # A crew member on the SAME activity who is NOT the Meetup Head. This is
        # AC-25's subject: can_manage_activity says yes (there is a team row), so
        # every campaign route except push-live is open to them. Only
        # is_meetup_head separates them from the organiser above.
        crew = User(
            name="Crew",
            email="crew@test.com",
            password_hash=generate_password_hash("testpass"),
            role="student",
        )
        # An admin who is deliberately NOT on the team. can_manage_activity has an
        # admin short-circuit; is_meetup_head has none, and this user proves it.
        admin = User(
            name="Admin",
            email="admin@test.com",
            password_hash=generate_password_hash("testpass"),
            role="admin",
        )
        _db.session.add_all([crew, admin])
        _db.session.flush()

        _db.session.add(
            ActivityTeamMember(
                activity_id=activity.id,
                user_id=crew.id,
                role="Designer",
                added_by=organiser.id,
            )
        )
        _db.session.commit()

        yield {
            "organiser": organiser,
            "organiser_id": organiser.id,
            "activity_id": activity.id,
            "org": org,
            "student": student,
            "crew": crew,
            "admin": admin,
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


def test_campaign_read_carries_the_allowed_form_field_types(client, seeds):
    """The campaign payload names the allowed custom-field types.

    The campaign builder's type picker is populated from this key. Without it
    the browser would need its own copy of FORM_FIELD_TYPES, which is the kind
    of second list that drifts away from the schema's 422 and is exactly what
    the frontend's no-por-literals gate exists to prevent.
    """
    from app.constants import FORM_FIELD_TYPES

    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    resp = client.get(f"/api/v1/activities/{aid}/campaign", headers=_auth(tok))
    assert resp.status_code == 200
    assert resp.get_json()["form_field_types"] == list(FORM_FIELD_TYPES)


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


def test_campaign_read_carries_the_registration_url(client, seeds):
    """The campaign read answers with the same URL the mint call returned.

    The copy-link card renders and copies this value. If the read returned only
    the slug, the browser would have to assemble the URL from its own origin,
    which is the client-side URL construction D-12 rules out.
    """
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    before = client.get(f"/api/v1/activities/{aid}/campaign", headers=_auth(tok)).get_json()
    assert before["registration_url"] is None

    minted = client.post(
        f"/api/v1/activities/{aid}/campaign/generate-slug", headers=_auth(tok)
    ).get_json()
    after = client.get(f"/api/v1/activities/{aid}/campaign", headers=_auth(tok)).get_json()
    assert after["registration_url"] == minted["registration_url"]
    assert after["registration_url"].endswith(after["registration_slug"])


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


# --------------------------------------------------------------------------- #
# Plan 05-03 Task 2: push-live (CAMPAIGN-06, AC-24 / AC-26)                    #
# --------------------------------------------------------------------------- #

def _push_live(client, token, activity_id):
    return client.post(
        f"/api/v1/activities/{activity_id}/campaign/push-live", headers=_auth(token)
    )


def _campaign(client, token, activity_id):
    return client.get(
        f"/api/v1/activities/{activity_id}/campaign", headers=_auth(token)
    ).get_json()


def test_push_live_sets_audit_fields(client, seeds):
    """The Meetup Head publishes: status live plus all three approval fields (AC-24)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    _add_schedule_item(aid)

    r = _push_live(client, tok, aid)
    assert r.status_code == 200, r.get_data(as_text=True)
    body = r.get_json()
    assert body["status"] == "live"
    assert body["approved_by"] == seeds["organiser_id"]
    assert body["approved_at"] is not None
    assert body["pushed_live_at"] is not None


def test_push_live_idempotent(client, seeds):
    """A second push-live is a no-op: 200, still live, timestamps unchanged (AC-26)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    _add_schedule_item(aid)

    first = _push_live(client, tok, aid).get_json()
    second_resp = _push_live(client, tok, aid)
    assert second_resp.status_code == 200
    second = second_resp.get_json()
    assert second["status"] == "live"
    assert second["approved_at"] == first["approved_at"]
    assert second["pushed_live_at"] == first["pushed_live_at"]
    assert second["approved_by"] == first["approved_by"]


def test_push_live_schedule_empty(client, seeds):
    """No schedule items → 400/schedule_empty and the campaign stays draft."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    r = _push_live(client, tok, aid)
    assert r.status_code == 400, r.get_data(as_text=True)
    assert r.get_json()["code"] == "schedule_empty"
    assert _campaign(client, tok, aid)["status"] == "draft"


# --------------------------------------------------------------------------- #
# Plan 05-03 Task 3: the AC-25 negative control + is_meetup_head flag          #
# --------------------------------------------------------------------------- #

def test_push_live_non_meetup_head_403(client, seeds):
    """Only the assigned Meetup Head may publish — not crew, not an admin (AC-25).

    Both subjects pass ``can_manage_activity``: the crew member has a team row,
    the admin has the role short-circuit. Only ``is_meetup_head`` separates them
    from the organiser, which is exactly what this asserts.
    """
    aid = seeds["activity_id"]
    _add_schedule_item(aid)

    crew_tok = _token(client, "crew@test.com")
    crew_resp = _push_live(client, crew_tok, aid)
    assert crew_resp.status_code == 403, crew_resp.get_data(as_text=True)
    assert crew_resp.get_json()["code"] == "forbidden"

    admin_tok = _token(client, "admin@test.com")
    admin_resp = _push_live(client, admin_tok, aid)
    assert admin_resp.status_code == 403, admin_resp.get_data(as_text=True)
    assert admin_resp.get_json()["code"] == "forbidden"

    # The refusal must also have written nothing. A 403 that still stamped
    # approved_by would pass a status-code-only assertion.
    from app.models import CampaignPackage

    row = CampaignPackage.query.filter_by(activity_id=aid).first()
    assert row is None or (row.status == "draft" and row.approved_by is None)
    assert _campaign(client, _token(client, "org@test.com"), aid)["status"] == "draft"


def test_campaign_state_carries_is_meetup_head(client, seeds):
    """The campaign payload answers "is this person the Meetup Head" server-side.

    ``capabilities.manageableActivityIds`` — the frontend's only authorization
    input — is true for every crew member and so cannot express Meetup Head
    identity; D-07's disabled button needs this flag instead.
    """
    aid = seeds["activity_id"]

    head = _campaign(client, _token(client, "org@test.com"), aid)
    assert head["is_meetup_head"] is True

    crew = _campaign(client, _token(client, "crew@test.com"), aid)
    assert crew["is_meetup_head"] is False
