from datetime import datetime, UTC

from ..constants import (
    ACTIVITY_FEE_INR,
    BUDGET_CAPACITY_RATE,
    BUDGET_ABSOLUTE_CEILING,
    COLLAB_ACCEPTED,
    COLLAB_DECLINED,
    COLLAB_PENDING,
    EVENT_UPCOMING,
    EVENT_CANCELLED,
    FEST_COLLAB_THRESHOLD,
    MEETUPS_PER_CITY_PER_MONTH,
    MEGA_MEETUP_THRESHOLD,
    ORG_MANAGER_PORS,
    PROPOSAL_APPROVED,
    PROPOSAL_CHANGES,
    PROPOSAL_REJECTED,
    PROPOSAL_REVOKED,
    PROPOSAL_SUBMITTED,
    REPORT_DRAFT,
    REPORT_SUBMITTED,
    ROLE_ADMIN,
    TEAM_ROLES,
    TEAM_ROLE_MEETUP_HEAD,
)
from .progression_service import (
    assert_fest_collaborators_accepted,
    assert_fest_eligible,
    fest_eligibility,
    record_unlock,
)
from .settings_service import get_recognition_points
from ..errors import ApiError
from ..extensions import db
from ..models import (
    Activity,
    ActivityCollaborator,
    ActivityTeamMember,
    BudgetLine,
    ContributionPoint,
    Notification,
    Proposal,
    Report,
    User,
)
from ..rbac import has_organiser_por_in_org, is_meetup_head
from ..repositories.repos import ActivityRepository, AuditRepository, OrgRepository


