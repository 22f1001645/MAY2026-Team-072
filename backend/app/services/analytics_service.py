from ..constants import ACTIVITY_FEE_INR
from ..extensions import db
from ..models import (
    Activity,
    ActivityFeeRecord,
    Attendance,
    Organisation,
    Proposal,
    Registration,
    User,
)


def community_analytics() -> dict:
    """Descriptive admin analytics + the Rs 100 fee-utilisation wedge (FR-H)."""
    regions = Organisation.query.filter_by(type="region").order_by(Organisation.name).all()
    per_city = []
    tot = {"meetups": 0, "attendance": 0, "unique": 0, "repeat": 0, "fee_paid": 0, "fee_used": 0}

    for region in regions:
        meetups = (
            Activity.query.join(Proposal)
            .filter(Activity.org_id == region.id, Proposal.status == "approved")
            .count()
        )
        # Attendance rows for students in this region
        student_ids = [u.id for u in User.query.filter_by(region_id=region.id, role="student").all()]
        fee_paid = ActivityFeeRecord.query.filter(
            ActivityFeeRecord.user_id.in_(student_ids or ["-"])
        ).count()

        attendance_count = 0
        attended_students = set()
        repeat = 0
        for sid in student_ids:
            n = (
                Registration.query.join(Attendance)
                .filter(Registration.student_id == sid)
                .count()
            )
            attendance_count += n
            if n >= 1:
                attended_students.add(sid)
            if n >= 2:
                repeat += 1

        unique = len(attended_students)
        fee_used = unique  # utilised = attended >= 1 activity this term
        row = {
            "city": region.name,  # Key remains 'city' for frontend compat, but holds Region name
            "meetups": meetups,
            "attendance": attendance_count,
            "unique": unique,
            "repeat": repeat,
            "fee_paid": fee_paid,
            "fee_used": fee_used,
            "fee_util_pct": round(100 * fee_used / fee_paid) if fee_paid else 0,
        }
        per_city.append(row)
        for k in tot:
            tot[k] += row[k]

    fee_util_pct = round(100 * tot["fee_used"] / tot["fee_paid"]) if tot["fee_paid"] else 0
    repeat_rate = round(100 * tot["repeat"] / tot["attendance"]) if tot["attendance"] else 0

    return {
        "fee_amount_inr": ACTIVITY_FEE_INR,
        "totals": {**tot, "fee_util_pct": fee_util_pct, "repeat_rate_pct": repeat_rate},
        "by_city": per_city,
    }


def city_heatmap() -> list:
    """ANLY-01 — City participation heatmap ranked by total attendance."""
    data = community_analytics()
    ranked = sorted(data["by_city"], key=lambda r: r["attendance"], reverse=True)
    return [
        {
            "city": row["city"],
            "meetups": row["meetups"],
            "attendance": row["attendance"],
            "unique": row["unique"],
            "fee_util_pct": row["fee_util_pct"],
            "rank": idx + 1,
        }
        for idx, row in enumerate(ranked)
    ]


def top_organisers() -> list:
    """ANLY-02 — Organiser-activity view: who is actively organising."""
    # Group approved activities by organiser
    activities = (
        Activity.query.join(Proposal)
        .filter(Proposal.status == "approved")
        .all()
    )
    organiser_map = {}
    for act in activities:
        if not act.organiser_id:
            continue
        entry = organiser_map.setdefault(act.organiser_id, {
            "organiser_id": act.organiser_id,
            "organiser": act.organiser.name if act.organiser else "Unknown",
            "org": act.org.name if act.org else "Unknown",
            "activities_run": 0,
            "total_attendance": 0,
        })
        entry["activities_run"] += 1
        entry["total_attendance"] += act.attended_count()

    ranked = sorted(organiser_map.values(), key=lambda r: r["activities_run"], reverse=True)
    for idx, row in enumerate(ranked):
        row["rank"] = idx + 1
    return ranked
