---
phase: 02-identity-session-dashboard-shell
plan: 07
subsystem: ui
tags: [react, react-router, vitest, testing-library, localstorage, rbac, aria]

requires:
  - phase: 02-01
    provides: cookie session spine, /auth/refresh → /auth/me cold-load sequence
  - phase: 02-06
    provides: camelCase capability adapter, session-expiry handling
provides:
  - Two-segment Student/Organiser view switcher derived from location.pathname
  - View-aware sidebar nav (useSession().role follows the URL, admin stays a login role)
  - Shared pathname-to-view matcher exported from ViewSwitcher.tsx
  - Academic-status banner relocated inside the main column, gated to the two home routes
  - D-18 proof in both directions: the view is never sent, and would not matter if it were
affects: [05-organiser-workspace, 07-progression-gating, 08-notifications]

actuals:
  tokens: 6900
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "URL as the single source of truth for view state — no React state to synchronise"
    - "Storage read for a landing route only, never for a rendered value"
    - "Mutation-verified tests: a test that cannot go red is not evidence"

key-files:
  created:
    - frontend/src/components/__tests__/ViewSwitcher.test.tsx
    - frontend/src/lib/__tests__/view-not-sent.test.ts
    - backend/tests/test_view_switcher.py
  modified:
    - frontend/src/components/ViewSwitcher.tsx
    - frontend/src/lib/session.tsx
    - frontend/src/components/Layout.tsx
    - frontend/src/lib/auth.tsx

key-decisions:
  - "The pathname matcher lives in ViewSwitcher.tsx and is imported by session.tsx, per the plan — one definition of the route set, no drift"
  - "homeFor() in lib/auth.tsx is the single place localStorage['ekatva_view'] is read, chosen over a new module because it avoids an import cycle with useAuth"
  - "SessionProvider kept as a stateless passthrough rather than deleted, to avoid an out-of-scope edit to App.tsx"
  - "Admin resolution stays on the login role; only the Student/Organiser distinction comes from the URL"
  - "/leaderboard belongs to both navs and therefore reads as Student — the locked S1 rule was followed rather than given a shared-route exception"

patterns-established:
  - "Radiogroup segmented control: role=radiogroup + role=radio + aria-checked, roving tabIndex, arrow/Home/End keys"
  - "Capability-absent controls return null with no reserved space (empty:hidden on the wrapper)"
  - "Negative security claims are proved structurally as well as behaviourally"

requirements-completed: [DASH-01]

coverage:
  - id: D1
    description: "A POR holder switches between Student and Organiser views from the sidebar, and the switch navigates to that view's home route"
    requirement: DASH-01
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/ViewSwitcher.test.tsx#navigates to that view and stores the choice on activation"
        status: pass
    human_judgment: false
  - id: D2
    description: "The switcher renders exactly two segments for every user, and nothing at all for a single-role student"
    requirement: DASH-01
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/ViewSwitcher.test.tsx#renders exactly two segments for an organiser"
        status: pass
      - kind: unit
        ref: "frontend/src/components/__tests__/ViewSwitcher.test.tsx#renders nothing at all for a single-role student, and drops the stored view"
        status: pass
    human_judgment: false
  - id: D3
    description: "A deep link into the other view flips the switcher — the URL wins on crossover (D-16), mutation-verified"
    requirement: DASH-01
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/ViewSwitcher.test.tsx#lets the URL win over the stored view on crossover (D-16)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The stored view survives a cold load, so the choice persists across a reload"
    requirement: DASH-01
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/ViewSwitcher.test.tsx#keeps the stored view across a cold load (D-15 persistence)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The view value never appears in any request header, query parameter or body, and api.ts cannot send it (verification map row 17)"
    requirement: DASH-01
    verification:
      - kind: unit
        ref: "npx vitest run src/lib/__tests__/view-not-sent.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Identical API calls return identical responses whichever view is active; a view hint neither grants nor removes access (verification map row 16)"
    requirement: DASH-01
    verification:
      - kind: integration
        ref: "cd backend && .venv/Scripts/python.exe -m pytest tests/test_view_switcher.py -q --no-cov"
        status: pass
    human_judgment: false
  - id: D7
    description: "Neither switcher segment wraps or clips inside the 256px sidebar rail at 320px, 768px and 1440px"
    verification:
      - kind: manual_procedural
        ref: "human checkpoint, Task 4 item 1 — approved 2026-08-12"
        status: pass
    human_judgment: true
    rationale: "Visual geometry is measured, not proven; jsdom has no layout engine so wrapping and clipping cannot be asserted in a unit test"
  - id: D8
    description: "Banner, switcher, nav and page title coexist without displacement; the sidebar gains no scrollbar at 768px height"
    verification:
      - kind: manual_procedural
        ref: "human checkpoint, Task 4 item 2 — sidebar half approved 2026-08-12; banner half not exercised (no terms data)"
        status: unknown
    human_judgment: true
    rationale: "Composed-layout geometry needs a real layout engine. The banner half could not be exercised because the dev terms table is empty — see Deferred Items."
  - id: D9
    description: "Admin-override dialog truncates long name and email on their own lines within max-w-md"
    verification:
      - kind: manual_procedural
        ref: "human checkpoint, Task 4 item 3 — approved 2026-08-12"
        status: pass
    human_judgment: true
    rationale: "S6 truncation is a rendered-width behaviour; jsdom reports no widths, so overflow cannot be asserted"

