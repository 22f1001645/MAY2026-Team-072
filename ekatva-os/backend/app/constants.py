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
