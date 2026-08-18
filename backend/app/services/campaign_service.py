"""Campaign service — shared guards that every later Phase 5 plan imports.

This module is the single chokepoint for the live-campaign immutability rule
(PROB-P3, AC-06) and the workspace-activation gate (AC-27, AC-33). Defining
each guard here means a route added in a future phase cannot forget it by
writing an inline ``campaign.status`` comparison — there would be no pattern
to copy and the test for the first guard would immediately fail.

Extended by plan 05-02: slug minting, campaign singleton accessor, custom
form-field CRUD, and the registration form shape (CAMPAIGN-04, CAMPAIGN-05).

Extended by plan 05-03: ``push_live`` — the draft → live transition (CAMPAIGN-06)."""
import re
import secrets
from datetime import UTC, datetime

from flask import current_app
from sqlalchemy.exc import IntegrityError

from ..constants import (
    CAMPAIGN_DRAFT,
    CAMPAIGN_LIVE,
    FORM_FIELD_TEXT,
    FORM_FIELD_TYPES,
    SLUG_MAX_ATTEMPTS,
    SLUG_RANDOM_BYTES,
    SLUG_TITLE_MAX,
    TASK_STATUS_LABELS,
    TASK_STATUSES,
)
from ..errors import ApiError
from ..extensions import db
from ..models import CampaignPackage, RegistrationFormField
from ..rbac import is_meetup_head
from ..repositories.repos import AuditRepository


# --------------------------------------------------------------------------- #
# Plan 05-01 guards (unchanged)                                               #
# --------------------------------------------------------------------------- #

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


# --------------------------------------------------------------------------- #
# Plan 05-02: Campaign singleton + slug minting (CAMPAIGN-04)                 #
# --------------------------------------------------------------------------- #

def _get_or_create_campaign(activity) -> CampaignPackage:
    """Read or lazily create the singleton CampaignPackage for *activity*.

    This is the only accessor every campaign write goes through. That single
    chokepoint is what makes AC-13 and AC-17 last-write-wins for free — callers
    do not need to check whether a row exists before writing; they can always
    call this function and trust the returned object to be the authoritative row.

    Uses ``db.session.flush()`` so the row gets an id without committing — the
    caller commits when it is ready (service-commit rule)."""
    if activity.campaign is not None:
        return activity.campaign
    campaign = CampaignPackage(activity_id=activity.id)
    db.session.add(campaign)
    db.session.flush()
    return campaign