duration: 47min
completed: 2026-08-12
status: complete
---

# Phase 2 Plan 07: View Switcher Summary

**Two-segment Student/Organiser radiogroup driven by `location.pathname`, with a view-aware sidebar nav, S4 banner placement, and D-18 proved from both the client and the server**

## Performance

- **Duration:** 47 min
- **Started:** 2026-08-12T15:38:00Z
- **Completed:** 2026-08-12T16:25:00Z
- **Tasks:** 4
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- Rewrote `ViewSwitcher` against 02-UI-SPEC S1 on all nine points it previously diverged on: it is now a `role="radiogroup"` with exactly two `role="radio"` segments, derives its value from the URL every render, navigates on activation, persists the choice, carries the arrow/Home/End keyboard contract, and returns `null` for a single-role student.
- Made the sidebar nav view-aware by deriving `useSession().role` from the pathname, which is the integration gap `02-RESEARCH.md` flagged — an organiser could previously never reach the student nav.
- Moved the switcher into the sidebar between the wordmark and the nav list, so the control sits directly above the list it rewrites, and moved the academic-status banner inside `<main>`'s `max-w-6xl` wrapper, gated to `/discover` and `/organiser`.
- Proved DASH-01's negative claim twice: behaviourally (every request scanned under both stored view values) and structurally (`api.ts` contains no reference to the view), plus a server-side half asserting responses are byte-identical with and without a view hint.
- **Found and fixed a silent persistence bug that the tests would otherwise have shipped** — see Deviations.

## Task Commits

1. **Task 1: Rewrite ViewSwitcher to the S1 contract** - `6423d49` (feat)
2. **Task 2: Sidebar placement, view-aware nav, S4 banner placement** - `97dbdb2` (feat)
3. **Task 3: DASH-01 tests + persistence bug fix** - `f1f2e58` (test)
4. **Task 4: Human verification checkpoint** - approved 2026-08-12, no code change

**Plan metadata:** see the docs commit accompanying this file.

## Files Created/Modified

- `frontend/src/components/ViewSwitcher.tsx` - Rewritten: two-segment radiogroup, pathname-derived, navigating, persisting; exports the shared `viewFromPathname` matcher and the `View` type
- `frontend/src/lib/session.tsx` - `viewRole` state and its reset effect replaced by a pathname-derived value; `setViewRole` removed (nothing else imported it)
- `frontend/src/components/Layout.tsx` - Switcher moved from the header cluster into the `<aside>` at `px-3 my-3 empty:hidden`; banner moved inside `<main>`'s wrapper and gated to the two home routes
- `frontend/src/lib/auth.tsx` - `homeFor()` now honours the stored view when picking an organiser's landing route
- `frontend/src/components/__tests__/ViewSwitcher.test.tsx` - 6 tests through the real `AuthProvider`
- `frontend/src/lib/__tests__/view-not-sent.test.ts` - 4 tests, behavioural + structural halves of D-18
- `backend/tests/test_view_switcher.py` - 11 tests: identical responses, and hints that neither grant nor remove access

## Decisions Made

- **The shared matcher lives in `ViewSwitcher.tsx`**, as the plan's `artifacts_produced` specified. No cycle results because the rewritten switcher no longer imports `useSession`.
- **`homeFor()` reads `localStorage['ekatva_view']` directly** rather than importing a helper. Importing the matcher into `auth.tsx` would have created `auth.tsx → ViewSwitcher.tsx → auth.tsx`; a two-line inline read in the module that already owns landing routes was the smaller and safer option.
- **`SessionProvider` was kept as a stateless passthrough.** It now holds nothing, but deleting it means editing `App.tsx`, which the plan placed out of scope. Flagged below as a one-line cleanup.
- **`/leaderboard` resolves to the Student view.** It appears in both navs, so an organiser clicking it from the organiser nav sees the sidebar flip. This follows S1's locked "everything else → Student" rule; inventing a shared-route exception would be an undiscussed design change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The lapse cleanup deleted the stored view on every page load**
- **Found during:** Task 3, while mutation-verifying the URL-wins test
- **Issue:** `ViewSwitcher`'s D-17 effect ran on the first render of every page load, when `capabilities` is still `null` during the `/auth/refresh` → `/auth/me` cold-load sequence. `isOrganiser` read `false` at that moment, so `localStorage['ekatva_view']` was removed before anything could read it. The switcher still looked correct — it renders from the URL — so the only symptom was that the view never survived a reload, silently defeating D-15 and making the new `homeFor` read dead code.
- **How it surfaced:** the mandated mutation check. Making the switcher render from `localStorage` should have turned the crossover test red; it stayed green, because the bug had already wiped the value the mutation depended on. A green mutation is a failed mutation, so the test was not yet evidence.
- **Fix:** guarded the effect on `loading` from `useAuth()`, so the cleanup runs only once capabilities have actually resolved.
- **Files modified:** `frontend/src/components/ViewSwitcher.tsx`
- **Verification:** added a dedicated sixth test, `keeps the stored view across a cold load (D-15 persistence)`; both required mutations then went red on exactly the intended test and green again on revert.
- **Committed in:** `f1f2e58`

