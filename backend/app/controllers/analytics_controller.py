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


@analytics_bp.get("/analytics/live-campaigns")
@admin_required
def live_campaigns():
    """Admin overview of all currently live campaigns (Phase 5 audit surface)."""
    from ..models import Activity, CampaignPackage
    from ..constants import CAMPAIGN_LIVE
    rows = (
        Activity.query
        .join(CampaignPackage, CampaignPackage.activity_id == Activity.id)
        .filter(CampaignPackage.status == CAMPAIGN_LIVE)
        .order_by(CampaignPackage.pushed_live_at.desc())
        .all()
    )
    result = []
    for activity in rows:
        cp = activity.campaign
        result.append({
            "id": activity.id,
            "title": activity.title,
            "city": activity.city,
            "org": activity.org.name if activity.org else None,
            "org_type": activity.org.type if activity.org else None,
            "starts_at": activity.starts_at.isoformat() if activity.starts_at else None,
            "pushed_live_at": cp.pushed_live_at.isoformat() if cp.pushed_live_at else None,
            "registration_slug": cp.registration_slug,
            "has_poster": bool(cp.poster_name),
            "has_mail": bool(cp.mail_body),
        })
    return jsonify(result), 200


