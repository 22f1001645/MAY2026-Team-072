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
from ..constants import FEST_COLLAB_THRESHOLD
from ..errors import ApiError
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
