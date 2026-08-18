"""Tests for Plan 05-02 — CAMPAIGN-04 and CAMPAIGN-05.

Module covers AC-08…AC-26 (CAMPAIGN-01/04/05 surface):
  - Slug minting, collision retry, overwrite (AC-15, AC-16, AC-17)
  - Campaign read (AC-13, AC-14)
  - Custom registration form fields (AC-18…AC-23)
  - Public event preview via slug resolution (OD-3)

Error envelope: {error: ..., code: ...} — no "reason" key (errors.py:19-23).

Extended by plan 05-10: poster upload (CAMPAIGN-03, AC-12/AC-13/AC-14).
"""
import base64
import io
import sys
from contextlib import contextmanager
from types import ModuleType, SimpleNamespace

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


def test_campaign_read_carries_the_task_board_columns(client, seeds):
    """The campaign payload names the board's columns and their headings.

    The Kanban board renders one column per entry, in this order. TaskSchema
    validates an incoming status against the same tuple, so a column list built
    in the browser could offer a status the server answers 422 to — the label
    travels alongside the value for the same reason, since "To Do" cannot be
    derived from "todo" by any rule the client could apply.
    """
    from app.constants import TASK_STATUS_LABELS, TASK_STATUSES

    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    resp = client.get(f"/api/v1/activities/{aid}/campaign", headers=_auth(tok))
    assert resp.status_code == 200
    assert resp.get_json()["task_statuses"] == [
        {"value": s, "label": TASK_STATUS_LABELS[s]} for s in TASK_STATUSES
    ]


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


def test_anonymous_preview_of_an_activity_that_has_a_proposal(client, seeds):
    """The public preview survives an activity that actually has a Proposal row.

    Regression: the anonymous branch used to read `activity.proposal.description`,
    and Proposal has no such attribute — so every anonymous visit to a real event
    raised AttributeError and answered 500. `test_slug_resolves_to_event` above
    passed throughout, because `_seed_activity` deliberately creates an Activity
    WITHOUT a Proposal and the old expression short-circuited to None before it
    could touch the missing attribute. The proposal row here is the whole point
    of this test; without it the bug is invisible again.

    Description is now read from `activity.description`, the column the
    authenticated `to_dict(detail=True)` already uses — one source for both
    faces of the same event.
    """
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    activity = Activity.query.get(aid)
    activity.description = "An evening of chai and compilers."
    _db.session.add(
        Proposal(activity_id=aid, submitted_by=seeds["organiser_id"], status="approved")
    )
    _db.session.commit()

    slug = client.post(
        f"/api/v1/activities/{aid}/campaign/generate-slug", headers=_auth(tok)
    ).get_json()["registration_slug"]

    anon = client.get(f"/api/v1/events/{slug}")
    assert anon.status_code == 200, anon.get_data(as_text=True)
    body = anon.get_json()
    assert body["description"] == "An evening of chai and compilers."
    for k in ("budget", "collaborators", "team_members"):
        assert k not in body, f"anonymous response must not include '{k}'"


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


# --------------------------------------------------------------------------- #
# Plan 05-10: poster upload (CAMPAIGN-03, AC-12 / AC-13 / AC-14)               #
# --------------------------------------------------------------------------- #

# A real 1x1 PNG, not a bare signature: the sniff only reads the head, but the
# serve assertion compares the whole stored file against these bytes, so a
# truncated stand-in would make that comparison prove nothing.
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAE"
    "hQGAhKmMIQAAAABJRU5ErkJggg=="
)
JPEG_HEAD = b"\xff\xd8\xff\xe0" + b"\x00" * 32
# The T-05-48 payload: an SVG is XML that can carry a <script> element, and it
# arrives here wearing a .png filename and an image/png content type, because
# both of those cost an attacker nothing to set.
SVG_BYTES = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'

_POSTER_BOUNDARY = "----ekatvaposterboundary"
_POSTER_MULTIPART = f"multipart/form-data; boundary={_POSTER_BOUNDARY}"


def _poster_url(activity_id):
    return f"/api/v1/activities/{activity_id}/campaign/poster"


