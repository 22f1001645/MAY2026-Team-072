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
    ContributionPoint,
    Organisation,
    User,
)
from app.rbac import can_manage_activity, can_manage_org


# --------------------------------------------------------------------------- #
# Module-local helpers                                                         #
# --------------------------------------------------------------------------- #

def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


def _auth(client, email, password):
    return {"Authorization": f"Bearer {_token(client, email, password)}"}


def _seed_activity(title="Hyderabad Dev Meetup", campaign_status=CAMPAIGN_LIVE,
                   with_crew=True):
    """Create an Activity, its crew rows, and (optionally) its CampaignPackage.

    Every task route is gated on a live campaign, so the campaign row is part of
    the fixture rather than something each test remembers to add. Pass
    ``campaign_status=None`` for the no-campaign-row case that AC-27 asserts.

    Pass ``with_crew=False`` for an activity nobody is crew on — the second
    activity TEAM-04's cross-activity leg needs, where the same user who is crew
    elsewhere is a stranger here.

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

    if with_crew:
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


# --------------------------------------------------------------------------- #
# AC-27 / AC-33: the workspace activates only after push-live                  #
# --------------------------------------------------------------------------- #

def test_tasks_403_when_campaign_not_live(client):
    """Every task route is 403 code=campaign_not_live until publication.

    Covers the absent-campaign case AND the draft case: a gate that only tested
    for a missing row would let a half-built draft campaign open the workspace
    (T-05-21).
    """
    h = _auth(client, "crew@ekatva.os", "crew12345")

    for campaign_status in (None, CAMPAIGN_DRAFT):
        activity = _seed_activity(
            f"Unpublished {campaign_status}", campaign_status=campaign_status
        )
        aid = activity.id
        # A real row to address, created behind the gate rather than through it.
        task = ActivityTask(activity_id=aid, title="Invisible", created_by=None)
        db.session.add(task)
        db.session.commit()
        tid = task.id

        calls = [
            client.get(f"/api/v1/activities/{aid}/tasks", headers=h),
            client.post(
                f"/api/v1/activities/{aid}/tasks", json={"title": "New"}, headers=h
            ),
            client.patch(
                f"/api/v1/activities/{aid}/tasks/{tid}",
                json={"status": "done"},
                headers=h,
            ),
            client.delete(f"/api/v1/activities/{aid}/tasks/{tid}", headers=h),
        ]
        for res in calls:
            assert res.status_code == 403, (campaign_status, res.get_json())
            assert res.get_json()["code"] == "campaign_not_live"

    # After push-live the same read succeeds.
    live = _seed_activity("Published")
    res = client.get(f"/api/v1/activities/{live.id}/tasks", headers=h)
    assert res.status_code == 200, res.get_json()


# --------------------------------------------------------------------------- #
# AC-31 / AC-32: deterministic board order                                     #
# --------------------------------------------------------------------------- #

def test_task_ordering(client):
    """Tasks come back in (position, created_at, id) order. (AC-31)"""
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    for pos, title in [(2, "C"), (0, "A"), (1, "B")]:
        res = client.post(
            f"/api/v1/activities/{aid}/tasks",
            json={"title": title, "position": pos},
            headers=h,
        )
        assert res.status_code == 201, res.get_json()

    res = client.get(f"/api/v1/activities/{aid}/tasks", headers=h)
    assert [t["title"] for t in res.get_json()] == ["A", "B", "C"]


def test_task_ordering_tiebreak_on_equal_position(client):
    """Equal positions fall back to created_at, then id. (AC-32)

    B is created FIRST and A second, both at position 0, so a position-only sort
    would leave the pair in whatever order SQLite happened to return. Asserting
    B first proves the backref's three-element order_by tuple is doing the work
    — this test is the guard against a future service-side re-sort dropping it.
    """
    h = _auth(client, "crew@ekatva.os", "crew12345")
    activity = _seed_activity()
    aid = activity.id

    for title in ("B", "A"):
        res = client.post(
            f"/api/v1/activities/{aid}/tasks",
            json={"title": title, "position": 0},
            headers=h,
        )
        assert res.status_code == 201, res.get_json()

    res = client.get(f"/api/v1/activities/{aid}/tasks", headers=h)
    rows = res.get_json()
    assert [t["title"] for t in rows] == ["B", "A"]
    assert [t["position"] for t in rows] == [0, 0]


# --------------------------------------------------------------------------- #
# TEAM-04 / AC-37 / AC-38: volunteer points require real crew membership       #
# --------------------------------------------------------------------------- #

def _volunteer(client, activity_id, user_id, headers, role_name="Logistics"):
    return client.post(
        f"/api/v1/events/{activity_id}/volunteer",
        json={"user_id": user_id, "role_name": role_name},
        headers=headers,
    )


def _volunteer_points(user_id, activity_id):
    db.session.expire_all()
    return ContributionPoint.query.filter_by(
        user_id=user_id, activity_id=activity_id, action="volunteered"
    ).count()


def test_volunteer_points_non_crew(client, rc_headers):
    """Awarding to someone with no crew row on this activity is refused, and the
    refusal leaves the recognition ledger untouched. (AC-37)

    The ledger count is asserted alongside the status because the two can
    disagree: a membership check placed after the first ``db.session.add`` would
    still answer 403 while leaving the ContributionPoint row behind, and a
    status-only assertion would call that a pass.

    The organiser here is the RC, whose POR satisfies the route's coarse
    ``organiser_required`` guard — which is the point of TEAM-04. That guard is
    happy with any organiser POR anywhere and says nothing at all about the
    *target* user id, so the only thing standing between an arbitrary user id
    and a points row is the service-tier check.
    """
    activity = _seed_activity()
    student = User.query.filter_by(email="arav@ekatva.os").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()

    res = _volunteer(client, activity.id, student.id, rc_headers)
    assert res.status_code == 403, res.get_json()
    assert res.get_json()["code"] == "not_crew_member"
    assert _volunteer_points(student.id, activity.id) == 0

    # Cross-activity leg: crew membership is per activity, never global. The
    # same user who is crew on the meetup above is a stranger to this one.
    other = _seed_activity("Chennai Dev Meetup", with_crew=False)
    res = _volunteer(client, other.id, crew.id, rc_headers)
    assert res.status_code == 403, res.get_json()
    assert res.get_json()["code"] == "not_crew_member"
    assert _volunteer_points(crew.id, other.id) == 0


def test_volunteer_points_crew(client, rc_headers):
    """A real crew member is awarded exactly one ledger row. (AC-38)"""
    activity = _seed_activity()
    crew = User.query.filter_by(email="crew@ekatva.os").first()

    res = _volunteer(client, activity.id, crew.id, rc_headers)
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["action"] == "volunteered"
    assert _volunteer_points(crew.id, activity.id) == 1


# --------------------------------------------------------------------------- #
# TEAM-03 / AC-36 and PROB-P4: crew membership is confined to its own activity #
# --------------------------------------------------------------------------- #

def test_team_role_grants_no_org_permission(client, app, crew_headers, student_headers):
    """A crew row grants authority over its activity and nothing org-wide. (AC-36)

    Two halves. The predicates state the asymmetry directly, so the rule is
    still asserted even on a day when the org route surface happens to be empty.
    The url_map walk then proves it over HTTP for every route that names an
    ``<org_id>`` — including routes that do not exist yet. Naming one endpoint
    would go stale the moment another org route lands; walking the map means the
    new one is covered on the day it appears.

    The HTTP half is differential rather than a flat "everything is 403", because
    one org route legitimately answers any authenticated reader today:
    ``GET /orgs/<org_id>/profile`` is public within the app (04-04). What TEAM-03
    actually claims is that crew membership adds nothing org-wide — so the test
    compares the crew user against a plain student who holds neither a POR nor a
    crew row anywhere. Identical statuses everywhere is exactly that claim, and
    it needs no exemption list to stay true. Writes are additionally pinned at
    403, since no org write is ever open to an ordinary reader.

    If a future org route legitimately treats a crew member differently from any
    other authenticated user, this assertion is the right place to have that
    conversation — not a place to add a quiet exemption.
    """
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    activity = _seed_activity()

    assert can_manage_activity(crew, activity) is True
    for org in Organisation.query.all():
        assert can_manage_org(crew, org) is False, org.name

    org_id = Organisation.query.filter_by(type="region").first().id
    rules = [r for r in app.url_map.iter_rules() if "<org_id>" in r.rule]
    assert rules, "no <org_id> routes found — the walk would assert nothing"

    for rule in rules:
        path = rule.rule.replace("<org_id>", org_id)
        for method in sorted((rule.methods or set()) - {"HEAD", "OPTIONS"}):
            crew_res = client.open(path, method=method, headers=crew_headers)
            plain_res = client.open(path, method=method, headers=student_headers)
            assert crew_res.status_code == plain_res.status_code, (
                f"{method} {rule.rule} answers the crew user "
                f"{crew_res.status_code} but a plain student "
                f"{plain_res.status_code} — a crew row bought org-wide access."
            )
            if method != "GET":
                assert crew_res.status_code == 403, (method, rule.rule)


def test_removed_member_loses_access(client, crew_headers):
    """Deleting the crew row revokes workspace access on the very next request.

    The same bearer token is used before and after the deletion: access must die
    with the row, not with the session. A cached capability or a grant baked into
    the token at login would pass step one and fail here (PROB-P4).
    """
    activity = _seed_activity()
    head = User.query.filter_by(email="head@ekatva.os").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()

    # The fixture also makes the crew user the activity's organiser, and that is
    # an independent grant in can_manage_activity. Hand the activity to the
    # Meetup Head so the crew row is the only thing under test.
    activity.organiser_id = head.id
    db.session.commit()
    aid = activity.id

    res = client.get(f"/api/v1/activities/{aid}/tasks", headers=crew_headers)
    assert res.status_code == 200, res.get_json()

    row = ActivityTeamMember.query.filter_by(activity_id=aid, user_id=crew.id).first()
    db.session.delete(row)
    db.session.commit()

    res = client.get(f"/api/v1/activities/{aid}/tasks", headers=crew_headers)
    assert res.status_code == 403, res.get_json()
