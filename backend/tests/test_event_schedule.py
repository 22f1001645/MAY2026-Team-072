"""Phase 5: Event Schedule — Design & Campaign Builder (DESIGN-01).

Covers: AC-01 (POST returns 201), AC-02 (PATCH returns 200), AC-03 (DELETE returns 204),
        AC-04 (unlock check / schedule_empty), AC-05 (deterministic ordering),
        AC-06 (immutable after live / campaign_live), AC-07 (presets endpoint).

Wire format: error envelope is {\"error\": ..., \"code\": ...} — no \"reason\" key (see errors.py:19-23).
Campaign states: CAMPAIGN_DRAFT, CAMPAIGN_PENDING_APPROVAL, CAMPAIGN_LIVE — no \"approved\" state.
"""
import pytest
from datetime import datetime, timedelta, timezone
from werkzeug.security import generate_password_hash

from app.constants import (
    CAMPAIGN_DRAFT,
    CAMPAIGN_LIVE,
    TEAM_ROLE_MEETUP_HEAD,
)
from app.extensions import db
from app.models import (
    Activity,
    ActivityTeamMember,
    CampaignPackage,
    Organisation,
    User,
)


# --------------------------------------------------------------------------- #
# Module-local helpers
# --------------------------------------------------------------------------- #

def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


def _auth(client, email, password):
    return {"Authorization": f"Bearer {_token(client, email, password)}"}


