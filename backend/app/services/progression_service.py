"""Progression gating — the one place that knows the fest-tier rule (PROG-01).

Eligibility is COMPUTED on every call from the org's own activity history. It is
never read from `org_progression_unlocks`: that table records that an unlock
happened, and treating it as an input would let a stale or forged row grant
fest-proposal rights the activity history does not support (threat T-01-18,
named in that model's own docstring).

The rule: an organisation may propose a `regional_fest` in a city once it has
completed one `local_meetup` AND one `regional_meetup` in that same city, as the
PRIMARY organisation (Activity.org_id). A meetup it merely accepted a
collaboration invite on does not count — the narrower reading, matching the
existing `meetups_in_region_month` quota precedent.
"""
from sqlalchemy.exc import IntegrityError

from ..constants import COLLAB_ACCEPTED, FEST_COLLAB_THRESHOLD
from ..errors import ApiError
from ..extensions import db
from ..models import OrgProgressionUnlock
from ..repositories.repos import ActivityRepository

# The two halves of the track record, in the order the UI lists them.
FEST_REQUIRED_SCALES = ("local_meetup", "regional_meetup")


def fest_eligibility(org_id: str, city: str) -> dict:
    """Fest-tier progression facts for one (org, city).

    Returns a dict rather than a bool because both callers need more than a
    yes/no: the UI must name WHICH half is missing, and the 403 message must
    state the shortfall numerically. Neither is derivable from a boolean.
    """
    local = ActivityRepository.completed_meetups_by_scale(org_id, city, "local_meetup")
    regional = ActivityRepository.completed_meetups_by_scale(org_id, city, "regional_meetup")
    met = (1 if local else 0) + (1 if regional else 0)
    total = len(FEST_REQUIRED_SCALES)
    return {
        "local_meetups_completed": local,
        "regional_meetups_completed": regional,
        "requirements_met": met,
        "requirements_total": total,
        "fest_eligible": met == total,
        "collaborator_threshold": FEST_COLLAB_THRESHOLD,
    }


def assert_fest_eligible(org_id: str, city: str) -> None:
    """PROG-04: refuse a fest-scale action by an org that has not earned it.

    No admin carve-out. The ROLE_ADMIN bypass in submit_proposal() covers the
    POR check only; progression is a property of the organisation, not of the
    caller (threat T-07-03).
    """
    facts = fest_eligibility(org_id, city)
    if facts["fest_eligible"]:
        return
    missing = [
        scale.replace("_", " ")
        for scale, done in (
            ("local_meetup", facts["local_meetups_completed"]),
            ("regional_meetup", facts["regional_meetups_completed"]),
        )
        if not done
    ]
    raise ApiError(
        f"Regional Fest is locked in {city}: your organisation has completed "
        f"{facts['requirements_met']} of {facts['requirements_total']} "
        f"progression requirements there. Still needed: "
        f"{' and '.join(missing)}.",
        "fest_locked",
        403,
    )


def assert_fest_collaborators_accepted(activity) -> None:
    """PROG-02 (D-01, accepted half): refuse a fest whose partners have not agreed.

    Counts ACCEPTED invites, never the named list — a proposal can name six
    organisations without a single one of them having said yes, and approving it
    would commit five other organisations to an event they never agreed to
    (threat T-07-08). The primary org is already one of these rows, auto-accepted
    at submit.

    Mirrors Activity.is_mega_meetup's expression rather than adding a second
    @property beside it: that one is PROPOSAL-03's threshold, this one is
    PROG-02's, and a shared helper would invite a future edit to move both.
    """
    accepted = sum(1 for c in activity.collaborators if c.status == COLLAB_ACCEPTED)
    if accepted >= FEST_COLLAB_THRESHOLD:
        return
    raise ApiError(
        f"A Regional Fest needs {FEST_COLLAB_THRESHOLD} collaborating organisations "
        f"to have accepted their invitations; only {accepted} of "
        f"{FEST_COLLAB_THRESHOLD} have accepted so far (counting your own "
        f"organisation).",
        "fest_collaborators_required",
        403,
    )


def record_unlock(org_id: str, city: str) -> OrgProgressionUnlock:
    """PROG-03: mark that this org has reached fest tier in this city.

    Get-or-create, with the insert wrapped in a SAVEPOINT. A plain check-then-
    insert is not atomic: two admins approving qualifying proposals for the same
    org+city concurrently both see no row, both insert, and uq_org_progression
    fires at the caller's commit — a 500 that discards the whole approval
    (T-07-09). A bare try/except IntegrityError has the same problem, because
    recovering from it needs a rollback of the outer transaction.

    begin_nested() is what makes the recovery cheap: the rollback discards only
    the marker, leaving decide()'s approval intact.

    Does not commit — the caller's own commit is what makes the marker and the
    approval that earned it land together or not at all.
    """
    existing = OrgProgressionUnlock.query.filter_by(org_id=org_id, city=city).first()
    if existing:
        return existing
    unlock = OrgProgressionUnlock(org_id=org_id, city=city)
    try:
        with db.session.begin_nested():
            db.session.add(unlock)
    except IntegrityError:
        # Someone else recorded the same unlock between the check and the
        # insert. The marker is the point, not who wrote it.
        return OrgProgressionUnlock.query.filter_by(org_id=org_id, city=city).first()
    return unlock


def progression_for(org, city=None) -> dict:
    """The payload behind GET /orgs/<org_id>/progression — two callers, one route.

    With a city it is the fest card's lock state (D-04); without one it is the
    organisation profile's sponsorship banner (D-05). The `unlocks` list ignores
    the city parameter in both cases, which is what saves the profile page from
    needing a third route.

    Counts are None rather than 0 when no city was asked about: the form has not
    been told which city yet, and "0 completed" is a different statement from
    "not asked". Never None for `unlocks` — an org with no unlocks is an empty
    list, so the client renders one shape.
    """
    facts = fest_eligibility(org.id, city) if city else {
        "local_meetups_completed": None,
        "regional_meetups_completed": None,
        "requirements_met": 0,
        "requirements_total": len(FEST_REQUIRED_SCALES),
        "fest_eligible": False,
        "collaborator_threshold": FEST_COLLAB_THRESHOLD,
    }
    return {
        "org_id": org.id,
        "city": city or None,
        **facts,
        "unlocks": [
            u.to_dict()
            for u in OrgProgressionUnlock.query.filter_by(org_id=org.id).all()
        ],
    }
