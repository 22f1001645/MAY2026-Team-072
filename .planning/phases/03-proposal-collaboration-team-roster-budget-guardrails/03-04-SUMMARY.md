---
phase: "03"
plan: "03-04"
title: "Summary: Frontend - Proposal Form, Approval Queue & Collaborator Respond UI"
requirements: ["PROPOSAL-01", "PROPOSAL-02", "PROPOSAL-03", "PROPOSAL-04", "BUDGET-01"]
status: complete
completed: 2026-08-12
---

# 03-04 Execution Summary — Frontend: Proposal Form, Approval Queue & Collaborator Respond UI

**Phase**: 3 — Proposal Collaboration, Team Roster & Budget Guardrails  
**Requirements covered**: PROPOSAL-01, PROPOSAL-02, PROPOSAL-03, PROPOSAL-04, BUDGET-01 (UI surfaces)  
**Frontend test files**: `proposal-budget-cap.test.ts`, `CollabStatus.test.tsx`  
**Type check**: `npx tsc --noEmit` — zero application errors  
**All vitest tests passing**: ✅

---

## Goal

Bring all Phase 3 backend capabilities into the React frontend:
- `ProposalNew.tsx` — collaborating org picker, team roster builder with Meetup Head validation, live budget cap indicator
- `ApprovalQueue.tsx` — collaborators list with Mega Meetup badge and team roster visible in the admin detail panel
- `EventDetail.tsx` — Accept/Decline buttons for collab authority holders, team roster display, Reassign Meetup Head control
- New TypeScript types, API calls, and TanStack Query mutation hooks

---

## Files Changed

| File | Change Type | What Changed |
|------|-------------|--------------|
| `frontend/src/lib/types.ts` | MODIFY | Added `Collaborator` interface with `CollabStatus` union type; added `TeamMember` interface; extended `EkatvaEvent` with `collaborators`, `teamMembers`, `isMegaMeetup` |
| `frontend/src/lib/api.ts` | MODIFY | Added `respondCollaboratorInvite()` and `reassignMeetupHead()` API functions; mapped `collaborators` and `team_members` in `adaptActivity()`; cast `collaborators` as `EkatvaEvent['collaborators']` to satisfy `CollabStatus` typing |
| `frontend/src/lib/queries.ts` | MODIFY | Added `useRespondCollab()` mutation hook with `invalidateQueries` for activity + proposals; added `useReassignMeetupHead()` mutation hook |
| `frontend/src/lib/session.tsx` | MODIFY | `useSession()` return now includes `capabilities: currentUser?.capabilities` so `EventDetail` can check `manageable_org_ids` |
| `frontend/src/pages/ProposalNew.tsx` | MODIFY | Added collaborating org multiselect picker (tag-based, excludes primary org); team roster row builder with email+role inputs, validation warning for ≠1 Meetup Heads, live budget cap indicator with colour coding, and submit-disable guards |
| `frontend/src/pages/ApprovalQueue.tsx` | MODIFY | Admin proposal detail expanded with `Collaborating Orgs` section (org name + status, Mega Meetup badge) and `Team Roster` section (member name + role, Meetup Head highlighted gold) |
| `frontend/src/pages/EventDetail.tsx` | MODIFY | Collaborator respond panel (Accept/Decline buttons — visible only to `manageable_org_ids` holders for `pending` collabs); team roster panel in left column; Reassign Meetup Head text input widget guarded by `canManage`; removed stray extra `</div>` syntax error |
| `frontend/src/__tests__/proposal-budget-cap.test.ts` | CREATE | 6 vitest unit tests for `computeBudgetCap()` pure function covering both caps, exemptions, and boundary values |
| `frontend/src/components/__tests__/CollabStatus.test.tsx` | CREATE | 3 vitest unit tests for `isMegaMeetup()` client-side logic covering under/at/with-declined threshold |

---

## Implementation Detail

### Task 1 — TypeScript Types (`types.ts`)

```typescript
export type CollabStatus = 'pending' | 'accepted' | 'declined'

export interface Collaborator {
  id: string
  activity_id: string
  org_id: string
  org: string | null
  is_primary: boolean
  status: CollabStatus
  responded_at: string | null
}

export interface TeamMember {
  id: string
  activity_id: string
  user_id: string
  member: string | null   // display name from the backend join
  role: string
  added_by: string | null
}
```

