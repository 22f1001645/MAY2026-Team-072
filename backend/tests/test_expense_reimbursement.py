"""REIMB-01/REIMB-02 — the expense draft list and the Meetup Head's submit.

The requirement splits one screen into two authorities, and that split is the
only thing worth testing hard. Any team member builds the expense list; exactly
one person turns it into a reimbursement request, and only with a link to the
event's social post. Everything below exists to pin one of those two halves:

  * REIMB-01 — drafting is open. A row can be created, edited and re-edited by
    anyone who may manage the event, and none of it counts as a submission.
  * REIMB-02 — submitting is closed. Not the drafter, not an admin, not without
    a URL, and not with a URL that only looks like one.

The admin case has its own test rather than being folded into the non-head one.
`is_meetup_head` is documented as having no admin short-circuit precisely
because a convenience fallback there would silently rewrite three separate
"only the Meetup Head submits" rules, and a rule kept only in a docstring is a
rule that decays. This is where it stops being a comment.
"""
import base64
import io

import pytest

from app.constants import EXPENSE_DRAFT, EXPENSE_SUBMITTED
from app.extensions import db
from app.models import AuditLog, Expense
from app.services import timeline_service

from .conftest import meetup_head_user, region_org, two_hours_after

GOOD_URL = "https://www.instagram.com/p/CabcDEF123/"

# A real 1x1 PNG, not a bare signature: the sniff reads only the head, but the
# stored-file assertion compares the whole file, so a truncated stand-in would
# make that comparison prove nothing.
PNG_1X1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAE"
    "hQGAhKmMIQAAAABJRU5ErkJggg=="
)
PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
SVG_BYTES = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


def _approved_activity(
    client,
    rc_headers,
    admin_headers,
    title="Reimbursement Meetup",
    starts_at="2026-11-05T17:30:00",
):
    """One approved activity with the fixture Meetup Head on its team.

    `starts_at` is a parameter because a region may hold one meetup per month
    (the quota guardrail), so a test needing two activities has to put them in
    two different months rather than two different titles.
    """
    payload = {
        "title": title,
        "org_id": region_org().id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Somewhere",
        "starts_at": starts_at,
        "ends_at": two_hours_after(starts_at),
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


def _patch(client, aid, headers, **body):
    return client.patch(f"/api/v1/activities/{aid}/expenses", json=body, headers=headers)


# --- The column (REIMB-02, decision D-10) ---------------------------------- #


def test_expense_carries_social_post_url_and_reports_it(app):
    expense = Expense(activity_id="anything", label="Banner", amount=900)

    assert hasattr(expense, "social_post_url")
    assert "social_post_url" in expense.to_dict()
    assert expense.to_dict()["social_post_url"] is None


# --- REIMB-01: any team member drafts -------------------------------------- #


def test_draft_creates_rows_without_submitting_them(client, rc_headers, admin_headers):
    aid = _approved_activity(client, rc_headers, admin_headers)

    res = _patch(
        client,
        aid,
        rc_headers,
        expenses=[
            {"label": "Snacks", "amount": 1200, "bill_name": "snacks.pdf"},
            {"label": "Banner", "amount": 800},
        ],
        submit=False,
    )

    assert res.status_code == 200
    body = res.get_json()
    assert body["submitted"] is False
    assert len(body["expenses"]) == 2
    assert {e["status"] for e in body["expenses"]} == {EXPENSE_DRAFT}
    assert {e["social_post_url"] for e in body["expenses"]} == {None}


def test_draft_updates_an_existing_row_rather_than_duplicating_it(
    client, rc_headers, admin_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    created = _patch(
        client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}]
    ).get_json()["expenses"]
    row_id = created[0]["id"]

    res = _patch(
        client,
        aid,
        rc_headers,
        expenses=[{"id": row_id, "label": "Snacks and chai", "amount": 1450}],
    )

    assert res.status_code == 200
    rows = res.get_json()["expenses"]
    assert len(rows) == 1, "editing a row must not create a second one"
    assert rows[0]["label"] == "Snacks and chai"
    assert rows[0]["amount"] == 1450


def test_the_endpoint_refuses_someone_with_no_authority_over_the_event(
    client, rc_headers, admin_headers, student_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)

    res = _patch(client, aid, student_headers, expenses=[{"label": "Snacks", "amount": 10}])

    assert res.status_code == 403
    assert Expense.query.filter_by(activity_id=aid).count() == 0