def submit_proposal(data: dict, organiser) -> Activity:
    org = OrgRepository.by_id(data["org_id"])
    if not org:
        raise ApiError("Organisation not found", "org_not_found", 404)

    # PROPOSAL-00: submitter must hold an active organiser POR in the primary org.
    # Admin users bypass this check — they can propose on behalf of any org.
    if organiser.role != ROLE_ADMIN and not has_organiser_por_in_org(organiser, org):
        raise ApiError(
            "You must hold an active organiser POR in this organisation to propose on its behalf",
            "forbidden",
            403,
        )

    # BUDGET-01: hard cap for meetup scales (regional_fest is sponsor-funded, exempt).
    if data["scale"] in ("local_meetup", "regional_meetup"):
        requested = sum(line["planned"] for line in data.get("budget", []))
        allowed = min(data["capacity"] * BUDGET_CAPACITY_RATE, BUDGET_ABSOLUTE_CEILING)
        if requested > allowed:
            raise ApiError(
                f"Budget \u20b9{requested:,} exceeds the cap of \u20b9{allowed:,} "
                f"for a {data['capacity']}-person {data['scale'].replace('_', ' ')} "
                f"(\u20b9{BUDGET_CAPACITY_RATE}/person, max \u20b9{BUDGET_ABSOLUTE_CEILING:,})",
                "budget_cap_exceeded",
                400,
            )

    # PROG-01/PROG-04: fest tier is earned, not requested. No admin carve-out —
    # the ROLE_ADMIN bypass above covers the POR check only.
    if data["scale"] == "regional_fest":
        assert_fest_eligible(data["org_id"], data["city"])

    # PROPOSAL-02: validate team roster — exactly one Meetup Head required.
    team = data.get("team", [])
    meetup_heads = [m for m in team if m["role"] == TEAM_ROLE_MEETUP_HEAD]
    if len(meetup_heads) == 0:
        raise ApiError(
            "A proposal must name exactly one Meetup Head",
            "invalid_team",
            400,
        )
    if len(meetup_heads) > 1:
        raise ApiError(
            "A proposal must name exactly one Meetup Head",
            "invalid_team",
            400,
        )
    for member in team:
        if member["role"] not in TEAM_ROLES:
            raise ApiError(f"Invalid team role: {member['role']!r}", "invalid_role", 400)
        if not User.query.get(member["user_id"]):
            raise ApiError(f"Team member not found: {member['user_id']!r}", "user_not_found", 404)

    # Quota guardrail (FR-B2): one meetup per region per month.
    if data["scale"] in ("local_meetup", "regional_meetup"):
        count = ActivityRepository.meetups_in_region_month(data["org_id"], data["starts_at"])
        if count >= MEETUPS_PER_CITY_PER_MONTH:
            raise ApiError(
                f"Quota guardrail: this region already has a meetup this month",
                "quota_exceeded",
                409,
            )

    # PROPOSAL-01: validate collaborating org IDs before writing anything.
    collab_org_ids_raw = data.get("collaborating_org_ids", [])
    seen_org_ids = {org.id}
    valid_collab_orgs = []
    for collab_org_id in collab_org_ids_raw:
        if collab_org_id in seen_org_ids:
            continue  # deduplicate silently; primary appearing in list is ignored
        collab_org = OrgRepository.by_id(collab_org_id)
        if not collab_org:
            raise ApiError(
                f"Collaborating organisation not found: {collab_org_id!r}",
                "org_not_found",
                404,
            )
        seen_org_ids.add(collab_org_id)
        valid_collab_orgs.append(collab_org)

    # PROG-02 (D-01, named half): a Regional Fest must name at least
    # FEST_COLLAB_THRESHOLD organisations INCLUDING the primary. Counted off
    # valid_collab_orgs, never data["collaborating_org_ids"] — the raw request
    # list is undeduplicated, so six repeats of one id would otherwise pass.
    # The accepted-count half of this rule is enforced at approve time; it could
    # never pass here, on a proposal whose invites have not been answered yet.
    if data["scale"] == "regional_fest":
        named = len(valid_collab_orgs) + 1
        if named < FEST_COLLAB_THRESHOLD:
            raise ApiError(
                f"A Regional Fest needs at least {FEST_COLLAB_THRESHOLD} collaborating "
                f"organisations; this proposal names {named} of {FEST_COLLAB_THRESHOLD} "
                f"(counting your own organisation).",
                "fest_collaborators_required",
                403,
            )

    # --- All validation passed; write to DB ---

    activity = Activity(
        org_id=org.id,
        title=data["title"],
        description=data.get("description", ""),
        city=data["city"],
        scale=data["scale"],
        venue=data["venue"],
        starts_at=data["starts_at"],
        capacity=data["capacity"],
        status=EVENT_UPCOMING,
        organiser_id=organiser.id,
    )
    db.session.add(activity)
    db.session.flush()

    for line in data.get("budget", []):
        db.session.add(
            BudgetLine(activity_id=activity.id, label=line["label"], planned=line["planned"])
        )

    # PROPOSAL-02: write team roster rows.
    for member in team:
        db.session.add(ActivityTeamMember(
            activity_id=activity.id,
            user_id=member["user_id"],
            role=member["role"],
            added_by=organiser.id,
        ))

    # PROPOSAL-01: write primary org as an accepted ActivityCollaborator.
    now = datetime.now(UTC)
    db.session.add(ActivityCollaborator(
        activity_id=activity.id,
        org_id=org.id,
        is_primary=True,
        status=COLLAB_ACCEPTED,
        invited_by=organiser.id,
        responded_by=organiser.id,
        responded_at=now,
    ))

    # PROPOSAL-01 + PROPOSAL-06: write secondary collaborating orgs as pending invites
    # and notify their authority holders.
    for collab_org in valid_collab_orgs:
        db.session.add(ActivityCollaborator(
            activity_id=activity.id,
            org_id=collab_org.id,
            is_primary=False,
            status=COLLAB_PENDING,
            invited_by=organiser.id,
        ))
        _notify_collab_invite(activity, org, collab_org)

    proposal = Proposal(activity_id=activity.id, submitted_by=organiser.id, status=PROPOSAL_SUBMITTED)
    db.session.add(proposal)

    AuditRepository.record("proposal", activity.id, "Submitted proposal", organiser)
    
    # Notify all admins of the new proposal
    _notify_admins(activity.id, "approval", "New Proposal Submitted", f"{organiser.name} has submitted '{activity.title}' in {activity.city}.")
    
    db.session.commit()
    return activity


