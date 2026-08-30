"""TIMELINE-01/TIMELINE-02 — the event timeline projection and the audit backfill.

Two things are worth pinning down here, and they are not the same thing.

TIMELINE-02 is about writes: three services claimed to record audit events and
did not. Those rows have to exist, and they have to be keyed on the activity —
a row keyed on the registration's or the expense's own id is invisible to every
reader that asks "what happened to this event?", which is the only question
anyone asks of it.

TIMELINE-01 is about reads: the endpoint is a projection over tables that
already exist, so the tests assert ordering and shape rather than a stored row.
The empty case gets its own test because "nothing has happened yet" is a real
answer for a freshly approved event, and returning `[]` for it must not be
confused with the 404 an unknown id gets.
"""
from app.extensions import db
from app.models import Activity, AuditLog, Attendance, Registration, User
from app.services import timeline_service

from .conftest import meetup_head_user, region_org, student_user


def _approved_activity(client, rc_headers, admin_headers, title="Timeline Test Meetup"):
    payload = {
        "title": title,
        "org_id": region_org().id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Somewhere",
        "starts_at": "2026-08-15T10:00:00",
        "ends_at": "2026-08-15T12:00:00",
        "capacity": 30,
        "budget": [{"label": "Snacks", "planned": 4000}],
        "team": [{"user_id": meetup_head_user().id, "role": "Meetup Head"}],
        "collaborating_org_ids": [],
    }
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    res = client.post(
        f"/api/v1/proposals/{aid}/decision",
        json={"decision": "approve", "note": ""},
        headers=admin_headers,
    )
    assert res.status_code == 200
    return aid


# --- TIMELINE-02: the three services now write AuditLog rows ---------------- #


def test_register_writes_an_activity_scoped_audit_row(
    client, app, rc_headers, admin_headers, student_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    assert client.post(f"/api/v1/events/{aid}/register", headers=student_headers).status_code in (200, 201)

    rows = AuditLog.query.filter_by(entity="registration", entity_id=aid).all()
    assert len(rows) == 1
    assert student_user().name in rows[0].action


def test_check_in_writes_one_audit_row_per_new_check_in_and_none_on_a_repeat(
    client, app, rc_headers, admin_headers, student_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    client.post(f"/api/v1/events/{aid}/register", headers=student_headers)
    reg_id = Registration.query.filter_by(activity_id=aid).first().id

    client.post(
        f"/api/v1/events/{aid}/attendance",
        json={"registration_ids": [reg_id]},
        headers=rc_headers,
    )
    assert AuditLog.query.filter_by(entity="attendance", entity_id=aid).count() == 1

    # check_in is idempotent; the audit row must be too, or a re-scan would
    # write a second "checked in" event for one arrival.
    client.post(
        f"/api/v1/events/{aid}/attendance",
        json={"registration_ids": [reg_id]},
        headers=rc_headers,
    )
    assert AuditLog.query.filter_by(entity="attendance", entity_id=aid).count() == 1


def test_submit_expense_audit_row_is_keyed_on_the_activity_not_null(
    client, app, rc_headers, admin_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    res = client.post(
        "/api/v1/expenses",
        json={"activity_id": aid, "label": "Snacks bill", "amount": 1200, "bill_name": "bill.pdf"},
        headers=rc_headers,
    )
    assert res.status_code == 201

    rows = AuditLog.query.filter_by(entity="expense", entity_id=aid).all()
    assert len(rows) == 1, "the submission row must be findable by activity id"
    assert AuditLog.query.filter_by(entity="expense", entity_id=None).count() == 0


# --- TIMELINE-01: the endpoint ---------------------------------------------- #


def test_timeline_returns_200_with_entries_sorted_ascending(
    client, app, rc_headers, admin_headers, student_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    client.post(f"/api/v1/events/{aid}/register", headers=student_headers)
    reg_id = Registration.query.filter_by(activity_id=aid).first().id
    client.post(
        f"/api/v1/events/{aid}/attendance",
        json={"registration_ids": [reg_id]},
        headers=rc_headers,
    )

    res = client.get(f"/api/v1/activities/{aid}/timeline", headers=rc_headers)
    assert res.status_code == 200
    entries = res.get_json()
    assert isinstance(entries, list) and entries

    stamps = [e["at"] for e in entries]
    assert stamps == sorted(stamps), f"timeline is not in chronological order: {stamps}"

    types = {e["type"] for e in entries}
    assert "proposal_submitted" in types
    assert "admin_approved" in types
    assert "registration" in types
    assert "check_in" in types


def test_every_entry_carries_type_description_and_at(
    client, app, rc_headers, admin_headers, student_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    client.post(f"/api/v1/events/{aid}/register", headers=student_headers)

    entries = client.get(f"/api/v1/activities/{aid}/timeline", headers=rc_headers).get_json()
    for entry in entries:
        assert entry["type"], entry
        assert entry["description"], entry
        assert entry["at"], entry


def test_activity_with_no_history_returns_an_empty_list(client, app, rc_headers):
    """An Activity row with nothing attached — no proposal, no audit, no rows.

    Built directly rather than through the proposal flow, because that flow
    writes an audit row as its first act and so cannot produce this state."""
    activity = Activity(
        org_id=region_org().id,
        title="Nothing Has Happened Yet",
        city="Hyderabad",
        scale="local_meetup",
        capacity=10,
    )
    db.session.add(activity)
    db.session.commit()

    res = client.get(f"/api/v1/activities/{activity.id}/timeline", headers=rc_headers)
    assert res.status_code == 200
    assert res.get_json() == []


def test_timeline_404s_on_an_unknown_activity(client, app, rc_headers):
    res = client.get("/api/v1/activities/does-not-exist/timeline", headers=rc_headers)
    assert res.status_code == 404


def test_timeline_requires_authentication(client, app, rc_headers, admin_headers):
    aid = _approved_activity(client, rc_headers, admin_headers)
    assert client.get(f"/api/v1/activities/{aid}/timeline").status_code == 401


# --- TIMELINE-01: the pre-backfill fallback --------------------------------- #


def test_pre_backfill_rows_are_projected_from_the_tables_without_duplicating(
    client, app, rc_headers, admin_headers
):
    """The historic case: Registration and Attendance rows with no audit row.

    Written straight to the tables, which is exactly the state every event that
    ran before TIMELINE-02 is in. Each must appear once — the projection reads
    both sources and would double-count a modern event if the cutoff were not
    doing its job."""
    aid = _approved_activity(client, rc_headers, admin_headers)

    student = User(
        name="Historic Attendee",
        email="historic@ds.study.iitm.ac.in",
        role="student",
        password_hash="x",
    )
    db.session.add(student)
    db.session.flush()
    reg = Registration(activity_id=aid, student_id=student.id)
    db.session.add(reg)
    db.session.flush()
    db.session.add(Attendance(registration_id=reg.id, checked_in_by="seed"))
    db.session.commit()

    assert AuditLog.query.filter_by(entity="attendance", entity_id=aid).count() == 0

    entries = timeline_service.build_timeline(aid)
    check_ins = [e for e in entries if e["type"] == "check_in"]
    registrations = [e for e in entries if e["type"] == "registration"]

    assert len(check_ins) == 1, "the untracked check-in must appear exactly once"
    assert len(registrations) == 1
    assert check_ins[0]["method"] == "manual"
    assert "Historic Attendee" in check_ins[0]["description"]
