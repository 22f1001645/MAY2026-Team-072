"""SQLAlchemy models — the 18-table schema from Milestone 2 §5 (Figure C).

Conventions (per the design): UUID string PKs, created_at/updated_at on every
table, FKs indexed, the audit_log append-only. UUID-as-string keeps the schema
portable across SQLite (dev) and PostgreSQL 15 (prod)."""
import uuid
from datetime import datetime, UTC, timezone

from ..extensions import db


def _uuid() -> str:
    return uuid.uuid4().hex


def _utcnow():
    return datetime.now(UTC)


def _iso(dt):
    if not dt:
        return None
    s = dt.isoformat()
    if not s.endswith("Z") and "+" not in s:
        return s + "Z"
    return s


class Base(db.Model):
    """Shared PK + timestamps for every entity."""

    __abstract__ = True

    id = db.Column(db.String(32), primary_key=True, default=_uuid)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=_utcnow, onupdate=_utcnow, nullable=False
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


# --------------------------------------------------------------------------- #
# Module A — Community: identity, orgs, memberships, PORs
# --------------------------------------------------------------------------- #
class User(Base):
    __tablename__ = "users"

    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")  # admin|student
    city = db.Column(db.String(80))          # free-text specific city (e.g. Warangal)
    region_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=True)  # official Region
    interests = db.Column(db.JSON, default=list)

    memberships = db.relationship("Membership", back_populates="user", cascade="all, delete-orphan")
    registrations = db.relationship("Registration", back_populates="student", foreign_keys="Registration.student_id")
    region = db.relationship("Organisation", foreign_keys=[region_id])

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "city": self.city,
            "region": self.region.name if self.region else None,
            "region_id": self.region_id,
            "pors": [p.to_dict() for m in self.memberships for p in m.pors if p.active],
        }


class City(Base):
    __tablename__ = "cities"
    name = db.Column(db.String(80), nullable=False)
    # Region-scoped: every city belongs to one of the 10 official Regions
    region_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=True, index=True)

    region = db.relationship("Organisation", foreign_keys=[region_id])

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "region_id": self.region_id,
            "region": self.region.name if self.region else None,
        }


class Organisation(Base):
    __tablename__ = "organisations"
    name = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # house|society|region|council
    city = db.Column(db.String(80))
    bio = db.Column(db.Text)
    logo_url = db.Column(db.String(300))
    voice_descriptors = db.Column(db.JSON, default=list)
    color_palette = db.Column(db.JSON, default=list)
    sample_phrases = db.Column(db.JSON, default=list)

    activities = db.relationship("Activity", back_populates="org")
    memberships = db.relationship("Membership", back_populates="org")
    social_links = db.relationship("OrganisationSocialLink", back_populates="org", cascade="all, delete-orphan")

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
    """A Position of Responsibility — the *source of permissions* (PRD P3).

    council_tier distinguishes Upper House Council (Secretaries) from Lower
    House Council (Regional Coordinators). region_id scopes an RC to one of
    the 10 geographic regions within their house."""

    __tablename__ = "por_assignments"

    membership_id = db.Column(db.String(32), db.ForeignKey("memberships.id"), nullable=False, index=True)
    por_type = db.Column(db.String(80), nullable=False)
    term = db.Column(db.String(40))
    active = db.Column(db.Boolean, default=True, nullable=False)
    # Council governance fields (House & Region POR Architecture)
    region_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=True)
    council_tier = db.Column(db.String(50), nullable=True)  # upper_house_council | lower_house_council

    membership = db.relationship("Membership", back_populates="pors")
    region = db.relationship("Organisation", foreign_keys=[region_id])

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
            "member_id": m.user_id if m else None,
            "council_tier": self.council_tier,
            "region": self.region.name if self.region else None,
            "region_id": self.region_id,
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
    tags = db.Column(db.JSON, default=list)
    mail_template = db.Column(db.Text)
    poster_url = db.Column(db.String(300))

    org = db.relationship("Organisation", back_populates="activities")
    organiser = db.relationship("User")
    proposal = db.relationship("Proposal", back_populates="activity", uselist=False, cascade="all, delete-orphan")
    budget_lines = db.relationship("BudgetLine", back_populates="activity", cascade="all, delete-orphan")
    registrations = db.relationship("Registration", back_populates="activity", cascade="all, delete-orphan")
    expenses = db.relationship("Expense", back_populates="activity", cascade="all, delete-orphan")
    team_members = db.relationship("ActivityTeamMember", back_populates="activity", cascade="all, delete-orphan")
    tasks = db.relationship("ActivityTask", back_populates="activity", cascade="all, delete-orphan")
    schedule = db.relationship("EventSchedule", back_populates="activity", cascade="all, delete-orphan")
    custom_fields = db.relationship("CustomRegistrationField", back_populates="activity", cascade="all, delete-orphan")
    queries = db.relationship("EventQuery", back_populates="activity", cascade="all, delete-orphan")
    polls = db.relationship("EventPoll", back_populates="activity", cascade="all, delete-orphan")

    def registered_count(self):
        return sum(1 for r in self.registrations if r.status == "confirmed")

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
            "starts_at": _iso(self.starts_at),
            "capacity": self.capacity,
            "status": self.status,
            "tags": self.tags,
            "registered": self.registered_count(),
            "attended": self.attended_count(),
            "organiser": self.organiser.name if self.organiser else None,
            "proposal_status": self.proposal.status if self.proposal else None,
        }
        if detail:
            d["description"] = self.description
            d["budget"] = [b.to_dict() for b in self.budget_lines]
        return d