def test_an_unknown_event_404s(client, rc_headers):
    res = _patch(client, "no-such-activity", rc_headers, expenses=[])

    assert res.status_code == 404


def test_a_row_belonging_to_another_event_cannot_be_edited_through_this_one(
    client, rc_headers, admin_headers
):
    theirs = _approved_activity(client, rc_headers, admin_headers, title="Their Meetup")
    ours = _approved_activity(
        client,
        rc_headers,
        admin_headers,
        title="Our Meetup",
        starts_at="2026-12-05T17:30:00",
    )
    foreign_id = _patch(
        client, theirs, rc_headers, expenses=[{"label": "Their banner", "amount": 500}]
    ).get_json()["expenses"][0]["id"]

    res = _patch(
        client, ours, rc_headers, expenses=[{"id": foreign_id, "label": "Mine now", "amount": 1}]
    )

    assert res.status_code == 404
    assert res.get_json()["code"] == "expense_not_found"
    assert Expense.query.get(foreign_id).label == "Their banner"


def test_an_already_submitted_row_can_no_longer_be_edited(
    client, rc_headers, admin_headers, meetup_head_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    row_id = _patch(
        client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}]
    ).get_json()["expenses"][0]["id"]
    assert _patch(
        client, aid, meetup_head_headers, submit=True, social_post_url=GOOD_URL
    ).status_code == 200

    res = _patch(client, aid, rc_headers, expenses=[{"id": row_id, "amount": 99999}])

    assert res.status_code == 409
    assert res.get_json()["code"] == "expense_not_draft"
    assert Expense.query.get(row_id).amount == 1200


# --- REIMB-02: only the Meetup Head submits -------------------------------- #


