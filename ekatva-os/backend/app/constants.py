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
    "Event Lead",
    "Technical Secretary",
}

# --- Organisation types ---
ORG_TYPES = ("house", "society", "region", "council")

# --- Activity scale spectrum ---
ACTIVITY_SCALES = ("local_meetup", "regional_meetup", "regional_fest")

# --- Proposal state machine (FR-B3) ---
PROPOSAL_DRAFT = "draft"
PROPOSAL_SUBMITTED = "submitted"
PROPOSAL_CHANGES = "changes_requested"
PROPOSAL_APPROVED = "approved"
PROPOSAL_REJECTED = "rejected"

# --- Event lifecycle ---
EVENT_UPCOMING = "upcoming"
EVENT_LIVE = "live"
EVENT_COMPLETED = "completed"
EVENT_ARCHIVED = "archived"

# --- Reimbursement pipeline (FR-E4): Submitted → Verified → Approved → Paid ---
EXPENSE_SUBMITTED = "submitted"
EXPENSE_VERIFIED = "verified"
EXPENSE_APPROVED = "approved"
EXPENSE_PAID = "paid"
EXPENSE_FLOW = [EXPENSE_SUBMITTED, EXPENSE_VERIFIED, EXPENSE_APPROVED, EXPENSE_PAID]

# --- Recognition: points per action (FR-G1-G3, admin-configurable in spirit) ---
POINTS = {
    "attended": 30,
    "organised": 50,
    "volunteered": 20,
}

# --- Quota guardrail (FR-B2): one meetup per city per calendar month ---
MEETUPS_PER_CITY_PER_MONTH = 1

# --- Activity fee (PRD assumption) ---
ACTIVITY_FEE_INR = 100
