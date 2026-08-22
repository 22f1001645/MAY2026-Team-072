import json
from uuid import uuid4

from ..controllers.upload_controller import (
    IMAGE_MAGIC_BYTES,
    served_path,
    sniff_bill_ext,
    upload_dir,
)
from ..constants import (
    ACTIVITY_FEE_INR,
    EXPENSE_DRAFT,
    EXPENSE_FLOW,
    EXPENSE_SUBMITTED,
    EXPENSE_VERIFIED,
    EXPENSE_APPROVED,
    EXPENSE_PAID,
    ROLE_ADMIN,
    SOCIAL_PLATFORM_KEYS,
)
from ..errors import ApiError
from ..extensions import db
from ..models import Expense, Notification, User
from ..rbac import is_meetup_head
from ..repositories.repos import ActivityRepository, AuditRepository, ExpenseRepository
from ..url_safety import REJECT_HOST, check_social_url, check_website_url


def submit_expense(data: dict, organiser) -> Expense:
    activity = ActivityRepository.by_id(data["activity_id"])
    if not activity:
        raise ApiError("Activity not found", "activity_not_found", 404)

    expense = Expense(
        activity_id=activity.id,
        budget_line_id=data.get("budget_line_id"),
        label=data["label"],
        amount=data["amount"],
        status=EXPENSE_SUBMITTED,
        bill_name=data.get("bill_name", "bill.pdf"),
        submitted_by=organiser.id,
    )
    db.session.add(expense)

    # TIMELINE-02 — this row used to be keyed on `expense.id`, which was always
    # null: the UUID default is applied at INSERT, and this call ran before the
    # flush, so every "Expense submitted" audit row ever written carried
    # entity_id=None and belonged to nothing. Keying it on `activity_id` both
    # fixes that and puts the submission where its two readers look — the
    # activity audit trail and the Phase 6 timeline projection. The pipeline
    # rows written by advance()/bulk_advance() stay keyed on the expense id:
    # those are admin-side status moves, not events in the organiser's timeline.
    db.session.flush()
    AuditRepository.record(
        "expense",
        expense.activity_id,
        f"Expense submitted: {expense.label} ({expense.amount})",
        organiser,
        note=json.dumps(
            {
                "expense_id": expense.id,
                "label": expense.label,
                "amount": expense.amount,
            }
        ),
    )
    db.session.commit()
    return expense


# --------------------------------------------------------------------------- #
# REIMB-01 / REIMB-02 - the draft list and the Meetup Head's submit
# --------------------------------------------------------------------------- #

# The two rejections a social post link can earn. Worded for the Reimbursement
# panel rather than reused verbatim from org_profile_service: the host message
# there names "this platform" because that editor has a platform per row, and
# this one field has none.
_URL_REJECTION_MESSAGES = {
    "social_url_scheme": "A link must start with http:// or https://.",
    "social_url_host": "That link is not on a social platform this system recognises.",
}


def _validated_social_post_url(raw):
    """Decision D-09: the social post link runs the ORG-02 allowlist, unchanged.

    A post lives on one of the six known platforms but the client never says
    which, so the URL is offered to each in turn and the first acceptance wins.
    That reuses check_social_url exactly as the organisation profile does -
    scheme allowlist first and unconditionally, then credentials, ports, IP
    literals, non-ASCII hosts and the suffix-attack guard - rather than standing
    a second, weaker parser beside it (the parser-differential class of bug the
    whole module exists to close).

    When every platform refuses it, check_website_url runs the same controls
    WITHOUT the host allowlist to tell the two failures apart: a value it also
    refuses is malformed (social_url_scheme), and a value it accepts is a
    perfectly good URL that simply is not a social post (social_url_host).
    Those are different user corrections, so they keep different codes.

    Returns the normalised URL to store; raises ApiError 400 otherwise.
    """
    candidate = (raw or "").strip()
    for platform in SOCIAL_PLATFORM_KEYS:
        normalised, _error = check_social_url(candidate, platform)
        if normalised:
            return normalised

    _site, error = check_website_url(candidate)
    code = error or REJECT_HOST
    raise ApiError(
        _URL_REJECTION_MESSAGES[code], code, 400, {"field": "social_post_url"}
    )


