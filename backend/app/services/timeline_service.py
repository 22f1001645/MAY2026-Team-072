"""TIMELINE-01 — the event timeline, assembled as a read-only projection.

There is deliberately no `timeline` table. Every entry here is derived from a
row that some other part of the system already owns — AuditLog, Registration,
Attendance, CampaignPackage, Report, Expense — so the timeline cannot drift from
the records it describes, and nothing in this module writes.

The two-source problem
----------------------
TIMELINE-02 backfilled AuditLog writes into `registration_service`,
`attendance_service` and `expense_service`, which had claimed to record audit
events and never did. That backfill only covers what happens from now on: every
event that ran before it has real Registration and Attendance rows and no audit
rows at all. So the projection reads BOTH, and would double-count if it simply
concatenated them.

The de-duplication rule is a cutoff, not a flag. For each backfilled entity the
projection takes the earliest audit row's timestamp and emits direct-table
entries only for rows older than it. An activity with no audit rows falls back
entirely to the tables (the historic case); an activity created after the
backfill has an audit row for everything and adds nothing from the tables (the
normal case); an activity that straddles the backfill — check-ins both before
and after it — gets each half from exactly one source, which a per-entity
on/off switch could not do.
"""
import json
from datetime import UTC

from ..constants import (
    ATTENDANCE_METHOD_MANUAL,
    CAMPAIGN_LIVE,
    EXPENSE_DRAFT,
    REPORT_SUBMITTED,
)
from ..models import (
    Attendance,
    AuditLog,
    CampaignPackage,
    Expense,
    Registration,
    Report,
    User,
    _iso,
)

# --- Entry types (D-06, in the order they normally occur) ------------------- #
TYPE_PROPOSAL_SUBMITTED = "proposal_submitted"
TYPE_ADMIN_APPROVED = "admin_approved"
TYPE_REGISTRATION = "registration"
TYPE_CAMPAIGN_LIVE = "campaign_live"
TYPE_CHECK_IN = "check_in"
TYPE_REPORT_SUBMITTED = "report_submitted"
TYPE_REIMBURSEMENT_SUBMITTED = "reimbursement_submitted"

# The AuditLog entities that are activity-scoped — i.e. whose `entity_id` holds
# an activity id. `campaign` and `report` audit rows are keyed on their own row
# id and are NOT listed here; those two events come from their tables instead,
# which is also why they need no cutoff.
PROJECTED_ENTITIES = ("proposal", "registration", "attendance", "expense")

# Proposal audit actions are written as prose by proposal_service. Mapping them
# here rather than parsing the string keeps the wire types stable if the prose
# is ever reworded.
_PROPOSAL_ACTION_TYPES = {
    "Submitted proposal": TYPE_PROPOSAL_SUBMITTED,
    "Approved & auto-published": TYPE_ADMIN_APPROVED,
    "Requested changes": "proposal_changes_requested",
    "Rejected": "proposal_rejected",
    "Revoked": "proposal_revoked",
}

_ENTITY_TYPES = {
    "registration": TYPE_REGISTRATION,
    "attendance": TYPE_CHECK_IN,
    "expense": TYPE_REIMBURSEMENT_SUBMITTED,
}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _naive_utc(dt):
    """Comparable form of a timestamp.

    SQLite hands back naive datetimes while `models._utcnow()` produces
    tz-aware ones, and Python refuses to order the two against each other. Every
    timestamp in this schema means UTC, so dropping the tzinfo loses nothing and
    makes the whole projection sortable in one pass.
    """
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(UTC).replace(tzinfo=None)
    return dt


def _note(raw):
    """The structured half of an audit row, when there is one.

    TIMELINE-02 rows carry JSON here (D-07); rows written before it carry a bare
    label, and older ones carry nothing. All three have to survive this call,
    so a value that is not a JSON object is simply not structured detail."""
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _predates(at, cutoff):
    """True when a table row belongs to the era before the audit backfill.

    `cutoff is None` means this activity has no audit rows for the entity at
    all, so the table is the only source and every row qualifies."""
    if cutoff is None:
        return True
    at = _naive_utc(at)
    return at is None or at < cutoff


def _actor_name(user_id):
    if not user_id:
        return None
    user = User.query.get(user_id)
    return user.name if user else None


def _entry(entry_type, description, at, actor=None, method=None):
    """One timeline entry, paired with the key it sorts on.

    The sort key is kept beside the entry rather than inside it so the wire
    shape stays exactly the four documented keys plus `method`, and so sorting
    never depends on string formatting."""
    return (
        _naive_utc(at),
        {
            "type": entry_type,
            "description": description,
            "actor": actor,
            "method": method,
            "at": _iso(at),
        },
    )


