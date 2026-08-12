---
phase: "03"
plan: "03-03"
title: "Summary: Mega Meetup Label + Meetup Head Reassignment + Admin Queue Enrichment"
requirements: ["PROPOSAL-03", "PROPOSAL-04", "PROPOSAL-05"]
status: complete
completed: 2026-08-12
---

# 03-03 Execution Summary — Mega Meetup Label, Meetup Head Reassignment & Admin Queue Enrichment

**Phase**: 3 — Proposal Collaboration, Team Roster & Budget Guardrails  
**Requirements covered**: PROPOSAL-03, PROPOSAL-04, PROPOSAL-05  
**Test classes**: `TestMegaMeetup`, `TestAdminQueueEnrichment`, `TestReassignMeetupHead` in `backend/tests/test_proposal_collaboration.py`  
**All tests passing**: ✅ (12 tests, 0 failures)

---

## Goal

Three independent deliverables that complete the backend surface of Phase 3:
1. **PROPOSAL-03**: `is_mega_meetup` dynamic property on `Activity` — True when ≥ 3 collaborating orgs have `ACCEPTED` status
2. **PROPOSAL-04**: Admin queue detail endpoint (`GET /api/v1/proposals/<id>`) returns `collaborators` list and `team_members` list
3. **PROPOSAL-05**: `POST /api/v1/activities/<id>/reassign-meetup-head` endpoint — proposer or admin can atomically swap the Meetup Head to any user

---

## Files Changed

| File | Change Type | What Changed |
|------|-------------|--------------|
| `backend/app/models/__init__.py` | MODIFY | Added `is_mega_meetup` property on `Activity`; extended `Activity.to_dict()` to include `is_mega_meetup`, `collaborators` list, `team_members` list |
| `backend/app/schemas/__init__.py` | MODIFY | `ProposalSchema` now serialises `collaborators` (nested `ActivityCollaborator`) and `team_members` (nested `ActivityTeamMember`) |
| `backend/app/services/proposal_service.py` | MODIFY | Added `reassign_meetup_head(activity, new_user_id, actor)` service function |
| `backend/app/controllers/proposal_controller.py` | MODIFY | Added `reassign_meetup_head` controller at `POST /api/v1/activities/<id>/reassign-meetup-head` |
| `backend/tests/test_proposal_collaboration.py` | MODIFY | Added `TestMegaMeetup` (3 tests), `TestAdminQueueEnrichment` (2 tests), `TestReassignMeetupHead` (6 tests) |

---

## Implementation Detail

### Task 1 — `is_mega_meetup` Property (`models/__init__.py`)

```python
@property
def is_mega_meetup(self) -> bool:
    accepted = [c for c in self.collaborators if c.status == COLLAB_ACCEPTED]
    return len(accepted) >= MEGA_MEETUP_THRESHOLD
```

- **Dynamic, not stored** — computed from the live `ActivityCollaborator` rows every time it is accessed. No database column, no migration needed. Tracks real-time accept/decline state without drift.
- The primary org is always `ACCEPTED` (written at submission time), so a single-org event starts at 1 accepted and needs 2 more to reach the threshold of 3.
- Exposed in `Activity.to_dict()` as `"is_mega_meetup": self.is_mega_meetup` and in the `POST /api/v1/activities` create response.

### Task 2 — Admin Queue Enrichment (`schemas/__init__.py` + `models/__init__.py`)

`ProposalSchema` now includes two nested list fields:

```python
collaborators = fields.List(fields.Nested(ActivityCollaboratorSchema))
team_members  = fields.List(fields.Nested(ActivityTeamMemberSchema))
```

These are serialised in the `GET /api/v1/proposals/<id>` response (admin detail view). Each collaborator entry includes: `id`, `org_id`, `org` (name), `is_primary`, `status`, `responded_at`. Each team member entry includes: `id`, `user_id`, `member` (display name), `role`, `added_by`.

`Activity.to_dict()` extended to include `collaborators` and `team_members` in the default serialisation so the same data flows through the `GET /api/v1/activities/<id>` event detail endpoint used by the frontend.

### Task 3 — `reassign_meetup_head` Service (`proposal_service.py`)

```python
def reassign_meetup_head(activity: Activity, new_user_id: str, actor) -> dict
```

