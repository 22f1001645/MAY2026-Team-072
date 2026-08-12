---
phase: "03"
plan: "03-01"
title: "Summary: Tracer - Submission Guards + Budget Cap + Team Roster Validation"
requirements: ["PROPOSAL-00", "PROPOSAL-02", "BUDGET-01"]
status: complete
completed: 2026-08-12
---

# 03-01 Execution Summary — Submission Guards, Budget Cap & Team Roster Validation

**Phase**: 3 — Proposal Collaboration, Team Roster & Budget Guardrails  
**Requirements covered**: PROPOSAL-00, PROPOSAL-02, BUDGET-01  
**Test class**: `TestSubmitterAuthorization`, `TestBudgetCap`, `TestTeamRoster` in `backend/tests/test_proposal_collaboration.py`  
**All tests passing**: ✅ (13 tests, 0 failures)

---

## Goal

Prove that `POST /api/v1/activities` now enforces three submission guards end-to-end before any other Phase 3 work touches the submission path:
1. Submitter holds an active organiser POR in the specific primary org (PROPOSAL-00)
2. Budget total is hard-capped at `min(capacity × ₹200, ₹20,000)` for meetup scales (BUDGET-01)
3. The team roster contains exactly one Meetup Head (PROPOSAL-02)

---

## Files Changed

| File | Change Type | What Changed |
|------|-------------|--------------|
| `backend/app/constants.py` | MODIFY | Added `BUDGET_CAPACITY_RATE = ACTIVITY_FEE_INR` (₹200/person), `BUDGET_ABSOLUTE_CEILING = 20_000`, `MEGA_MEETUP_THRESHOLD = 3` |
| `backend/app/rbac.py` | MODIFY | Added `has_organiser_por_in_org(user, org) -> bool` predicate after `has_organiser_por` |
| `backend/app/schemas/__init__.py` | MODIFY | Added `TeamMemberInputSchema` with `user_id` + `role` fields; extended `ProposalSchema` with `team` list and `collaborating_org_ids` list |
| `backend/app/services/proposal_service.py` | MODIFY | Rewrote `submit_proposal` to run org-POR guard, budget cap check, and meetup-head count validation before writing any DB rows; added `ActivityTeamMember` writes for team roster |
| `backend/tests/test_proposal_collaboration.py` | CREATE | New test file — classes `TestSubmitterAuthorization` (3 tests), `TestBudgetCap` (5 tests), `TestTeamRoster` (5 tests) |

---

## Implementation Detail

### Task 1 — Constants (`constants.py`)
Three new constants appended at end of file:
- `BUDGET_CAPACITY_RATE = ACTIVITY_FEE_INR` — reuses the ₹200 activity fee as the per-person budget allowance
- `BUDGET_ABSOLUTE_CEILING = 20_000` — hard upper bound regardless of capacity
- `MEGA_MEETUP_THRESHOLD = 3` — minimum accepted collaborating orgs for the Mega Meetup label (used in Plan 03-03)

### Task 2 — RBAC Helper (`rbac.py`)
`has_organiser_por_in_org(user, org)` added between `has_organiser_por` and `can_manage_org`. Intentionally checks `ORGANISER_PORS` (not `ORG_MANAGER_PORS`) because PROPOSAL-00 explicitly includes Event Lead, which is in `ORGANISER_PORS` but not `ORG_MANAGER_PORS`. Returns `False` safely for `None` inputs.

### Task 3 — Schema Extensions (`schemas/__init__.py`)
`TeamMemberInputSchema(user_id: str, role: str)` validates role against `TEAM_ROLES` enum using `validate.OneOf`. `ProposalSchema` extended with:
- `team = fields.List(Nested(TeamMemberInputSchema), load_default=[])` — role validated at schema level; invalid roles rejected with 422
- `collaborating_org_ids = fields.List(fields.String(), load_default=[])` — raw IDs, org existence checked in service

