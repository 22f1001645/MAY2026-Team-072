"""ORG-01 — reads and writes of an organisation's public profile.

Both functions take the Organisation OBJECT, never an id. The scoped guard on
the route has already loaded the row, already 404'd a missing one and already
403'd a caller without authority over it, so re-querying by id here would be a
second and weaker copy of a decision that was made upstream.
"""
from ..constants import SOCIAL_FIELD_ORDER
from ..errors import ApiError
from ..extensions import db
from ..models import OrganisationSocialLink
from ..repositories.repos import AuditRepository
from ..url_safety import check_social_url, check_website_url, is_renderable_social_url

# The profile keys this service may write. `bio` is the whole of it for now:
# 04-02 owns social links and 04-03 owns the logo, and each adds its key here
# rather than letting the request body decide what a profile field is.
EDITABLE_FIELDS = ("bio",)

_REJECTION_MESSAGES = {
    "social_url_scheme": "A link must start with http:// or https://.",
    "social_url_host": "That address does not belong to this platform.",
}


def public_profile(org) -> dict:
    """The read payload. Identical for every authenticated caller — it carries
    no hint of whether the reader may edit it, because a denial the caller
    cannot act on is noise rather than information (P-06).

    The social-link list is filtered through the SAME predicate the write path
    uses. This is ROADMAP Phase 4 criterion 2's second clause — "never rendered
    anywhere" — and it is not a redundant copy of the write gate: the write gate
    does nothing about rows already in the table, and
    `OrganisationSocialLink.url` is documented as stored unvalidated by that
    layer on purpose. Rows can pre-date this phase, arrive from a direct database
    edit or seed data, or come from a future bug. Without this filter the
    criterion is a claim about the write path rather than a property of the
    system.

    It lives here rather than in `to_dict()` because a `to_dict()` cannot omit
    itself from a list.
    """
    data = org.to_dict(detail=True)

    renderable = {}
    withheld = set()
    for row in org.social_links:
        if is_renderable_social_url(row.url, row.platform):
            renderable[row.platform] = row.to_dict()
        else:
            withheld.add(row.platform)

    # Ordered by the one declaration of the order, so the seven-row editor maps
    # each platform to the same row every time. `website` is in that tuple and is
    # never a platform, so it simply never matches a row.
    data["social_links"] = [
        renderable[key] for key in SOCIAL_FIELD_ORDER if key in renderable
    ]
    # Platform KEYS only — never the URL and never a reason (P-05a). The row's
    # existence is not the secret; the URL is precisely the string that failed the
    # safety check and must not reach the DOM at all.
    data["withheld_platforms"] = sorted(withheld)
    # The same filter for the website field (D-03): a value that could not be
    # saved today is not served today either, whatever put it there.
    data["website"] = check_website_url(org.website)[0]
    return data


def replace_social_links(org, data: dict, actor):
    """Replace the organisation's whole social section in one write.

    Every URL is validated and normalised BEFORE the database is touched, so a
    rejected payload leaves the existing links exactly as they were.
    """
    prepared = []
    seen = set()
    for entry in data.get("links") or []:
        platform = entry["platform"]
        if platform in seen:
            # A user mistake with a sentence, not an IntegrityError with a 500.
            raise ApiError(
                "Only one link per platform.", "duplicate_platform", 400,
                {"platform": platform},
            )
        seen.add(platform)

        raw = (entry.get("url") or "").strip()
        if not raw:
            continue        # a blank means "remove that link", not an empty string
        url, error = check_social_url(raw, platform)
        if error:
            # `details` must be a NON-EMPTY dict: errors.envelope() drops a falsy
            # one, and the editor cannot mark the offending row without it.
            raise ApiError(
                _REJECTION_MESSAGES[error], error, 400, {"platform": platform}
            )
        prepared.append((platform, url))

    if "website" in data:
        raw_site = (data["website"] or "").strip()
        if not raw_site:
            org.website = None
        else:
            website, error = check_website_url(raw_site)
            if error:
                raise ApiError(
                    _REJECTION_MESSAGES[error], error, 400, {"field": "website"}
                )
            org.website = website

    # Delete, flush, then insert — all inside the one transaction. The flush is
    # what keeps uq_org_social_platform from firing when a user edits an existing
    # platform's URL: without it the insert and the pending delete reach the
    # database in the wrong order.
    for row in list(org.social_links):
        db.session.delete(row)
    db.session.flush()

    for platform, url in prepared:
        db.session.add(
            OrganisationSocialLink(org_id=org.id, platform=platform, url=url)
        )

    AuditRepository.record(
        "organisation", org.id, "Replaced organisation social links", actor, org.name
    )
    db.session.commit()
    return org


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
