"""Campaign service — shared guards that every later Phase 5 plan imports.

This module is the single chokepoint for the live-campaign immutability rule
(PROB-P3, AC-06) and the workspace-activation gate (AC-27, AC-33). Defining
each guard here means a route added in a future phase cannot forget it by
writing an inline ``campaign.status`` comparison — there would be no pattern
to copy and the test for the first guard would immediately fail.

No mutations live here yet; plans 05-02 … 05-03 extend this module."""
from ..constants import CAMPAIGN_LIVE
from ..errors import ApiError


def assert_editable(activity) -> None:
    """Raise 409/campaign_live if the activity's campaign has been pushed live.

    Reads ``activity.campaign`` — the ``uselist=False`` backref, so an object or
    ``None``, never a list. A missing campaign row means nothing has been published,
    so editing is allowed.

    Referenced by: schedule_service.create_item/update_item/delete_item (plan 05-01),
    proposal_service.reassign_meetup_head (plan 05-01 stub fill).
    """
    if activity.campaign is not None and activity.campaign.status == CAMPAIGN_LIVE:
        raise ApiError(
            "This campaign is live; its schedule can no longer be changed.",
            "campaign_live",
            409,
        )


def assert_campaign_live(activity) -> None:
    """Raise 403/campaign_not_live if the campaign is *not* live.

    The inverse of assert_editable: used to gate workspace features that only
    become active after publication (AC-27, AC-33). First caller: plan 05-04.
    """
    if activity.campaign is None or activity.campaign.status != CAMPAIGN_LIVE:
        raise ApiError(
            "The team workspace activates once the campaign is live.",
            "campaign_not_live",
            403,
        )