def _poster_body_of_exactly(total):
    """A genuine multipart body whose TOTAL length is exactly *total* bytes.

    MAX_CONTENT_LENGTH caps the request body rather than the file inside it, so
    only a body that counts its own envelope can land on the cap's real edge.
    """
    prefix = (
        f"--{_POSTER_BOUNDARY}\r\n"
        'Content-Disposition: form-data; name="poster"; filename="poster.png"\r\n'
        "Content-Type: image/png\r\n\r\n"
    ).encode()
    suffix = f"\r\n--{_POSTER_BOUNDARY}--\r\n".encode()
    padding = total - len(prefix) - len(suffix) - len(PNG_1X1)
    assert padding >= 0, "asked for a body smaller than its own envelope"
    body = prefix + PNG_1X1 + b"\x00" * padding + suffix
    assert len(body) == total
    return body


def _upload_poster(client, token, activity_id, content, filename, mimetype):
    return client.post(
        _poster_url(activity_id),
        data={"poster": (io.BytesIO(content), filename, mimetype)},
        content_type="multipart/form-data",
        headers=_auth(token),
    )


@pytest.fixture()
def uploads(app):
    """The upload directory, with every file the test created removed after.

    `instance/uploads/` is real gitignored disk shared with the dev server and
    with Phase 4's suite, so a test may only clean up what it made itself.
    """
    from app.controllers.upload_controller import upload_dir

    with app.app_context():
        before = set(upload_dir().iterdir())
        yield upload_dir()
        for stale in set(upload_dir().iterdir()) - before:
            stale.unlink(missing_ok=True)


def test_poster_upload_saves_and_returns_name(client, seeds, uploads):
    """AC-12: the stored name is the server's, never the client's."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    resp = _upload_poster(client, tok, aid, PNG_1X1, "My Poster (v2).PNG", "image/png")

    assert resp.status_code == 200, resp.get_json()
    name = resp.get_json()["poster_name"]
    assert name != "My Poster (v2).PNG"
    assert "poster" not in name.lower()
    assert name.endswith(".png")
    assert (uploads / name).read_bytes() == PNG_1X1
    assert _campaign(client, tok, aid)["poster_name"] == name
    assert _campaign(client, tok, aid)["completeness"]["poster"] is True


def test_poster_upload_overwrites(client, seeds, uploads):
    """AC-13: a second upload wins and the row still holds exactly one poster."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    first = _upload_poster(client, tok, aid, PNG_1X1, "a.png", "image/png")
    second = _upload_poster(client, tok, aid, JPEG_HEAD, "b.jpg", "image/jpeg")

    assert second.status_code == 200, second.get_json()
    first_name = first.get_json()["poster_name"]
    second_name = second.get_json()["poster_name"]
    assert second_name != first_name
    assert second_name.endswith(".jpg")
    assert _campaign(client, tok, aid)["poster_name"] == second_name


def test_poster_upload_rejects_svg(client, seeds, uploads):
    """T-05-48: SVG markup under a .png name and an image/png type is refused."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    before = set(uploads.iterdir())

    resp = _upload_poster(client, tok, aid, SVG_BYTES, "safe.png", "image/png")

    assert resp.status_code == 415, resp.status_code
    assert resp.get_json()["code"] == "unsupported_media_type"
    assert set(uploads.iterdir()) == before, "a refused upload was written anyway"
    assert _campaign(client, tok, aid)["poster_name"] is None


def test_poster_upload_rejects_oversize(client, app, seeds, uploads):
    """T-05-51: over the cap is refused by Flask before the body is buffered."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    cap = app.config["MAX_CONTENT_LENGTH"]
    before = set(uploads.iterdir())

    resp = client.post(
        _poster_url(aid),
        data=_poster_body_of_exactly(cap + 1),
        content_type=_POSTER_MULTIPART,
        headers=_auth(tok),
    )

    assert resp.status_code == 413, resp.status_code
    assert set(uploads.iterdir()) == before, "the view ran anyway"


def test_poster_upload_missing_part_400(client, seeds, uploads):
    """A multipart body with no `poster` part is a client error, not a 500."""
    tok = _token(client, "org@test.com")
    resp = client.post(
        _poster_url(seeds["activity_id"]),
        data={"wrong_key": (io.BytesIO(PNG_1X1), "a.png", "image/png")},
        content_type="multipart/form-data",
        headers=_auth(tok),
    )
    assert resp.status_code == 400, resp.status_code


