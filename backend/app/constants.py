"""Domain constants — enums, state machines, and the points economy.

Kept in one place so the business rules are auditable (PRD P7) and the points
values stay admin-configurable in spirit (FR-G6)."""

# --- Login roles (exactly two; everything else is POR-derived — PRD P3) ---
ROLE_ADMIN = "admin"
ROLE_STUDENT = "student"
LOGIN_ROLES = (ROLE_ADMIN, ROLE_STUDENT)

# --- POR types that grant organiser capability ---
ORGANISER_PORS = {
    "Regional Coordinator",
    "Society Secretary",
    "House Secretary",
    "Deputy House Secretary",   # Upper House Council members can also organise
    "Event Lead",
    "Technical Secretary",
    "Web Admin",
}

# --- Organisation types ---
ORG_TYPES = ("house", "society", "region", "council")

# --- 12 Forest Houses (IIT Madras BS Non-Academic Guidelines A.1) ---
HOUSES = (
    "Bandipur House",
    "Corbett House",
    "Gir House",
    "Kanha House",
    "Kaziranga House",
    "Nallamala House",
    "Namdapha House",
    "Nilgiri House",
    "Pichavaram House",
    "Saranda House",
    "Sundarbans House",
    "Wayanad House",
)

# --- 10 Geographic Regions (IIT Madras BS Non-Academic Guidelines A.2) ---
REGIONS = (
    "Delhi (Delhi-NCR)",
    "Chennai (Tamil Nadu)",
    "Bengaluru (Karnataka, Kerala)",
    "Hyderabad (AP & Telangana)",
    "Mumbai (Maharashtra, Gujarat)",
    "Kolkata (WB, NE, Odisha)",
    "Patna (Bihar, Jharkhand, Chhattisgarh)",
    "Chandigarh (Punjab, HP, RJ, J&K)",
    "Lucknow (UP, Gwalior)",
    "International",
)

# --- Council Tiers & Official Positions (IIT Madras BS Guidelines A.3, A.9) ---
COUNCIL_UPPER_HOUSE = "upper_house_council"
COUNCIL_LOWER_HOUSE = "lower_house_council"

POR_HOUSE_SECRETARY = "House Secretary"
POR_DEPUTY_SECRETARY = "Deputy House Secretary"
POR_REGIONAL_COORDINATOR = "Regional Coordinator"
POR_WEB_ADMIN = "Web Admin"

# --- Activity scale spectrum ---
ACTIVITY_SCALES = ("local_meetup", "regional_meetup", "regional_fest")

# --- Event team role catalog (PROPOSAL-02) ---
# A fixed catalog, assigned at proposal time and reviewed by the admin alongside
# the proposal. Activity-scoped: holding one of these grants zero org-wide
# permission (that stays with PORAssignment). Meetup Head is the one exception —
# it carries sole campaign-approval authority (RBAC-03) for its own Activity.
TEAM_ROLE_MEETUP_HEAD = "Meetup Head"
TEAM_ROLES = (
    TEAM_ROLE_MEETUP_HEAD,
    "Co-Head",
    "Designer",
    "Video/Content",
    "PR & Outreach",
    "Logistics",
    "Volunteer Coordinator",
    "Finance",
)

# --- Collaboration invite states (PROPOSAL-01/06) ---
# Only `accepted` counts toward PROPOSAL-03's Mega Meetup label and PROG-02's
# regional-fest threshold; the threshold numbers themselves are Phase 3 / Phase 7
# business rules and are deliberately not defined here.
COLLAB_PENDING = "pending"
COLLAB_ACCEPTED = "accepted"
COLLAB_DECLINED = "declined"
COLLAB_STATES = (COLLAB_PENDING, COLLAB_ACCEPTED, COLLAB_DECLINED)

# --- Task board columns (TEAM-02) ---
TASK_TODO = "todo"
TASK_IN_PROGRESS = "in_progress"
TASK_DONE = "done"
TASK_STATUSES = (TASK_TODO, TASK_IN_PROGRESS, TASK_DONE)

# --- Campaign package states (CAMPAIGN-06) ---
# The transition to `live` is gated on is_meetup_head (RBAC-03), supplied by the
# authorization predicates in plan 01-05.
CAMPAIGN_DRAFT = "draft"
CAMPAIGN_PENDING_APPROVAL = "pending_approval"
CAMPAIGN_LIVE = "live"
CAMPAIGN_STATES = (CAMPAIGN_DRAFT, CAMPAIGN_PENDING_APPROVAL, CAMPAIGN_LIVE)

# --- Registration custom-field types (CAMPAIGN-05) ---
FORM_FIELD_TEXT = "text"
FORM_FIELD_DROPDOWN = "dropdown"
FORM_FIELD_TYPES = (FORM_FIELD_TEXT, FORM_FIELD_DROPDOWN)