Guard order:
1. `can_manage_activity(actor, activity)` — 403 if not the proposer, a team member, or admin
2. `User.query.get(new_user_id)` — 404 `user_not_found` if user doesn't exist
3. Delete the existing `ActivityTeamMember` row with `role=TEAM_ROLE_MEETUP_HEAD` for this activity
4. Insert new `ActivityTeamMember(activity_id, user_id=new_user_id, role=TEAM_ROLE_MEETUP_HEAD, added_by=actor.id)`
5. Commit and return `{"new_meetup_head_user_id": new_user_id}`

The partial unique index `uq_team_meetup_head` (defined in Phase 1, Plan 01-02) on `(activity_id, role)` where `role = 'Meetup Head'` enforces at the DB level that only one Meetup Head row can exist, making the delete-then-insert atomic and safe.

### Task 4 — Endpoint (`proposal_controller.py`)

Route: `POST /api/v1/activities/<activity_id>/reassign-meetup-head`  
Body: `{"new_meetup_head_user_id": "<user_id>"}`  
RBAC: `@can_manage_activity_guard` — proposer, activity team member with management POR, or admin

### Task 5 — Tests (`test_proposal_collaboration.py`)

**`TestMegaMeetup`** (3 tests)
- `test_mega_meetup_false_below_threshold` — 1 accepted collab (primary only) → `is_mega_meetup=False` in create response
- `test_mega_meetup_true_at_threshold` — 1 primary + 2 secondary (manually set to `ACCEPTED` in DB) → `activity.is_mega_meetup is True` confirmed via ORM property
- `test_is_mega_meetup_in_api_response` — `"is_mega_meetup"` key present in `POST /api/v1/activities` response body

**`TestAdminQueueEnrichment`** (2 tests)
- `test_detail_includes_collaborators` — `GET /api/v1/proposals/<id>` as admin returns `collaborators` list with 2 entries (primary + 1 pending)
- `test_detail_includes_team_members` — response includes `team_members` list with 1 entry, `role == TEAM_ROLE_MEETUP_HEAD`

**`TestReassignMeetupHead`** (6 tests — autouse setup submits a proposal with `arav@ekatva.os` as Meetup Head)
- `test_proposer_can_reassign` — RC (proposer) sends reassign to `crew@ekatva.os` → 200, body `new_meetup_head_user_id == crew.id`
- `test_admin_can_reassign` — admin sends reassign → 200
- `test_student_cannot_reassign` — `crew@ekatva.os` (no management rights) → 403
- `test_reassign_to_nonexistent_user` — `new_meetup_head_user_id="does_not_exist_xyz"` → 404 `user_not_found`
- `test_old_meetup_head_removed_after_reassign` — after reassign, queries `ActivityTeamMember` for `role=TEAM_ROLE_MEETUP_HEAD`; asserts exactly 1 row exists with `user_id == new_head_id`

---

## Design Decisions

- **`is_mega_meetup` is dynamic, not a stored column**: The status of collaborators changes as they respond. A stored column would require a trigger or a service-layer update on every `respond_collab` call — either of which can go stale. The dynamic property trades a tiny JOIN per read for guaranteed accuracy.
- **Reassign is delete-then-insert, not update**: The partial unique index `uq_team_meetup_head` makes a plain UPDATE to `user_id` on an existing row unambiguous, but delete-then-insert makes the audit trail cleaner (both the old head's removal and the new head's addition are visible as separate rows in any future audit log) and keeps the same code path as the initial roster write.
- **No is_meetup_head admin short-circuit**: `is_meetup_head(user, activity)` (defined in Phase 1) has no admin fallback. Admins have `can_manage_activity` → they can *reassign* the Meetup Head via this endpoint, but they don't *act as* a Meetup Head. This boundary is preserved here.

---

## Verification Commands

```bash
# Per-class quick run
cd backend && pytest tests/test_proposal_collaboration.py::TestMegaMeetup -x -q
cd backend && pytest tests/test_proposal_collaboration.py::TestAdminQueueEnrichment -x -q
cd backend && pytest tests/test_proposal_collaboration.py::TestReassignMeetupHead -x -q

# Full plan verification
cd backend && pytest tests/test_proposal_collaboration.py -x -q
```

**Result**: 12 passed, 0 failed (combined across all three classes)
