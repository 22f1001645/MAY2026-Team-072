# Phase 3 Research: Proposal Collaboration, Team Roster & Budget Guardrails

**Phase**: 3
**Requirements**: PROPOSAL-00, PROPOSAL-01, PROPOSAL-02, PROPOSAL-03, PROPOSAL-04, PROPOSAL-05, PROPOSAL-06, BUDGET-01
**Researched**: 2026-08-12

## Overview

Phase 3 adds the three things missing from the existing proposal flow before a proposal can meaningfully represent a real-world city meetup:

1. **Collaborating entities** — multiple orgs can co-run an event; each consents independently (pending → accepted/declined state machine).
2. **Team roster** — the proposer assembles a fixed-catalog crew with exactly one Meetup Head, whose singleton is already enforced at the DB level by `uq_team_meetup_head`.
3. **Budget guardrail** — for local and regional meetup scale, the total budget is hard-capped at `min(capacity × ₹200, ₹20,000)` with a clear server-side rejection.

All three data structures exist in the schema already (landed in Phase 1). Phase 3 is purely service, controller, and frontend wiring — no new migrations.

## Validation Architecture

### Backend Pytest Tests
- `backend/tests/test_proposal_collaboration.py` — all PROPOSAL-xx and BUDGET-01 tests
  - PROPOSAL-00: submitter holds active POR in primary org → 201; POR in different org → 403
  - PROPOSAL-01: collaborators saved as PENDING at submission; `POST /collaborators/respond` accept/decline; non-authority user → 403
  - PROPOSAL-02: zero Meetup Heads → 400; two Meetup Heads → 400; exactly one → 201; invalid role → 400
  - PROPOSAL-03: is_mega_meetup False at 2 accepted, True at 3 accepted
  - PROPOSAL-04: `GET /proposals/<id>` returns `collaborators` list and `team_members` list
  - PROPOSAL-05: reassign Meetup Head → 200 before campaign live; attempt after live → 409
  - PROPOSAL-06: notification rows created for authority holders in collaborating org
  - BUDGET-01: capacity=50, budget=10000 → pass; capacity=50, budget=10001 → 400; capacity=200, budget=20000 → pass; capacity=200, budget=20001 → 400

### Frontend Vitest Tests
- `frontend/src/__tests__/proposal-form.test.ts` — client-side budget warning threshold
- `frontend/src/components/__tests__/AdminQueue.test.tsx` — team + collaborator columns render

---

## Codebase Findings

### What Already Exists

#### Models (Phase 1, no changes needed)
- **`ActivityCollaborator`** — `activity_id`, `org_id`, `is_primary`, `status` (COLLAB_PENDING/ACCEPTED/DECLINED), `invited_by`, `responded_by`, `responded_at`. The `uq_activity_collaborator` unique constraint prevents double-inviting the same org. The `uq_activity_primary_org` partial unique index ensures exactly one primary.
- **`ActivityTeamMember`** — `activity_id`, `user_id`, `role`, `added_by`. The `uq_team_member_role` unique constraint prevents duplicate (activity, user, role) triples. The `uq_team_meetup_head` partial unique index enforces the Meetup Head singleton at the DB level.

#### Constants (already correct)
- `TEAM_ROLES` = 8-role catalog (Meetup Head, Co-Head, Designer, Video/Content, PR & Outreach, Logistics, Volunteer Coordinator, Finance)
- `TEAM_ROLE_MEETUP_HEAD = "Meetup Head"` — hardcoded in the partial index predicate
- `COLLAB_PENDING`, `COLLAB_ACCEPTED`, `COLLAB_DECLINED`
- `ACTIVITY_FEE_INR = 200`
- `ORGANISER_PORS`, `ORG_MANAGER_PORS` — already include RC, Secretary, Deputy Secretary, Event Lead, Coordinator

#### RBAC (already correct)
- `can_manage_org(user, org)` — checks POR membership in that specific org; backs PROPOSAL-06 collaborator respond gate
- `org_scoped(predicate)` / `activity_scoped(predicate)` — guard factory decorators
- `can_manage_org_required` — `@org_scoped(can_manage_org)` — ready to use on the collaborator respond route

#### Existing proposal flow
- `POST /api/v1/activities` → `proposal_service.submit_proposal` — creates Activity + BudgetLines + Proposal. Uses coarse `@organiser_required`. No collaborator or team handling today.
- `GET /api/v1/proposals` + `GET /api/v1/proposals/<id>` — admin queue, returns `to_dict(detail=True)`. No collaborator/team data in the payload.
- `POST /api/v1/proposals/<id>/decision` — approve/reject/revoke.