def test_uploads_serve_returns_the_poster_bytes(client, seeds, uploads):
    """AC-14: Phase 4's serve route hands back a Phase 5 poster unchanged.

    Phase 5 adds no serve route of its own — this asserts that reuse.
    """
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    name = _upload_poster(
        client, tok, aid, PNG_1X1, "a.png", "image/png"
    ).get_json()["poster_name"]

    served = client.get(f"/api/v1/uploads/{name}")

    assert served.status_code == 200
    assert served.data == PNG_1X1
    assert served.headers["X-Content-Type-Options"] == "nosniff"


def test_poster_upload_blocked_when_live(client, seeds, uploads):
    """A live campaign's poster is frozen with the rest of the package (AC-06)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    _add_schedule_item(aid)
    assert _push_live(client, tok, aid).status_code == 200

    resp = _upload_poster(client, tok, aid, PNG_1X1, "a.png", "image/png")

    assert resp.status_code == 409, resp.status_code
    assert resp.get_json()["code"] == "campaign_live"


def test_poster_upload_forbidden_for_a_non_manager(client, seeds, uploads):
    """T-05-54: the guard resolves the activity from the URL, not from the body."""
    resp = _upload_poster(
        client, _token(client, "stu@test.com"), seeds["activity_id"],
        PNG_1X1, "a.png", "image/png",
    )
    assert resp.status_code == 403, resp.status_code


# --------------------------------------------------------------------------- #
# Plan 05-11: mail generation (CAMPAIGN-01 / CAMPAIGN-02, AC-08…AC-11)         #
# --------------------------------------------------------------------------- #

# Nothing below reaches the provider. The whole battery runs with GEMINI_API_KEY
# unset and with google-genai uninstalled, which is the state of every machine on
# this team and of every grading run.

# The nonsense the fake model returns. It shares not one character with a date, a
# venue, a fee or a capacity, so when those values turn up in the assembled body
# the only possible explanation is that the SERVER wrote them (PROB-P1). A
# realistic-sounding stand-in could have contained a plausible number and made the
# assertion pass for the wrong reason.
LOREM = "lorem ipsum"

# The vendor's exception text. If any of this reaches the client, provider
# internals have leaked (T-05-57).
VENDOR_TOKEN = "quota_exceeded_for_project_1234567890"


@contextmanager
def _fake_sdk(reply=None, error=None):
    """Stand a fake `google.genai` in `sys.modules` for the duration of a test.

    Injected rather than `mock.patch`ed onto the real package, for the reason
    Phase 4's brand-kit battery records: the real package is genuinely absent on
    most machines here, and patching an attribute of something that cannot be
    imported fails before it can patch anything. `_llm_narrative` imports the SDK
    lazily inside the function, so by the time the import runs this fake is what
    it finds.

    Yields the list of calls the service made, so a test can assert on what was
    SENT — the prompt assertions are then real rather than assumed.
    """
    calls = []

    class _Models:
        def __init__(self, api_key):
            self._api_key = api_key

        def generate_content(self, model, contents, config):
            calls.append(
                {"api_key": self._api_key, "model": model,
                 "contents": contents, "config": config}
            )
            if error is not None:
                raise error
            return SimpleNamespace(text=reply)

    class _Client:
        def __init__(self, api_key=None, **kwargs):
            self.models = _Models(api_key)

    fake_genai = ModuleType("google.genai")
    fake_genai.Client = _Client
    fake_types = ModuleType("google.genai.types")
    fake_types.GenerateContentConfig = lambda **kwargs: SimpleNamespace(**kwargs)
    fake_genai.types = fake_types
    fake_google = ModuleType("google")
    fake_google.genai = fake_genai

    saved = {
        name: module for name, module in sys.modules.items()
        if name == "google" or name.startswith("google.")
    }
    for name in saved:
        del sys.modules[name]
    sys.modules["google"] = fake_google
    sys.modules["google.genai"] = fake_genai
    sys.modules["google.genai.types"] = fake_types
    try:
        yield calls
    finally:
        for name in ("google", "google.genai", "google.genai.types"):
            sys.modules.pop(name, None)
        sys.modules.update(saved)


def _generate_mail(client, token, activity_id):
    return client.post(
        f"/api/v1/activities/{activity_id}/campaign/generate-mail",
        headers=_auth(token),
    )


def _save_mail(client, token, activity_id, payload):
    return client.patch(
        f"/api/v1/activities/{activity_id}/campaign/mail",
        headers=_auth(token),
        json=payload,
    )


def _with_key(app, key="test-key-not-a-real-one"):
    """Turn the AI path on for one test. Unset is the project's steady state."""
    app.config["GEMINI_API_KEY"] = key