def _type_of(log):
    if log.entity == "proposal":
        return _PROPOSAL_ACTION_TYPES.get(log.action, "proposal_update")
    return _ENTITY_TYPES.get(log.entity, log.entity or "event")


# --------------------------------------------------------------------------- #
# The projection
# --------------------------------------------------------------------------- #
def build_timeline(activity_id: str) -> list[dict]:
    """TIMELINE-01 — the chronological history of one activity.

    Returns a list of `{type, description, actor, method, at}` sorted ascending
    by `at`. An activity with no history returns `[]` — an empty timeline is a
    true answer about a brand-new event, not an error.
    """
    if not activity_id:
        return []

    entries = []

    # --- 1. Audit rows: the record of intent, for everything that has one ---
    logs = (
        AuditLog.query.filter(
            AuditLog.entity_id == activity_id,
            AuditLog.entity.in_(PROJECTED_ENTITIES),
        )
        .order_by(AuditLog.created_at.asc())
        .all()
    )

    # Earliest audit row per entity — the boundary between "the tables are the
    # only record" and "the audit log is the record".
    cutoffs = {}
    for log in logs:
        at = _naive_utc(log.created_at)
        if at is None:
            continue
        current = cutoffs.get(log.entity)
        if current is None or at < current:
            cutoffs[log.entity] = at

    for log in logs:
        note = _note(log.note)
        entries.append(
            _entry(
                _type_of(log),
                log.action or "",
                log.created_at,
                actor=log.actor_name,
                method=note.get("method"),
            )
        )

    # --- 2. First registration (pre-backfill events only) ------------------- #
    first_reg = (
        Registration.query.filter_by(activity_id=activity_id)
        .order_by(Registration.created_at.asc())
        .first()
    )
    if first_reg is not None and _predates(first_reg.created_at, cutoffs.get("registration")):
        student = first_reg.student.name if first_reg.student else "A student"
        entries.append(
            _entry(
                TYPE_REGISTRATION,
                f"First registration: {student}",
                first_reg.created_at,
                actor=student,
            )
        )

    # --- 3. Campaign pushed live (CAMPAIGN-06) ------------------------------ #
    campaign = CampaignPackage.query.filter_by(activity_id=activity_id).first()
    if campaign is not None and campaign.status == CAMPAIGN_LIVE:
        entries.append(
            _entry(
                TYPE_CAMPAIGN_LIVE,
                "Campaign pushed live",
                campaign.pushed_live_at or campaign.updated_at or campaign.created_at,
                actor=_actor_name(campaign.approved_by),
            )
        )

    # --- 4. Individual check-ins (pre-backfill events only) ----------------- #
    attendance_cutoff = cutoffs.get("attendance")
    attendances = (
        Attendance.query.join(Registration, Attendance.registration_id == Registration.id)
        .filter(Registration.activity_id == activity_id)
        .all()
    )
    for attendance in attendances:
        if not _predates(attendance.created_at, attendance_cutoff):
            continue
        reg = attendance.registration
        student = reg.student.name if reg is not None and reg.student else "unknown"
        method = attendance.method or ATTENDANCE_METHOD_MANUAL
        entries.append(
            _entry(
                TYPE_CHECK_IN,
                f"Checked in: {student} ({method})",
                attendance.created_at,
                actor=student,
                method=method,
            )
        )

    # --- 5. Post-event report submitted (FEEDBACK-01) ----------------------- #
    reports = Report.query.filter_by(activity_id=activity_id).all()
    for report in reports:
        if report.deleted_at is not None or report.status != REPORT_SUBMITTED:
            continue
        entries.append(
            _entry(
                TYPE_REPORT_SUBMITTED,
                "Post-event report submitted",
                report.submitted_at or report.created_at,
                actor=_actor_name(report.submitted_by),
            )
        )

    # --- 6. Reimbursement submitted (pre-backfill events only) -------------- #
    # Draft rows are excluded on purpose: REIMB-01 makes `draft` a pre-submission
    # state, and a row nobody has submitted is not an event that happened.
    first_expense = (
        Expense.query.filter(
            Expense.activity_id == activity_id,
            Expense.status != EXPENSE_DRAFT,
        )
        .order_by(Expense.created_at.asc())
        .first()
    )
    if first_expense is not None and _predates(first_expense.created_at, cutoffs.get("expense")):
        entries.append(
            _entry(
                TYPE_REIMBURSEMENT_SUBMITTED,
                f"Reimbursement submitted: {first_expense.label} ({first_expense.amount})",
                first_expense.created_at,
                actor=_actor_name(first_expense.submitted_by),
            )
        )

    # Rows with no timestamp at all sort first rather than raising — the
    # timeline degrading in order is survivable, a 500 is not.
    entries.sort(key=lambda pair: (pair[0] is not None, pair[0]))
    return [entry for _, entry in entries]