### What Is Missing (Phase 3 adds these)

1. **Submitter scoped guard** on `POST /activities` — `organiser_required` lets any organiser POR through; Phase 3 must check the submitter holds a POR in the `org_id` they're proposing on behalf of.
2. **Collaborator write path** in `submit_proposal` — create `ActivityCollaborator` rows.
3. **Collaborator respond endpoint** — `POST /api/v1/activities/<id>/collaborators/<collab_id>/respond`.
4. **Team roster write path** in `submit_proposal` — create `ActivityTeamMember` rows + validation (zero or >1 Meetup Head → 400).
5. **Meetup Head reassignment endpoint** — `POST /api/v1/activities/<id>/reassign-meetup-head`.
6. **Budget cap validation** in `submit_proposal`.
7. **Notification dispatch** to collaborating org's authority holders.
8. **`to_dict(detail=True)` enrichment** on Activity to include collaborators + team members.
9. **`is_mega_meetup` property** on Activity.
10. **Frontend form fields** on `ProposalNew.tsx` for collaborators and team roster.
11. **Admin queue UI** (`ApprovalQueue.tsx`) columns for collaborators and team roster.

---

## Technical Decisions

### PROPOSAL-00: Submitter Authorization

**Decision**: Add a **service-layer org membership check** inside `submit_proposal`, not a new decorator.

**Rationale**: The primary `org_id` is in the request body, not the URL path, so `org_scoped()` (which reads from URL kwargs) doesn't fit. A service-layer check is cleaner and consistent with how `submit_proposal` already validates org existence.

**Implementation**:
```python
# In proposal_service.submit_proposal, after `org = OrgRepository.by_id(...)`
from ..rbac import can_manage_org
if not can_manage_org(organiser, org):
    raise ApiError(
        "You must hold an active organiser POR in this organisation to propose on its behalf",
        "forbidden",
        403,
    )
```

`can_manage_org` already checks `ORG_MANAGER_PORS` (which includes RC, Secretary, Deputy Secretary, Web Admin, Technical Secretary, Coordinator, Society Deputy Secretary) and the admin short-circuit. This is correct — an Event Lead is in `ORGANISER_PORS` but NOT in `ORG_MANAGER_PORS`, so Event Leads are correctly excluded from proposing (they can manage activities but not orgs). The spec says "RC, Secretary, Deputy Secretary, Event Lead, Coordinator" — review: PROPOSAL-00 text says "organiser-POR holder", and lists Event Lead explicitly. This means `ORGANISER_PORS` is the right set, not `ORG_MANAGER_PORS`.

**Correction**: Check `has_organiser_por_in_org(organiser, org)` — a new helper that walks the user's PORs looking for an `ORGANISER_PORS` match **in that specific org** (not any org):

```python
def has_organiser_por_in_org(user, org) -> bool:
    """Does user hold an active organiser POR specifically in this org?"""
    for por in _active_pors(user):
        if por.por_type in ORGANISER_PORS and org.id in _por_org_ids(por):
            return True
    return False
```

Add to `rbac.py`. The proposal submission guard uses this.

---

### PROPOSAL-01: Collaborators Written Atomically at Proposal Submission

**Decision**: Collaborators are part of the proposal submission payload — a list of `org_ids`. They are written in the same DB transaction as the Activity.

**Rationale**: The spec says "at submission time, the proposer names collaborating organisations". Splitting into a second API call would mean a proposal can exist without any collaborators, which is fine, but the UI presents it as a single form. Atomic is simpler.

**Payload extension**:
```json
{
  "collaborating_org_ids": ["org_id_1", "org_id_2"]
}
```

**Rules**:
- Primary org (`org_id`) is always written as the primary `ActivityCollaborator` row with `is_primary=True, status=COLLAB_ACCEPTED` (the primary has already consented by submitting).
- Each collaborating org gets an `ActivityCollaborator` row with `is_primary=False, status=COLLAB_PENDING, invited_by=organiser.id`.
- Duplicate org_ids silently deduplicated.
- The primary org appearing in `collaborating_org_ids` is ignored (already written as primary).

---

### PROPOSAL-02: Team Roster Assembly at Submission

**Decision**: Team roster is part of the proposal submission payload — a list of `{user_id, role}` objects.

**Payload extension**:
```json
{
  "team": [
    {"user_id": "abc", "role": "Meetup Head"},
    {"user_id": "def", "role": "Designer"}
  ]
}
```