def _brand_kit(org_id, voice_tone, sample_phrases):
    from app.models import BrandKit

    kit = BrandKit(org_id=org_id, voice_tone=voice_tone, sample_phrases=sample_phrases)
    _db.session.add(kit)
    _db.session.commit()
    return kit


def _collaborators(activity_id, invited_by):
    """Three accepted collaborating orgs plus one pending and one declined.

    The pending and the declined rows are the negative control for AC-11 and for
    T-05-60: an organisation that has not consented must not have its name or its
    logo on a mail that goes out to students.
    """
    from app.constants import COLLAB_ACCEPTED, COLLAB_DECLINED, COLLAB_PENDING
    from app.models import ActivityCollaborator, Organisation

    made = {}
    for name, status in [
        ("Accepted Alpha", COLLAB_ACCEPTED),
        ("Accepted Bravo", COLLAB_ACCEPTED),
        ("Accepted Charlie", COLLAB_ACCEPTED),
        ("Pending Delta", COLLAB_PENDING),
        ("Declined Echo", COLLAB_DECLINED),
    ]:
        org = Organisation(
            name=name,
            type="house",
            city="Hyderabad",
            logo_url=f"/api/v1/uploads/{name.split()[-1].lower()}.png",
        )
        _db.session.add(org)
        _db.session.flush()
        _db.session.add(
            ActivityCollaborator(
                activity_id=activity_id,
                org_id=org.id,
                is_primary=False,
                status=status,
                invited_by=invited_by,
            )
        )
        made.setdefault(status, []).append(org)
    _db.session.commit()
    return made


def test_mail_facts_are_server_interpolated(client, app, seeds):
    """AC-08 / PROB-P1: the facts are in the body because the SERVER put them there.

    The model returns two words of nonsense. Every factual field still appears,
    which can only be true if the fact block is concatenated onto the model's
    output rather than passed through it. Reverse the assembly order and this
    test fails — that is the whole point of asserting it against a model that
    said nothing useful.
    """
    from app.constants import ACTIVITY_FEE_INR
    from app.models import Activity

    _with_key(app)
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    activity = Activity.query.get(aid)
    expected_date = activity.starts_at.strftime("%d %b %Y")

    with _fake_sdk(reply=LOREM):
        resp = _generate_mail(client, tok, aid)

    assert resp.status_code == 200, resp.get_data(as_text=True)
    body = resp.get_json()
    assert body["degraded"] is False
    mail = body["mail_body"]
    assert LOREM in mail, "the model's narrative is missing from the body"
    assert str(ACTIVITY_FEE_INR) in mail
    assert "Room A" in mail
    assert expected_date in mail
    assert "30" in mail                       # capacity
    assert body["mail_subject"]
    # And it was persisted, not merely returned.
    assert _campaign(client, tok, aid)["mail_body"] == mail
    assert _campaign(client, tok, aid)["completeness"]["mail"] is True


def test_mail_degrades_not_empty(client, app, seeds):
    """The pipeline never blocks on AI availability (T-05-59), and never leaks (T-05-57).

    Three ways for the model to be unavailable — no key, no SDK, a raising
    client — and all three answer 200 with a usable draft. The raising leg also
    asserts the vendor's exception text is nowhere in the response.
    """
    from app.constants import ACTIVITY_FEE_INR

    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    # 1. No key configured — the project's steady state.
    app.config["GEMINI_API_KEY"] = None
    no_key = _generate_mail(client, tok, aid)
    assert no_key.status_code == 200, no_key.get_data(as_text=True)
    assert no_key.get_json()["degraded"] is True
    assert no_key.get_json()["mail_body"].strip()
    assert str(ACTIVITY_FEE_INR) in no_key.get_json()["mail_body"]

    # 2. Key set, SDK raising — the vendor's words must not travel.
    _with_key(app)
    with _fake_sdk(error=RuntimeError(VENDOR_TOKEN)):
        raised = _generate_mail(client, tok, aid)

    assert raised.status_code == 200, raised.get_data(as_text=True)
    payload = raised.get_json()
    assert payload["degraded"] is True
    assert payload["mail_body"].strip()
    assert VENDOR_TOKEN not in raised.get_data(as_text=True)
    assert "RuntimeError" not in raised.get_data(as_text=True)

    # 3. Key set, model answering with nothing usable — still a draft, not a blank.
    with _fake_sdk(reply="   "):
        empty = _generate_mail(client, tok, aid)
    assert empty.status_code == 200
    assert empty.get_json()["degraded"] is True
    assert empty.get_json()["mail_body"].strip()


