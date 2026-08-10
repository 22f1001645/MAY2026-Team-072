"""The v1 spine, end to end: propose → approve → publish → discover →
register → check-in → points. Plus RBAC and the quota guardrail."""
from app.models import Organisation


def _org_id():
    return Organisation.query.first().id


def _proposal_payload(**over):
    base = {
        "title": "Hyderabad Chai & Charcha",
        "org_id": _org_id(),
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Roastery Coffee House",
        "starts_at": "2026-09-10T17:30:00",
        "capacity": 40,
        "description": "An evening of chai and conversation.",
        "budget": [{"label": "Snacks", "planned": 4000}],
    }
    base.update(over)
    return base


def test_student_cannot_submit_proposal(client, student_headers):
    res = client.post("/api/v1/activities", json=_proposal_payload(), headers=student_headers)
    assert res.status_code == 403  # needs an organiser POR (P3)


def test_organiser_can_submit_proposal(client, rc_headers):
    res = client.post("/api/v1/activities", json=_proposal_payload(), headers=rc_headers)
    assert res.status_code == 201
    assert res.get_json()["proposal_status"] == "submitted"


def test_quota_guardrail_blocks_second_meetup_same_month(client, rc_headers):
    client.post("/api/v1/activities", json=_proposal_payload(), headers=rc_headers)
    # Same city, same month → blocked (FR-B2)
    res = client.post(
        "/api/v1/activities",
        json=_proposal_payload(title="Another one", starts_at="2026-09-20T17:30:00"),
        headers=rc_headers,
    )

    assert res.status_code == 409
    assert res.get_json()["code"] == "quota_exceeded"


def test_full_spine_propose_approve_register_checkin_points(client, rc_headers, admin_headers, student_headers):
    # 1. Propose
    r = client.post("/api/v1/activities", json=_proposal_payload(), headers=rc_headers)
    activity_id = r.get_json()["id"]

    # 2. Approve → auto-publish (FR-C1)
    dec = client.post(
        f"/api/v1/proposals/{activity_id}/decision",
        json={"decision": "approve", "note": "Looks good"},
        headers=admin_headers,
    )
    assert dec.status_code == 200
    assert dec.get_json()["proposal_status"] == "approved"

    # 3. Appears in the city discovery feed
    feed = client.get("/api/v1/events?city=Hyderabad", headers=student_headers).get_json()
    assert any(e["id"] == activity_id for e in feed)

    # 4. Student registers
    reg = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert reg.status_code == 201
    reg_id = reg.get_json()["id"]

    # 5. Double registration is rejected
    assert client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers).status_code == 409

    # 6. Organiser checks the student in (attendance → points)
    ci = client.post(
        f"/api/v1/events/{activity_id}/attendance",
        json={"registration_ids": [reg_id]},
        headers=rc_headers,
    )
    assert ci.status_code == 200
    assert ci.get_json()["checked_in"] == 1

    # 7. Points landed in the student's ledger (FR-G1/G4)
    pts = client.get("/api/v1/me/points", headers=student_headers).get_json()
    assert pts["total"] >= 30


def test_approve_then_decide_again_conflicts(client, rc_headers, admin_headers):
    activity_id = client.post("/api/v1/activities", json=_proposal_payload(), headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{activity_id}/decision",
                json={"decision": "approve", "note": ""}, headers=admin_headers)
    again = client.post(f"/api/v1/proposals/{activity_id}/decision",
                        json={"decision": "reject", "note": "x"}, headers=admin_headers)
    assert again.status_code == 409


def test_changes_requested_requires_note(client, rc_headers, admin_headers):
    activity_id = client.post("/api/v1/activities", json=_proposal_payload(), headers=rc_headers).get_json()["id"]
    res = client.post(f"/api/v1/proposals/{activity_id}/decision",
                      json={"decision": "changes", "note": ""}, headers=admin_headers)
    assert res.status_code == 400


def test_proposal_with_team_roster_and_collaborating_orgs(client, rc_headers):
    from app.models import Organisation
    payload = {
        "title": "Team Roster Test",
        "org_id": Organisation.query.first().id,
        "city": "Chennai",
        "scale": "local_meetup",
        "venue": "Test Venue",
        "starts_at": "2026-09-10T10:00:00",
        "capacity": 20,
        "team_roster": [{"role": "Meetup Head", "user_id": "test_id", "name": "Test User"}],
        "collaborating_orgs": ["Code Club"]
    }
    res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    if res.status_code == 409:
        payload["starts_at"] = "2027-10-10T10:00:00"
        res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    assert res.status_code == 201
    data = res.get_json()
    assert len(data["team_roster"]) == 1
    assert data["collaborating_orgs"] == ["Code Club"]


def test_reassign_meetup_head(client, rc_headers, admin_headers):
    from app.models import Organisation, User
    payload = {
        "title": "Reassign Head Test",
        "org_id": Organisation.query.first().id,
        "city": "Chennai",
        "scale": "local_meetup",
        "venue": "Test Venue",
        "starts_at": "2026-09-11T10:00:00",
        "capacity": 20,
        "team_roster": [{"role": "Meetup Head", "user_id": "old_id", "name": "Old User"}]
    }
    res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    if res.status_code == 409:
        payload["starts_at"] = "2027-11-11T10:00:00"
        res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    aid = res.get_json()["id"]

    new_head = User.query.filter_by(role="student").first()
    patch_res = client.patch(
        f"/api/v1/activities/{aid}/reassign-head",
        json={"new_head_user_id": new_head.id},
        headers=admin_headers
    )
    assert patch_res.status_code == 200
    roster = patch_res.get_json()["team_roster"]
    assert len(roster) > 0
    assert roster[0]["role"] == "Meetup Head"
    assert roster[0]["user_id"] == new_head.id
