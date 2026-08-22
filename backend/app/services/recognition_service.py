from ..models import Attendance, ContributionPoint, Registration, User
from ..repositories.repos import RecognitionRepository


def leaderboard(city=None) -> list:
    """Rank students by total points, scoped by city or overall (FR-G5)."""
    totals = RecognitionRepository.totals_by_user()
    users = User.query.filter_by(role="student").all()

    rows = []
    for u in users:
        if city and city not in (None, "Overall") and u.city != city:
            continue
        attended = (
            Registration.query.join(Attendance)
            .filter(Registration.student_id == u.id)
            .count()
        )
        organised = ContributionPoint.query.filter_by(user_id=u.id, action="organised").count()
        is_organiser = any(p.active for m in u.memberships for p in m.pors)
        rows.append(
            {
                "userId": u.id,
                "name": u.name,
                "city": u.city,
                "points": totals.get(u.id, 0),
                "attended": attended,
                "organised": organised,
                "isOrganiser": is_organiser,
            }
        )

    rows.sort(key=lambda r: r["points"], reverse=True)
    for i, r in enumerate(rows, start=1):
        r["rank"] = i
    return rows


def ledger(user) -> dict:
    entries = RecognitionRepository.ledger_for(user.id)
    total = sum(e.points for e in entries)
    return {"total": total, "entries": [e.to_dict() for e in entries]}