**2. [Rule 2 - Missing Critical] `localStorage['ekatva_view']` had no reader**
- **Found during:** Task 1
- **Issue:** The plan's `files_modified` covered only the switcher, session and layout, but must-have truth 2 requires the stored view to be read at boot to pick a landing route. Written-but-never-read storage is a stub, not a feature.
- **Fix:** two lines in `homeFor()` — an organiser whose last view was Student lands on `/discover`.
- **Files modified:** `frontend/src/lib/auth.tsx` (outside the plan's declared file list)
- **Verification:** `npm run build` and the full suite pass; exercised by hand at the checkpoint.
- **Committed in:** `6423d49`

### Accepted deviations from stated acceptance criteria

- **`ViewSwitcher.test.tsx` has 6 tests, not the 5 the plan specified.** The sixth is the cold-load persistence regression test from deviation 1. Removing it to hit the number would delete the only guard against a bug that had already occurred once and is invisible in the UI.
- **A third structural assertion was written and then removed.** It asserted `api.ts` never mentions `localStorage`; the file mentions it only in a comment explaining that access tokens are *not* stored there. The assertion was my own addition beyond the plan's `<behavior>` block and was wrong, so it was deleted rather than weakened.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical) + 2 documented criteria deviations
**Impact on plan:** No scope creep. The `auth.tsx` change is two lines in the function that already owns landing routes. The bug fix is the plan's own mutation-verification requirement doing exactly what it exists to do.

## Issues Encountered

- **The plan's checkpoint credentials do not exist in the dev database.** `saiteja@ekatva.os` and `arav@ekatva.os` are the pytest fixture emails from `conftest.py`; `seed.py` uses `saiteja@ds.study.iitm.ac.in` and `arav@ds.study.iitm.ac.in`. Verified against the running server and corrected at the checkpoint. `CLAUDE.md`'s seeded-accounts table carries the same wrong emails and is worth correcting.
- **The academic-status banner cannot render in the dev environment.** The `terms` table has zero rows, and `is_academic_status_stale()` returns `False` when no current term exists. No data was inserted — the destructive `seed.py` reset was deliberately not run.

  > **Corrected 2026-08-12, after executing 02-05.** This originally attributed the empty `terms` table to 02-05 being unexecuted, and said 02-05 "owns the terms seed". Both claims were wrong. `seed.py`'s `seed_reference_data()` already creates the `May 2026` term idempotently, and 02-05's `files_modified` does not include `seed.py` at all. The real cause is simply that `seed_reference_data()` has not been run against this dev database. 02-05 has since been executed and its actual scope was the unregistered blueprint, the broken audit write, Marshmallow validation and migration-safety tests — none of which touch seeding.

## Known Stubs

None. `localStorage['ekatva_view']` was the one write-without-a-reader and it was wired in deviation 2.

## Deferred Items (Phase 3 candidates)

- **`NAV.organiser` hardcoded event ids** (`Layout.tsx:31-33`: `ev-ekatva-hyd`, `ev-hyd-coffee`). These sit on the exact routes S1 uses to detect the Organiser view, so they were read carefully and deliberately left alone. They predate this phase, no Phase 2 requirement covers them, and replacing them is a behaviour change with its own design question.
- **`SessionProvider` is now a stateless passthrough.** Deleting it and its `App.tsx` usage is a one-line cleanup, held back to keep this plan's diff inside its declared files.
- **Backstop item 2's banner half is unverified.** Run `seed_reference_data()` against the dev database (idempotent, non-destructive), then re-check that the banner, switcher, nav and page title coexist at a 768px viewport height.
- **`CLAUDE.md` seeded-accounts table lists the wrong organiser and student emails.**

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DASH-01 is complete and ROADMAP criterion 4's four clauses each have their own proof.
- `viewFromPathname` is exported and ready for Phase 5's organiser workspace pages to reuse rather than restate the organiser route set.
- **Blocker for phase completion:** `02-05` remains unexecuted. It owns the `terms` seed, which is why the academic-status banner has no data path in dev.

---
*Phase: 02-identity-session-dashboard-shell*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 8 claimed files exist on disk; all 3 task commits resolve in git history.
