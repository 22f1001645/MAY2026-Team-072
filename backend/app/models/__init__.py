"""SQLAlchemy models — the 18-table schema from Milestone 2 §5 (Figure C).

Conventions (per the design): UUID string PKs, created_at/updated_at on every
table, FKs indexed, the audit_log append-only. UUID-as-string keeps the schema
portable across SQLite (dev) and PostgreSQL 15 (prod)."""
import uuid
from datetime import datetime, UTC, timezone

from ..constants import (
    ATTENDANCE_METHOD_MANUAL,
    BRAND_KIT_MANUAL,
    CAMPAIGN_DRAFT,
    COLLAB_PENDING,
    POLL_OPEN,
    QUERY_OPEN,
    REPORT_SUBMITTED,
    TASK_TODO,
    TEAM_ROLE_MEETUP_HEAD,
)
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
    # Academic self-declaration (AUTH-04). All three are nullable because the
    # field is self-declared and every user who already exists has declared
    # nothing yet, so NULL genuinely means "not yet declared" rather than a
    # guess. AUTH-04 also requires these to stay decoupled from auth: no login,
    # token issue or token refresh may branch on them, so an out-of-date
    # declaration can never lock anyone out. Values come from ACADEMIC_LEVELS
    # and ACADEMIC_STATUSES; the termly re-confirmation nudge and the admin
    # override are Phase 2 service rules.
    academic_level = db.Column(db.String(20), nullable=True)
    academic_status = db.Column(db.String(20), nullable=True)
    academic_confirmed_at = db.Column(db.DateTime, nullable=True)

    memberships = db.relationship("Membership", back_populates="user", cascade="all, delete-orphan")
    registrations = db.relationship("Registration", back_populates="student")
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
            # Data on the payload only. Nothing in the auth path may read these
            # keys to decide whether a session is valid (AUTH-04).
            "academic_level": self.academic_level,
            "academic_status": self.academic_status,
            "academic_confirmed_at": _iso(self.academic_confirmed_at),
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
    # Entity profile (ORG-01). Both nullable: every organisation that already
    # exists was seeded without a profile, and an empty profile is a truthful
    # state rather than something to invent a default for. Applies to all four
    # org types, replacing the Houses-only HOUSE_META precedent.
    bio = db.Column(db.Text, nullable=True)
    logo_url = db.Column(db.String(300), nullable=True)

    activities = db.relationship("Activity", back_populates="org")
    memberships = db.relationship("Membership", back_populates="org")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "city": self.city,
            "bio": self.bio,
            "logo_url": self.logo_url,
        }


# --------------------------------------------------------------------------- #
# Module A — Organisation identity & brand (v1.1 milestone)
# --------------------------------------------------------------------------- #
class OrganisationSocialLink(Base):
    """One social handle belonging to an Organisation (ORG-01/ORG-02).

    `url` is free text supplied by a Secretary or Deputy Secretary and is stored
    unvalidated by this layer on purpose. ORG-02 owns the server-side gate in
    Phase 4: an http/https scheme check plus a host allowlist, applied at the
    service boundary before the row is written. Until that lands, the column is
    inert - nothing in Phases 1-3 reads or renders it anywhere, so a hostile
    value has no path to a browser (threat T-01-12).

    One row per (org, platform), so an entity cannot list two conflicting
    Instagram handles and leave a reader guessing which is current."""

    __tablename__ = "organisation_social_links"
    __table_args__ = (
        db.UniqueConstraint("org_id", "platform", name="uq_org_social_platform"),
    )

    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=False, index=True)
    platform = db.Column(db.String(40), nullable=False)   # instagram|linkedin|x|...
    url = db.Column(db.String(300), nullable=False)

    org = db.relationship(
        "Organisation", backref=db.backref("social_links", cascade="all, delete-orphan")
    )

    def to_dict(self):
        return {
            "id": self.id,
            "org_id": self.org_id,
            "platform": self.platform,
            "url": self.url,
        }


