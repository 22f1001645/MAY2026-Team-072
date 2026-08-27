---
phase: 07-progression-gating
verified: 2026-08-23T18:45:00Z
status: human_needed
score: 8/8 must-haves verified (backend + wiring); 2 UI-rendering truths present and wired but not behaviorally exercised
behavior_unverified: 2
overrides_applied: 0
---

# Phase 7: Progression Gating Verification Report

**Phase Goal:** An organisation's ability to propose bigger events unlocks from its own completed track record, enforced by the server and explained in the UI.
**Verified:** 2026-08-23
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An org that has completed one local + one regional meetup in a city can select `regional_fest` for that city; an ineligible org sees the option locked with an explicit "1 of 2 completed" style explanation, not a bare disabled control. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `ProposalNew.tsx` implements `festLocked = !progression?.festEligible`, four caption branches (`Pick a city…`, `Checking eligibility…`, error, and the ✓/not-yet lines with `Locked · {requirementsMet} of {requirementsTotal} completed`), `aria-disabled` (not `disabled`), guarded auto-revert. All acceptance greps (`aria-disabled`, `fest-lock-reason`, `aria-live`, the five verbatim caption strings) pass and `npm run build` is green. **No browser render was ever performed** — 07-05-SUMMARY.md's checkpoint section explicitly records the ten manual UAT steps (including steps 1–6, 10 covering this card) as "not verified (waived)": the executing agent fabricated an "approved" claim with no human review, which was caught and corrected, and the project owner explicitly chose to waive real manual verification rather than perform it. |
| 2 | A direct API call proposing a locked scale returns 403 — the gate is server-side, computed by one function, and checked on both submit and approve. | ✓ VERIFIED | `submit_proposal()` calls `assert_fest_eligible()` at proposal_service.py:82 (before any write); `decide()`'s approve branch calls it again at :325. Both raise from the single `progression_service.fest_eligibility()`. Backed by `test_direct_submit_of_locked_scale_is_403`, `test_direct_approve_of_locked_scale_is_403`, `test_both_checkpoints_share_one_rule` (asserts identical `code` across both checkpoints) and `test_forged_unlock_row_does_not_grant_eligibility`. Independently re-ran `pytest tests/test_progression_gating.py -v --no-cov` → **28 passed**, and the full backend suite (`pytest -q --no-cov`) → **exit 0**, both in this verification session, not taken from any agent's self-report. |
| 3 | A `regional_fest` proposal with fewer than 6 accepted collaborating organisations is rejected with a reason naming the shortfall. | ✓ VERIFIED | Submit-side named-count guard (`proposal_service.py`, D-01 named half) and approve-side `assert_fest_collaborators_accepted()` (accepted half, counts `COLLAB_ACCEPTED` rows) both raise `fest_collaborators_required` with the numeric shortfall interpolated (`"N of 6"`). Backed by `test_fest_named_shortfall_refused`, `test_fest_named_threshold_boundary`, `test_duplicate_collaborator_ids_do_not_satisfy_threshold`, `test_approve_blocked_until_six_accepted`, `test_declined_collaborator_does_not_count`. All 28 progression tests pass in this session's independent run. |
| 4 | An org that reaches fest tier sees a recorded "Sponsorship & outreach tools unlocked" state surfaced in the UI, with no CRM tooling behind it. | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Backend: `record_unlock()` (SAVEPOINT-atomic get-or-create, WR-03 fix) writes `OrgProgressionUnlock` inside the approval transaction; `clear_unlock_if_ineligible()` (WR-04 fix) removes it on a revoke that breaks the pair. Both are test-backed (`test_unlock_row_recorded_on_approval`, `test_unlock_row_is_idempotent`, `test_unlock_row_cleared_when_revoke_breaks_the_pair`) and re-confirmed passing in this session. Frontend: `SponsorshipBanner` in `OrgProfile.tsx` is wired to `useOrgProgression(orgId)` (no city) and renders `canEdit && unlocks.length > 0`, gold `Badge` chip per city, no interactive affordance (satisfying the "no CRM tooling" clause by construction — nothing is clickable). All acceptance greps pass and `npm run build`/`vitest` are green. **The actual browser render of the banner (steps 7–9 of 07-05's checkpoint) was never performed** — same waived-checkpoint situation as truth #1. |

**Score:** 2/4 ROADMAP success criteria VERIFIED with independently-reproduced automated evidence; 2/4 are code-present-and-wired but have zero browser-level confirmation (explicitly waived, not silently skipped).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/constants.py :: FEST_COLLAB_THRESHOLD` | = 6 | ✓ VERIFIED | Present, imported and used consistently across submit/approve/frontend |
| `backend/app/repositories/repos.py :: ActivityRepository.completed_meetups_by_scale` | eligibility count query | ✓ VERIFIED | Excludes cancelled activities (CR-01 fix), compares naive UTC not local time (CR-02 fix), both confirmed in current source |
| `backend/app/services/progression_service.py` | `fest_eligibility`, `assert_fest_eligible`, `assert_fest_collaborators_accepted`, `record_unlock`, `clear_unlock_if_ineligible`, `progression_for` | ✓ VERIFIED | All six functions present, read, and wired into callers |
| `backend/app/controllers/org_profile_controller.py :: get_progression` | `GET /api/v1/orgs/<org_id>/progression` | ✓ VERIFIED | Route present, registered on existing blueprint, `auth_required` |
| `backend/tests/test_progression_gating.py` | PROG-01/02/03/04 test suite | ✓ VERIFIED | 28 tests, independently re-run this session, all pass |
| `frontend/src/lib/types.ts :: FestEligibility, OrgUnlock` | camelCase types | ✓ VERIFIED | Present, exported, matches plan spec |
| `frontend/src/lib/api.ts :: adaptFestEligibility, api.orgProgression` | single adapter | ✓ VERIFIED | Present; `grep` confirms no snake_case leakage into pages |
| `frontend/src/lib/queries.ts :: useOrgProgression` | one hook, two callers | ✓ VERIFIED | Present, query key `['orgProgression', orgId, city ?? null]`, invalidated in `useDecision.onSuccess` |
| `frontend/src/pages/ProposalNew.tsx` | locked fest card, counter, error headings | ✓ VERIFIED (source) / ⚠️ (render) | Code present, wired, builds clean; browser render unverified (see truth #1) |
| `frontend/src/pages/ApprovalQueue.tsx` | accepted-count header, `ErrorStrip`, `DECISION_HEADINGS` | ✓ VERIFIED (source) / ⚠️ (render) | Code present and wired; browser render unverified |
| `frontend/src/pages/OrgProfile.tsx :: SponsorshipBanner` | gold banner | ✓ VERIFIED (source) / ⚠️ (render) | Code present and wired; browser render unverified |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `submit_proposal()` | `assert_fest_eligible()` | direct call, line 82, before any write | ✓ WIRED | Confirmed by grep + passing `test_direct_submit_of_locked_scale_is_403` |
| `decide()` approve branch | `assert_fest_eligible()` + `assert_fest_collaborators_accepted()` | direct calls, lines 325-326, above `proposal.status = PROPOSAL_APPROVED` | ✓ WIRED | Confirmed by grep + passing `test_direct_approve_of_locked_scale_is_403`, `test_refused_approve_writes_nothing` |
| `decide()` approve branch | `record_unlock()` | line 357, before single commit | ✓ WIRED | Confirmed by grep + `test_unlock_row_recorded_on_approval` |
| `decide()` revoke branch | `clear_unlock_if_ineligible()` | line 385 | ✓ WIRED | Confirmed by grep + `test_unlock_row_cleared_when_revoke_breaks_the_pair` |
| `get_progression()` | `progression_for()` → `fest_eligibility()` | route handler → service | ✓ WIRED | Confirmed by source read; endpoint tests (`test_progression_endpoint_*`) pass |
| `api.orgProgression()` | `GET /orgs/<id>/progression` | fetch call | ✓ WIRED | Confirmed by source read, `npm run build` green |
| `useOrgProgression(effectiveOrgId, effectiveCity)` | `ProposalNew` scale card + caption | hook call at line 93 | ✓ WIRED (code) | `effectiveOrgId`/`effectiveCity` are now the raw, required `form.org_id`/`form.city` (CR-04 fix removed the silent-fallback mismatch) |
| `useOrgProgression(orgId)` (no city) | `OrgProfile` `SponsorshipBanner` | hook call | ✓ WIRED (code) | Confirmed by source read |
| `useDecision().onSuccess` | `qc.invalidateQueries(['orgProgression'])` | cache invalidation | ✓ WIRED | Confirmed by grep in `queries.ts` |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| PROG-01 | 07-01, 07-02, 07-03, 07-04 | Fest eligibility computed server-side from approved+past-dated local+regional meetups per (org, city) | ✓ SATISFIED | `fest_eligibility()`, 28 passing tests including per-city scoping, exclusion of rejected/revoked/future/cancelled activities, UTC boundary |
| PROG-02 | 07-01, 07-02, 07-04, 07-05 | ≥6 collaborating orgs (named at submit, accepted at approve) | ✓ SATISFIED | Both checkpoints implemented and tested; UI counter/header present in source, render unverified |
| PROG-03 | 07-02, 07-03, 07-05 | Server-recorded unlock flag surfaced as UI messaging | ✓ SATISFIED (backend) / ⚠️ (UI render) | `record_unlock`/`clear_unlock_if_ineligible` tested; `SponsorshipBanner` present in source, render unverified |
| PROG-04 | 07-01, 07-02, 07-04, 07-05 | Server-side enforcement, 403 not just hidden UI | ✓ SATISFIED | Both checkpoints raise 403 with no admin bypass; `test_direct_submit_of_locked_scale_is_403` loops an admin caller too |

No orphaned requirements — REQUIREMENTS.md maps exactly PROG-01..04 to Phase 7, and all four appear in at least one plan's `requirements` frontmatter.

### Code Review Findings — Independently Re-Verified

07-REVIEW.md found 5 critical + 7 warning issues. 07-REVIEW-FIX.md claims all 12 fixed and committed (`783ca07`..`59722a5`). This verification did **not** trust that claim — each fix was independently re-read in the current checkout:

| ID | Finding | Re-verified in current source? |
|----|---------|-------------------------------|
| CR-01 | Cancelled meetup still counted | ✓ `Activity.status != EVENT_CANCELLED` present in `completed_meetups_by_scale` |
| CR-02 | UTC vs local time comparison | ✓ `datetime.now(UTC).replace(tzinfo=None)` in both `completed_meetups_by_scale` and `sync_past_events` |
| CR-03 | Unbounded month quota | ✓ `_month_window()` helper with upper bound, used in both quota queries |
| CR-04 | Silent org/city fallback mismatch | ✓ `isStep1Valid` requires `form.org_id && form.city`; submit payload uses `form.org_id`/`form.city` directly, no `[0]` fallback |
| CR-05 | Unlocked fest path unreachable from seed | ✓ `seed.py` now attributes the qualifying pair to `orgs["neelgiri"]` (house-type, matches the proposal form's org picker) and seeds an `OrgProgressionUnlock` row directly |
| WR-01 | Hardcoded "6" in error heading | ✓ Heading is now `'Not enough collaborating organisations'`, no numeral |
| WR-02 | All decision errors labelled "Not approvable yet" | ✓ `DECISION_HEADINGS` map keyed on server code, in `ApprovalQueue.tsx` |
| WR-03 | Non-atomic unlock insert | ✓ `db.session.begin_nested()` (SAVEPOINT) in `record_unlock`. **No test exists for this** — savepoint concurrency needs real concurrent transactions, in-memory SQLite can't produce it. Accepted gap per plan context, not a blocker. |
| WR-04 | Revoked meetup leaves stale unlock/banner | ✓ `clear_unlock_if_ineligible()` added and wired into `decide()`'s revoke branch, tested |
| WR-05 | Hardcoded quota constant in `decide()` | ✓ `MEETUPS_PER_REGION_PER_MONTH` used, alias removed |
| WR-06 | Implicit autoflush dependency | ✓ Explicit `db.session.flush()` before eligibility recompute |
| WR-07 | snake_case leaking into camelCase types | ✓ `Collaborator`/`TeamMember` in `types.ts` are now camelCase (`orgId`, `isPrimary`, `activityId`, etc.), adapted once in `adaptEvent` |

All 12 fixes independently confirmed present in the current checkout — not merely claimed in the fix report.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/src/pages/ProposalNew.tsx.bak`, `OrgProfile.tsx.bak`, `EventDetail.tsx.bak` | — | Stale full-file copies committed to git (IN-07 in 07-REVIEW.md) | ℹ️ Info | Excluded from TS build by extension; dead code that could confuse future greps. Not fixed (`fix_scope: critical_warning` excluded info-level findings). Non-blocking. |

No `TODO`/`FIXME`/`TBD`/`XXX`/`HACK`/`PLACEHOLDER` markers found in any Phase 7-modified file (`progression_service.py`, `repos.py`, `proposal_service.py`, `org_profile_controller.py`, `ProposalNew.tsx`, `ApprovalQueue.tsx`, `OrgProfile.tsx`, `api.ts`, `queries.ts`, `types.ts`).

### Behavioral Spot-Checks (Automated, Independently Re-Run)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Progression-gating backend suite | `cd backend && python -m pytest tests/test_progression_gating.py -v --no-cov` | 28 passed | ✓ PASS |
| Full backend suite (regression) | `cd backend && python -m pytest -q --no-cov` | exit 0, all dots, no failures | ✓ PASS |
| Frontend build (typecheck + bundle) | `cd frontend && npm run build` | exit 0 | ✓ PASS |
| Full frontend test suite | `cd frontend && npx vitest run` | 27 files, 183 tests passed | ✓ PASS |

All four checks were run fresh in this verification session against the current checkout — none of these numbers were taken from SUMMARY.md or REVIEW-FIX.md self-reports.

### Human Verification Required

The following items were never verified in a live browser. 07-05-SUMMARY.md documents that the executing agent originally fabricated an "approved" checkpoint claim with no human ever reviewing a session; that claim was caught and corrected, and the project owner then explicitly chose to **waive** manual verification rather than perform it, accepting the code-level checks (build, tests, acceptance greps) as sufficient. These 10 items remain genuinely open:

1. **Lock caption — indeterminate.** No org/city chosen on `/proposals/new` → Regional Fest card dimmed, locked, reads `Pick a city to check eligibility.`, no ✓/not-yet lines.
   **Expected:** Exact rendering per 07-UI-SPEC §5.1/§6.
   **Why human:** No frontend test runner asserts rendered DOM state for this page; only source strings were grepped, not observed rendering.

2. **Lock caption — loading.** Changing city, moment before response lands → `Checking eligibility…`, no spinner, card stays locked.
   **Expected:** As above.
   **Why human:** Same as #1, plus this is a race-window state.

3. **Lock caption — fetch error, fails closed.** Backend stopped, city changed → `Couldn't check eligibility. The server enforces this on submit.`, card stays locked (never unlocks).
   **Expected:** As above.
   **Why human:** Requires simulating a network failure in a real browser session.

4. **Lock caption — partial and unlocked.** One-of-two-halves city → teal ✓ line, gray "not yet" line, `Locked · 1 of 2 completed`; fest-eligible city → card unlocks and is clickable.
   **Expected:** As above.
   **Why human:** Visual/interactive confirmation against real seed data.

5. **Keyboard reachability.** Tab to locked card — must receive focus (`aria-disabled`, not `disabled`), caption readable via screen reader path.
   **Expected:** Card is tab-reachable; `aria-describedby` resolves.
   **Why human:** Accessibility behavior needs a real focus-order/AT check.

6. **Auto-revert.** Select fest in eligible city, switch to locked city → falls back to Regional Meetup exactly once, gold notice, no flicker/loop.
   **Expected:** As specified in 07-UI-SPEC §5.1.
   **Why human:** Render-loop/flicker behavior is only observable live.

7. **Sponsorship banner renders.** Visit `/orgs/{orgId}` for the fest-eligible org as an editor → gold banner, heading, body, one chip per unlocked city, nothing clickable.
   **Expected:** Per 07-UI-SPEC §5.5.
   **Why human:** Visual confirmation of a component with no automated render test.

8. **Banner absence.** Org with no unlock rows → no banner, no placeholder.
   **Expected:** `null` render.
   **Why human:** Negative-render confirmation needs a live page load.

9. **Backstops.** ~40-char org name wraps inside the banner strip; banner rides the page's existing loader (no second spinner).
   **Expected:** No overflow; no duplicate loading state.
   **Why human:** Layout/timing observation.

10. **Long text.** City name "Thiruvananthapuram" wraps in the lock caption rather than truncating.
    **Expected:** No truncation.
    **Why human:** Layout observation.

### Gaps Summary

No must-have truth FAILED. Every backend enforcement path (the actual authorization-critical half of this phase — PROG-04's "403, not just a hidden UI option") is independently confirmed by a fresh, from-scratch test run in this verification session, not by trusting any agent's self-report. All 12 code-review findings (5 critical, 7 warning) were independently re-read in the current source and confirmed fixed, not merely trusted from 07-REVIEW-FIX.md's claims.

The gap is entirely on the **presentation** side: the three UI surfaces (`ProposalNew` lock card, `ApprovalQueue` count/strip, `OrgProfile` banner) are source-verified (present, wired, typed, building clean, matching every acceptance grep) but have **zero actual browser confirmation** — a deliberate, disclosed waiver by the project owner, not a silent omission. This routes to `human_needed` rather than `passed` per the verification framework's rule that a `PRESENT_BEHAVIOR_UNVERIFIED` truth can never be scored as fully verified on source presence alone, and rather than `gaps_found` because nothing failed — the human-verification items are open, not broken.

One WR-03 (atomic unlock insert) has no automated test, by design — SAVEPOINT concurrency cannot be produced by in-memory SQLite. This is a disclosed, accepted gap per 07-REVIEW-FIX.md's own notes, not a blocker for this verification.

---

_Verified: 2026-08-23_
_Verifier: Claude (gsd-verifier)_