class Announcement(Base):
    """A broadcast message sent to all registrants of an activity."""

    __tablename__ = "announcements"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    sender_id = db.Column(db.String(32), db.ForeignKey("users.id"))
    title = db.Column(db.String(200))
    body = db.Column(db.Text)

    activity = db.relationship("Activity", backref=db.backref("announcements", cascade="all, delete-orphan"))
    sender = db.relationship("User")

    def to_dict(self):
        # Determine sender role dynamically since chat is now 2-way
        role = "Student"
        if self.sender:
            if self.sender.role == "admin":
                role = "Admin"
            elif self.sender.id == self.activity.organiser_id:
                role = "Organiser"

        return {
            "id": self.id,
            "eventId": self.activity_id,
            "senderName": self.sender.name if self.sender else "Organising Team",
            "senderRole": role if self.sender else "Organiser",
            "title": self.title,
            "content": self.body,
            "isAlert": bool(self.title),
            "createdAt": _iso(self.created_at),
        }


class Proposal(Base):
    """Initiates an Activity; carries status + is the anchor for the audit trail."""

    __tablename__ = "proposals"

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), unique=True, nullable=False)
    submitted_by = db.Column(db.String(32), db.ForeignKey("users.id"))
    status = db.Column(db.String(30), default="submitted")

    activity = db.relationship("Activity", back_populates="proposal")
    collaborators = db.relationship("ProposalCollaborator", back_populates="proposal", cascade="all, delete-orphan")

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
    status = db.Column(db.String(20), default="confirmed")  # confirmed|waitlisted
    qr_token = db.Column(db.String(32), unique=True, default=_uuid, nullable=False)
    referred_by_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True)

    activity = db.relationship("Activity", back_populates="registrations")
    student = db.relationship("User", back_populates="registrations", foreign_keys=[student_id])
    referred_by = db.relationship("User", foreign_keys=[referred_by_id])
    attendance = db.relationship("Attendance", back_populates="registration", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        a = self.activity
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "student_id": self.student_id,
            "student": self.student.name if self.student else None,
            "status": self.status,
            "qr_token": self.qr_token,
            "attended": self.attendance is not None,
            "referrer": self.referred_by.name if self.referred_by else None,
            "referred_by_id": self.referred_by_id,
            # Embedded activity summary so the student's list renders without a join
            "activity": {
                "id": a.id,
                "title": a.title,
                "city": a.city,
                "scale": a.scale,
                "venue": a.venue,
                "status": a.status,
                "starts_at": _iso(a.starts_at),
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

    activity = db.relationship("Activity")

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "body": self.body,
            "read": self.read,
            "activity_title": self.activity.title if self.activity else None,
            "at": _iso(self.created_at),
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
            "at": _iso(self.created_at),
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

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "summary": self.summary,
            "submitted_at": _iso(self.created_at),
        }


class Document(Base):
    __tablename__ = "documents"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"))
    url = db.Column(db.String(300))
    deleted_at = db.Column(db.DateTime)  # soft-delete

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "url": self.url,
            "created_at": _iso(self.created_at),
        }


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
            "at": _iso(self.created_at),
        }

