"""SQLAlchemy models — the 18-table schema from Milestone 2 §5 (Figure C).

Conventions (per the design): UUID string PKs, created_at/updated_at on every
table, FKs indexed, the audit_log append-only. UUID-as-string keeps the schema
portable across SQLite (dev) and PostgreSQL 15 (prod)."""
import uuid
from datetime import datetime

from ..extensions import db


def _uuid() -> str:
    return uuid.uuid4().hex


class Base(db.Model):
    """Shared PK + timestamps for every entity."""

    __abstract__ = True

    id = db.Column(db.String(32), primary_key=True, default=_uuid)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


# --------------------------------------------------------------------------- #
# Module A — Community: identity, orgs, memberships, PORs
# --------------------------------------------------------------------------- #
class User(Base):
    __tablename__ = "users"

    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")  # admin|student
    city = db.Column(db.String(80))

    memberships = db.relationship("Membership", back_populates="user", cascade="all, delete-orphan")
    registrations = db.relationship("Registration", back_populates="student")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "city": self.city,
            "pors": [p.to_dict() for m in self.memberships for p in m.pors if p.active],
        }


class City(Base):
    __tablename__ = "cities"
    name = db.Column(db.String(80), unique=True, nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class Organisation(Base):
    __tablename__ = "organisations"
    name = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # house|society|region|council
    city = db.Column(db.String(80))

    activities = db.relationship("Activity", back_populates="org")
    memberships = db.relationship("Membership", back_populates="org")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "type": self.type, "city": self.city}


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (db.UniqueConstraint("user_id", "org_id", name="uq_member"),)

    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=False, index=True)

    user = db.relationship("User", back_populates="memberships")
    org = db.relationship("Organisation", back_populates="memberships")
    pors = db.relationship("PORAssignment", back_populates="membership", cascade="all, delete-orphan")


class PORAssignment(Base):
    """A Position of Responsibility — the *source of permissions* (PRD P3)."""

    __tablename__ = "por_assignments"

    membership_id = db.Column(db.String(32), db.ForeignKey("memberships.id"), nullable=False, index=True)
    por_type = db.Column(db.String(80), nullable=False)
    term = db.Column(db.String(40))
    active = db.Column(db.Boolean, default=True, nullable=False)

    membership = db.relationship("Membership", back_populates="pors")

    def to_dict(self):
        m = self.membership
        return {
            "id": self.id,
            "por_type": self.por_type,
            "term": self.term,
            "active": self.active,
            "org_id": m.org_id if m else None,
            "org": m.org.name if m and m.org else None,
            "member": m.user.name if m and m.user else None,
        }


# --------------------------------------------------------------------------- #
# Module B/C — Events: activity, proposal, budget
# --------------------------------------------------------------------------- #
class Activity(Base):
    """The hub entity. An Event is a *published* Activity."""

    __tablename__ = "activities"
    __table_args__ = (db.Index("ix_activity_feed", "city", "starts_at"),)

    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    city = db.Column(db.String(80), index=True)
    scale = db.Column(db.String(30), nullable=False, default="local_meetup")
    venue = db.Column(db.String(200))
    starts_at = db.Column(db.DateTime)
    capacity = db.Column(db.Integer, default=50)
    status = db.Column(db.String(20), default="upcoming")  # upcoming|live|completed|archived
    organiser_id = db.Column(db.String(32), db.ForeignKey("users.id"))

    org = db.relationship("Organisation", back_populates="activities")
    organiser = db.relationship("User")
    proposal = db.relationship("Proposal", back_populates="activity", uselist=False, cascade="all, delete-orphan")
    budget_lines = db.relationship("BudgetLine", back_populates="activity", cascade="all, delete-orphan")
    registrations = db.relationship("Registration", back_populates="activity", cascade="all, delete-orphan")
    expenses = db.relationship("Expense", back_populates="activity", cascade="all, delete-orphan")

    def registered_count(self):
        return len(self.registrations)

    def attended_count(self):
        return sum(1 for r in self.registrations if r.attendance is not None)

    def to_dict(self, detail=False):
        d = {
            "id": self.id,
            "title": self.title,
            "org": self.org.name if self.org else None,
            "city": self.city,
            "scale": self.scale,
            "venue": self.venue,
            "starts_at": self.starts_at.isoformat() if self.starts_at else None,
            "capacity": self.capacity,
            "status": self.status,
            "registered": self.registered_count(),
            "attended": self.attended_count(),
            "organiser": self.organiser.name if self.organiser else None,
            "proposal_status": self.proposal.status if self.proposal else None,
        }
        if detail:
            d["description"] = self.description
            d["budget"] = [b.to_dict() for b in self.budget_lines]
        return d


class Proposal(Base):
    """Initiates an Activity; carries status + is the anchor for the audit trail."""

    __tablename__ = "proposals"

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), unique=True, nullable=False)
    submitted_by = db.Column(db.String(32), db.ForeignKey("users.id"))
    status = db.Column(db.String(30), default="submitted")

    activity = db.relationship("Activity", back_populates="proposal")

    def to_dict(self):
        return {"id": self.id, "activity_id": self.activity_id, "status": self.status}