def _title_slug(title: str, limit: int = SLUG_TITLE_MAX) -> str:
    """Derive a URL-safe slug from *title*.

    Lowercase → replace non-[a-z0-9] runs with '-' → strip leading/trailing '-'
    → truncate to *limit* chars → fall back to 'meetup' when the result is empty.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:limit].rstrip("-")
    return slug or "meetup"


def _registration_url(slug: str | None) -> str | None:
    """Assemble the public registration URL for *slug*, or None if unminted.

    The single place the URL shape is written down. D-12 makes that shape a
    published contract the moment a link is shared, so it is assembled here from
    ``current_app.config`` and never in the browser — a client that built it
    from ``window.location.origin`` would produce a different link on every host
    it happened to be served from.
    """
    if not slug:
        return None
    public_base = current_app.config.get(
        "PUBLIC_BASE_URL",
        current_app.config["CORS_ORIGINS"][0],
    )
    return f"{public_base}/events/{slug}"


def campaign_state(activity, actor=None) -> dict:
    """Return a campaign-state dict without creating a row.

    When no campaign row exists, returns a synthetic dict with the same keys,
    ``status`` set to ``CAMPAIGN_DRAFT``, every other value ``None``, and a
    ``completeness`` sub-dict. This is what plan 05-08's stepper reads, so the
    completeness rule lives on the server and is not recomputed in the browser.

    ``is_meetup_head`` is computed here from the same ``rbac.is_meetup_head``
    predicate that backs the push-live route guard, so the button's disabled
    state and the server's 403 cannot disagree. The frontend has no way to
    derive it: ``capabilities.manageableActivityIds`` answers "may this person
    manage this activity", which is true for every crew member. The flag is a
    rendering convenience only — ``meetup_head_required`` is the enforcement,
    and it refuses regardless of what the client believes (threat T-05-16).
    """
    campaign = activity.campaign
    if campaign is not None:
        base = campaign.to_dict()
        has_mail = bool(campaign.mail_body)
        has_poster = bool(campaign.poster_name)
        has_reg = bool(campaign.registration_slug)
    else:
        base = {
            "id": None,
            "activity_id": activity.id,
            "mail_subject": None,
            "mail_body": None,
            "poster_name": None,
            "registration_slug": None,
            "status": CAMPAIGN_DRAFT,
            "approved_by": None,
            "approved_at": None,
            "pushed_live_at": None,
        }
        has_mail = False
        has_poster = False
        has_reg = False

    base["completeness"] = {
        "schedule": bool(activity.schedule_items),
        "mail": has_mail,
        "poster": has_poster,
        "registration": has_reg,
    }
    # The card that copies the link reads this key. Returning the slug alone
    # would leave the browser to assemble the URL, which is exactly what D-12
    # forbids — so the read answers with the same URL the mint call returned.
    base["registration_url"] = _registration_url(base["registration_slug"])
    base["is_meetup_head"] = is_meetup_head(actor, activity)
    # The allowed custom-field types travel with the campaign state so the
    # builder's type picker is populated from constants.FORM_FIELD_TYPES rather
    # than from a second list living in the browser. FormFieldSchema validates
    # against the same tuple, so the picker and the 422 cannot disagree.
    base["form_field_types"] = list(FORM_FIELD_TYPES)
    # The Kanban board's three columns travel with the campaign state for the
    # same reason: TaskSchema validates a status against this exact tuple, so a
    # column set assembled in the browser could offer an option the server
    # answers 422 to. Order is the declared order — the board renders its
    # columns left to right in it (TEAM-02).
    base["task_statuses"] = [
        {"value": status, "label": TASK_STATUS_LABELS[status]} for status in TASK_STATUSES
    ]
    return base


def generate_slug(activity, actor) -> dict:
    """Mint a unique registration slug for *activity* and return it with the URL.

    Uses ``secrets.token_urlsafe`` — never ``random`` — because the slug is the
    only barrier between a shared link and enumeration of the event catalogue.

    The URL is assembled here on the server from ``current_app.config`` so that
    D-12's published-contract rule is honoured: the browser must never assemble
    the URL shape itself.

    Retry loop: at most SLUG_MAX_ATTEMPTS attempts; raises 503/slug_collision
    only after all attempts fail (AC-16). An IntegrityError on commit means the
    randomly-chosen suffix was already taken; roll back and try a new one.
    """
    assert_editable(activity)
    campaign = _get_or_create_campaign(activity)
    base = _title_slug(activity.title)

    for _ in range(SLUG_MAX_ATTEMPTS):
        suffix = secrets.token_urlsafe(SLUG_RANDOM_BYTES)[:6].lower()
        candidate = f"{base}-{suffix}"
        campaign.registration_slug = candidate
        try:
            db.session.commit()
            break
        except IntegrityError:
            db.session.rollback()
    else:
        raise ApiError(
            "Could not mint a unique link. Try again.",
            "slug_collision",
            503,
        )

    return {
        "registration_slug": campaign.registration_slug,
        "registration_url": _registration_url(campaign.registration_slug),
    }


# --------------------------------------------------------------------------- #
# Plan 05-02: Custom registration fields (CAMPAIGN-05)                        #
# --------------------------------------------------------------------------- #

def list_form_fields(activity) -> list:
    """Return all form fields for *activity* in declared backref order."""
    return [f.to_dict() for f in activity.form_fields]


def create_form_field(activity, data: dict, actor) -> dict:
    """Create one custom form field on *activity* and return its dict.

    Duplicate-label rejection is enforced by ``uq_form_field_label`` with an
    ``IntegrityError`` catch — never a pre-SELECT (no TOCTOU window).
    """
    assert_editable(activity)
    field = RegistrationFormField(
        activity_id=activity.id,
        label=data["label"],
        field_type=data["field_type"],
        options=data.get("options") or [],
        required=data.get("required", False),
        position=data.get("position") or 0,
    )
    db.session.add(field)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError(
            "A field with this label already exists on this event.",
            "duplicate_label",
            409,
        )
    return field.to_dict()


def update_form_field(activity, field_id: str, data: dict, actor) -> dict:
    """Partially update one form field and return its dict.

    Re-raises ``duplicate_label`` on a label collision. Cross-activity write
    guard: raises 404 when the field belongs to a different activity.
    """
    assert_editable(activity)
    field = RegistrationFormField.query.get(field_id)
    if field is None or field.activity_id != activity.id:
        raise ApiError("Form field not found", "not_found", 404)

    updatable = ["label", "field_type", "options", "required", "position"]
    for key in updatable:
        val = data.get(key)
        if val is not None:
            setattr(field, key, val)
    # Allow explicit False for required
    if "required" in data and data["required"] is False:
        field.required = False

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError(
            "A field with this label already exists on this event.",
            "duplicate_label",
            409,
        )
    return field.to_dict()


def delete_form_field(activity, field_id: str, actor) -> None:
    """Delete one form field. Returns None (controller responds 204)."""
    assert_editable(activity)
    field = RegistrationFormField.query.get(field_id)
    if field is None or field.activity_id != activity.id:
        raise ApiError("Form field not found", "not_found", 404)
    db.session.delete(field)
    db.session.commit()


def registration_form(activity) -> dict:
    """Return the registration form shape — core fields + custom fields.

    ``core_fields`` is a server-side literal list of two entries (name, contact).
    It is fixed and server-owned; nothing in the request may add to, reorder or
    remove it (AC-23). The ``assumption_delta_decision`` in 05-02-PLAN.md records
    why they are not promoted to rows: rows are editable and deletable by definition,
    which would contradict the requirement they are meant to serve.
    """
    return {
        "core_fields": [
            {"key": "name", "label": "Full name", "field_type": FORM_FIELD_TEXT, "required": True},
            {"key": "contact", "label": "Contact", "field_type": FORM_FIELD_TEXT, "required": True},
        ],
        "custom_fields": list_form_fields(activity),
    }


# --------------------------------------------------------------------------- #
# Plan 05-03: push live (CAMPAIGN-06)                                         #
# --------------------------------------------------------------------------- #

def push_live(activity, actor) -> dict:
    """Publish *activity*'s campaign: draft → live, once and for all (AC-24).

    Phase 5 ships a two-state machine, ``draft → live``. ``CAMPAIGN_PENDING_APPROVAL``
    stays declared-but-unused (as ``EXPENSE_DRAFT`` already is) and is never
    written to a row — no acceptance criterion makes it reachable, and campaign
    status values persist, so an unused value costs nothing while an unreachable
    one written into rows would cost a data migration to remove.

    The Meetup Head gate is the route decorator ``meetup_head_required``, not a
    check here: this function trusts its caller's authorization exactly as every
    other service in this module does.

    Idempotent by early return (AC-26). An already-live campaign is returned
    untouched and uncommitted, so replaying the call cannot re-stamp the approval
    trail with a later time or a different approver (threat T-05-18).

    Emptiness is ``schedule_service.assert_schedule_non_empty`` — the same helper
    the unlock-check route calls, so AC-04's rule keeps exactly one definition.
    """
    from . import schedule_service  # local: schedule_service imports this module

    schedule_service.assert_schedule_non_empty(activity)
    campaign = _get_or_create_campaign(activity)

    if campaign.status == CAMPAIGN_LIVE:
        return campaign.to_dict()

    # datetime.now(UTC), not the deprecated utcnow() — the same aware-UTC value
    # models._utcnow already stamps every created_at with.
    now = datetime.now(UTC)
    campaign.status = CAMPAIGN_LIVE
    campaign.approved_by = actor.id
    campaign.approved_at = now
    campaign.pushed_live_at = now
    AuditRepository.record(
        "campaign", campaign.id, "campaign_pushed_live", actor,
        note=activity.id,
    )
    db.session.commit()
    return campaign.to_dict()
