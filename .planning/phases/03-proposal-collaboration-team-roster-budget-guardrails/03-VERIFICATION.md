---
phase: 03-proposal-collaboration-team-roster-budget-guardrails
verified: 2026-08-13T00:00:00Z
status: human_needed
score: 10/10 must-haves verified (code-level)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Complete the 9 outstanding manual UAT rows in 03-UAT.md (M-03, M-04, M-06 through M-12) in a real browser session"
    expected: "Meetup Head count warnings (0 / >1) render and gate submit; Accept/Decline buttons appear only for the collaborating org's authority holder and update status without reload; non-authority users see no respond buttons; team roster panel renders on EventDetail; Reassign Meetup Head control works for proposer and admin; ApprovalQueue shows the collaborator list, Mega Meetup badge and team roster in the admin detail panel"
    why_human: "These are runtime, role-conditional UI behaviors (button visibility keyed to a logged-in user's manageableOrgIds, live query invalidation without reload, multi-role login flows) that grep/static analysis cannot execute — and the project's own 03-UAT.md and .planning/STATE.md explicitly record them as still pending (3/12 done, 9/12 pending) rather than exercised"
gaps:
  - truth: "Frontend vitest tests for BUDGET-01 cap formula and PROPOSAL-03 Mega Meetup client logic exist and pass, as 03-04-SUMMARY.md and 03-VALIDATION.md claim"
    status: failed
    reason: "03-04-SUMMARY.md Task 8 and the phase's own verification commands claim two new test files with 9 passing vitest tests. Neither file exists anywhere in the working tree or in git history (`git log --all` returns nothing for either path). Running the exact commands from the SUMMARY (`npx vitest run src/__tests__/proposal-budget-cap.test.ts src/components/__tests__/CollabStatus.test.tsx`) fails with 'No test files found, exiting with code 1'. The client-side budget-cap and Mega Meetup logic embedded in ProposalNew.tsx/EventDetail.tsx (a hand-written IIFE and inline filters, not the pure functions the plan specified) has zero automated coverage."
    artifacts:
      - path: "frontend/src/__tests__/proposal-budget-cap.test.ts"
        issue: "Does not exist — never committed (confirmed via git log --all)"
      - path: "frontend/src/components/__tests__/CollabStatus.test.tsx"
        issue: "Does not exist — never committed (confirmed via git log --all)"
    missing:
      - "Either create the two vitest files as specified in 03-04-PLAN.md Task 8, or correct 03-04-SUMMARY.md and 03-VALIDATION.md to stop claiming '9 passing vitest tests' that were never written."
deferred: []
---

# Phase 3: Proposal Collaboration, Team Roster & Budget Guardrails — Verification Report

