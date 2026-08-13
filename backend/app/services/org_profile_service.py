"""ORG-01 — reads and writes of an organisation's public profile.

Both functions take the Organisation OBJECT, never an id. The scoped guard on
the route has already loaded the row, already 404'd a missing one and already
403'd a caller without authority over it, so re-querying by id here would be a
second and weaker copy of a decision that was made upstream.
"""
from ..extensions import db
from ..repositories.repos import AuditRepository

# The profile keys this service may write. `bio` is the whole of it for now:
# 04-02 owns social links and 04-03 owns the logo, and each adds its key here
# rather than letting the request body decide what a profile field is.
EDITABLE_FIELDS = ("bio",)


def public_profile(org) -> dict:
    """The read payload. Identical for every authenticated caller — it carries
    no hint of whether the reader may edit it, because a denial the caller
    cannot act on is noise rather than information (P-06)."""
    return org.to_dict(detail=True)


def update_profile(org, data: dict, actor):
    """Apply the profile keys present in `data`, audit the change, commit once.

    Absent keys are left alone rather than nulled, so a partial PATCH cannot
    silently erase a field the client never mentioned."""
    for field in EDITABLE_FIELDS:
        if field in data:
            setattr(org, field, data[field])
    # Recorded before the commit, so the audit row and the change land in the
    # same transaction — matching the three call sites in org_service.py.
    AuditRepository.record(
        "organisation", org.id, "Updated organisation profile", actor, org.name
    )
    db.session.commit()
    return org