class BrandKit(Base):
    """The one brand kit per Organisation, driving campaign generation (ORG-03).

    `source` records provenance, not approval state: an AI-assisted draft is
    never applied without an explicit save by a human (ORG-04), so a row marked
    BRAND_KIT_AI_DRAFT is content someone reviewed and kept, not something
    pending review. The AI-assist call itself is a Phase 4 service concern."""

    __tablename__ = "brand_kits"

    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), unique=True, nullable=False)
    voice_tone = db.Column(db.Text)
    palette = db.Column(db.JSON, default=list)          # hex strings
    sample_phrases = db.Column(db.JSON, default=list)
    source = db.Column(db.String(20), nullable=False, default=BRAND_KIT_MANUAL)

    org = db.relationship(
        "Organisation",
        backref=db.backref("brand_kit", uselist=False, cascade="all, delete-orphan"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "org_id": self.org_id,
            "voice_tone": self.voice_tone,
            "palette": self.palette,
            "sample_phrases": self.sample_phrases,
            "source": self.source,
        }


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

    org = db.relationship("Organisation", back_populates="activities")
    organiser = db.relationship("User")
    proposal = db.relationship("Proposal", back_populates="activity", uselist=False, cascade="all, delete-orphan")
    budget_lines = db.relationship("BudgetLine", back_populates="activity", cascade="all, delete-orphan")
    registrations = db.relationship("Registration", back_populates="activity", cascade="all, delete-orphan")
    expenses = db.relationship("Expense", back_populates="activity", cascade="all, delete-orphan")

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
    # CHAT-04 polls the event channel with a cursor: "announcements for this
    # activity created after X, newest first". This composite index matches that
    # query shape so the poll walks an index instead of scanning the table on
    # every tick.
    __table_args__ = (db.Index("ix_announcement_cursor", "activity_id", "created_at"),)

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    sender_id = db.Column(db.String(32), db.ForeignKey("users.id"))
    title = db.Column(db.String(200))
    body = db.Column(db.Text)

    activity = db.relationship("Activity", backref=db.backref("announcements", cascade="all, delete-orphan"))
    sender = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "eventId": self.activity_id,
            "senderName": self.sender.name if self.sender else "Organising Team",
            "senderRole": "Organiser",
            "title": self.title,
            "content": self.body,
            "createdAt": _iso(self.created_at),
        }


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
# Module B/C — Collaboration, team, design & campaign (v1.1 milestone)
# --------------------------------------------------------------------------- #
class ActivityCollaborator(Base):
    """An Organisation running an Activity, with its own consent state.

    This table — not `activities.org_id` — is the source of truth for "which
    organisations are running this activity". `activities.org_id` survives as a
    denormalised pointer that must always equal the org_id of the row where
    is_primary is true; Phase 3 (PROPOSAL-01) writes both sides.

    Only rows with status `accepted` count toward the Mega Meetup label
    (PROPOSAL-03) or the regional-fest collaborator minimum (PROG-02); those
    thresholds are Phase 3 / Phase 7 rules, not schema constraints."""

    __tablename__ = "activity_collaborators"
    __table_args__ = (
        db.UniqueConstraint("activity_id", "org_id", name="uq_activity_collaborator"),
        # Exactly one primary organisation per activity, enforced by the database
        # so `can_manage_activity` can never face two owners (threat T-01-07).
        db.Index(
            "uq_activity_primary_org",
            "activity_id",
            unique=True,
            sqlite_where=db.text("is_primary = 1"),
            postgresql_where=db.text("is_primary"),
        ),
    )

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=False, index=True)
    is_primary = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.String(20), nullable=False, default=COLLAB_PENDING)
    invited_by = db.Column(db.String(32), db.ForeignKey("users.id"))
    responded_by = db.Column(db.String(32), db.ForeignKey("users.id"))
    responded_at = db.Column(db.DateTime)

    activity = db.relationship(
        "Activity", backref=db.backref("collaborators", cascade="all, delete-orphan")
    )
    org = db.relationship("Organisation")

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "org_id": self.org_id,
            "org": self.org.name if self.org else None,
            "is_primary": self.is_primary,
            "status": self.status,
            "responded_at": _iso(self.responded_at),
        }