**Phase Goal:** A proposal expresses who is collaborating, who is running the event, and a budget that policy cannot be talked out of — and admins review all three together.
**Verified:** 2026-08-13
**Status:** human_needed (one code-level gap found and documented below; the remaining blocking issue is the project's own unresolved manual UAT, not a missing implementation)
**Re-verification:** No — initial verification

## Summary

The Phase 3 backend is real, complete, and independently proven: I re-ran (did not just read) `pytest tests/test_proposal_collaboration.py` (32/32 passed) and the **full** backend suite (`pytest`, no filters — all green, 0 failures) from a cold shell. Every endpoint, service function, RBAC predicate, model property and schema field named in 03-01 through 03-03's PLAN/SUMMARY exists in the code and is wired end-to-end: org-scoped submitter guard, budget hard-cap with the exact `min(capacity×200, 20000)` formula, team-roster/Meetup-Head validation, `ActivityCollaborator` writes (primary=accepted, secondary=pending), the collaborator respond endpoint with 409 double-respond protection, authority-holder notifications, the dynamic `is_mega_meetup` property, admin-queue enrichment (`collaborators` + `team_members` in one `to_dict(detail=True)` payload), the N+1 `joinedload` fix, and the reassign-Meetup-Head endpoint/service.

The frontend (03-04) is also real — I read the live `ProposalNew.tsx`, `ApprovalQueue.tsx`, `EventDetail.tsx`, `lib/api.ts`, `lib/queries.ts`, `lib/types.ts` and confirmed every UI surface the plan promised is present and calling the right endpoints (not stubs): the collaborator toggle grid, team-roster search-and-add builder with a first-added-is-Head rule, a live red/teal budget-cap indicator, the ApprovalQueue detail panel showing collaborators + Mega Meetup badge + team roster together, and EventDetail's Accept/Decline buttons gated on `capabilities.manageableOrgIds` plus a Reassign-Meetup-Head control gated on `canManage`. `npx tsc --noEmit` and `npm run build` both pass clean.

**One concrete gap was found and is not a matter of interpretation:** 03-04-SUMMARY.md and 03-VALIDATION.md both claim two new vitest test files (`proposal-budget-cap.test.ts`, `CollabStatus.test.tsx`, 9 tests total, "all passing") were created for this phase. Neither file exists in the working tree, and `git log --all` shows no history of them ever being committed — they were never written. Running the verification commands from the SUMMARY confirms this (`No test files found, exiting with code 1`).

**Separately, and more consequentially for "is this phase actually done":** the phase's own tracking documents (`03-UAT.md`, `03-VALIDATION.md`, `.planning/STATE.md`) all agree that only 3 of 12 manual UAT items have been exercised in a real browser session — 9 are still `⬜ pending`, including the collaborator accept/decline flow, the Reassign Meetup Head control, and the Mega Meetup badge in the admin queue. `03-UAT.md`'s own frontmatter says `status: in-progress` and its sign-off checklist is unchecked. I did not find any evidence contradicting this — the code is present and wired, but nobody has clicked through the flows in a browser to confirm they render and behave as designed. This is exactly what the project's own tracking says, so it is reported here as a still-open human-verification item rather than silently accepted as done.

## Goal Achievement — Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Any organiser-POR holder of the primary entity can submit a proposal naming ≥1 collaborating orgs with exactly one primary | ✓ VERIFIED | `has_organiser_por_in_org` (rbac.py:137) enforced in `submit_proposal` (proposal_service.py:49); primary org always written `is_primary=True, status=COLLAB_ACCEPTED` (proposal_service.py:150-158); admin bypass at line 49. Test: `TestSubmitterAuthorization` (3 tests), `TestCollaboratorWrite` — all pass. |
| 2 | A named collaborator's authority holder is notified and can accept/decline; only accepted count; "Mega Meetup" appears automatically at 3 accepted | ✓ VERIFIED | `_notify_collab_invite` (proposal_service.py:349) dispatches to `ORG_MANAGER_PORS` holders; `respond_collab` endpoint + service enforce PENDING→ACCEPTED/DECLINED with 409 on re-respond; `Activity.is_mega_meetup` (models/__init__.py:319-327) counts only `COLLAB_ACCEPTED` rows against `MEGA_MEETUP_THRESHOLD=3`. Tests: `TestCollabRespond` (5), `TestMegaMeetup` (3) — all pass. |
| 3 | Submission rejected server-side for 0/2+ Meetup Heads or over-cap budget, with the actual reason shown (not generic) | ✓ VERIFIED | `submit_proposal` raises `invalid_team`/`budget_cap_exceeded` with the specific numbers interpolated (proposal_service.py:56-88); `ProposalNew.tsx:415-419` renders `(submitMut.error as Error).message` verbatim, not a generic string. Tests: `TestBudgetCap` (5), `TestTeamRoster` (5) — all pass. |
| 4 | Admin approval queue shows team roster + collaborating-entity list alongside description/budget/city, in one review | ✓ VERIFIED | `ActivityRepository.proposals_by_status` joinedloads `collaborators`/`team_members`/`budget_lines` (repos.py:126-139, N+1 fix); `Activity.to_dict(detail=True)` includes both lists (models/__init__.py:329-351); `ApprovalQueue.tsx:143-185` renders both blocks inside the same detail `Card` as budget/description. Tests: `TestAdminQueueEnrichment` (2) — pass. |
| 5 | Proposer or admin can reassign the Meetup Head to any team member (POR or not) before campaign goes live | ✓ VERIFIED | `POST /activities/<id>/reassign-meetup-head` guarded by `can_manage_activity_required` (proposal_controller.py:118-130); service deletes old head row, inserts new one, no POR check on the new user (proposal_service.py:204-244); `EventDetail.tsx:223-253` wires the UI. Tests: `TestReassignMeetupHead` (6, including old-head-removed and 403/404 cases) — pass. |

**Score:** 5/5 ROADMAP success criteria verified at the code level.

## Plan-Level Must-Haves (03-01 through 03-04)

| Must-have | Status | Evidence |
|---|---|---|
| `BUDGET_CAPACITY_RATE`, `BUDGET_ABSOLUTE_CEILING`, `MEGA_MEETUP_THRESHOLD` constants | ✓ VERIFIED | `backend/app/constants.py:260-267` |
| `has_organiser_por_in_org` RBAC predicate | ✓ VERIFIED | `backend/app/rbac.py:137` |
| `ProposalSchema` extended with `team`, `collaborating_org_ids`; `CollabRespondSchema`, `ReassignMeetupHeadSchema` | ✓ VERIFIED | `backend/app/schemas/__init__.py:34-140` |
| `ActivityCollaborator` / `ActivityTeamMember` written at submission | ✓ VERIFIED | `proposal_service.py:139-170` |
| Respond endpoint with `can_manage_org` authority check + 409 double-respond | ✓ VERIFIED | `proposal_controller.py:90-115`, `proposal_service.py:180-201` |
| `is_mega_meetup` dynamic property + `to_dict` enrichment | ✓ VERIFIED | `models/__init__.py:319-351` |
| Reassign-Meetup-Head endpoint + service | ✓ VERIFIED | `proposal_controller.py:118-130`, `proposal_service.py:204-244` |
| N+1 fix on admin queue query | ✓ VERIFIED | `repositories/repos.py:126-139` |
| Frontend types (`Collaborator`, `TeamMember`) + adapters | ✓ VERIFIED | `lib/types.ts:101-103`, `lib/api.ts:164-191` |
| Frontend API calls + TanStack Query hooks (`respondCollaboratorInvite`, `reassignMeetupHead`, `useRespondCollab`, `useReassignMeetupHead`) | ✓ VERIFIED | `lib/api.ts:398-410`, `lib/queries.ts:140` |
| `ProposalNew.tsx`: collaborator picker, team roster builder, live budget cap indicator | ✓ VERIFIED (implemented as a checkbox grid + search-based roster builder rather than the plan's literal `<select>`-based mock, but functionally equivalent and more capable — real user search backed by `api.users(q)`) | `ProposalNew.tsx:289-403` |
| `ApprovalQueue.tsx`: collaborators + Mega Meetup badge + team roster in admin detail | ✓ VERIFIED | `ApprovalQueue.tsx:143-185` |
| `EventDetail.tsx`: collaborator Accept/Decline UI gated on authority, team roster panel, Reassign control | ✓ VERIFIED | `EventDetail.tsx:114-253` |
| Frontend vitest tests (`proposal-budget-cap.test.ts`, `CollabStatus.test.tsx`) | ✗ **FAILED** | Files do not exist; never committed (`git log --all` empty for both paths); `npx vitest run` on the documented paths returns "No test files found, exiting with code 1" |

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/app/constants.py` | Budget/Mega Meetup constants | ✓ VERIFIED | Present, correct values |
| `backend/app/rbac.py` | `has_organiser_por_in_org` | ✓ VERIFIED | Present, used in service |
| `backend/app/schemas/__init__.py` | 3 new schemas | ✓ VERIFIED | Present, imported by controller |
| `backend/app/services/proposal_service.py` | `submit_proposal`, `respond_collab`, `reassign_meetup_head`, `_notify_collab_invite` | ✓ VERIFIED | All present, called from controller |
| `backend/app/controllers/proposal_controller.py` | 2 new routes | ✓ VERIFIED | Both registered on `proposal_bp` |
| `backend/app/models/__init__.py` | `is_mega_meetup`, enriched `to_dict` | ✓ VERIFIED | Present |
| `backend/app/repositories/repos.py` | `joinedload` N+1 fix | ✓ VERIFIED | Present |
| `backend/tests/test_proposal_collaboration.py` | 30+ tests across 8 classes | ✓ VERIFIED | 32 tests, re-run live: 32 passed in 61s |
| `frontend/src/pages/ProposalNew.tsx` | Collaborator + roster + budget UI | ✓ VERIFIED | Present, wired to submit payload |
| `frontend/src/pages/ApprovalQueue.tsx` | Enriched admin detail | ✓ VERIFIED | Present |
| `frontend/src/pages/EventDetail.tsx` | Respond + roster + reassign UI | ✓ VERIFIED | Present, RBAC-gated client-side |
| `frontend/src/lib/{api,queries,types}.ts` | Types + calls + hooks | ✓ VERIFIED | Present |
| `frontend/src/__tests__/proposal-budget-cap.test.ts` | 6 vitest tests | ✗ **MISSING** | Never created |
| `frontend/src/components/__tests__/CollabStatus.test.tsx` | 3 vitest tests | ✗ **MISSING** | Never created |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `ProposalNew.tsx` submit | `POST /api/v1/activities` | `useSubmitProposal()` → `api.ts` | ✓ WIRED | Payload includes `team`, `collaborating_org_ids` |
| `EventDetail.tsx` Accept/Decline | `POST /activities/<id>/collaborators/<id>/respond` | `useRespondCollab()` | ✓ WIRED | Gated on `capabilities.manageableOrgIds.includes(c.org_id)` and `status === 'pending'` |
| `EventDetail.tsx` Reassign | `POST /activities/<id>/reassign-meetup-head` | `useReassignMeetupHead()` | ✓ WIRED | Gated on `canManage` |
| `ApprovalQueue.tsx` detail | `GET /api/v1/proposals/<id>` | existing `useProposal` query | ✓ WIRED | Renders `collaborators`, `teamMembers`, `isMegaMeetup` from the same payload |
| `/auth/me` `manageable_org_ids` | `EventDetail.tsx` respond-button gate | `auth_service.py:144` → `lib/api.ts:236` → `capabilities.manageableOrgIds` | ✓ WIRED | Real server-computed set, not a client guess |

## Behavioral Spot-Checks (re-run live, not trusted from SUMMARY)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase 3 backend test file | `pytest tests/test_proposal_collaboration.py --no-cov -v` | `32 passed in 61.29s` | ✓ PASS |
| Full backend suite (regression) | `pytest --no-cov -q` | all green, 0 failures | ✓ PASS |
| RBAC/collaboration-adjacent suites | `pytest tests/test_rbac_predicates.py tests/test_rbac_enforcement.py tests/test_registration_and_waitlist.py --no-cov -q` | all green | ✓ PASS |
| Frontend type check | `npx tsc --noEmit` | exits 0, no output | ✓ PASS |
| Frontend production build | `npm run build` | builds clean (one pre-existing chunk-size warning, unrelated to Phase 3) | ✓ PASS |
| Claimed Phase 3 vitest files | `npx vitest run src/__tests__/proposal-budget-cap.test.ts src/components/__tests__/CollabStatus.test.tsx` | `No test files found, exiting with code 1` | ✗ **FAIL** |

## Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|---|---|---|---|
| PROPOSAL-00 | 03-01 | ✓ SATISFIED | `has_organiser_por_in_org`, cross-org 403 test |
| PROPOSAL-01 | 03-02 | ✓ SATISFIED | Collaborator rows, dedup, 404 on unknown org |
| PROPOSAL-02 | 03-01 | ✓ SATISFIED | Meetup Head count validation |
| PROPOSAL-03 | 03-03 | ✓ SATISFIED | `is_mega_meetup` at threshold 3 |
| PROPOSAL-04 | 03-03 | ✓ SATISFIED | Admin queue enrichment, one review |
| PROPOSAL-05 | 03-03 | ✓ SATISFIED | Reassign endpoint, no POR requirement on new head |
| PROPOSAL-06 | 03-02 | ✓ SATISFIED | Notify + respond + 409 double-respond |
| BUDGET-01 | 03-01 | ✓ SATISFIED | Cap formula, ceiling, fest exemption |

REQUIREMENTS.md itself still shows these 8 rows as unchecked `[ ]` with a "Pending" status column — this is a documentation-sync gap (the requirements tracker was not updated after Phase 3 shipped), not a code gap. Worth flagging so it doesn't cause confusion in Phase 4 planning.

## Anti-Patterns Found

None load-bearing. Scanned all Phase 3 backend/frontend files for `TBD`/`FIXME`/`XXX`/`TODO`/placeholder patterns:
- `reassign_meetup_head`'s Phase-5 live-campaign-gate stub is a documented, intentional no-op with a comment explaining exactly what to fill in and when (`proposal_service.py:207-222`) — not a debt marker, it's forward-referenced future work called out explicitly in the plan itself.
- No stub returns, no `console.log`-only handlers, no hardcoded empty arrays feeding real UI in any Phase 3 file.

## Documentation Integrity Note (not a code gap, but worth surfacing)

`03-UI-SPEC.md` (dated 2026-08-13, "retro-documented" per the git log, checker-approved 6/6 dimensions) describes a considerably more elaborate UI contract than what actually shipped in 03-04 — it names four new component files (`CollaboratorPicker.tsx`, `TeamRosterPicker.tsx`, `BudgetCeiling.tsx`, `InvitationCard.tsx`), an "Invitations block" on `OrganiserDashboard.tsx`, and a `collaboration_invite` entry in `NotificationsDropdown.tsx`. **None of these exist.** The actual implementation (verified above) achieves the same *functional* requirements inline in `ProposalNew.tsx`/`EventDetail.tsx`/`ApprovalQueue.tsx` without those component files or the dashboard/notification-dropdown surfaces. Since 03-UI-SPEC.md post-dates the code (per its own `created: 2026-08-13` vs. the code's `2026-08-12` completion) and describes a contract that isn't what was built, it should not be read as an accurate description of the current UI — it appears to be an aspirational or misattributed design document, not a build record. This doesn't block the phase (the ROADMAP success criteria and REQUIREMENTS.md are satisfied by the simpler implementation that does exist), but a Phase 4 planner reading 03-UI-SPEC.md as-is would be planning against components that were never built.

## Human Verification Required

### 1. Complete the outstanding manual UAT pass

**Test:** Work through the 9 `⬜ pending` rows in `03-UAT.md` (M-03, M-04, M-06–M-12) in a real logged-in browser session across the seeded accounts (admin, organiser, student, plus an authority holder in a second org for the collaborator-respond flow).
**Expected:** Meetup Head warnings render/gate submit at 0 and >1 count; Accept/Decline buttons appear only for the correct authority holder and update without a page reload; a non-authority student sees no respond buttons; the team roster panel renders on `EventDetail`; Reassign Meetup Head works from both the organiser and admin entry points; the Mega Meetup badge and team roster render in `ApprovalQueue`'s admin detail panel.
**Why human:** Role-conditional button visibility (`capabilities.manageableOrgIds`), live TanStack Query cache invalidation without reload, and multi-account login flows are runtime behaviors that static analysis and grep cannot execute. The project's own `03-UAT.md`, `03-VALIDATION.md`, and `.planning/STATE.md` all independently confirm these are still open (3/12 done) — this verification did not find any evidence that they've since been exercised, and is reporting the project's own documented state rather than overriding it.

---

_Verified: 2026-08-13_
_Verifier: Claude (gsd-verifier)_