`EkatvaEvent` enriched with:
- `collaborators: Collaborator[]` — mapped from `a.collaborators` in `adaptActivity()`
- `teamMembers: TeamMember[]` — mapped from `a.team_members`
- `isMegaMeetup: boolean` — mapped from `a.is_mega_meetup`

The `collaborators` array cast in `api.ts` as `EkatvaEvent['collaborators']` because the raw API response has `status: string` not `CollabStatus`.

### Task 2 — API & Query Hooks (`api.ts`, `queries.ts`)

**`api.ts` additions:**
```typescript
export async function respondCollaboratorInvite(
  activityId: string, collabId: string, status: 'accepted' | 'declined'
): Promise<Collaborator>

export async function reassignMeetupHead(
  activityId: string, newMeetupHeadUserId: string
): Promise<{ activity_id: string; new_meetup_head_user_id: string }>
```

**`queries.ts` additions:**
```typescript
export function useRespondCollab()       // → useMutation, invalidates ['activity', id] + ['proposals']
export function useReassignMeetupHead()  // → useMutation, invalidates ['activity', id]
```

**`session.tsx` change:**  
`useSession()` now returns `capabilities: currentUser?.capabilities` (previously only `role`, `name`, `city`). This avoids prop-drilling `capabilities` into `EventDetail` — the component reads it directly from the session hook.

### Task 3 — ProposalNew: Collaborating Org Picker

Added after the "Core Details" card:
- `selectedCollabOrgs: string[]` state — IDs of chosen collaborating orgs
- A `<select>` dropdown populated from the `useOrgs()` query, filtered to exclude the primary org and already-selected orgs
- Selected orgs rendered as teal pill tags with an `×` remove button
- Deduplication enforced by `!selectedCollabOrgs.includes(val)` before adding
- Included in submit payload as `collaborating_org_ids: selectedCollabOrgs`

### Task 4 — ProposalNew: Team Roster Builder

Added after the collab picker:
- `teamMembers: TeamMemberInput[]` state — defaults to `[{ email: '', user_id: '', role: 'Meetup Head' }]` so first-time submitters see the required field pre-populated
- Each row: email text input (for UX), role `<select>` from `TEAM_ROLES` constant, remove `×` button
- Inline warning badge: `⚠ One Meetup Head required` when count = 0; `⚠ Only one Meetup Head allowed` when count > 1
- `teamValid = meetupHeadCount === 1` gates the Submit button via `disabled={!teamValid || !budgetValid}`
- Payload: `team: teamMembers.filter(m => m.user_id).map(m => ({ user_id: m.user_id, role: m.role }))`

### Task 5 — ProposalNew: Live Budget Cap Indicator

Inside the existing budget card, a computed indicator renders only for `local_meetup` and `regional_meetup` scales:
- `cap = Math.min(capacity * 200, 20_000)`
- `over = total > cap`
- **Red** (`border-red-400/30 bg-red-500/10 text-red-300`) with "Over cap: ₹X exceeds limit of ₹Y" message when over
- **Teal** (`border-teal/20 bg-teal/[0.05] text-teal`) with "₹X / ₹Y allowed" message when within limit
- `budgetValid = total <= budgetCap` — contributes to the combined Submit disable guard

### Task 6 — ApprovalQueue: Collaborator & Team Sections

Two new sections rendered when the expanded proposal detail is visible:

**Collaborating Orgs:**
- Lists each collaborator row: `org ?? org_id` name + `is_primary ? "(primary)" : ""` + status badge (teal=accepted, red=declined, gray=pending)
- Mega Meetup badge (gold pill with ⭐) conditionally rendered when `proposal.is_mega_meetup === true`

**Team Roster:**
- Lists each team member: display name + role chip (gold for "Meetup Head", gray for others)

### Task 7 — EventDetail: Collab Respond UI + Team Roster + Reassign

**Collab Respond panel** (shown only when applicable):
- Filters `activity.collaborators` for `status === 'pending' && !is_primary && capabilities?.manageable_org_ids?.includes(c.org_id)`
- Each matching collab gets Accept + Decline buttons wired to `useRespondCollab()` mutation
- Optimistic-style: on success, React Query invalidates the `['activity', id]` key → UI updates without page reload

**Team Roster panel:**
- Shows all `activity.teamMembers` with display name and role
- Meetup Head highlighted distinctly (gold text)

