from flask import Blueprint, jsonify, request

from ..rbac import auth_required
from ..services import venue_service

venue_bp = Blueprint("venue", __name__, url_prefix="/api/v1")


@venue_bp.get("/venues/autocomplete")
@auth_required
def venue_autocomplete():
    """Venue suggestions for the proposal form's venue field.

    auth_required is not ceremony: without it this is an open relay onto a
    metered upstream that anyone could drain with a script.

    501 (not 500) when no key is configured — it is an unimplemented optional
    feature, not a failure, and the client keys the plain-input fallback off it.
    """
    if not venue_service.is_configured():
        return jsonify({"error": "Venue autocomplete is not configured.",
                        "code": "venue_autocomplete_unavailable"}), 501

    return jsonify({"suggestions": venue_service.suggest(request.args.get("q", ""))}), 200
