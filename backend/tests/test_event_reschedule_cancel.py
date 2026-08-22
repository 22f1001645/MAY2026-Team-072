import pytest
from app.models import Activity, Notification, Registration
from app.constants import EVENT_CANCELLED, EVENT_UPCOMING

def test_event_edit(client, admin_headers, app):
    # Get a published activity
    with app.app_context():
        activity = Activity.query.filter_by(status=EVENT_UPCOMING).first()
        if not activity:
            pytest.skip("No upcoming activity found")
        activity_id = activity.id
        old_title = activity.title

    # Edit it
    resp = client.put(
        f"/api/v1/events/{activity_id}",
        json={
            "title": "New Title",
            "starts_at": "2030-01-01T10:00:00Z"
        },
        headers=admin_headers
    )
    assert resp.status_code == 200
    
    with app.app_context():
        activity = Activity.query.get(activity_id)
        assert activity.title == "New Title"
        assert activity.starts_at.isoformat().startswith("2030-01-01")

def test_event_cancel(client, admin_headers, app):
    with app.app_context():
        activity = Activity.query.filter_by(status=EVENT_UPCOMING).first()
        if not activity:
            pytest.skip("No upcoming activity found")
        activity_id = activity.id

    resp = client.delete(
        f"/api/v1/events/{activity_id}",
        headers=admin_headers
    )
    assert resp.status_code == 200
    
    with app.app_context():
        activity = Activity.query.get(activity_id)
        assert activity.status == EVENT_CANCELLED
