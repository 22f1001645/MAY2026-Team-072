"""ORG-01 — an organisation's public profile.

Readable by anyone signed in; editable only by someone holding authority over
that specific organisation. This is the first route in the codebase to sit
behind `can_manage_org_required`, so the URL parameter spelling matters more
than usual: `org_scoped` reads it out of the view's kwargs by name, and any
other spelling yields a 404 for every caller, admins included, while the RBAC
suite stays green.
"""
from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..rbac import auth_required, can_manage_org_required
from ..repositories.repos import OrgRepository
from ..schemas import BrandKitSchema, OrgProfileSchema, SocialLinksReplaceSchema
from ..services import org_profile_service

org_profile_bp = Blueprint("org_profile", __name__, url_prefix="/api/v1")


@org_profile_bp.get("/orgs/<org_id>/profile")
@auth_required
def get_profile(org_id):
    """Any authenticated reader. The profile is public within the app and no
    field it returns is sensitive (T-04-03, accepted); the payload deliberately
    carries no editability hint, so a reader without authority sees an ordinary
    profile rather than a locked one (P-06)."""
    org = OrgRepository.by_id(org_id)
    if not org:
        raise ApiError("Organisation not found", "not_found", 404)
    return jsonify(org_profile_service.public_profile(org)), 200


@org_profile_bp.patch("/orgs/<org_id>/profile")
@can_manage_org_required
def update_profile(org_id):
    """The guard has already loaded the organisation onto `g.org`, 404'd a
    missing one and 403'd a cross-org edit, so this view neither re-queries nor
    re-authorizes — it validates the body and hands the object to the service."""
    data = OrgProfileSchema().load(request.get_json() or {})
    org = org_profile_service.update_profile(g.org, data, g.current_user)
    return jsonify(org_profile_service.public_profile(org)), 200


@org_profile_bp.post("/orgs/<org_id>/logo")
@can_manage_org_required
def upload_logo(org_id):
    """ORG-01, D-01 — replace this organisation's logo with an uploaded image.

    An oversized body never reaches this function: Flask refuses anything past
    MAX_CONTENT_LENGTH before buffering it, and the existing HTTPException
    handler turns that into the standard envelope. There is deliberately no
    length check here — by the time a view could run one, the body it is
    measuring is already in memory, which is precisely the cost the cap exists
    to avoid.

    There is no matching DELETE: a logo is removed with PATCH /profile and a
    null `logo_url` (UI-SPEC S3), so the column has exactly one writer per
    direction and one audit trail.
    """
    file_storage = request.files.get("file")
    if file_storage is None:
        raise ApiError("Attach the image as the `file` field.", "invalid_image", 400)
    org = org_profile_service.store_logo(g.org, file_storage, g.current_user)
    return jsonify(org_profile_service.public_profile(org)), 200


@org_profile_bp.put("/orgs/<org_id>/social-links")
@can_manage_org_required
def replace_social_links(org_id):
    """ORG-02 — replace the whole social section in one write.

    Replace-all rather than per-link routes: the editor shows every platform at
    once, so one write matching what the user sees avoids a half-applied section
    when one row of several is rejected.

    Returns the same payload GET /profile returns, so the client re-renders from
    the server's normalised values rather than from its own form state — the
    stored URL is not always the string that was typed.
    """
    data = SocialLinksReplaceSchema().load(request.get_json() or {})
    org = org_profile_service.replace_social_links(g.org, data, g.current_user)
    return jsonify(org_profile_service.public_profile(org)), 200


@org_profile_bp.get("/orgs/<org_id>/brand-kit")
@can_manage_org_required
def get_brand_kit(org_id):
    """ORG-03 — read this organisation's brand kit.

    Guarded on the READ, unlike GET /profile which any signed-in member may see
    (P-09). A brand kit is an internal working document for one organisation's
    own communications rather than part of its public identity, and a reader who
    cannot use it must not even be shown that the surface exists.

    An organisation with no saved kit answers 200 with `has_kit: false` rather
    than 404, so the campaign creator reads one stable shape.
    """
    return jsonify(org_profile_service.get_brand_kit(g.org)), 200


@org_profile_bp.put("/orgs/<org_id>/brand-kit")
@can_manage_org_required
def put_brand_kit(org_id):
    """ORG-03 — save the whole brand kit in one write.

    Replace-all rather than per-field routes, matching the social-links editor
    above: the form shows every field at once, so one write matching what the
    user sees avoids a half-applied kit when one field of several is rejected.

    Returns the same payload the GET returns, so the client re-renders from the
    server's normalised values — a palette entry is stored lowercase whatever
    case it was typed in.
    """
    data = BrandKitSchema().load(request.get_json() or {})
    org_profile_service.upsert_brand_kit(g.org, data, g.current_user)
    return jsonify(org_profile_service.get_brand_kit(g.org)), 200


@org_profile_bp.post("/orgs/<org_id>/brand-kit/draft")
@can_manage_org_required
def draft_brand_kit(org_id):
    """ORG-04 — draft a starting kit for the user to edit. Persists NOTHING.

    A POST because it costs an outbound call and is not idempotent, not because
    it writes: the PUT above remains the only writer of a BrandKit row, and
    there is deliberately no accept-draft route to become a second one. Nothing
    the user sees here applies until they save it themselves.

    Unconditional on purpose. It answers even when a kit already exists, because
    regenerating is harmless when it stores nothing, and refusing server-side
    would block a legitimate "start over" without adding any safety. ORG-04's
    "for organisations that don't have one yet" scopes who the BUTTON is for,
    and the UI is what scopes the button.

    Every failure is a 503 carrying `ai_unavailable` or `ai_failed`, so the
    client can tell "this server has no AI" from "the call went wrong" and word
    each one differently.
    """
    return jsonify(org_profile_service.draft_brand_kit(g.org)), 200