def draft_and_submit(activity_id, rows, submit, social_post_url, user):
    """REIMB-01/REIMB-02 - save the expense draft list; optionally submit it.

    Two requirements share one call because they share one button (decision
    D-11). Any team member may build and edit the draft list; only the Meetup
    Head may turn it into a reimbursement request, and only with a validated
    link to the event's social post.

    Every submit gate is checked BEFORE a single row is touched, following
    org_profile_service.replace_social_links: a rejected submit must leave the
    draft list exactly as the organiser left it, not half-saved by the same call
    that refused them. The gates run in the order the user meets them -
    authority (403), then the missing link (422), then a malformed one (400).
    """
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)

    normalised_url = None
    if submit:
        # No admin fallback, deliberately. is_meetup_head is documented as "the
        # one accountable submitter" and REIMB-01 is one of its three named
        # readers; an admin short-circuit here would quietly restate the rule as
        # "the Meetup Head or anyone senior to them" (RBAC-03).
        if not is_meetup_head(user, activity):
            raise ApiError(
                "Only the assigned Meetup Head of this event may submit the "
                "reimbursement",
                "forbidden",
                403,
            )
        if not (social_post_url or "").strip():
            raise ApiError(
                "A link to the event's social post is required to submit the "
                "reimbursement",
                "missing_social_url",
                422,
            )
        normalised_url = _validated_social_post_url(social_post_url)

    for row in rows:
        row_id = row.get("id")
        if row_id:
            expense = ExpenseRepository.by_id(row_id)
            # An id naming another event's expense is refused rather than
            # ignored: silently skipping it would report success for an edit
            # that never happened, and honouring it would let a team member
            # rewrite a bill on an event they have no authority over - the
            # activity guard on this route only ever checked the URL's id.
            if expense is None or expense.activity_id != activity_id:
                raise ApiError("Expense not found", "expense_not_found", 404)
            # Draft rows only. Once a bill is submitted it is in the admin
            # pipeline (EXPENSE_FLOW), and letting this endpoint rewrite its
            # amount would mean an approved figure could change after approval.
            if expense.status != EXPENSE_DRAFT:
                raise ApiError(
                    "A submitted expense can no longer be edited",
                    "expense_not_draft",
                    409,
                )
            # None means "not mentioned", never "clear it". The schema fills
            # every absent key with None, so reading them with .get(key, default)
            # would blank a label the client never sent (the EditEventSchema
            # partial-PATCH rule).
            for field in ("label", "amount", "bill_name"):
                if row.get(field) is not None:
                    setattr(expense, field, row[field])
        else:
            db.session.add(
                Expense(
                    activity_id=activity_id,
                    label=row["label"],
                    # A draft is a working document: an amount the organiser has
                    # not looked up yet is 0, not a 422 on the whole payload.
                    amount=row.get("amount") or 0,
                    bill_name=row.get("bill_name"),
                    status=EXPENSE_DRAFT,
                    submitted_by=user.id,
                )
            )

    if submit:
        # Flush so rows created moments ago in this same call are visible to the
        # query below - the submit button saves the row still being typed and
        # then submits it, in that order.
        db.session.flush()
        drafts = Expense.query.filter_by(
            activity_id=activity_id, status=EXPENSE_DRAFT
        ).all()
        if not drafts:
            raise ApiError("There are no expenses to submit", "no_expenses", 422)
        for expense in drafts:
            expense.status = EXPENSE_SUBMITTED
            expense.social_post_url = normalised_url

        total = sum(expense.amount or 0 for expense in drafts)
        # Keyed on the activity, matching submit_expense() above and the
        # TIMELINE-01 projection, which reads an event's audit trail by activity
        # id and knows nothing about individual expense ids.
        AuditRepository.record(
            "expense",
            activity_id,
            f"Reimbursement submitted: {len(drafts)} bill(s), total {total}",
            user,
            note=json.dumps(
                {
                    "expense_ids": [expense.id for expense in drafts],
                    "count": len(drafts),
                    "total": total,
                    "social_post_url": normalised_url,
                }
            ),
        )

    db.session.commit()
    return {
        "expenses": [e.to_dict() for e in ExpenseRepository.for_activity(activity_id)],
        "submitted": bool(submit),
    }