def _seed_activity(title="Hyderabad Dev Meetup", scale="local_meetup"):
    """Create an Activity plus ActivityTeamMember rows for crew@ and head@.

    Looks up users by email and orgs by type — never by insertion position, so
    a future change to _seed_minimal cannot silently repoint the lookup.
    """
    org = Organisation.query.filter_by(type="region").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    head = User.query.filter_by(email="head@ekatva.os").first()

    activity = Activity(
        title=title,
        city="Hyderabad",
        scale=scale,
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
    db.session.commit()
    return activity


# --------------------------------------------------------------------------- #
# AC-01/02/03: basic CRUD
# --------------------------------------------------------------------------- #

def test_schedule_crud(client):
    """crew@ can create, update, list, and delete schedule items. (AC-01/02/03)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    # POST → 201
    res = client.post(
        f"/api/v1/activities/{aid}/schedule",
        json={"time_block": "10:00 - 10:15", "title": "Arrival & icebreaker"},
        headers=h,
    )
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    assert body["title"] == "Arrival & icebreaker"
    item_id = body["id"]

    # PATCH → 200 with changed title
    res = client.patch(
        f"/api/v1/activities/{aid}/schedule/{item_id}",
        json={"title": "Arrival"},
        headers=h,
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["title"] == "Arrival"

    # GET → list contains the item
    res = client.get(f"/api/v1/activities/{aid}/schedule", headers=h)
    assert res.status_code == 200
    ids = [i["id"] for i in res.get_json()]
    assert item_id in ids

    # DELETE → 204
    res = client.delete(f"/api/v1/activities/{aid}/schedule/{item_id}", headers=h)
    assert res.status_code == 204

    # GET after delete → item absent
    res = client.get(f"/api/v1/activities/{aid}/schedule", headers=h)
    ids = [i["id"] for i in res.get_json()]
    assert item_id not in ids


def test_schedule_cross_activity_patch_returns_404(client):
    """PATCH with an item_id from a different activity returns 404 code=not_found. (AC-02 guard)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    a1 = _seed_activity("Event A")
    a2 = _seed_activity("Event B")

    # Create an item on a2
    res = client.post(
        f"/api/v1/activities/{a2.id}/schedule",
        json={"title": "Item on B"},
        headers=h,
    )
    assert res.status_code == 201
    item_id = res.get_json()["id"]

    # Try to PATCH it via a1's URL → 404
    res = client.patch(
        f"/api/v1/activities/{a1.id}/schedule/{item_id}",
        json={"title": "Hijacked"},
        headers=h,
    )
    assert res.status_code == 404
    assert res.get_json()["code"] == "not_found"


# --------------------------------------------------------------------------- #
# AC-06: immutable after live
# --------------------------------------------------------------------------- #

def test_schedule_immutable_after_live(client):
    """POST/PATCH/DELETE on a live campaign return 409 code=campaign_live. (AC-06)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    # Add one item while still DRAFT (should succeed)
    res = client.post(
        f"/api/v1/activities/{aid}/schedule",
        json={"title": "Setup slot"},
        headers=h,
    )
    assert res.status_code == 201
    item_id = res.get_json()["id"]

    # Mark campaign as LIVE
    campaign = CampaignPackage(activity_id=aid, status=CAMPAIGN_LIVE)
    db.session.add(campaign)
    db.session.commit()

    # POST → 409
    res = client.post(
        f"/api/v1/activities/{aid}/schedule",
        json={"title": "Late addition"},
        headers=h,
    )
    assert res.status_code == 409
    assert res.get_json()["code"] == "campaign_live"

    # PATCH → 409
    res = client.patch(
        f"/api/v1/activities/{aid}/schedule/{item_id}",
        json={"title": "Changed"},
        headers=h,
    )
    assert res.status_code == 409
    assert res.get_json()["code"] == "campaign_live"

    # DELETE → 409
    res = client.delete(f"/api/v1/activities/{aid}/schedule/{item_id}", headers=h)
    assert res.status_code == 409
    assert res.get_json()["code"] == "campaign_live"


def test_schedule_editable_when_draft(client):
    """With status=CAMPAIGN_DRAFT the immutability gate does not fire."""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    # Add draft campaign
    campaign = CampaignPackage(activity_id=aid, status=CAMPAIGN_DRAFT)
    db.session.add(campaign)
    db.session.commit()

    res = client.post(
        f"/api/v1/activities/{aid}/schedule",
        json={"title": "Draft item"},
        headers=h,
    )
    assert res.status_code == 201


def test_schedule_editable_without_campaign(client):
    """With no CampaignPackage row the immutability gate does not fire."""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()

    res = client.post(
        f"/api/v1/activities/{activity.id}/schedule",
        json={"title": "Pre-campaign item"},
        headers=h,
    )
    assert res.status_code == 201


# --------------------------------------------------------------------------- #
# AC-04: unlock check
# --------------------------------------------------------------------------- #

def test_campaign_unlock_schedule_empty(client):
    """GET /unlock returns 400/schedule_empty when no items; 200/{unlocked:true} after add. (AC-04)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    # No items → 400
    res = client.get(f"/api/v1/activities/{aid}/schedule/unlock", headers=h)
    assert res.status_code == 400
    assert res.get_json()["code"] == "schedule_empty"

    # Add one item
    client.post(
        f"/api/v1/activities/{aid}/schedule",
        json={"title": "Welcome"},
        headers=h,
    )

    # Now → 200 with unlocked=True
    res = client.get(f"/api/v1/activities/{aid}/schedule/unlock", headers=h)
    assert res.status_code == 200
    assert res.get_json()["unlocked"] is True


# --------------------------------------------------------------------------- #
# AC-05: deterministic ordering
# --------------------------------------------------------------------------- #

def test_schedule_ordering(client):
    """Items inserted out of order are returned in (position, created_at, id) order. (AC-05)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    # Insert with positions 2, 0, 1 (out of order)
    for pos, title in [(2, "C"), (0, "A"), (1, "B")]:
        res = client.post(
            f"/api/v1/activities/{aid}/schedule",
            json={"title": title, "position": pos},
            headers=h,
        )
        assert res.status_code == 201

    res = client.get(f"/api/v1/activities/{aid}/schedule", headers=h)
    titles = [i["title"] for i in res.get_json()]
    assert titles == ["A", "B", "C"]


def test_schedule_reorder_position_only(client):
    """PATCH with only 'position' moves the row without clobbering other fields. (AC-05 reorder)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    # Create two items
    r1 = client.post(
        f"/api/v1/activities/{aid}/schedule",
        json={"title": "First", "time_block": "09:00-09:30", "position": 0},
        headers=h,
    ).get_json()
    r2 = client.post(
        f"/api/v1/activities/{aid}/schedule",
        json={"title": "Second", "time_block": "09:30-10:00", "position": 1},
        headers=h,
    ).get_json()

    # Reorder: move item 0 to position 1 (push it after Second)
    res = client.patch(
        f"/api/v1/activities/{aid}/schedule/{r1['id']}",
        json={"position": 1},
        headers=h,
    )
    assert res.status_code == 200

    # Verify First is now last, and its time_block is intact
    items = client.get(f"/api/v1/activities/{aid}/schedule", headers=h).get_json()
    assert items[0]["title"] == "Second"
    assert items[1]["title"] == "First"
    assert items[1]["time_block"] == "09:00-09:30"


# --------------------------------------------------------------------------- #
# AC-07: scale presets
# --------------------------------------------------------------------------- #

def test_schedule_presets(client):
    """GET /schedule-presets returns non-empty lists for local_meetup and regional_meetup. (AC-07)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")

    res = client.get("/api/v1/schedule-presets?scale=local_meetup", headers=h)
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "items" in data[0]
    assert len(data[0]["items"]) >= 1

    res = client.get("/api/v1/schedule-presets?scale=regional_meetup", headers=h)
    assert res.status_code == 200
    assert len(res.get_json()) >= 1

    # Unknown scale → empty list, not 500
    res = client.get("/api/v1/schedule-presets?scale=not_a_scale", headers=h)
    assert res.status_code == 200
    assert res.get_json() == []
