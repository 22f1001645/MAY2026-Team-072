"""ORG-01 and ORG-03 — an organisation's public profile and its brand kit.

Both functions take the Organisation OBJECT, never an id. The scoped guard on
the route has already loaded the row, already 404'd a missing one and already
403'd a caller without authority over it, so re-querying by id here would be a
second and weaker copy of a decision that was made upstream.
"""
import re
from uuid import uuid4

from flask import current_app

from ..constants import (
    BRAND_KIT_MANUAL,
    SOCIAL_FIELD_ORDER,
    UPLOAD_URL_PATTERN,
    UPLOAD_URL_PREFIX,
)
# The upload primitive lives with the route that serves it (D-01). This is the
# one place a service reaches into a controller module, and it is deliberate:
# splitting `sniff_image_ext` away from the route whose `nosniff` header depends
# on it would put the format allowlist and the serving rule in two files that
# can drift.
from ..controllers.upload_controller import served_path, sniff_image_ext, upload_dir
from ..errors import ApiError
from ..extensions import db
from ..models import BrandKit, OrganisationSocialLink
from ..repositories.repos import AuditRepository
from ..url_safety import check_social_url, check_website_url, is_renderable_social_url

# The profile keys this service may write, rather than letting the request body
# decide what a profile field is. `logo_url` is writable here ONLY so a null can
# clear it — the schema refuses any non-null value that is not a path this server
# issued, so the upload endpoint below stays the only writer of a real one.
EDITABLE_FIELDS = ("bio", "logo_url")

# 16 bytes covers every signature in IMAGE_MAGIC and is all that is ever read
# before the format decision is made.
_SNIFF_BYTES = 16

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
    previous_logo = org.logo_url

    for field in EDITABLE_FIELDS:
        if field in data:
            setattr(org, field, data[field])
    # Recorded before the commit, so the audit row and the change land in the
    # same transaction — matching the three call sites in org_service.py.
    AuditRepository.record(
        "organisation", org.id, "Updated organisation profile", actor, org.name
    )
    db.session.commit()

    # Clearing the column is how a logo is removed (UI-SPEC S3), so the same
    # after-commit unlink applies here as on a replace.
    if org.logo_url != previous_logo:
        _discard_stored_file(previous_logo)
    return org


def store_logo(org, file_storage, actor):
    """Save an uploaded logo and point the organisation at its served path.

    The format decision is made from the FIRST BYTES and nothing else. The
    multipart part's declared content type and its filename are both fully
    client-controlled, so neither is read here. Werkzeug's filename sanitiser is
    not the defence either: it can return an empty string, and it does nothing
    at all about content-type confusion. The stored name is `uuid4().hex` plus
    the extension the SNIFF produced, which is the only filename an attacker has
    no input to.
    """
    head = file_storage.read(_SNIFF_BYTES)
    file_storage.seek(0)                    # the sniff must not eat the file

    ext = sniff_image_ext(head)
    if ext is None:
        # Refused before anything is written, so a rejected upload leaves no
        # file behind to be served or cleaned up later.
        raise ApiError(
            "That file isn't a PNG, JPEG or WebP.", "invalid_image", 400
        )

    previous = org.logo_url
    name = f"{uuid4().hex}{ext}"
    file_storage.save(str(upload_dir() / name))

    org.logo_url = served_path(name)
    AuditRepository.record(
        "organisation", org.id, "Updated organisation logo", actor, org.name
    )
    db.session.commit()

    # AFTER the commit, never before: deleting first would leave the row
    # pointing at a file that no longer exists if the write rolled back. The
    # reverse order at worst leaves one unreferenced file on disk, which is a
    # cleanup problem rather than a broken profile.
    _discard_stored_file(previous)
    return org


def get_brand_kit(org) -> dict:
    """ORG-03 — the editor's read payload. THIS FUNCTION NEVER WRITES.

    An organisation nobody has written a kit for gets a truthful
    `has_kit: false` rather than a 404 or a freshly minted empty row
    (T-04-31). A 404 would force every caller to branch on absence, and a row
    created by a read would make "has anyone written one?" unanswerable
    afterwards.

    `voice_tone` comes back as `None` rather than as the neutral default here,
    because this payload fills a form: prefilling the default would show the
    user words they never wrote as though they had. `brand_kit_for()` — the
    Phase 5 seam — coalesces instead, which is the difference between the two
    functions.

    `ai_available` is reported on this payload and NOT on `/auth/me` (D-04).
    That payload is AUTH-02's authorization capability contract; a server
    feature flag on it invites the next config flag onto it too.
    """
    kit = org.brand_kit
    return {
        "org_id": org.id,
        "has_kit": kit is not None,
        "voice_tone": kit.voice_tone if kit else None,
        "palette": (kit.palette if kit else None) or [],
        "sample_phrases": (kit.sample_phrases if kit else None) or [],
        "source": kit.source if kit else BRAND_KIT_MANUAL,
        "ai_available": bool(current_app.config.get("GEMINI_API_KEY")),
    }


def upsert_brand_kit(org, data: dict, actor):
    """Save the organisation's one brand kit, creating the row or updating it.

    **This is the ONLY writer of a BrandKit row.** 04-05's AI draft endpoint
    returns a suggestion for the user to review and must not become a second
    one — ORG-04 requires that nothing persists until a human explicitly saves,
    and a second writer is exactly how that guarantee is lost. The same
    BrandKitSchema validates both paths for the same reason: two validators
    would drift, and the AI path is precisely where the weaker one would be.

    `brand_kits.org_id` is unique, so the row is reached through the
    `uselist=False` backref rather than inserted blind — a second save is an
    ordinary edit, not an IntegrityError.

    Palette entries are lowercased before storage so the stored value matches
    what the editor re-renders, and a user does not watch their colour change
    case on the next load. Phrases are stripped and blanks are dropped: a row
    the user cleared arrives as whitespace, and storing it would render as an
    empty bullet in a Phase 5 template.
    """
    kit = org.brand_kit
    if kit is None:
        kit = BrandKit(org_id=org.id)
        db.session.add(kit)

    kit.voice_tone = data.get("voice_tone")
    kit.palette = [c.strip().lower() for c in data.get("palette") or [] if c.strip()]
    kit.sample_phrases = [
        p.strip() for p in data.get("sample_phrases") or [] if p.strip()
    ]
    kit.source = data.get("source") or BRAND_KIT_MANUAL

    # Recorded before the commit, so the audit row and the change land in the
    # same transaction — matching every other write in this service.
    AuditRepository.record(
        "organisation", org.id, "Updated organisation brand kit", actor, org.name
    )
    db.session.commit()
    return kit


def _discard_stored_file(logo_url):
    """Unlink a file this server issued, if that is what `logo_url` names.

    The pattern check is the guard: only a value matching the served-path shape
    is ever turned into a filesystem path, so nothing outside the upload
    directory is reachable from this function even if a stray value reached the
    column. A failure is logged and swallowed — a logo that saved correctly is
    not a failed request because a stale file happened to be locked or already
    gone.
    """
    if not logo_url or not re.match(UPLOAD_URL_PATTERN, logo_url):
        return
    try:
        (upload_dir() / logo_url[len(UPLOAD_URL_PREFIX):]).unlink(missing_ok=True)
    except OSError:
        current_app.logger.warning(
            "Could not remove the previous logo file %s", logo_url, exc_info=True
        )