# --- Proposal state machine (FR-B3) ---
PROPOSAL_DRAFT = "draft"
PROPOSAL_SUBMITTED = "submitted"
PROPOSAL_CHANGES = "changes_requested"
PROPOSAL_APPROVED = "approved"
PROPOSAL_REJECTED = "rejected"
PROPOSAL_REVOKED = "revoked"

# --- Event lifecycle ---
EVENT_UPCOMING = "upcoming"
EVENT_LIVE = "live"
EVENT_COMPLETED = "completed"
EVENT_ARCHIVED = "archived"
EVENT_CANCELLED = "cancelled"

# --- Reimbursement pipeline (FR-E4): Submitted → Verified → Approved → Paid ---
EXPENSE_SUBMITTED = "submitted"
EXPENSE_VERIFIED = "verified"
EXPENSE_APPROVED = "approved"
EXPENSE_PAID = "paid"
EXPENSE_FLOW = [EXPENSE_SUBMITTED, EXPENSE_VERIFIED, EXPENSE_APPROVED, EXPENSE_PAID]

# --- Pre-submission expense draft (REIMB-01) ---
# EXPENSE_DRAFT is deliberately NOT a member of EXPENSE_FLOW. EXPENSE_FLOW models
# the admin verification pipeline (submitted, verified, approved, paid) and
# `expense_service.advance()` walks it by index, so inserting a pre-submission
# state would change how every existing expense advances. Phase 6 wires the draft
# state when it implements REIMB-01 ("any team member drafts, only the Meetup
# Head submits"); until then this name exists only so nothing invents a second
# spelling for it.
EXPENSE_DRAFT = "draft"

# --- Recognition: points per action (FR-G1-G3, admin-configurable in spirit) ---
POINTS = {
    "attended": 30,
    "organised": 50,
    "volunteered": 20,
}

# --- Quota guardrail (FR-B2): one meetup per region per calendar month ---
MEETUPS_PER_REGION_PER_MONTH = 1
# Keep old name as alias for backward compat during transition
MEETUPS_PER_CITY_PER_MONTH = MEETUPS_PER_REGION_PER_MONTH

# --- Activity fee (PRD assumption) ---
ACTIVITY_FEE_INR = 200

# --- Academic level & status (AUTH-04) ---
# Self-declared by the student and overridable by an admin. Deliberately
# decoupled from session/auth: neither value may gate a login or a token refresh,
# so an out-of-date declaration never locks anyone out. Designed so a future
# official IITM BS registration feed can replace the self-declare step without
# touching the auth path.
ACADEMIC_LEVELS = ("foundation", "diploma", "degree")
ACADEMIC_STATUSES = ("active", "on_break", "withdrawn")

# --- Post-event report states (FEEDBACK-01) ---
# Any team member may draft a report; only the assigned Meetup Head may move it
# to `submitted`. The runtime gate is `meetup_head_required` from plan 01-05.
REPORT_DRAFT = "draft"
REPORT_SUBMITTED = "submitted"
REPORT_STATES = (REPORT_DRAFT, REPORT_SUBMITTED)

# --- Attendance capture method (QR-01/QR-03/QR-04) ---
# QR-04 treats every Attendance row as authoritative regardless of method: the
# column records how the check-in happened, it does not weight it. QR check-in is
# additive alongside the existing tap-based roster flow, never a replacement.
ATTENDANCE_METHOD_QR = "qr"
ATTENDANCE_METHOD_MANUAL = "manual"
ATTENDANCE_METHODS = (ATTENDANCE_METHOD_QR, ATTENDANCE_METHOD_MANUAL)

# --- Registration states (CHAT-02) ---
# `confirmed` and `waitlisted` are the values registration_service already writes
# as bare string literals; naming them here does not refactor those call sites.
# `cancelled` is what CHAT-02's "registrants may cancel their registration" needs.
REGISTRATION_CONFIRMED = "confirmed"
REGISTRATION_WAITLISTED = "waitlisted"
REGISTRATION_CANCELLED = "cancelled"
REGISTRATION_STATES = (
    REGISTRATION_CONFIRMED,
    REGISTRATION_WAITLISTED,
    REGISTRATION_CANCELLED,
)

# --- Event poll states (CHAT-01) ---
POLL_OPEN = "open"
POLL_CLOSED = "closed"
POLL_STATES = (POLL_OPEN, POLL_CLOSED)

# --- Event query states (CHAT-02) ---
QUERY_OPEN = "open"
QUERY_ANSWERED = "answered"
QUERY_STATES = (QUERY_OPEN, QUERY_ANSWERED)

# --- Brand kit provenance (ORG-03/ORG-04) ---
# An AI-drafted kit is never applied without an explicit save (ORG-04), so
# `ai_draft` describes where the saved content came from, not an unapproved
# pending state waiting on review.
BRAND_KIT_MANUAL = "manual"
BRAND_KIT_AI_DRAFT = "ai_draft"
BRAND_KIT_SOURCES = (BRAND_KIT_MANUAL, BRAND_KIT_AI_DRAFT)
