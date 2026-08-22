from app.extensions import db
from app.models import Attendance, ContributionPoint, Registration, User


def _meetup_head_id():
    return User.query.filter_by(email="head@ekatva.os").first().id


def _setup_approved_event(client, rc_headers, admin_headers, org_id, starts_at="2026-08-15T10:00:00"):
    payload = {
        "title": "Scan Test Event",
        "scale": "local_meetup",
        "city": "Hyderabad",
        "org_id": org_id,
        "starts_at": starts_at,
        "venue": "Test Venue",
        "capacity": 50,
        "description": "Testing QR scan check-in",
        "budget": [{"label": "Snacks", "planned": 500}],
        "team": [{"user_id": _meetup_head_id(), "role": "Meetup Head"}],
        "collaborating_org_ids": [],
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


def test_valid_scan_checks_in_and_awards_points(client, app, rc_headers, admin_headers, student_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    reg_id = res.get_json()["id"]
    qr_token = res.get_json()["qr_token"]

    res = client.post(
        f"/api/v1/events/{activity_id}/scan",
        json={"registration_id": qr_token},
        headers=rc_headers,
    )
    assert res.status_code == 200
    assert res.get_json()["status"] == "success"

    with app.app_context():
        assert Attendance.query.filter_by(registration_id=reg_id).count() == 1
        assert ContributionPoint.query.filter_by(action="attended").count() == 1


def test_duplicate_scan_does_not_double_check_in(client, app, rc_headers, admin_headers, student_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    reg_id = res.get_json()["id"]
    qr_token = res.get_json()["qr_token"]

    client.post(f"/api/v1/events/{activity_id}/scan", json={"registration_id": qr_token}, headers=rc_headers)
    res = client.post(f"/api/v1/events/{activity_id}/scan", json={"registration_id": qr_token}, headers=rc_headers)

    assert res.status_code == 200
    assert res.get_json()["status"] == "duplicate"
    with app.app_context():
        assert Attendance.query.filter_by(registration_id=reg_id).count() == 1


def test_scan_rejects_a_registration_from_a_different_event(client, app, rc_headers, admin_headers, student_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    other_activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id, starts_at="2026-09-15T10:00:00")
    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    reg_id = res.get_json()["id"]
    qr_token = res.get_json()["qr_token"]

    res = client.post(
        f"/api/v1/events/{other_activity_id}/scan",
        json={"registration_id": qr_token},
        headers=rc_headers,
    )
    assert res.status_code == 400
    assert res.get_json()["code"] == "invalid_qr"


def test_scan_rejects_an_unknown_registration_id(client, app, rc_headers, admin_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    res = client.post(
        f"/api/v1/events/{activity_id}/scan",
        json={"registration_id": "not-a-real-id"},
        headers=rc_headers,
    )
    assert res.status_code == 400


def test_student_cannot_scan(client, app, rc_headers, admin_headers, student_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    reg_id = res.get_json()["id"]
    qr_token = res.get_json()["qr_token"]

    res = client.post(
        f"/api/v1/events/{activity_id}/scan",
        json={"registration_id": qr_token},
        headers=student_headers,
    )
    assert res.status_code == 403


def test_referral_attendance_awards_the_referrer_and_referred_bonus(
    client, app, rc_headers, admin_headers, student_headers
):
    """Covers both the manual check-in path and scan_qr, since scan_qr delegates
    to the same check_in() that carries the referral-gamification bonus."""
    with app.app_context():
        from tests.conftest import org_id, rc_user, student_user

        o_id = org_id()
        referrer_id = rc_user().id
        student_id = student_user().id

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    res = client.post(
        f"/api/v1/events/{activity_id}/register",
        json={"referred_by": referrer_id},
        headers=student_headers,
    )
    reg_id = res.get_json()["id"]
    qr_token = res.get_json()["qr_token"]
    assert res.get_json()["referred_by_id"] == referrer_id

    res = client.post(
        f"/api/v1/events/{activity_id}/scan",
        json={"registration_id": qr_token},
        headers=rc_headers,
    )
    assert res.status_code == 200

    with app.app_context():
        referrer_points = (
            db.session.query(db.func.sum(ContributionPoint.points))
            .filter_by(user_id=referrer_id, action="referred")
            .scalar()
        )
        referred_points = (
            db.session.query(db.func.sum(ContributionPoint.points))
            .filter_by(user_id=student_id, action="referred_welcome")
            .scalar()
        )
        assert referrer_points == 10
        assert referred_points == 5
