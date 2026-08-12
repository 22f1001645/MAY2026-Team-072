from app.models import Activity, AuditLog, Notification


def _setup_approved_event(client, rc_headers, admin_headers, org_id):
    payload = {
        "title": "Editable Event",
        "scale": "local_meetup",
        "city": "Hyderabad",
        "org_id": org_id,
        "starts_at": "2026-08-15T10:00:00",
        "venue": "Original Venue",
        "capacity": 50,
        "description": "Testing event edit/cancel",
        "budget": [{"label": "Snacks", "planned": 500}],
    }
    res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    assert res.status_code == 201
    activity_id = res.get_json()["id"]

    res = client.post(
        f"/api/v1/proposals/{activity_id}/decision",
        json={"decision": "approve", "note": "LGTM"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    return activity_id


def test_edit_changes_fields_notifies_on_venue_change_and_writes_audit(
    client, app, rc_headers, admin_headers, student_headers
):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert res.status_code == 201

    with app.app_context():
        audit_before = AuditLog.query.count()

    res = client.put(
        f"/api/v1/events/{activity_id}",
        json={"venue": "New Venue"},
        headers=rc_headers,
    )
    assert res.status_code == 200
    assert res.get_json()["venue"] == "New Venue"

    with app.app_context():
        assert AuditLog.query.count() == audit_before + 1
        notif = Notification.query.filter_by(activity_id=activity_id, type="update").first()
        assert notif is not None
        assert "venue" in notif.body


def test_edit_without_time_or_venue_change_sends_no_notification(
    client, app, rc_headers, admin_headers, student_headers
):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)

    res = client.put(
        f"/api/v1/events/{activity_id}",
        json={"description": "Just a wording tweak"},
        headers=rc_headers,
    )
    assert res.status_code == 200

    with app.app_context():
        assert Notification.query.filter_by(activity_id=activity_id, type="update").count() == 0


def test_student_cannot_edit_or_cancel_event(client, app, rc_headers, admin_headers, student_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    res = client.put(f"/api/v1/events/{activity_id}", json={"venue": "Nope"}, headers=student_headers)
    assert res.status_code == 403

    res = client.delete(f"/api/v1/events/{activity_id}", headers=student_headers)
    assert res.status_code == 403


def test_cancel_sets_status_and_notifies_registrants(client, app, rc_headers, admin_headers, student_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)

    res = client.delete(f"/api/v1/events/{activity_id}", headers=rc_headers)
    assert res.status_code == 200
    assert res.get_json()["status"] == "cancelled"

    with app.app_context():
        activity = Activity.query.get(activity_id)
        assert activity.status == "cancelled"
        notif = Notification.query.filter_by(activity_id=activity_id, title=f"Event Cancelled: {activity.title}").first()
        assert notif is not None


def test_cannot_edit_or_cancel_an_already_cancelled_event(client, app, rc_headers, admin_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    res = client.delete(f"/api/v1/events/{activity_id}", headers=rc_headers)
    assert res.status_code == 200

    res = client.put(f"/api/v1/events/{activity_id}", json={"venue": "Too late"}, headers=rc_headers)
    assert res.status_code == 400

    res = client.delete(f"/api/v1/events/{activity_id}", headers=rc_headers)
    assert res.status_code == 400