class ActivityTeamMember(Base):
    """A person holding one team role on ONE Activity.

    Team membership is Activity-scoped and grants zero org-wide permission —
    org-wide authority stays with PORAssignment (TEAM-03). The single exception
    is TEAM_ROLE_MEETUP_HEAD, which carries sole campaign-approval authority
    (RBAC-03) for its own Activity and nothing beyond it.

    The Meetup Head singleton is a database constraint, not a service check: two
    concurrent Meetup Heads would make campaign-approval authority ambiguous
    (threat T-01-06)."""

    __tablename__ = "activity_team_members"
    __table_args__ = (
        db.UniqueConstraint("activity_id", "user_id", "role", name="uq_team_member_role"),
        # A partial-index predicate must be static SQL, so the role literal is
        # written out here rather than bound from TEAM_ROLE_MEETUP_HEAD.
        db.Index(
            "uq_team_meetup_head",
            "activity_id",
            unique=True,
            sqlite_where=db.text("role = 'Meetup Head'"),
            postgresql_where=db.text("role = 'Meetup Head'"),
        ),
    )

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    role = db.Column(db.String(40), nullable=False)  # a value from TEAM_ROLES
    added_by = db.Column(db.String(32), db.ForeignKey("users.id"))

    activity = db.relationship(
        "Activity", backref=db.backref("team_members", cascade="all, delete-orphan")
    )
    user = db.relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "user_id": self.user_id,
            "member": self.user.name if self.user else None,
            "role": self.role,
            "added_by": self.added_by,
        }


# uq_team_meetup_head hard-codes the role as static SQL because a partial-index
# predicate cannot take a bound parameter. This guard fails loudly at import time
# if the constant is ever edited without updating that literal — otherwise the
# index would silently stop enforcing the RBAC-03 singleton (threat T-01-06).
assert TEAM_ROLE_MEETUP_HEAD == "Meetup Head", (
    "TEAM_ROLE_MEETUP_HEAD changed — update the uq_team_meetup_head predicate in "
    "ActivityTeamMember.__table_args__ to match, and emit a migration for it."
)