**Validation** (service layer, before any DB write):
- Exactly one member with `role == TEAM_ROLE_MEETUP_HEAD`. Zero → `ApiError("A proposal must name exactly one Meetup Head", "invalid_team", 400)`. More than one → same error.
- Every `role` must be in `TEAM_ROLES`. Invalid role → `ApiError("Invalid role: ...", "invalid_role", 400)`.
- Every `user_id` must resolve to an existing User. Unknown user → `ApiError("Team member not found: ...", "user_not_found", 404)`.

**DB note**: The `uq_team_meetup_head` partial unique index is a DB-level backstop, but the service validation runs first so the user gets a meaningful error, not an `IntegrityError`.

---

### PROPOSAL-03: Mega Meetup Label

**Decision**: Compute dynamically as a **`@property` on `Activity`**, serialized in `to_dict`.

**Rationale**: No separate DB flag needed — the count of accepted collaborators is the ground truth. A stored flag would drift if a collaborator later declines.

```python
@property
def is_mega_meetup(self) -> bool:
    """PROPOSAL-03: auto-label when ≥3 orgs have accepted the collaboration invite."""
    return sum(1 for c in self.collaborators if c.status == COLLAB_ACCEPTED) >= 3
```

Serialized as `"is_mega_meetup": self.is_mega_meetup` in `Activity.to_dict()`.

**Frontend**: Show a "Mega Meetup" badge on the proposal card when `is_mega_meetup` is true.

---

### PROPOSAL-04: Admin Queue Enrichment

**Decision**: Add collaborators and team members to `Activity.to_dict(detail=True)`.

**Implementation**:
```python
if detail:
    d["description"] = self.description
    d["budget"] = [b.to_dict() for b in self.budget_lines]
    # Phase 3 additions:
    d["collaborators"] = [c.to_dict() for c in self.collaborators]
    d["team_members"] = [t.to_dict() for t in self.team_members]
```

**N+1 prevention**: The `ActivityRepository.proposals_by_status` query should `joinedload` collaborators and team_members. Add `options(joinedload(Activity.collaborators), joinedload(Activity.team_members))`.

---

### PROPOSAL-05: Meetup Head Reassignment

**Decision**: Dedicated endpoint, accessible to the proposer or admin, only before campaign goes live.

**Route**: `POST /api/v1/activities/<activity_id>/reassign-meetup-head`
**Guard**: `@can_manage_activity_required` (covers proposer, team members, org POR holders, admin).
**Request body**: `{"new_meetup_head_user_id": "..."}`

**Service logic**:
```python
def reassign_meetup_head(activity_id, new_user_id, actor):
    activity = ActivityRepository.by_id(activity_id)
    # Check campaign is not live (Phase 5 concern, but the check is here)
    campaign = activity.campaign  # may be None in Phase 3
    if campaign and campaign.status == CAMPAIGN_LIVE:
        raise ApiError("Cannot reassign Meetup Head after campaign goes live", "campaign_live", 409)
    # Remove existing Meetup Head row
    old = ActivityTeamMember.query.filter_by(
        activity_id=activity.id, role=TEAM_ROLE_MEETUP_HEAD
    ).first()
    if old:
        db.session.delete(old)
    # Add new Meetup Head row
    db.session.add(ActivityTeamMember(
        activity_id=activity.id, user_id=new_user_id,
        role=TEAM_ROLE_MEETUP_HEAD, added_by=actor.id
    ))
    db.session.commit()
```

**Note**: The campaign model doesn't exist yet in Phase 3 (it's Phase 5). The live-campaign gate is a no-op in Phase 3 — just write a comment that the gate will be filled in Phase 5.

---

### PROPOSAL-06: Collaborator Invite Notifications

**Decision**: Fire notifications to all authority holders (ORG_MANAGER_PORS) in each collaborating org at submission time.

**Implementation**: After writing `ActivityCollaborator` rows in `submit_proposal`:
```python
for collab_org_id in collaborating_org_ids:
    collab_org = OrgRepository.by_id(collab_org_id)
    if not collab_org:
        continue
    authority_holders = [
        m.user for m in collab_org.memberships
        if any(p.active and p.por_type in ORG_MANAGER_PORS for p in m.pors)
    ]
    for holder in authority_holders:
        _notify(
            holder.id, activity.id, "collaboration_invite",
            f"Collaboration invite: {activity.title}",
            f"{org.name} has invited {collab_org.name} to collaborate on '{activity.title}'. "
            f"Accept or decline from the event detail page."
        )
```

**Respond endpoint**: `POST /api/v1/activities/<activity_id>/collaborators/<collab_id>/respond`
- Guard: `@can_manage_org_required` on the collaborating org. But the collab_id is the `ActivityCollaborator` row id, not the org_id, so we need a custom guard that loads the collaborator row and checks `can_manage_org(user, collab.org)`.
- Body: `{"status": "accepted" | "declined"}`
- Only PENDING invites can be responded to.

