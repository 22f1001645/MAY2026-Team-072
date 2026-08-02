"""Concrete repositories. Grouped in one module for a compact v1; each class
owns queries for one aggregate (Milestone 2 §3 — Repository layer)."""
from datetime import datetime

from ..extensions import db
from ..models import (
    Activity,
    AuditLog,
    City,
    ContributionPoint,
    Expense,
    Membership,
    Notification,
    Organisation,
    PORAssignment,
    Proposal,
    Registration,
    User,
)


class UserRepository:
    @staticmethod
    def by_email(email: str):
        return User.query.filter(db.func.lower(User.email) == email.strip().lower()).first()

    @staticmethod
    def by_id(uid: str):
        return User.query.get(uid)

    @staticmethod
    def add(user: User):
        db.session.add(user)
        return user

    @staticmethod
    def students():
        return User.query.filter_by(role="student").all()

    @staticmethod
    def search(query: str):
        q = f"%{query.strip().lower()}%"
        return User.query.filter(
            User.role == "student",
            (db.func.lower(User.email).like(q) | db.func.lower(User.name).like(q))
        ).all()


class OrgRepository:
    @staticmethod
    def all():
        return Organisation.query.order_by(Organisation.name).all()

    @staticmethod
    def by_id(oid):
        return Organisation.query.get(oid)

    @staticmethod
    def cities():
        return City.query.order_by(City.name).all()

    @staticmethod
    def cities_for_region(region_id: str):
        return City.query.filter_by(region_id=region_id).order_by(City.name).all()

    @staticmethod
    def add_city_to_region(name: str, region_id: str):
        existing = City.query.filter_by(name=name.strip(), region_id=region_id).first()
        if existing:
            return existing
        city = City(name=name.strip(), region_id=region_id)
        from ..extensions import db
        db.session.add(city)
        db.session.commit()
        return city

    @staticmethod
    def por_assignments():
        return PORAssignment.query.all()

    @staticmethod
    def membership_for(user_id, org_id):
        return Membership.query.filter_by(user_id=user_id, org_id=org_id).first()


class ActivityRepository:
    @staticmethod
    def by_id(aid):
        return Activity.query.get(aid)

    @staticmethod
    def published_feed(city=None):
        q = Activity.query.filter(Activity.status.in_(["upcoming", "live"]))
        q = q.join(Proposal).filter(Proposal.status == "approved")
        if city and city != "All":
            q = q.filter(Activity.city == city)
        return q.order_by(Activity.starts_at).all()

    @staticmethod
    def proposals_by_status(status=None):
        q = Activity.query.join(Proposal)
        if status == "pending":
            q = q.filter(Proposal.status.in_(["submitted", "changes_requested"]))
        elif status:
            q = q.filter(Proposal.status == status)
        return q.order_by(Activity.created_at.desc()).all()

    @staticmethod
    def by_organiser(user_id):
        return Activity.query.filter_by(organiser_id=user_id).order_by(Activity.created_at.desc()).all()

    @staticmethod
    def meetups_in_region_month(org_id: str, ref: datetime):
        """FR-B2 quota: counts meetups in a Region per month (via Activity.org_id).
        Excludes rejected proposals so they don't consume the quota.
        For backward compat, also accepts a city string as fallback."""
        start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        q = Activity.query.filter(
            Activity.org_id == org_id,
            Activity.starts_at >= start,
            Activity.scale.in_(["local_meetup", "regional_meetup"]),
        ).join(Proposal).filter(~Proposal.status.in_(["rejected", "revoked"]))
        return q.count()

    @staticmethod
    def approved_meetups_in_region_month(org_id: str, ref: datetime):
        """Used strictly during Admin decision to ensure an approved meetup doesn't violate quota."""
        start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        q = Activity.query.filter(
            Activity.org_id == org_id,
            Activity.starts_at >= start,
            Activity.scale.in_(["local_meetup", "regional_meetup"]),
        ).join(Proposal).filter(Proposal.status == "approved")
        return q.count()

    # Keep old method for backward compat with existing tests
    @staticmethod
    def meetups_in_city_month(city, ref: datetime):
        start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        q = Activity.query.filter(
            Activity.city == city,
            Activity.starts_at >= start,
            Activity.scale.in_(["local_meetup", "regional_meetup"]),
        )
        return q.count()


class RegistrationRepository:
    @staticmethod
    def find(activity_id, student_id):
        return Registration.query.filter_by(activity_id=activity_id, student_id=student_id).first()

    @staticmethod
    def for_activity(activity_id):
        return Registration.query.filter_by(activity_id=activity_id).all()

    @staticmethod
    def for_student(student_id):
        return Registration.query.filter_by(student_id=student_id).all()

    @staticmethod
    def by_ids(ids):
        return Registration.query.filter(Registration.id.in_(ids)).all()


class ExpenseRepository:
    @staticmethod
    def by_id(eid):
        return Expense.query.get(eid)

    @staticmethod
    def for_activity(activity_id):
        return Expense.query.filter_by(activity_id=activity_id).all()

    @staticmethod
    def all():
        return Expense.query.order_by(Expense.created_at.desc()).all()


class RecognitionRepository:
    @staticmethod
    def ledger_for(user_id):
        return (
            ContributionPoint.query.filter_by(user_id=user_id)
            .order_by(ContributionPoint.created_at.desc())
            .all()
        )

    @staticmethod
    def totals_by_user():
        rows = (
            db.session.query(
                ContributionPoint.user_id, db.func.sum(ContributionPoint.points)
            )
            .group_by(ContributionPoint.user_id)
            .all()
        )
        return {uid: int(total) for uid, total in rows}


class NotificationRepository:
    @staticmethod
    def for_user(user_id):
        return (
            Notification.query.filter_by(user_id=user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )


class AuditRepository:
    @staticmethod
    def for_entity(entity_id):
        return (
            AuditLog.query.filter_by(entity_id=entity_id)
            .order_by(AuditLog.created_at.asc())
            .all()
        )

    @staticmethod
    def all_logs(limit=50):
        return AuditLog.query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    @staticmethod
    def record(entity, entity_id, action, actor, note=None):
        entry = AuditLog(
            entity=entity,
            entity_id=entity_id,
            action=action,
            actor_id=actor.id if actor else None,
            actor_name=actor.name if actor else "System",
            note=note,
        )
        db.session.add(entry)
        return entry
