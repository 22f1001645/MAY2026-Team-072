from ..constants import ACTIVITY_FEE_INR
from ..extensions import db
from ..models import (
    Activity,
    ActivityFeeRecord,
    Attendance,
    Proposal,
    Registration,
    User,
)


def community_analytics() -> dict:
    """Descriptive admin analytics + the Rs 100 fee-utilisation wedge (FR-H)."""
    cities = [c[0] for c in db.session.query(User.city).distinct() if c[0]]
    per_city = []
    tot = {"meetups": 0, "attendance": 0, "unique": 0, "repeat": 0, "fee_paid": 0, "fee_used": 0}

    for city in sorted(cities):
        meetups = (
            Activity.query.join(Proposal)
            .filter(Activity.city == city, Proposal.status == "approved")
            .count()
        )
        # Attendance rows for students in this city
        student_ids = [u.id for u in User.query.filter_by(city=city, role="student").all()]
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
            "city": city,
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