---

### BUDGET-01: Budget Cap Enforcement

**Decision**: Validate total budget in `submit_proposal` service before writing anything.

**Cap formula**: `min(capacity × ACTIVITY_FEE_INR, 20_000)` where `ACTIVITY_FEE_INR = 200`.

**Only applies to**: `local_meetup` and `regional_meetup` scale. `regional_fest` is exempt (sponsor-funded model).

**Implementation**:
```python
BUDGET_CAPACITY_RATE = ACTIVITY_FEE_INR  # ₹200/person
BUDGET_ABSOLUTE_CEILING = 20_000          # ₹20,000

if data["scale"] in ("local_meetup", "regional_meetup"):
    requested = sum(line["planned"] for line in data.get("budget", []))
    allowed = min(data["capacity"] * BUDGET_CAPACITY_RATE, BUDGET_ABSOLUTE_CEILING)
    if requested > allowed:
        raise ApiError(
            f"Budget ₹{requested:,} exceeds the cap of ₹{allowed:,} "
            f"for a {data['capacity']}-person {data['scale'].replace('_', ' ')} "
            f"(₹{BUDGET_CAPACITY_RATE}/person, max ₹{BUDGET_ABSOLUTE_CEILING:,})",
            "budget_cap_exceeded",
            400,
        )
```

Add `BUDGET_CAPACITY_RATE` and `BUDGET_ABSOLUTE_CEILING` to `constants.py` (as named constants, not bare literals in the service).

---

## Schema Changes

**None.** All models (`ActivityCollaborator`, `ActivityTeamMember`) exist from Phase 1. No new migration needed.

**Constants changes** (no migration):
- Add `BUDGET_CAPACITY_RATE = ACTIVITY_FEE_INR` and `BUDGET_ABSOLUTE_CEILING = 20_000` to `constants.py`.
- Add `MEGA_MEETUP_THRESHOLD = 3` for clarity.

---

## Open Questions Resolved

1. **Team member consent**: Assumed offline. Team members do not confirm their assignment in-platform for Phase 3. Consent is captured at campaign push-live (Phase 5, CAMPAIGN-06 pattern). No "accept team invite" endpoint needed this phase.

2. **Meetup Head demotion on reassignment**: The old Meetup Head row is **deleted** (not demoted to another role). If the proposer wants the old Meetup Head to remain on the team in a different role, they do that separately. This keeps the reassignment endpoint simple and the singleton guaranteed.

3. **`can_manage_org` vs `has_organiser_por_in_org`** for PROPOSAL-00: Use the new `has_organiser_por_in_org` helper (checks `ORGANISER_PORS`, which includes Event Lead). `can_manage_org` checks `ORG_MANAGER_PORS` which excludes Event Lead — too narrow for PROPOSAL-00.

4. **Collaborator respond guard**: A custom inline check (load collaborator row, check `can_manage_org(user, collab.org)`) rather than `org_scoped` (which reads `org_id` from URL). The URL param is `collab_id`.

---

## Recommended Wave Structure

**Wave 1 — Tracer (must land first)**:
- `03-01-PLAN.md`: Submitter authorization (PROPOSAL-00) + budget cap (BUDGET-01) + team roster validation (PROPOSAL-02). These all live in `proposal_service.submit_proposal` / `ProposalSchema`. Extend the submission endpoint end-to-end, proven by pytest.

**Wave 2** *(blocked on Wave 1)*:
- `03-02-PLAN.md`: Collaborator invite flow — write collaborators at submission, respond endpoint, notify authority holders (PROPOSAL-01, PROPOSAL-06). Depends on Wave 1's DB writes for `ActivityCollaborator`.

**Wave 3** *(blocked on Wave 2)*:
- `03-03-PLAN.md`: Mega Meetup label + Meetup Head reassignment + admin queue enrichment (PROPOSAL-03, PROPOSAL-04, PROPOSAL-05). Pure read-path and reshaping; depends on Wave 2's collaborator state being correct.

**Wave 4** *(blocked on Wave 3)*:
- `03-04-PLAN.md`: Frontend — ProposalNew form (collaborator picker + team roster builder + budget live cap warning), ApprovalQueue enriched columns, collaborator respond UI on EventDetail. UI hint: yes.

**Why this order**: Wave 1 proves the proposal submission still works end-to-end before any new fields are added. Wave 2 adds the collaborator flow which is the most complex new behaviour. Wave 3 is read-only reshaping — safe to add once the underlying data is correct. Wave 4 is frontend-only, cleanly decoupled from the backend.
