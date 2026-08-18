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