def test_mail_regenerate_overwrites(client, app, seeds):
    """AC-10: a second generation replaces the stored body — last write wins."""
    _with_key(app)
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    with _fake_sdk(reply="first narrative from the model"):
        first = _generate_mail(client, tok, aid).get_json()["mail_body"]
    with _fake_sdk(reply="second narrative from the model"):
        second_resp = _generate_mail(client, tok, aid)

    assert second_resp.status_code == 200
    second = second_resp.get_json()["mail_body"]
    assert second != first
    assert "second narrative from the model" in second
    assert "first narrative from the model" not in second
    assert _campaign(client, tok, aid)["mail_body"] == second


def test_mail_mega_meetup_logos(client, app, seeds):
    """AC-11 / T-05-60: accepted collaborators appear; pending and declined do not.

    Asserted on both legs — the prompt the model was handed and the body the
    organiser gets — because a collaborator excluded from one but not the other
    would still be a leak.
    """
    _with_key(app)
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    made = _collaborators(aid, seeds["organiser_id"])

    with _fake_sdk(reply=LOREM) as calls:
        resp = _generate_mail(client, tok, aid)

    assert resp.status_code == 200, resp.get_data(as_text=True)
    mail = resp.get_json()["mail_body"]
    sent = calls[0]["contents"]

    for org in made["accepted"]:
        assert org.name in mail, f"{org.name} accepted but is missing from the body"
        assert org.logo_url in mail, f"{org.name}'s logo is missing from the body"
        assert org.name in sent, f"{org.name} is missing from the prompt"
        assert org.logo_url in sent, f"{org.name}'s logo is missing from the prompt"

    for status in ("pending", "declined"):
        for org in made[status]:
            assert org.name not in mail, f"{org.name} is {status} but is in the body"
            assert org.logo_url not in mail
            assert org.name not in sent, f"{org.name} is {status} but is in the prompt"


def test_mail_save(client, app, seeds):
    """The organiser's edit is what gets stored — the draft is a starting point."""
    _with_key(app)
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]

    with _fake_sdk(reply=LOREM):
        _generate_mail(client, tok, aid)

    resp = _save_mail(
        client, tok, aid,
        {"mail_subject": "Come to chai & compilers", "mail_body": "Hand-written body."},
    )

    assert resp.status_code == 200, resp.get_data(as_text=True)
    state = _campaign(client, tok, aid)
    assert state["mail_subject"] == "Come to chai & compilers"
    assert state["mail_body"] == "Hand-written body."

    # A PATCH carrying only one key leaves the other alone.
    assert _save_mail(client, tok, aid, {"mail_body": "Edited again."}).status_code == 200
    after = _campaign(client, tok, aid)
    assert after["mail_subject"] == "Come to chai & compilers"
    assert after["mail_body"] == "Edited again."


def test_mail_blocked_when_live(client, app, seeds):
    """A published campaign's mail is frozen with the rest of the package (AC-06)."""
    tok = _token(client, "org@test.com")
    aid = seeds["activity_id"]
    _add_schedule_item(aid)
    assert _push_live(client, tok, aid).status_code == 200

    assert _generate_mail(client, tok, aid).status_code == 409
    assert _save_mail(client, tok, aid, {"mail_body": "x"}).status_code == 409


def test_mail_forbidden_for_a_non_manager(client, seeds):
    """Both mail routes are behind can_manage_activity, like every campaign write."""
    stu = _token(client, "stu@test.com")
    aid = seeds["activity_id"]
    assert _generate_mail(client, stu, aid).status_code == 403
    assert _save_mail(client, stu, aid, {"mail_body": "x"}).status_code == 403
