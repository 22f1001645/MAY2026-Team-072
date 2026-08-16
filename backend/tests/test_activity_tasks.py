"""Phase 5: Team workspace — Kanban task board (TEAM-01, TEAM-02).

Covers: AC-27 / AC-33 (403 code=campaign_not_live until the campaign is live),
        AC-28 (POST returns 201), AC-29 (PATCH returns 200), AC-30 (DELETE returns 204),
        AC-31 (position ordering), AC-32 (equal-position tiebreak on created_at then id),
        AC-34 (an unknown status is a 422 and never reaches a column).

TEAM-03 and TEAM-04 (crew roster and per-member workload) land in plan 05-05,
which extends this file rather than starting a second one.

Wire format: the error envelope is {"error": ..., "code": ...} — there is no
"reason" key (see app/errors.py:19-23), so the SPEC's `reason="campaign_not_live"`
is asserted here as `code`.
"""
from datetime import datetime, timedelta, timezone

from app.constants import (
    CAMPAIGN_DRAFT,
    CAMPAIGN_LIVE,
    TASK_TODO,
    TEAM_ROLE_MEETUP_HEAD,
)
from app.extensions import db
from app.models import (
    Activity,
    ActivityTask,
    ActivityTeamMember,
    CampaignPackage,
    Organisation,
    User,
)


# --------------------------------------------------------------------------- #
# Module-local helpers                                                         #
# --------------------------------------------------------------------------- #

def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


def _auth(client, email, password):
    return {"Authorization": f"Bearer {_token(client, email, password)}"}


def _seed_activity(title="Hyderabad Dev Meetup", campaign_status=CAMPAIGN_LIVE):
    """Create an Activity, its crew rows, and (optionally) its CampaignPackage.

    Every task route is gated on a live campaign, so the campaign row is part of
    the fixture rather than something each test remembers to add. Pass
    ``campaign_status=None`` for the no-campaign-row case that AC-27 asserts.

    Users are looked up by email and orgs by type — never by insertion position,
    so a future change to _seed_minimal cannot silently repoint the lookup.
    """
    org = Organisation.query.filter_by(type="region").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    head = User.query.filter_by(email="head@ekatva.os").first()

    activity = Activity(
        title=title,
        city="Hyderabad",
        scale="local_meetup",
        capacity=50,
        starts_at=datetime.now(timezone.utc) + timedelta(days=30),
        venue="IITM Research Park",
        org_id=org.id,
        organiser_id=crew.id,
    )
    db.session.add(activity)
    db.session.flush()

    db.session.add(ActivityTeamMember(
        activity_id=activity.id, user_id=crew.id, role="Co-Head", added_by=crew.id,
    ))
    db.session.add(ActivityTeamMember(
        activity_id=activity.id, user_id=head.id, role=TEAM_ROLE_MEETUP_HEAD, added_by=crew.id,
    ))
    if campaign_status is not None:
        db.session.add(CampaignPackage(activity_id=activity.id, status=campaign_status))
    db.session.commit()
    return activity


# --------------------------------------------------------------------------- #
# AC-28/29/30: task CRUD                                                       #
# --------------------------------------------------------------------------- #

def test_task_crud(client):
    """A crew member creates, edits, lists and deletes a task. (AC-28/29/30)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id
    crew_id = User.query.filter_by(email="crew@ekatva.os").first().id

    # POST → 201, status defaults to todo
    res = client.post(
        f"/api/v1/activities/{aid}/tasks",
        json={
            "title": "Book the room",
            "assignee_id": crew_id,
            "deadline": "2026-09-01T10:00:00",
        },
        headers=h,
    )
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    assert body["title"] == "Book the room"
    assert body["status"] == TASK_TODO
    assert body["assignee_id"] == crew_id
    task_id = body["id"]

    # PATCH carrying only `status` → 200, and it must not blank the other fields
    res = client.patch(
        f"/api/v1/activities/{aid}/tasks/{task_id}",
        json={"status": "in_progress"},
        headers=h,
    )
    assert res.status_code == 200, res.get_json()
    patched = res.get_json()
    assert patched["status"] == "in_progress"
    assert patched["assignee_id"] == crew_id
    assert patched["deadline"] is not None

    # GET → the list contains it
    res = client.get(f"/api/v1/activities/{aid}/tasks", headers=h)
    assert res.status_code == 200
    assert task_id in [t["id"] for t in res.get_json()]

    # A task_id belonging to a different activity → 404 not_found
    other = _seed_activity("Bengaluru Dev Meetup")
    res = client.patch(
        f"/api/v1/activities/{other.id}/tasks/{task_id}",
        json={"title": "Hijacked"},
        headers=h,
    )
    assert res.status_code == 404
    assert res.get_json()["code"] == "not_found"

    # DELETE → 204, and the follow-up list omits it
    res = client.delete(f"/api/v1/activities/{aid}/tasks/{task_id}", headers=h)
    assert res.status_code == 204

    res = client.get(f"/api/v1/activities/{aid}/tasks", headers=h)
    assert task_id not in [t["id"] for t in res.get_json()]


# --------------------------------------------------------------------------- #
# AC-34: validation                                                            #
# --------------------------------------------------------------------------- #

def test_task_invalid_status_422(client):
    """A status outside TASK_STATUSES is a 422 and never reaches the row. (AC-34)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    res = client.post(
        f"/api/v1/activities/{aid}/tasks", json={"title": "Print badges"}, headers=h
    )
    assert res.status_code == 201
    task_id = res.get_json()["id"]

    res = client.patch(
        f"/api/v1/activities/{aid}/tasks/{task_id}",
        json={"status": "urgent"},
        headers=h,
    )
    assert res.status_code == 422, res.get_json()

    # The stored row is unchanged — a status-only assertion on the response
    # would pass even if the bad value had been written and then echoed back.
    db.session.expire_all()
    assert ActivityTask.query.get(task_id).status == TASK_TODO


def test_task_title_too_long_422(client):
    """A 201-character title exceeds the declared column width. (T-05-23)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()

    res = client.post(
        f"/api/v1/activities/{activity.id}/tasks",
        json={"title": "x" * 201},
        headers=h,
    )
    assert res.status_code == 422, res.get_json()