class ActivityTask(Base):
    """A card on the activity's Kanban board (TEAM-02).

    Replaces the client-side mock array in frontend/src/lib/mock.ts, which was
    never persisted."""

    __tablename__ = "activity_tasks"

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    assignee_id = db.Column(db.String(32), db.ForeignKey("users.id"), index=True)
    deadline = db.Column(db.DateTime)
    status = db.Column(db.String(20), nullable=False, default=TASK_TODO)
    position = db.Column(db.Integer, nullable=False, default=0)
    created_by = db.Column(db.String(32), db.ForeignKey("users.id"))

    activity = db.relationship(
        "Activity",
        backref=db.backref(
            "tasks",
            cascade="all, delete-orphan",
            order_by="(ActivityTask.position, ActivityTask.created_at, ActivityTask.id)",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "title": self.title,
            "description": self.description,
            "assignee_id": self.assignee_id,
            "deadline": _iso(self.deadline),
            "status": self.status,
            "position": self.position,
        }


class EventScheduleItem(Base):
    """One ordered row of the event-design agenda (DESIGN-01)."""

    __tablename__ = "event_schedule_items"

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    position = db.Column(db.Integer, nullable=False, default=0)
    time_block = db.Column(db.String(60))       # human label, e.g. "10:00 - 10:30"
    title = db.Column(db.String(200), nullable=False)
    owner_id = db.Column(db.String(32), db.ForeignKey("users.id"))
    owner_label = db.Column(db.String(120))     # for an owner who is not a platform user
    notes = db.Column(db.Text)

    activity = db.relationship(
        "Activity",
        backref=db.backref(
            "schedule_items",
            cascade="all, delete-orphan",
            order_by="(EventScheduleItem.position, EventScheduleItem.created_at, EventScheduleItem.id)",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "position": self.position,
            "time_block": self.time_block,
            "title": self.title,
            "owner_id": self.owner_id,
            "owner_label": self.owner_label,
            "notes": self.notes,
        }


class RegistrationFormField(Base):
    """One organiser-defined custom field on an activity's registration form.

    How many custom fields an organiser may add is a Phase 5 service rule, not a
    schema constraint — the cap is deliberately absent here (CAMPAIGN-05)."""

    __tablename__ = "registration_form_fields"
    __table_args__ = (
        db.UniqueConstraint("activity_id", "label", name="uq_form_field_label"),
    )

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    label = db.Column(db.String(120), nullable=False)
    field_type = db.Column(db.String(20), nullable=False)  # a value from FORM_FIELD_TYPES
    options = db.Column(db.JSON, default=list)             # used only when field_type is dropdown
    required = db.Column(db.Boolean, nullable=False, default=False)
    position = db.Column(db.Integer, nullable=False, default=0)

    activity = db.relationship(
        "Activity",
        backref=db.backref(
            "form_fields",
            cascade="all, delete-orphan",
            order_by="(RegistrationFormField.position, RegistrationFormField.created_at, RegistrationFormField.id)",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "label": self.label,
            "field_type": self.field_type,
            "options": self.options,
            "required": self.required,
            "position": self.position,
        }


class RegistrationFieldResponse(Base):
    """One student's answer to one custom registration field (CAMPAIGN-05).

    Without this table the form would collect answers with nowhere to store
    them, forcing a second destructive reset in Phase 5 — which ROADMAP Phase 1
    success criterion 3 forbids."""

    __tablename__ = "registration_field_responses"
    __table_args__ = (
        db.UniqueConstraint("registration_id", "field_id", name="uq_field_response"),
    )

    registration_id = db.Column(db.String(32), db.ForeignKey("registrations.id"), nullable=False, index=True)
    field_id = db.Column(db.String(32), db.ForeignKey("registration_form_fields.id"), nullable=False, index=True)
    value = db.Column(db.Text)

    registration = db.relationship(
        "Registration", backref=db.backref("field_responses", cascade="all, delete-orphan")
    )
    field = db.relationship("RegistrationFormField")

    def to_dict(self):
        return {
            "id": self.id,
            "registration_id": self.registration_id,
            "field_id": self.field_id,
            "label": self.field.label if self.field else None,
            "value": self.value,
        }


class CampaignPackage(Base):
    """The one campaign package per Activity (CAMPAIGN-01/02/03/04/06).

    `poster_name` stores a filename, following the existing Expense.bill_name
    precedent — no blob storage exists in this architecture yet and choosing one
    is a Phase 5 decision, so the column deliberately holds a name, not bytes.

    `approved_by`/`approved_at` are kept separate from `pushed_live_at` so
    CAMPAIGN-06's Meetup Head gate stays auditable after the fact; the runtime
    gate itself is meetup_head_required from plan 01-05 (threat T-01-09)."""

    __tablename__ = "campaign_packages"

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), unique=True, nullable=False)
    mail_subject = db.Column(db.String(200))
    mail_body = db.Column(db.Text)
    poster_name = db.Column(db.String(200))
    registration_slug = db.Column(db.String(64), unique=True, nullable=True, index=True)
    status = db.Column(db.String(30), nullable=False, default=CAMPAIGN_DRAFT)
    approved_by = db.Column(db.String(32), db.ForeignKey("users.id"))
    approved_at = db.Column(db.DateTime)
    pushed_live_at = db.Column(db.DateTime)

    activity = db.relationship(
        "Activity",
        backref=db.backref("campaign", uselist=False, cascade="all, delete-orphan"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "mail_subject": self.mail_subject,
            "mail_body": self.mail_body,
            "poster_name": self.poster_name,
            "registration_slug": self.registration_slug,
            "status": self.status,
            "approved_by": self.approved_by,
            "approved_at": _iso(self.approved_at),
            "pushed_live_at": _iso(self.pushed_live_at),
        }


# --------------------------------------------------------------------------- #
# Module D — Registration, attendance, notifications
# --------------------------------------------------------------------------- #
class Registration(Base):
    __tablename__ = "registrations"
    __table_args__ = (db.UniqueConstraint("activity_id", "student_id", name="uq_reg"),)

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    student_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(20), default="confirmed")  # confirmed|waitlisted

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
            "status": self.status,
            "attended": self.attendance is not None,
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
    # How the check-in happened (QR-01/QR-03). The server_default backfills every
    # row that already exists to `manual`, which is accurate: QR scanning does
    # not exist yet, so every check-in so far came from the tap-based roster
    # flow. QR-04 counts every Attendance row as authoritative regardless of
    # method - this column records the route, it does not weight the count.
    method = db.Column(
        db.String(20),
        nullable=False,
        default=ATTENDANCE_METHOD_MANUAL,
        server_default="manual",
    )

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
    """The post-event report (FEEDBACK-01).

    Any team member may draft one; only the assigned Meetup Head may move it to
    `submitted`. That rule needs both `status` and `submitted_by` to be
    representable at all, and `submitted_at` to make the action auditable after
    the fact (threat T-01-16). The runtime gate is meetup_head_required from
    plan 01-05."""

    __tablename__ = "reports"
    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"))
    summary = db.Column(db.Text)
    deleted_at = db.Column(db.DateTime)  # soft-delete
    # Organiser reflection, both nullable: an existing report has neither, and a
    # blank reflection is honest where an invented one would not be.
    challenges = db.Column(db.Text, nullable=True)
    learnings = db.Column(db.Text, nullable=True)
    # The server_default is load-bearing, not decoration. Every Report row that
    # exists today was in fact submitted - drafts had nowhere to live before this
    # column - so backfilling them to `submitted` records what actually happened.
    # Leaving them NULL would make the draft/submitted distinction ambiguous for
    # exactly the rows nobody can go back and check.
    status = db.Column(
        db.String(20),
        nullable=False,
        default=REPORT_SUBMITTED,
        server_default="submitted",
    )
    submitted_by = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True)
    # Distinct from created_at, which is when the draft was first written.
    # Historic rows carry NULL here because their true submission time is
    # unknowable; the `submitted_at` key in to_dict() keeps reporting created_at
    # so no existing API consumer changes meaning under this migration.
    submitted_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "summary": self.summary,
            "submitted_at": _iso(self.created_at),
            "challenges": self.challenges,
            "learnings": self.learnings,
            "status": self.status,
            "submitted_by": self.submitted_by,
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
# Close-out, event channel, session & progression (v1.1 milestone)
# --------------------------------------------------------------------------- #
class EventFeedback(Base):
    """One attendee's rating of one event (FEEDBACK-02).

    The unique constraint is what makes a rating mean something: without it the
    same person could submit ten rows and move the average on their own (threat
    T-01-15). FEEDBACK-02's "only attendees may rate" rule is a Phase 6 service
    check layered on top of this, not a replacement for it."""

    __tablename__ = "event_feedback"
    __table_args__ = (
        db.UniqueConstraint("activity_id", "user_id", name="uq_event_feedback"),
    )

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)

    activity = db.relationship(
        "Activity", backref=db.backref("feedback", cascade="all, delete-orphan")
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "user_id": self.user_id,
            "rating": self.rating,
            "comment": self.comment,
            "at": _iso(self.created_at),
        }


