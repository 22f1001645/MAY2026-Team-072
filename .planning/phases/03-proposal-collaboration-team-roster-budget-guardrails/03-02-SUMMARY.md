---
phase: "03"
plan: "03-02"
title: "Summary: Collaborator Invite Flow & Notifications"
requirements: ["PROPOSAL-01", "PROPOSAL-06"]
status: complete
completed: 2026-08-12
---

# 03-02 Execution Summary — Collaborator Invite Flow & Notifications

**Phase**: 3 — Proposal Collaboration, Team Roster & Budget Guardrails  
**Requirements covered**: PROPOSAL-01, PROPOSAL-06  
**Test classes**: `TestCollaboratorWrite`, `TestCollabRespond` in `backend/tests/test_proposal_collaboration.py`  
**All tests passing**: ✅ (9 tests, 0 failures)

---

## Goal

Prove that a proposal can name collaborating organisations — each written as a `PENDING` `ActivityCollaborator` row with authority-holder notifications on submission — and that a collaborating org's Secretary/RC can accept or decline the invite through a dedicated endpoint, with double-respond protection (409) and full RBAC enforcement.

---

## Files Changed

| File | Change Type | What Changed |
|------|-------------|--------------|
| `backend/app/services/proposal_service.py` | MODIFY | Extended `submit_proposal` to write `ActivityCollaborator` rows (primary as `ACCEPTED`, collaborating as `PENDING`); added `respond_collab` service function |
| `backend/app/controllers/proposal_controller.py` | MODIFY | Added `respond_collab` controller function at `POST /api/v1/activities/<id>/collaborators/<collab_id>/respond` |
| `backend/app/rbac.py` | MODIFY | Route decorator `can_manage_collab_org` added — verifies caller holds `ORG_MANAGER_PORS` POR in the collaborating org |
| `backend/app/models/__init__.py` | MODIFY | `ActivityCollaborator.to_dict()` extended to include `org` name via joined relationship |
| `backend/tests/test_proposal_collaboration.py` | MODIFY | Added `TestCollaboratorWrite` (4 tests) and `TestCollabRespond` (5 tests) |

---

## Implementation Detail

### Task 1 — Write Collaborator Rows in `submit_proposal` (`proposal_service.py`)

After team roster rows are written and before the `Proposal` row, the service now:

1. **Writes primary org as `ACCEPTED`** — always, with `is_primary=True`, `responded_at=datetime.now(UTC)`
2. **Deduplicates `collaborating_org_ids`** — `set(data.get("collaborating_org_ids", []))` prevents duplicate rows from a client sending the same id twice
3. **Validates each collab org exists** — `OrgRepository.by_id(org_id)` → 404 `org_not_found` if missing
4. **Writes each collab org as `PENDING`** — `is_primary=False`, `responded_at=None`
5. **Dispatches `collaboration_invite` notifications** — queries `PORAssignment` for active `ORG_MANAGER_PORS` holders in each collaborating org and inserts `Notification(user_id, activity_id, type="collaboration_invite")` rows

Constants imported from `constants.py`:
- `COLLAB_ACCEPTED`, `COLLAB_DECLINED`, `COLLAB_PENDING` — collab status values
- `ORG_MANAGER_PORS` — used to find authority holders for notification dispatch

### Task 2 — `respond_collab` Service Function (`proposal_service.py`)

```python
def respond_collab(collab: ActivityCollaborator, new_status: str) -> ActivityCollaborator
```

- Validates `new_status in (COLLAB_ACCEPTED, COLLAB_DECLINED)` — 400 `invalid_status` otherwise
- **409 guard**: if `collab.status != COLLAB_PENDING` → `ApiError("already_responded", 409)` — prevents double-respond
- Updates `collab.status = new_status`, `collab.responded_at = datetime.now(UTC)`, commits and returns the updated row

### Task 3 — Respond Endpoint (`proposal_controller.py`)

Route: `POST /api/v1/activities/<activity_id>/collaborators/<collab_id>/respond`  
Body: `{"status": "accepted" | "declined"}`  
RBAC: `@can_manage_collab_org` — caller must hold an active `ORG_MANAGER_PORS` POR in the collaborating org (`collab.org_id`)

Controller flow:
1. Fetch `ActivityCollaborator` by `collab_id` and `activity_id` → 404 if missing
2. Validate `data["status"]` present
3. Call `proposal_service.respond_collab(collab, data["status"])`
4. Return `collab.to_dict()`, 200

### Task 4 — Tests (`test_proposal_collaboration.py`)

**`TestCollaboratorWrite`** (4 tests)
- `test_primary_org_written_as_accepted` — after submit, `ActivityCollaborator` row for primary org has `is_primary=True`, `status=COLLAB_ACCEPTED`
- `test_collaborating_org_written_as_pending` — collab org row has `is_primary=False`, `status=COLLAB_PENDING`
- `test_duplicate_collab_org_ids_deduplicated` — same org_id sent twice → only one DB row
- `test_unknown_collab_org_rejected` — `collaborating_org_ids=["nonexistent_org_id_xyz"]` → 404 `org_not_found`

**`TestCollabRespond`** (5 tests — autouse setup submits a proposal with one collab org)
- `test_authority_holder_accepts` — Society Secretary of collab org calls respond with `"accepted"` → 200, response body `status == COLLAB_ACCEPTED`
- `test_authority_holder_declines` — same user, `"declined"` → 200, `status == COLLAB_DECLINED`
- `test_non_authority_cannot_respond` — student with no POR in collab org → 403
- `test_double_respond_returns_409` — first call succeeds (200), second call with different status → 409 `already_responded`
- `test_notification_sent_to_authority_holder` — after proposal submission, `Notification` row exists with `type="collaboration_invite"` for the collab org's authority holder's `user_id`

---

## Design Decisions

- **Notification at submission time, not respond time**: Notifications are dispatched when the proposal is submitted, not when an admin approves it. This gives collaborating orgs visibility immediately so they can respond while the admin is reviewing — keeping the workflow non-blocking.
- **409 instead of 400 for double-respond**: HTTP 409 Conflict is semantically correct — the resource (the collaborator row) already has a terminal state, not a malformed request. Clients can distinguish "invalid data" (400) from "already done" (409) without parsing the error code.
- **`ORG_MANAGER_PORS` for respond authority, `ORGANISER_PORS` for submit authority**: These are deliberately different. An Event Lead can submit a proposal (ORGANISER_PORS) but cannot speak for an org's decision to collaborate (ORG_MANAGER_PORS). The respond guard uses `can_manage_org`, which checks `ORG_MANAGER_PORS`.

---

## Verification Commands

```bash
# Per-class quick run
cd backend && pytest tests/test_proposal_collaboration.py::TestCollaboratorWrite -x -q
cd backend && pytest tests/test_proposal_collaboration.py::TestCollabRespond -x -q

# Full plan verification
cd backend && pytest tests/test_proposal_collaboration.py -k "collab" -x -q
```

**Result**: 9 passed, 0 failed
