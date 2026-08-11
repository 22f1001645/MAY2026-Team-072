from flask import Blueprint, jsonify

from ..rbac import admin_required
from ..services import analytics_service

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/v1")


@analytics_bp.get("/analytics")
@admin_required
def analytics():
    """FR-H1-H4 — community analytics."""
    return jsonify(analytics_service.community_analytics()), 200


@analytics_bp.get("/analytics/fee-utilisation")
@admin_required
def fee_utilisation():
    """FR-H5 — the Rs 100 activity-fee utilisation wedge, by city."""
    data = analytics_service.community_analytics()
    return jsonify(
        {"totals": data["totals"], "by_city": [
            {"city": c["city"], "fee_paid": c["fee_paid"], "fee_used": c["fee_used"],
             "fee_util_pct": c["fee_util_pct"]}
            for c in data["by_city"]
        ]}
    ), 200


@analytics_bp.get("/analytics/organisers")
@admin_required
def organisers_analytics():
    return jsonify(analytics_service.organiser_analytics()), 200