def advance(expense_id: str, admin) -> Expense:
    """Move one step along Submitted → Verified → Approved → Paid (FR-E3/E4).
    The system tracks status only; it never moves real money (FR-E6)."""
    expense = ExpenseRepository.by_id(expense_id)
    if not expense:
        raise ApiError("Expense not found", "expense_not_found", 404)

    idx = EXPENSE_FLOW.index(expense.status)
    if idx >= len(EXPENSE_FLOW) - 1:
        raise ApiError("Expense is already marked paid", "already_paid", 409)

    next_status = EXPENSE_FLOW[idx + 1]
    
    if next_status == EXPENSE_APPROVED:
        activity = expense.activity
        if activity:
            approved_total = sum(e.amount for e in activity.expenses if e.status in (EXPENSE_APPROVED, EXPENSE_PAID))
            max_allowed = ACTIVITY_FEE_INR * activity.attended_count()
            if (approved_total + expense.amount) > max_allowed:
                raise ApiError(f"Reimbursement cap exceeded. Max allowed based on actual check-ins is ₹{max_allowed}.", "cap_exceeded", 409)

    expense.status = next_status
    AuditRepository.record(
        "expense", expense.id, f"Advanced to {expense.status}", admin
    )
    
    if next_status == EXPENSE_VERIFIED and expense.activity:
        admins = User.query.filter_by(role=ROLE_ADMIN).all()
        for a in admins:
            db.session.add(
                Notification(
                    user_id=a.id,
                    activity_id=expense.activity_id,
                    type="approval",
                    title="Expense Verified",
                    body=f"An expense of ₹{expense.amount} for '{expense.activity.title}' is ready for final admin approval.",
                    target_role="admin"
                )
            )
            
    db.session.commit()
    return expense


def store_bill(activity, file_storage, actor) -> dict:
    """Store an uploaded bill and hand back the name to put on the expense row.

    Reuses Phase 4's upload primitive wholesale — `upload_dir` for the
    destination and `sniff_bill_ext` for the format decision — rather than
    defining a second allowlist or a second directory resolver, which would
    drift apart from the `nosniff` serve header that depends on them.

    The stored name is `uuid4().hex` plus the extension the SNIFF produced. The
    client's filename is never joined into a path and never stored, and the
    part's declared content type is not consulted: both are free for a caller to
    set. `original_name` is echoed back for display only, so the organiser can
    tell which receipt is which, and it never reaches the filesystem.

    Nothing is written until the bytes have been accepted, so a refused upload
    leaves no file behind.
    """
    head = file_storage.read(IMAGE_MAGIC_BYTES)
    file_storage.seek(0)                    # the sniff must not eat the file

    ext = sniff_bill_ext(head)
    if ext is None:
        raise ApiError(
            "Attach a PNG, JPG, WebP or PDF bill.",
            "unsupported_media_type",
            415,
        )

    name = f"{uuid4().hex}{ext}"
    file_storage.save(str(upload_dir() / name))

    AuditRepository.record("expense", activity.id, "Bill uploaded", actor)
    db.session.commit()

    return {
        "bill_name": name,
        "bill_url": served_path(name),
        "original_name": file_storage.filename,
    }


def for_activity(activity_id):
    return ExpenseRepository.for_activity(activity_id)


def all_expenses():
    return ExpenseRepository.all()


def bulk_advance(expense_ids: list, admin) -> list:
    """FR-E3 — Bulk advance multiple expense bills at once."""
    updated = []
    for eid in expense_ids:
        expense = ExpenseRepository.by_id(eid)
        if not expense:
            continue
        idx = EXPENSE_FLOW.index(expense.status)
        if idx < len(EXPENSE_FLOW) - 1:
            expense.status = EXPENSE_FLOW[idx + 1]
            AuditRepository.record("expense", expense.id, f"Bulk advanced to {expense.status}", admin)
            updated.append(expense)
    db.session.commit()
    return updated