def test_submit_from_a_team_member_who_is_not_the_meetup_head_is_403(
    client, rc_headers, admin_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    res = _patch(client, aid, rc_headers, submit=True, social_post_url=GOOD_URL)

    assert res.status_code == 403
    assert Expense.query.filter_by(activity_id=aid, status=EXPENSE_SUBMITTED).count() == 0


def test_submit_from_an_admin_is_403_too(client, rc_headers, admin_headers):
    """No admin short-circuit, deliberately (RBAC-03).

    PROPOSAL-05 gives an admin the power to REASSIGN the Meetup Head, which is a
    different power from acting as one. If this test ever starts failing, the
    fix is to remove the fallback, not to update the expectation."""
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    res = _patch(client, aid, admin_headers, submit=True, social_post_url=GOOD_URL)

    assert res.status_code == 403
    assert Expense.query.filter_by(activity_id=aid, status=EXPENSE_SUBMITTED).count() == 0


def test_a_refused_submit_leaves_the_draft_list_exactly_as_it_was(
    client, rc_headers, admin_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    res = _patch(
        client,
        aid,
        rc_headers,
        expenses=[{"label": "Banner", "amount": 800}],
        submit=True,
        social_post_url=GOOD_URL,
    )

    assert res.status_code == 403
    rows = Expense.query.filter_by(activity_id=aid).all()
    assert [r.label for r in rows] == ["Snacks"], (
        "a submit the caller was not allowed to make must not half-save its rows"
    )


def test_submit_without_a_social_post_url_is_422(
    client, rc_headers, admin_headers, meetup_head_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    res = _patch(client, aid, meetup_head_headers, submit=True)

    assert res.status_code == 422
    assert res.get_json()["code"] == "missing_social_url"
    assert Expense.query.filter_by(activity_id=aid, status=EXPENSE_DRAFT).count() == 1


def test_submit_with_a_blank_social_post_url_is_422_not_400(
    client, rc_headers, admin_headers, meetup_head_headers
):
    """Whitespace is an empty field, not a malformed URL — the panel's two
    corrections are "fill this in" and "that is not a link", and a user who
    typed nothing must get the first one."""
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    res = _patch(client, aid, meetup_head_headers, submit=True, social_post_url="   ")

    assert res.status_code == 422
    assert res.get_json()["code"] == "missing_social_url"


def test_a_hostile_scheme_is_rejected_by_the_org_02_validator(
    client, rc_headers, admin_headers, meetup_head_headers
):
    """`javascript://instagram.com/%0aalert(1)` parses to an ALLOWLISTED host.
    Only the unconditional scheme check in url_safety catches it, which is the
    whole reason D-09 reuses that module instead of matching a pattern here."""
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    res = _patch(
        client,
        aid,
        meetup_head_headers,
        submit=True,
        social_post_url="javascript://instagram.com/%0aalert(1)",
    )

    assert res.status_code == 400
    assert res.get_json()["code"] == "social_url_scheme"
    assert Expense.query.filter_by(activity_id=aid, status=EXPENSE_DRAFT).count() == 1


def test_a_well_formed_url_that_is_not_a_social_post_is_rejected_on_the_host(
    client, rc_headers, admin_headers, meetup_head_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    res = _patch(
        client,
        aid,
        meetup_head_headers,
        submit=True,
        social_post_url="https://example.com/our-lovely-event",
    )

    assert res.status_code == 400
    assert res.get_json()["code"] == "social_url_host"


def test_a_suffix_lookalike_host_is_rejected(
    client, rc_headers, admin_headers, meetup_head_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    res = _patch(
        client,
        aid,
        meetup_head_headers,
        submit=True,
        social_post_url="https://instagram.com.evil.example/p/abc/",
    )

    assert res.status_code == 400
    assert res.get_json()["code"] == "social_url_host"


def test_submit_transitions_every_draft_and_stamps_the_url(
    client, rc_headers, admin_headers, meetup_head_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(
        client,
        aid,
        rc_headers,
        expenses=[
            {"label": "Snacks", "amount": 1200},
            {"label": "Banner", "amount": 800},
        ],
    )

    res = _patch(client, aid, meetup_head_headers, submit=True, social_post_url=GOOD_URL)

    assert res.status_code == 200
    body = res.get_json()
    assert body["submitted"] is True
    assert {e["status"] for e in body["expenses"]} == {EXPENSE_SUBMITTED}
    assert {e["social_post_url"] for e in body["expenses"]} == {GOOD_URL}
    assert Expense.query.filter_by(activity_id=aid, status=EXPENSE_DRAFT).count() == 0


def test_submit_can_save_the_last_row_and_submit_it_in_one_call(
    client, rc_headers, admin_headers, meetup_head_headers
):
    """The Submit button both commits the row still being typed and closes the
    list (D-11), so a row created in the same request must be submitted by it."""
    aid = _approved_activity(client, rc_headers, admin_headers)

    res = _patch(
        client,
        aid,
        meetup_head_headers,
        expenses=[{"label": "Venue", "amount": 3000}],
        submit=True,
        social_post_url=GOOD_URL,
    )

    assert res.status_code == 200
    rows = Expense.query.filter_by(activity_id=aid).all()
    assert len(rows) == 1
    assert rows[0].status == EXPENSE_SUBMITTED
    assert rows[0].social_post_url == GOOD_URL


def test_submitting_nothing_is_422(
    client, rc_headers, admin_headers, meetup_head_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)

    res = _patch(client, aid, meetup_head_headers, submit=True, social_post_url=GOOD_URL)

    assert res.status_code == 422
    assert res.get_json()["code"] == "no_expenses"


def test_submit_writes_one_activity_keyed_audit_row(
    client, rc_headers, admin_headers, meetup_head_headers
):
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])
    _patch(client, aid, meetup_head_headers, submit=True, social_post_url=GOOD_URL)

    rows = AuditLog.query.filter_by(entity="expense", entity_id=aid).all()
    assert len(rows) == 1
    assert "Reimbursement submitted" in rows[0].action
    assert rows[0].actor_name == meetup_head_user().name


# --- The seam with TIMELINE-01 --------------------------------------------- #


def test_drafts_are_not_timeline_events_but_a_submission_is(
    client, app, rc_headers, admin_headers, meetup_head_headers
):
    """Plan 06-01 excluded draft expenses from the timeline on the grounds that
    a row nobody has submitted is not an event that happened. This asserts both
    halves of that from this side, so the two plans cannot drift apart."""
    aid = _approved_activity(client, rc_headers, admin_headers)
    _patch(client, aid, rc_headers, expenses=[{"label": "Snacks", "amount": 1200}])

    drafted = [e for e in timeline_service.build_timeline(aid)
               if e["type"] == "reimbursement_submitted"]
    assert drafted == [], "a draft expense is not a timeline event"

    _patch(client, aid, meetup_head_headers, submit=True, social_post_url=GOOD_URL)

    submitted = [e for e in timeline_service.build_timeline(aid)
                 if e["type"] == "reimbursement_submitted"]
    assert len(submitted) == 1, (
        "a reimbursement appears on the timeline exactly once — the audit row "
        "and the expense table must not each contribute an entry"
    )


# --- Bill upload ----------------------------------------------------------- #
#
# The UAT pass found the "Attach Bill" control did nothing at all: there was no
# upload endpoint behind it, so an organiser could name a bill but never hand one
# over. These pin the endpoint that closes that gap, and in particular pin the
# two things a file upload gets wrong when nobody is watching — trusting the
# client's filename, and trusting the client's declared content type.


@pytest.fixture()
def uploads(app):
    """The upload directory, with every file the test created removed after.

    `instance/uploads/` is real gitignored disk shared with the dev server, so a
    test may only clean up what it made itself (the Phase 5 fixture's rule)."""
    from app.controllers.upload_controller import upload_dir

    with app.app_context():
        before = set(upload_dir().iterdir())
        yield upload_dir()
        for stale in set(upload_dir().iterdir()) - before:
            stale.unlink(missing_ok=True)


def _upload_bill(client, aid, headers, content, filename, mimetype):
    return client.post(
        f"/api/v1/activities/{aid}/expenses/bill",
        data={"bill": (io.BytesIO(content), filename, mimetype)},
        content_type="multipart/form-data",
        headers=headers,
    )


def test_bill_upload_stores_the_file_under_a_name_the_server_chose(
    client, rc_headers, admin_headers, uploads
):
    aid = _approved_activity(client, rc_headers, admin_headers)

    res = _upload_bill(client, aid, rc_headers, PNG_1X1, "My Receipt (2).PNG", "image/png")

    assert res.status_code == 200
    body = res.get_json()
    assert body["bill_name"].endswith(".png")
    assert "receipt" not in body["bill_name"].lower(), "the client's filename never becomes the path"
    assert (uploads / body["bill_name"]).read_bytes() == PNG_1X1
    # Echoed for display so the organiser can tell two receipts apart.
    assert body["original_name"] == "My Receipt (2).PNG"


def test_bill_upload_accepts_a_pdf_invoice(client, rc_headers, admin_headers, uploads):
    """A bill is as often a PDF invoice as a photo, which is why bills use their
    own allowlist rather than the image-only one posters and logos share."""
    aid = _approved_activity(client, rc_headers, admin_headers)

    res = _upload_bill(client, aid, rc_headers, PDF_BYTES, "invoice.pdf", "application/pdf")

    assert res.status_code == 200
    assert res.get_json()["bill_name"].endswith(".pdf")


def test_bill_upload_refuses_a_script_carrying_svg_dressed_as_a_png(
    client, rc_headers, admin_headers, uploads
):
    """The bytes decide, not the filename and not the content type — both of
    which cost an attacker nothing to set. An SVG is XML that can carry a
    <script>, and the serve route is public."""
    aid = _approved_activity(client, rc_headers, admin_headers)
    before = set(uploads.iterdir())

    res = _upload_bill(client, aid, rc_headers, SVG_BYTES, "receipt.png", "image/png")

    assert res.status_code == 415
    assert set(uploads.iterdir()) == before, "a refused upload leaves nothing behind"


def test_bill_upload_needs_a_file(client, rc_headers, admin_headers):
    aid = _approved_activity(client, rc_headers, admin_headers)

    res = client.post(
        f"/api/v1/activities/{aid}/expenses/bill",
        data={},
        content_type="multipart/form-data",
        headers=rc_headers,
    )

    assert res.status_code == 400
    assert res.get_json()["code"] == "missing_file"


def test_bill_upload_is_closed_to_someone_who_cannot_manage_the_event(
    client, rc_headers, admin_headers, student_headers, uploads
):
    aid = _approved_activity(client, rc_headers, admin_headers)

    res = _upload_bill(client, aid, student_headers, PNG_1X1, "a.png", "image/png")

    assert res.status_code == 403