class BudgetLine(Base):
    __tablename__ = "budget_lines"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    label = db.Column(db.String(150), nullable=False)
    planned = db.Column(db.Integer, default=0)

    activity = db.relationship("Activity", back_populates="budget_lines")
    expenses = db.relationship("Expense", back_populates="budget_line")

    def actual(self):
        return sum(e.amount for e in self.expenses)

    def to_dict(self):
        return {"id": self.id, "label": self.label, "planned": self.planned, "actual": self.actual()}


# --------------------------------------------------------------------------- #
# Module D — Registration, attendance, notifications
# --------------------------------------------------------------------------- #
class Registration(Base):
    __tablename__ = "registrations"
    __table_args__ = (db.UniqueConstraint("activity_id", "student_id", name="uq_reg"),)

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    student_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)

    activity = db.relationship("Activity", back_populates="registrations")
    student = db.relationship("User", back_populates="registrations")
    attendance = db.relationship("Attendance", back_populates="registration", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        a = self.activity
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "student_id": self.student_id,
            "student": self.student.name if self.student else None,
            "attended": self.attendance is not None,
            # Embedded activity summary so the student's list renders without a join
            "activity": {
                "id": a.id,
                "title": a.title,
                "city": a.city,
                "scale": a.scale,
                "venue": a.venue,
                "status": a.status,
                "starts_at": a.starts_at.isoformat() if a.starts_at else None,
            }
            if a
            else None,
        }


class Attendance(Base):
    """A registered student actually attended — powers points & fee utilisation."""

    __tablename__ = "attendance"
    registration_id = db.Column(db.String(32), db.ForeignKey("registrations.id"), unique=True, nullable=False)
    checked_in_by = db.Column(db.String(32), db.ForeignKey("users.id"))

    registration = db.relationship("Registration", back_populates="attendance")


class Notification(Base):
    __tablename__ = "notifications"
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"))
    type = db.Column(db.String(20), default="update")
    title = db.Column(db.String(200))
    body = db.Column(db.Text)
    read = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "body": self.body,
            "read": self.read,
            "at": self.created_at.isoformat() if self.created_at else None,
        }


# --------------------------------------------------------------------------- #
# Module E — Budget & reimbursement
# --------------------------------------------------------------------------- #
class Expense(Base):
    __tablename__ = "expenses"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    budget_line_id = db.Column(db.String(32), db.ForeignKey("budget_lines.id"))
    label = db.Column(db.String(200))
    amount = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default="submitted")
    bill_name = db.Column(db.String(200))
    submitted_by = db.Column(db.String(32), db.ForeignKey("users.id"))

    activity = db.relationship("Activity", back_populates="expenses")
    budget_line = db.relationship("BudgetLine", back_populates="expenses")

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "activity": self.activity.title if self.activity else None,
            "city": self.activity.city if self.activity else None,
            "budget_line_id": self.budget_line_id,
            "label": self.label,
            "amount": self.amount,
            "status": self.status,
            "bill_name": self.bill_name,
            "submitted_by": self.submitted_by,
        }


# --------------------------------------------------------------------------- #
# Module G/H — Recognition & fee utilisation
# --------------------------------------------------------------------------- #
class ContributionPoint(Base):
    """Ledger entry crediting a Student for an action (computed off attendance)."""

    __tablename__ = "contribution_points"
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"))
    action = db.Column(db.String(20))  # attended|organised|volunteered
    points = db.Column(db.Integer, default=0)

    user = db.relationship("User")
    activity = db.relationship("Activity")

    def to_dict(self):
        return {
            "id": self.id,
            "action": self.action,
            "points": self.points,
            "activity": self.activity.title if self.activity else None,
            "at": self.created_at.isoformat() if self.created_at else None,
        }


class ActivityFeeRecord(Base):
    __tablename__ = "activity_fee_records"
    __table_args__ = (db.UniqueConstraint("user_id", "term", name="uq_fee"),)

    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    term = db.Column(db.String(40), nullable=False)
    paid = db.Column(db.Boolean, default=True)


# --------------------------------------------------------------------------- #
# Module F / cross-cutting — reports, documents, audit
# --------------------------------------------------------------------------- #
class Report(Base):
    __tablename__ = "reports"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"))
    summary = db.Column(db.Text)
    deleted_at = db.Column(db.DateTime)  # soft-delete


class Document(Base):
    __tablename__ = "documents"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"))
    url = db.Column(db.String(300))
    deleted_at = db.Column(db.DateTime)  # soft-delete


class AuditLog(Base):
    """Append-only. Every state change (approve, verify, publish) lands here."""

    __tablename__ = "audit_log"
    entity = db.Column(db.String(50))
    entity_id = db.Column(db.String(32), index=True)
    action = db.Column(db.String(120))
    actor_id = db.Column(db.String(32))
    actor_name = db.Column(db.String(120))
    note = db.Column(db.Text)

    def to_dict(self):
        return {
            "action": self.action,
            "actor": self.actor_name,
            "note": self.note,
            "at": self.created_at.isoformat() if self.created_at else None,
        }