def respond_collab(collab, new_status: str):
    """PROPOSAL-06: accept or decline a collaboration invite.

    Only PENDING invites can be responded to. The caller (controller) must have
    already verified that the acting user holds can_manage_org authority over
    collab.org before calling this function."""
    if collab.status != COLLAB_PENDING:
        raise ApiError(
            "This collaboration invite has already been responded to",
            "already_responded",
            409,
        )
    if new_status not in (COLLAB_ACCEPTED, COLLAB_DECLINED):
        raise ApiError(
            "Status must be 'accepted' or 'declined'",
            "invalid_status",
            400,
        )
    collab.status = new_status
    collab.responded_at = datetime.now(UTC)
    db.session.commit()
    return collab


def reassign_meetup_head(activity, new_user_id: str, actor) -> dict:
    """PROPOSAL-05: reassign the Meetup Head to any user, by proposer or admin.

    The live-campaign gate (cannot reassign after the campaign goes live) is a
    no-op stub — the Campaign model lands in Phase 5 (CAMPAIGN-06). Fill this
    stub when that model exists:

        campaign = Campaign.query.filter_by(activity_id=activity.id).first()
        if campaign and campaign.status == CAMPAIGN_LIVE:
            raise ApiError("Cannot reassign Meetup Head after campaign goes live",
                           "campaign_live", 409)

    The old Meetup Head row is DELETED (not demoted) *unless* the new head is
    already on the roster in another role, in which case that existing row is
    promoted in place — inserting a second row for the same user would leave
    them listed twice (once at their old role, once as Meetup Head)."""
    new_user = User.query.get(new_user_id)
    if not new_user:
        raise ApiError("User not found", "user_not_found", 404)

    # Phase 5 live-campaign gate — stub intentionally left as no-op until Phase 5.

    existing_new_head_row = ActivityTeamMember.query.filter_by(
        activity_id=activity.id, user_id=new_user_id
    ).first()

    old = ActivityTeamMember.query.filter_by(
        activity_id=activity.id, role=TEAM_ROLE_MEETUP_HEAD
    ).first()
    if old and old.user_id != new_user_id:
        db.session.delete(old)
        db.session.flush()

    if existing_new_head_row:
        existing_new_head_row.role = TEAM_ROLE_MEETUP_HEAD
        existing_new_head_row.added_by = actor.id
    else:
        db.session.add(ActivityTeamMember(
            activity_id=activity.id,
            user_id=new_user_id,
            role=TEAM_ROLE_MEETUP_HEAD,
            added_by=actor.id,
        ))
    AuditRepository.record(
        "proposal",
        activity.id,
        f"Meetup Head reassigned to {new_user.name}",
        actor,
    )
    db.session.commit()
    return {"activity_id": activity.id, "new_meetup_head_user_id": new_user_id}