class EventPoll(Base):
    """A poll the organising team runs inside an event's channel (CHAT-01).

    Polls are organiser-authored broadcast, matching the channel's whole design:
    the team asks, registrants answer, and there is no peer-to-peer thread."""

    __tablename__ = "event_polls"

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    question = db.Column(db.String(300), nullable=False)
    options = db.Column(db.JSON, nullable=False, default=list)
    status = db.Column(db.String(20), nullable=False, default=POLL_OPEN)
    closes_at = db.Column(db.DateTime, nullable=True)
    created_by = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True)

    activity = db.relationship(
        "Activity", backref=db.backref("polls", cascade="all, delete-orphan")
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "question": self.question,
            "options": self.options,
            "status": self.status,
            "closes_at": _iso(self.closes_at),
        }


class EventPollVote(Base):
    """One registrant's answer to one poll (CHAT-01).

    `uq_poll_vote` is the entire implementation of "each registrant votes once":
    a second vote is physically impossible rather than merely refused by a
    service that could be raced or bypassed (threat T-01-14)."""

    __tablename__ = "event_poll_votes"
    __table_args__ = (
        db.UniqueConstraint("poll_id", "user_id", name="uq_poll_vote"),
    )

    poll_id = db.Column(db.String(32), db.ForeignKey("event_polls.id"), nullable=False, index=True)
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    option_index = db.Column(db.Integer, nullable=False)

    poll = db.relationship(
        "EventPoll", backref=db.backref("votes", cascade="all, delete-orphan")
    )

    def to_dict(self):
        return {
            "id": self.id,
            "poll_id": self.poll_id,
            "user_id": self.user_id,
            "option_index": self.option_index,
        }