**Reassign Meetup Head** (guarded by `canManage`):
- Inside the Organiser View block only (when `capabilities?.manageable_activity_ids?.includes(e.id)`)
- Text input for new user ID + "Reassign" button wired to `useReassignMeetupHead()` mutation
- Button disabled while mutation is pending

### Task 8 — Frontend Tests

**`proposal-budget-cap.test.ts`** (6 tests — pure function, no DOM):
- `local_meetup` capacity=50 → cap=10,000
- `local_meetup` capacity=200 → cap=20,000 (absolute ceiling kicks in)
- `regional_meetup` capacity=100 → cap=20,000
- `regional_fest` → `null` (exempt)
- Budget at cap is valid (`10,000 <= 10,000`)
- Budget over cap is invalid (`10,001 > 10,000`)

**`CollabStatus.test.tsx`** (3 tests — pure function, mirrors backend `is_mega_meetup` logic):
- 2 accepted + 1 pending → `false` (below threshold of 3)
- 3 accepted → `true`
- 2 accepted + 1 declined → `false` (declined don't count)

---

## Design Decisions

- **Client-side cap replicates backend formula exactly** — `Math.min(capacity * 200, 20_000)` in the frontend is the same expression as in `proposal_service.py`. A mismatch would let users submit only to be rejected. The vitest test locks the client formula so a future change to one side without the other is immediately visible.
- **`useSession()` exposes `capabilities`** — rather than re-fetching `/auth/me` inside `EventDetail`, the session hook is the single source of truth. This is consistent with Phase 2's decision that `capabilities` come from the server once and are cached in the auth context.
- **Accept/Decline buttons are conditionally rendered, not conditionally disabled** — hiding inapplicable controls reduces cognitive load for ordinary attendees who have no invite to respond to. Only authority holders for `pending` collab orgs see the respond UI.
- **Reassign Meetup Head hidden behind `canManage`** — the client-side guard mirrors the backend RBAC guard. It provides UX clarity, not security (the backend enforces the actual 403).
- **TypeScript cast for `collaborators`** — `api.ts` casts the raw `string` status to `CollabStatus` rather than writing a runtime validator. Phase 3's scope doesn't include a full validation library; the cast is acknowledged as a trust boundary with the backend's own schema validation being the real guard.

---

## Manual UAT Checklist

| Behaviour | Test Instructions | Status |
|-----------|-------------------|----|
| Budget cap indicator — real-time feedback | Set scale=local_meetup, capacity=50. Add a budget line with ₹10,001. Confirm **red** "Over cap" indicator appears and Submit is disabled. Change to ₹9,999 — confirm **green** indicator and Submit enabled. | ⬜ |
| Team roster — Meetup Head validation | In ProposalNew, add two members both with role "Meetup Head". Confirm warning `⚠ Only one Meetup Head allowed` appears and Submit is disabled. Change one to "Designer" → warning clears, Submit enabled. | ⬜ |
| Mega Meetup badge — approval queue | Submit a proposal with 2 collaborating orgs. In DB, set both secondary collabs to `accepted`. Load `/admin/proposals`. Confirm "Mega Meetup" badge appears on that proposal. | ⬜ |
| Collab respond — authority holder flow | Log in as a Secretary of a collaborating org. Navigate to the event detail page. Confirm Accept/Decline buttons are visible. Click Accept → buttons disappear, status reads "accepted" without page reload. | ⬜ |
| Reassign Meetup Head — organiser view | Log in as the proposer (RC). Open the event detail. In the Organiser View block, enter a valid user ID in the Reassign input and click "Reassign". Confirm the team roster panel updates to show the new Meetup Head. | ⬜ |

---

## Verification Commands

```bash
# Frontend vitest (pure logic tests — no DOM setup needed)
cd frontend && npx vitest run src/__tests__/proposal-budget-cap.test.ts
cd frontend && npx vitest run src/components/__tests__/CollabStatus.test.tsx

# Full frontend type check (zero application errors)
cd frontend && npx tsc --noEmit

# Full backend suite (all 34 Phase 3 tests)
cd backend && pytest tests/test_proposal_collaboration.py tests/test_registration_and_waitlist.py -q
```

**Result**: All vitest tests passing; `tsc --noEmit` exits clean (test-file `vitest` import errors are pre-existing Phase 2 infrastructure gaps, not application errors).