def decide(activity_id: str, decision: str, note: str, admin) -> Activity:
    activity = ActivityRepository.by_id(activity_id)
    if not activity or not activity.proposal:
        raise ApiError("Proposal not found", "proposal_not_found", 404)

    proposal = activity.proposal
    if proposal.status in (PROPOSAL_REJECTED, PROPOSAL_REVOKED):
        raise ApiError("This proposal has already been decided", "already_decided", 409)
    if proposal.status == PROPOSAL_APPROVED and decision != "revoke":
        raise ApiError("This proposal has already been approved", "already_decided", 409)

    if decision == "approve":
        # FR-B2: Enforce the 1-meetup-per-month quota before allowing approval
        if activity.scale in ["local_meetup", "regional_meetup"]:
            count = ActivityRepository.approved_meetups_in_region_month(activity.org_id, activity.starts_at)
            if count >= 1:
                raise ApiError(
                    f"Quota exceeded: An approved meetup already exists in {activity.starts_at.strftime('%B %Y')} for this region.",
                    "quota_exceeded",
                    409,
                )

        # PROG-01/PROG-02/PROG-04, enforcement checkpoint 2 of 2. Both facts can
        # change while a proposal waits in the queue: the qualifying meetup can be
        # revoked, and an invited org can decline. Checking only at submit would
        # enforce the rule against the honest caller alone (T-07-07, T-07-08).
        # No admin carve-out, even though only an admin reaches this branch.
        #
        # Placement above the first write is load-bearing: decide() has no
        # rollback path, so a guard below it would leave proposal.status mutated
        # in the session after the raise (T-07-05).
        if activity.scale == "regional_fest":
            assert_fest_eligible(activity.org_id, activity.city)
            assert_fest_collaborators_accepted(activity)

        proposal.status = PROPOSAL_APPROVED
        # On approval the Activity auto-publishes as a live event (FR-C1)
        activity.status = EVENT_UPCOMING
        AuditRepository.record("proposal", activity.id, "Approved & auto-published", admin, note)
        # Organiser earns points for a run/approved activity (FR-G2)
        db.session.add(
            ContributionPoint(
                user_id=activity.organiser_id,
                activity_id=activity.id,
                action="organised",
                points=get_recognition_points()["organised"],
            )
        )
        _notify(activity.organiser_id, activity.id, "approval",
                "Proposal approved", f"'{activity.title}' is live on the city feed.")

        # PROG-03: an approval can be the thing that completes the pair, so the
        # marker is written here rather than only on fest approvals — otherwise
        # the sponsorship banner would appear one fest after the scale card
        # unlocked, and the two surfaces would disagree (assumption A1).
        # Inside this transaction, with no commit of its own.
        if fest_eligibility(activity.org_id, activity.city)["fest_eligible"]:
            record_unlock(activity.org_id, activity.city)
    elif decision == "changes":
        if not note:
            raise ApiError("A note is required when requesting changes", "note_required", 400)
        proposal.status = PROPOSAL_CHANGES
        AuditRepository.record("proposal", activity.id, "Requested changes", admin, note)
        _notify(activity.organiser_id, activity.id, "update", "Changes requested", note)
    elif decision == "reject":
        proposal.status = PROPOSAL_REJECTED
        AuditRepository.record("proposal", activity.id, "Rejected", admin, note)
        _notify(activity.organiser_id, activity.id, "update", "Proposal rejected", note or "")
    elif decision == "revoke":
        proposal.status = PROPOSAL_REVOKED
        activity.status = EVENT_CANCELLED
        AuditRepository.record("proposal", activity.id, "Revoked", admin, note)

        point = ContributionPoint.query.filter_by(
            user_id=activity.organiser_id, activity_id=activity.id, action="organised"
        ).first()
        if point:
            db.session.delete(point)

        _notify(activity.organiser_id, activity.id, "update", "Approval Revoked", note or "The admin has revoked the approval for this event.")

    db.session.commit()
    return activity


def audit_trail(activity_id: str):
    return AuditRepository.for_entity(activity_id)


def global_audit_trail(limit=50):
    return AuditRepository.all_logs(limit)