class EventQuery(Base):
    """A registrant's question to the organising team (CHAT-02/CHAT-03).

    CHAT-02 draws a hard boundary: inside an event's channel a registrant may
    submit a query and cancel their registration, and nothing else. There is
    deliberately no peer-to-peer reply column here - open chat was rejected as
    an anti-feature given the moderation burden, so only the team answers, via
    `response_body`/`responded_by`.

    Rate limiting on submissions is CHAT-03's Phase 8 concern, not a schema
    constraint."""

    __tablename__ = "event_queries"
    __table_args__ = (
        # CHAT-04 polls "queries for this activity since cursor X".
        db.Index("ix_event_query_cursor", "activity_id", "created_at"),
    )

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), nullable=False, index=True)
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False, index=True)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default=QUERY_OPEN)
    response_body = db.Column(db.Text, nullable=True)
    responded_by = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True)
    responded_at = db.Column(db.DateTime, nullable=True)

    activity = db.relationship(
        "Activity", backref=db.backref("queries", cascade="all, delete-orphan")
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "user_id": self.user_id,
            "body": self.body,
            "status": self.status,
            "response_body": self.response_body,
            "responded_by": self.responded_by,
            "responded_at": _iso(self.responded_at),
            "at": _iso(self.created_at),
        }


class RefreshTokenBlocklist(Base):
    """Revoked refresh tokens, by JWT id (AUTH-01).

    Without this table a long-lived refresh token cannot be revoked at all: a
    stolen one would stay valid for its full lifetime (threat T-01-13). `jti` is
    unique and indexed because the revocation check runs on every single refresh,
    and `expires_at` is indexed so expired rows can be pruned by range instead of
    scanning what becomes the hottest table in the auth flow. Phase 2 is the
    consumer."""

    __tablename__ = "refresh_token_blocklist"

    jti = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True, index=True)
    revoked_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "jti": self.jti,
            "user_id": self.user_id,
            "revoked_at": _iso(self.revoked_at),
            "expires_at": _iso(self.expires_at),
        }


class OrgProgressionUnlock(Base):
    """The one-way record that an org reached fest tier in a city (PROG-03).

    This table is NOT the eligibility source. PROG-01 eligibility stays computed
    server-side from the org's completed activities in that city, and PROG-04's
    403 gate computes it too rather than reading a stored flag - otherwise a
    stale or forged row here would grant fest-proposal rights the activity
    history does not support (threat T-01-18). What this records is only the
    downstream "sponsorship and outreach tooling is unlocked" marker, which
    PROG-03 asks for and which stays a flag this milestone."""

    __tablename__ = "org_progression_unlocks"
    __table_args__ = (
        db.UniqueConstraint("org_id", "city", name="uq_org_progression"),
    )

    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=False, index=True)
    city = db.Column(db.String(80), nullable=False)
    unlocked_at = db.Column(db.DateTime, nullable=False, default=_utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "org_id": self.org_id,
            "city": self.city,
            "unlocked_at": _iso(self.unlocked_at),
        }


class ReimbursementRequest(Base):
    """The one reimbursement request per Activity (REIMB-01/REIMB-02).

    `social_post_link` is supplementary context for the admin's review only.
    REIMB-02 is explicit that the QR-verified Attendance count remains the sole
    authoritative number, because a photo can show any crowd while a scan cannot.

    `submitted_by`/`submitted_at` make the single-submitter rule auditable: any
    team member drafts, only the Meetup Head submits (threat T-01-16)."""

    __tablename__ = "reimbursement_requests"

    activity_id = db.Column(db.String(32), db.ForeignKey("activities.id"), unique=True, nullable=False)
    social_post_link = db.Column(db.String(500), nullable=False)
    submitted_by = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=False)
    submitted_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    note = db.Column(db.Text, nullable=True)

    activity = db.relationship(
        "Activity",
        backref=db.backref(
            "reimbursement_request", uselist=False, cascade="all, delete-orphan"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "social_post_link": self.social_post_link,
            "submitted_by": self.submitted_by,
            "submitted_at": _iso(self.submitted_at),
            "note": self.note,
        }