### Task 4 — `submit_proposal` Service (`proposal_service.py`)
Guards execute in this order before any DB writes:
1. **Org lookup** — 404 if org doesn't exist
2. **PROPOSAL-00 guard** — `has_organiser_por_in_org(organiser, org)` → 403 `forbidden` if not met; admin bypass via `user.role == ROLE_ADMIN` inside the predicate
3. **BUDGET-01 cap** — `requested > min(capacity * BUDGET_CAPACITY_RATE, BUDGET_ABSOLUTE_CEILING)` → 400 `budget_cap_exceeded`; only applies to `local_meetup` / `regional_meetup` scales (`regional_fest` is sponsor-funded and exempt)
4. **PROPOSAL-02 roster check** — `meetup_heads = [m for m in team if m['role'] == TEAM_ROLE_MEETUP_HEAD]`; 0 or >1 → 400 `invalid_team`
5. **Quota guardrail** (pre-existing FR-B2) — one meetup per region per month → 409 `quota_exceeded`
6. **Activity row created**, then `BudgetLine` rows, then `ActivityTeamMember` rows, then `Proposal` row, then audit log — all in one `db.session.commit()`

### Task 5 — Test File (`test_proposal_collaboration.py`)

**`TestSubmitterAuthorization`** (3 tests)
- `test_rc_in_primary_org_can_submit` — RC holding POR in primary org → 201
- `test_rc_in_different_org_cannot_submit` — RC with POR in org B, proposing for org A → 403 `forbidden`
- `test_admin_can_submit_for_any_org` — admin bypasses org-POR check → 201

**`TestBudgetCap`** (5 tests)
- `test_at_capacity_cap_accepted` — capacity=50, budget=10,000 (exactly 50×200) → 201
- `test_over_capacity_cap_rejected` — capacity=50, budget=10,001 → 400 `budget_cap_exceeded`
- `test_at_absolute_ceiling_accepted` — capacity=200, budget=20,000 (cap=min(40000,20000)) → 201
- `test_over_absolute_ceiling_rejected` — capacity=200, budget=20,001 → 400 `budget_cap_exceeded`
- `test_regional_fest_exempt_from_cap` — scale=regional_fest, budget=100,000 → not a budget cap error

**`TestTeamRoster`** (5 tests)
- `test_one_meetup_head_succeeds` — exactly one Meetup Head → 201
- `test_zero_meetup_heads_rejected` — role=Designer only → 400 `invalid_team`
- `test_two_meetup_heads_rejected` — two Meetup Head roles → 400 `invalid_team`
- `test_invalid_role_rejected` — role="Grand Vizier" → 422 (schema-level)
- `test_team_members_written_to_db` — after 201, queries `ActivityTeamMember` rows, asserts role and user_id match

---

## Design Decisions

- **BUDGET-01 exempt check**: The scale check (`local_meetup`, `regional_meetup`) is explicit rather than a blacklist of exempt scales — adding a new scale later won't accidentally be budget-capped without a conscious change.
- **Schema vs service validation**: Invalid `role` values hit `validate.OneOf(TEAM_ROLES)` in the schema and return 422 before the service is ever called. The service's `TEAM_ROLE_MEETUP_HEAD` count check handles the business rule (exactly one), not role validity.
- **Admin bypass location**: The `has_organiser_por_in_org` predicate does NOT contain an admin bypass — the bypass is in `submit_proposal` (`if organiser.role == ROLE_ADMIN: return True`). This keeps the predicate a pure POR check, following the same pattern as `has_organiser_por`.

---

## Verification Commands

```bash
# Per-task quick run (< 30s)
cd backend && pytest tests/test_proposal_collaboration.py::TestSubmitterAuthorization -x -q
cd backend && pytest tests/test_proposal_collaboration.py::TestBudgetCap -x -q
cd backend && pytest tests/test_proposal_collaboration.py::TestTeamRoster -x -q

# Full plan verification
cd backend && pytest tests/test_proposal_collaboration.py -x -q
```

**Result**: 13 passed, 0 failed