def submit_report(activity_id: str, summary: str, organiser) -> Report:
    """FR-F2 — On completion, an organiser files a short post-event report."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Activity not found", "not_found", 404)

    report = Report(activity_id=activity_id, summary=summary)
    activity.status = "completed"
    db.session.add(report)
    AuditRepository.record("report", activity_id, "Filed post-event report", organiser)
    db.session.commit()
    return report


# --------------------------------------------------------------------------- #
# FEEDBACK-01 — the post-event reflection: open drafting, one submitter
# --------------------------------------------------------------------------- #
def patch_report(activity_id: str, data: dict, user) -> Report:
    """FEEDBACK-01 — save the reflection draft; only the Meetup Head submits.

    Decision D-12 splits one panel into two authorities, exactly as REIMB-01/02
    split the Reimbursement panel next to it. Any team member may write and
    rewrite `challenges` and `learnings` — the panel auto-saves each textarea on
    blur — and none of that counts as filing anything. Only the assigned Meetup
    Head may move the report to `submitted`.

    The route guard answers the broad question (may this person touch this
    event's reflection at all?). The narrow one depends on `status` in the
    request body, which no route guard can read, so it is asked here — the
    conditional-authority split established by expense_service.draft_and_submit.

    Both gates run BEFORE the first field is written, following that same
    function: a submit the caller was not allowed to make must leave the draft
    exactly as they left it, not half-saved by the call that refused them.
    """
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)

    submitting = data.get("status") == REPORT_SUBMITTED
    if submitting and not is_meetup_head(user, activity):
        # No admin fallback, deliberately. is_meetup_head documents itself as
        # "the one accountable submitter" and FEEDBACK-01 is one of the three
        # rules named in that docstring; a convenience short-circuit here would
        # quietly restate the rule as "the Meetup Head or anyone senior to
        # them" (RBAC-03). PROPOSAL-05 gives an admin the power to REASSIGN the
        # Meetup Head, which is a different power from acting as one.
        raise ApiError(
            "Only the assigned Meetup Head of this event may submit the "
            "post-event reflection",
            "forbidden",
            403,
        )

    # A soft-deleted report is gone, not a draft to resume — the TIMELINE-01
    # projection skips those rows for the same reason. Earliest-first so the row
    # this endpoint edits stays the same one when history has left more than one
    # behind (FR-F2's submit_report appends rather than upserting).
    report = (
        Report.query.filter(
            Report.activity_id == activity_id,
            Report.deleted_at.is_(None),
        )
        .order_by(Report.created_at.asc())
        .first()
    )

    if report is not None and report.status == REPORT_SUBMITTED:
        # Once filed, the reflection is a record of what the team said at the
        # time, not a document that keeps moving under the person reading it —
        # the same rule REIMB-01 applies to an expense that has left draft.
        # Rows predating this endpoint carry `submitted` by server default, and
        # that is the truth about them: they were filed, by FR-F2's POST.
        raise ApiError(
            "This report has already been submitted",
            "report_not_draft",
            409,
        )

    if report is None:
        # FEEDBACK-01's upsert: the panel has no "create report" action, so the
        # first blur on an empty textarea is what brings the row into being.
        # `summary` is left empty rather than invented — FR-F2's summary and
        # D-12's reflection are different fields written by different actions.
        report = Report(activity_id=activity_id, summary="", status=REPORT_DRAFT)
        db.session.add(report)

    # None means "not mentioned", never "clear it": the schema fills every
    # absent key with None, so reading these with a default would blank a
    # paragraph the client never sent (the EditEventSchema partial-PATCH rule).
    for field in ("challenges", "learnings"):
        if data.get(field) is not None:
            setattr(report, field, data[field])

    if submitting:
        report.status = REPORT_SUBMITTED
        report.submitted_by = user.id
        # Distinct from created_at, which is when the draft was first written.
        report.submitted_at = datetime.now(UTC)
        # Keyed on the activity so it lands in this event's audit trail beside
        # submit_report()'s row. `report` is deliberately absent from the
        # timeline projection's PROJECTED_ENTITIES, so this cannot double the
        # entry that projection already emits from the Report table itself.
        AuditRepository.record(
            "report",
            activity_id,
            "Post-event reflection submitted",
            user,
        )

    db.session.commit()
    return report


def get_report(activity_id: str) -> Report:
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Activity not found", "not_found", 404)
    report = Report.query.filter_by(activity_id=activity_id).first()
    if not report:
        raise ApiError("Report not found", "not_found", 404)
    return report


def _notify(user_id, activity_id, ntype, title, body, target_role="student"):
    db.session.add(
        Notification(user_id=user_id, activity_id=activity_id, type=ntype, title=title, body=body, target_role=target_role)
    )

def _notify_admins(activity_id, ntype, title, body):
    admins = User.query.filter_by(role=ROLE_ADMIN).all()
    for admin in admins:
        _notify(admin.id, activity_id, ntype, title, body, target_role="admin")


def _notify_collab_invite(activity: Activity, primary_org, collab_org):
    """PROPOSAL-06: fire a notification to every active ORG_MANAGER_PORS holder
    in collab_org informing them they have been invited to collaborate.

    Authority holders are determined by the same ORG_MANAGER_PORS set used by
    can_manage_org — the same people who will later accept or decline the invite.
    Notification bodies avoid storing accept/decline links; the UI routes to the
    event detail page where the respond button lives."""
    authority_user_ids = {
        m.user_id
        for m in collab_org.memberships
        if any(p.active and p.por_type in ORG_MANAGER_PORS for p in m.pors)
    }
    for uid in authority_user_ids:
        _notify(
            uid,
            activity.id,
            "collaboration_invite",
            f"Collaboration invite: {activity.title}",
            f"{primary_org.name} has invited {collab_org.name} to collaborate on "
            f"'{activity.title}'. Accept or decline from the event detail page.",
        )
