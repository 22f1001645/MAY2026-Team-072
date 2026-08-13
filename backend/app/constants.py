"""Domain constants — enums, state machines, and the points economy.

Kept in one place so the business rules are auditable (PRD P7) and the points
values stay admin-configurable in spirit (FR-G6)."""

# --- Login roles (exactly two; everything else is POR-derived — PRD P3) ---
ROLE_ADMIN = "admin"
ROLE_STUDENT = "student"
LOGIN_ROLES = (ROLE_ADMIN, ROLE_STUDENT)

# --- Refresh-token rotation grace window (AUTH-01, D-02a) ---
# A refresh token is spent on first use, so presenting it twice normally means
# replay and revokes the whole family. Two browser tabs waking together present
# the *same* cookie within milliseconds of each other, and the second one is
# otherwise indistinguishable from a stolen-token replay — so without a grace
# window that ordinary case logs the user out, which is exactly the failure
# ROADMAP criterion 2 forbids. Inside this window the replay re-issues instead
# of revoking.
#
# 10 seconds, not longer: the window's width IS the replay window's width. A
# real attacker replaying a stolen token essentially never lands within 10
# seconds of the legitimate rotation that spent it, so genuine reuse detection
# is preserved. Widening this is prohibited by D-02a.
REFRESH_ROTATION_GRACE_SECONDS = 10

# --- POR types that grant organiser capability ---
ORGANISER_PORS = {
    "Regional Coordinator",
    "Society Secretary",
    "House Secretary",
    "Deputy House Secretary",   # Upper House Council members can also organise
    "Event Lead",
    "Technical Secretary",
    "Web Admin",
    "Society Deputy Secretary",
    "Coordinator",
}

# --- POR types that grant authority over an Organisation itself (RBAC-01) ---
# Deliberately narrower than ORGANISER_PORS: `Event Lead` is excluded because an
# Event Lead's authority is per-activity and flows through can_manage_activity.
# It does not extend to editing an organisation's public identity (ORG-01) or to
# accepting a collaboration invite on the organisation's behalf (PROPOSAL-06).
#
# Division of labour: ORG_MANAGER_PORS is the POR set read by can_manage_org,
# while ORGANISER_PORS stays the POR set read by can_manage_activity.
#
# Forward note for AUTH-03 (Phase 2): that requirement adds `Society Deputy
# Secretary` and `Coordinator` to the POR taxonomy. Both belong in this set when
# they land — a Society Deputy Secretary edits the society's profile, and a
# Coordinator is a House/Society/Council-scoped Core Committee role. Add them
# here at the same time as ORGANISER_PORS, not afterwards.
ORG_MANAGER_PORS = {
    "Regional Coordinator",
    "House Secretary",
    "Deputy House Secretary",
    "Society Secretary",
    "Technical Secretary",
    "Web Admin",
    "Society Deputy Secretary",
    "Coordinator",
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

# --- Social platform host allowlist (ORG-02) ---
# The allowlist is per platform, not global: a LinkedIn URL stored under the
# `instagram` key is a data-integrity bug even though both hosts are safe, and a
# reader who clicks an "Instagram" link expects Instagram.
#
# There is deliberately NO generic or any-host entry (P-08). One would defeat the
# host allowlist by definition and would force ROADMAP Phase 4 criterion 2 — "a
# link with a non-allowlisted host is rejected" — to carry a carve-out. The
# organisation's own site is `organisations.website`, a distinct column with its
# own narrower rule (D-03), never a `platform` value here.
SOCIAL_PLATFORMS = {
    "instagram": ("instagram.com",),
    "linkedin": ("linkedin.com",),
    "x": ("x.com", "twitter.com"),
    "youtube": ("youtube.com", "youtu.be"),
    "facebook": ("facebook.com",),
    "github": ("github.com",),
}
SOCIAL_PLATFORM_KEYS = tuple(SOCIAL_PLATFORMS)

# The single declaration of the fixed, stable rendering order: the website field
# first, then the six platform rows. Declared here so the seven-row editor and
# the server cannot drift about which row is which. `website` appears here and
# NOWHERE in SOCIAL_PLATFORMS or SOCIAL_PLATFORM_KEYS.
SOCIAL_FIELD_ORDER = ("website",) + SOCIAL_PLATFORM_KEYS

# --- Uploaded-file URL shape (ORG-01, decision D-01) ---
# ONE declaration of the served path, because three layers read it: the serve
# route answers on it, OrgProfileSchema refuses any logo_url that does not match
# it, and org_profile_service maps a stored value back to a file on disk when a
# logo is replaced or cleared. Every value ever written to organisations.logo_url
# matches UPLOAD_URL_PATTERN — a ~40-character path, never bytes and never an
# external URL, which is why String(300) needs no migration.
#
# The name is `uuid4().hex` plus an extension derived from the SNIFFED type. The
# client's own filename never reaches the path, so the pattern is exact rather
# than permissive.
UPLOAD_URL_PREFIX = "/api/v1/uploads/"
UPLOAD_URL_PATTERN = r"^/api/v1/uploads/[0-9a-f]{32}\.(?:png|jpg|webp)$"

# --- Budget guardrail constants (BUDGET-01) ---
# Applies to local_meetup and regional_meetup scale only. regional_fest is
# sponsor-funded and is explicitly exempt. The cap is whichever is smaller:
# the per-person allowance (capacity × rate) or the absolute ceiling.
BUDGET_CAPACITY_RATE = ACTIVITY_FEE_INR  # ₹200 per expected attendee
BUDGET_ABSOLUTE_CEILING = 20_000          # ₹20,000 hard upper bound

# --- Mega Meetup threshold (PROPOSAL-03) ---
# Minimum number of ACCEPTED collaborating orgs (including primary) before the
# "Mega Meetup" label is applied. Computed dynamically on Activity as a property;
# no stored flag, so it tracks real-time accept/decline state without drifting.
MEGA_MEETUP_THRESHOLD = 3