# --------------------------------------------------------------------------- #
# Milestone 3 - New Phase 1 Tables
# --------------------------------------------------------------------------- #
class ProposalCollaborator(Base):
    __tablename__ = "proposal_collaborators"
    proposal_id = db.Column(db.String(32), db.ForeignKey("proposals.id"), nullable=False, index=True)
    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=False, index=True)
    status = db.Column(db.String(20), default="pending")  # pending|accepted|declined

    proposal = db.relationship("Proposal", back_populates="collaborators")
    org = db.relationship("Organisation")


class ActivityTeamMember(Base):
    __tablename__ = "activity_team_members"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    role = db.Column(db.String(80), nullable=False)

    activity = db.relationship("Activity", back_populates="team_members")
    user = db.relationship("User")


class ActivityTask(Base):
    __tablename__ = "activity_tasks"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    deadline = db.Column(db.DateTime)
    status = db.Column(db.String(20), default="todo")  # todo|in_progress|done
    assignee_id = db.Column(db.String(32), db.ForeignKey("users.id"))

    activity = db.relationship("Activity", back_populates="tasks")
    assignee = db.relationship("User")


class EventSchedule(Base):
    __tablename__ = "event_schedules"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    owner = db.Column(db.String(120))

    activity = db.relationship("Activity", back_populates="schedule")


class CustomRegistrationField(Base):
    __tablename__ = "custom_registration_fields"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    label = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(20), nullable=False, default="text")  # text|dropdown
    options = db.Column(db.JSON, default=list)
    required = db.Column(db.Boolean, default=False)

    activity = db.relationship("Activity", back_populates="custom_fields")


class OrganisationSocialLink(Base):
    __tablename__ = "organisation_social_links"
    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=False, index=True)
    platform = db.Column(db.String(50), nullable=False)
    url = db.Column(db.String(300), nullable=False)

    org = db.relationship("Organisation", back_populates="social_links")


class EventQuery(Base):
    __tablename__ = "event_queries"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    submitter_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False)
    query_text = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="open")  # open|answered
    response_text = db.Column(db.Text)
    responder_id = db.Column(db.String(32), db.ForeignKey("users.id"))

    activity = db.relationship("Activity", back_populates="queries")
    submitter = db.relationship("User", foreign_keys=[submitter_id])
    responder = db.relationship("User", foreign_keys=[responder_id])


class EventPoll(Base):
    __tablename__ = "event_polls"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    options = db.Column(db.JSON, nullable=False)  # list of strings

    activity = db.relationship("Activity", back_populates="polls")
    votes = db.relationship("EventPollVote", back_populates="poll", cascade="all, delete-orphan")


class EventPollVote(Base):
    __tablename__ = "event_poll_votes"
    __table_args__ = (db.UniqueConstraint("poll_id", "voter_id", name="uq_poll_vote"),)

    poll_id = db.Column(db.String(32), db.ForeignKey("event_polls.id"), nullable=False, index=True)
    voter_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    option_index = db.Column(db.Integer, nullable=False)

    poll = db.relationship("EventPoll", back_populates="votes")
    voter = db.relationship("User")


class AttendeeFeedback(Base):
    __tablename__ = "attendee_feedback"
    __table_args__ = (db.UniqueConstraint("activity_id", "student_id", name="uq_feedback"),)

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    student_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    comments = db.Column(db.Text)

    activity = db.relationship("Activity")
    student = db.relationship("User")


class TokenBlocklist(Base):
    __tablename__ = "token_blocklist"
    jti = db.Column(db.String(36), nullable=False, index=True)
