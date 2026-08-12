---
phase: 02-identity-session-dashboard-shell
plan: 06
subsystem: frontend-data-contract-and-session
tags: [camelcase-adapter, api-contract, session-expiry, router-state, single-flight, d-06, d-07, d-09]
status: complete

requires:
  - "02-02's vitest + jsdom runner (`npm test`) — the session-contract tests have no runner without it"
  - "The single-flight refresh already structurally correct in lib/api.ts (verified in the plan's prior_art)"
provides:
  - "adaptMe in frontend/src/lib/api.ts — the single adaptation point for /auth/me, matching adaptEvent"
  - "Capabilities and Account as camelCase domain types in frontend/src/lib/types.ts, re-exported from auth.tsx"
  - "api.me() typed Promise<Account> instead of any"
  - "Session expiry as router state { from, expired } — the ?expired=1 / ?from= query parameters are gone"
  - "One expiry toast and one redirect per failed refresh, fired from the shared failure path"
  - "frontend/src/lib/__tests__/session-contract.test.ts — 4 regression tests, both single-flight properties mutation-verified"
affects:
  - "02-07 (ViewSwitcher): reads capabilities.isOrganiser, not is_organiser"
  - "Phase 5 workspace pages: the published capability contract is now camelCase and typed"

tech-stack:
  added: []
  patterns:
    - "Symmetric adaptation — the wrapper is the only module that knows the wire format, in both request and response directions"
    - "Session-state signals travel as router state, never as a query parameter"
    - "Shared-failure-path callbacks: one signal per failed refresh, not one per rejected caller"

key-files:
  created:
    - frontend/src/lib/__tests__/session-contract.test.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/types.ts
    - frontend/src/lib/auth.tsx
    - frontend/src/lib/queries.ts
    - frontend/src/lib/session.tsx
    - frontend/src/components/ViewSwitcher.tsx
    - frontend/src/components/AcademicStatusBanner.tsx
    - frontend/src/components/AcademicStatusDialog.tsx
    - frontend/src/pages/Login.tsx
    - frontend/src/pages/Orgs.tsx

decisions:
  - "The expiry callback moved out of request()'s per-caller catch and into _doRefresh's shared catch — that relocation, not a debounce, is what makes ten queued rejections produce one toast"
  - "Account and Capabilities live in types.ts and are re-exported from auth.tsx, so no import site churned"
  - "assignPor's user_id / por_type request payload left in snake_case — out of this plan's scope, deferred with the /pors adapter"
  - "The Login notice strip dropped its warning-triangle icon: 02-UI-SPEC S3 specifies a plain strip and its class list carries no flex or gap"

metrics:
  duration: 25min
  completed: 2026-08-12
  tasks: 3
  files: 11

actuals:
  tokens: 5500
  tasks: 3
  commits: 3
---

# Phase 02 Plan 06: Frontend Data Contract and Session-Expiry Surface Summary

`/auth/me` is now adapted exactly once, in `lib/api.ts`, into typed camelCase domain models, and session expiry travels as router state that fires one toast however many requests were queued behind the failed refresh.

## What Was Built

**Task 1 — one adapter, camelCase types, every consumer updated** (commit `22fe45f`)

`adaptMe(u: ApiMe): Account` sits next to `adaptEvent` in `lib/api.ts` and is applied inside `api.me()`, whose signature changed from `request<any>` to `Promise<Account>`. The `any` is the structural half of the fix: it is what let `is_organiser` reach three components without the type checker noticing.

`Capabilities` (`isOrganiser`, `manageableOrgIds`, `manageableActivityIds`), `PorSummary` (`porType`, `org`) and `Account` (`academicStatusStale`, `academicLevel`, `academicStatus`, `pors`, `capabilities`) moved out of `auth.tsx` into `types.ts` alongside the other domain types, and are re-exported from `auth.tsx` with `export type { Account, Capabilities }`. Not one import site changed — import churn was not what this plan was for.

The three direct snake_case reads (`ViewSwitcher.tsx:20`, `session.tsx:14`, `AcademicStatusBanner.tsx:22`) became property renames of one word each. `ViewSwitcher`'s placement, segments and behaviour are untouched — those belong to 02-07.

The request direction is now symmetric: `confirmAcademicStatus` and `adminOverrideAcademicStatus` take `academicLevel` / `academicStatus` and build the snake_case body internally, so the two mutations in `queries.ts` and their call sites in `AcademicStatusDialog.tsx` and `Orgs.tsx` all pass camelCase.

`adaptMe` defaults every optional field (`?? false`, `?? []`, `?? undefined`) rather than trusting the wire shape. A missing `capabilities` object yielding `undefined.isOrganiser` at render time is exactly the class of failure a typed adapter is supposed to absorb.

**Task 2 — router state, not a query parameter** (commit `a823150`)

`lib/auth.tsx` now calls `navigate('/login', { replace: true, state: { from: location.pathname, expired: true } })`. The query-string construction is gone. `Login.tsx` reads `location.state` instead of `URLSearchParams`, and a successful login goes to `state.from` when present, otherwise `homeFor(role)` — applied to both the form submit and the demo-account quick login, via one `goHome` helper so the two paths cannot drift.

The notice strip carries S3's locked copy verbatim — **Your session expired. Sign in to continue.** — in `rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-[14px] text-amber-300`.

The toast fix is the substantive part. `_onSessionExpired?.()` was being called from `request()`'s catch, which runs **once per rejected caller** — ten queued 401s produced ten toasts and ten redirects. It moved into `_doRefresh`'s own catch, the shared failure path, where it fires once per failed refresh regardless of how many callers are waiting on that promise. The same catch now also clears `_accessToken`. `request()`'s catch was reduced to re-throwing the original 401, which is all it ever needed to do.

`AuthProvider` sits inside `ToastProvider` in `main.tsx`, so `useToast()` works there and `lib/api.ts` stays a non-React module driven through the registered callback.

**Task 3 — four session-contract tests** (commit `18bcfc4`)

`frontend/src/lib/__tests__/session-contract.test.ts` drives `lib/api.ts` through its public exports only; `_refreshPromise` stays unexported. `globalThis.fetch` is replaced in `beforeEach` and restored in `afterEach`, and refresh calls are counted by filtering the mock's own recorded arguments rather than by a parallel counter that could drift from reality.

| Test | Property |
|------|----------|
| many concurrent 401s produce exactly one refresh call | ROADMAP criterion 2 — five callers started before any is awaited, one `/auth/refresh` fetch, all five resolve |
| a failed refresh rejects every queued caller and fires the expiry callback once | D-06/D-07 — five rejections, one expiry signal |
| a failed refresh does not leave a poisoned promise | The second cycle must refresh again and succeed, proving the `finally` clear |
| the legacy ekatva_token key is never written | D-09 — after a login and a refresh, `localStorage.length` is 0 |

The concurrency test starts all five callers into an array and then `Promise.all`s it — awaiting the first would serialise them and pass against a wrapper with no single-flight at all. The refresh handler carries a 5ms delay so the other callers genuinely arrive while the refresh is in flight. `document.cookie` provides `csrf_refresh_token`, which the wrapper reads for the CSRF header on the refresh POST.

## Mutation Verification

Both single-flight properties were verified red against a deliberately broken `_doRefresh`, then restored (`git diff --stat` empty in both cases, confirming byte-identical restoration):

| Mutation | Result |
|----------|--------|
| `if (!_refreshPromise)` → `if (true)` — a new promise on every call | 2 tests FAILED: `expected 5 to be 1` on the refresh count, and `expected "spy" to be called 1 times, but got 5 times` on the expiry callback. Reverted. |
| `_refreshPromise = null` moved from `finally` into the success path | 1 test FAILED, exactly the poisoned-promise one: the second cycle inherited the cached rejection and threw `Token has expired` without ever retrying. Reverted. |

The second mutation failing *only* the poisoned-promise test is the useful signal — the test is specific to the property it claims to pin.

## Verification

| Gate | Result |
|------|--------|
| `cd frontend && npm run build` | exit 0, 400 modules transformed |
| `cd frontend && npm test` | 2 files, 6 tests, exit 0 |
| `grep -rnE "is_organiser\|manageable_org_ids\|manageable_activity_ids\|academic_status_stale" frontend/src` excluding `lib/api.ts` | no lines |
| `grep -c 'adaptMe' frontend/src/lib/api.ts` | 2 |
| `grep -c "me: () => request<any>" frontend/src/lib/api.ts` | 0 |
| `grep -rn "expired=1\|searchParams" Login.tsx auth.tsx` | no lines |
| `grep -c "Your session expired. Sign in to continue." frontend/src/pages/Login.tsx` | 1 |
| `git diff --stat frontend/package.json` over the whole plan | empty — zero new runtime dependencies |

## Deviations from Plan

**1. [Rule 3 - Blocking] `pages/Orgs.tsx` needed a two-key rename**

- **Found during:** Task 1, at the `npm run build` typecheck
- **Issue:** `useAdminOverrideAcademicStatus`'s variables became camelCase, and `Orgs.tsx:548-549` is its only call site. The build failed on it.
- **Fix:** Renamed the two object keys at the call site (`academic_level` → `academicLevel`, `academic_status` → `academicStatus`). Nothing else in that page was touched — its POR and academic *reads* come from a different admin endpoint whose adapter is out of this plan's scope, and it remains the sole `POR_LITERAL_ALLOWLIST` entry.
- **Files modified:** `frontend/src/pages/Orgs.tsx`
- **Commit:** `22fe45f`

**2. [Rule 2 - Missing critical] The expiry callback was firing per caller, not once**

- **Found during:** Task 2
- **Issue:** The plan anticipated this ("If the toast is currently fired per-caller anywhere, move it"). It was: `request()`'s catch called `_onSessionExpired?.()` for every rejected caller, so ten queued 401s meant ten toasts and ten `navigate` calls. The single-flight guard was only ever protecting the refresh *fetch*, not the failure signal.
- **Fix:** Moved the call into `_doRefresh`'s catch and added `_accessToken = null` there. Pinned by the second and third tests in Task 3.
- **Files modified:** `frontend/src/lib/api.ts`
- **Commit:** `a823150`

**3. [Scope] `assignPor`'s request payload left in snake_case**

`api.assignPor` still takes `{ user_id, por_type, term, region_id }`, and `useAssignPor` passes them through. The plan's action names only the two academic-status calls for the request-direction fix, and camelCasing `assignPor` would have rippled into `Orgs.tsx`'s assignment form — the page the plan explicitly says to leave alone. Logged as a deferred item rather than fixed inline; it belongs with the `/pors` response adapter whenever that lands.

## Notes for Next Plan

- **The session-contract tests are additions beyond 02-VALIDATION.md's twenty mapped rows.** They are named descriptively, not by a `-k` selector, and the file header says so. If 02-VALIDATION.md is regenerated, these four want rows of their own.
- The `useCapabilities` hook in `queries.ts` (`select: (data) => data.capabilities`) now returns a typed `Capabilities` for free — no change was needed, but its consumers get the camelCase names.
- 02-07 owns `ViewSwitcher`'s placement, segments and `localStorage['ekatva_view']` persistence. This plan changed one property name on line 20 and nothing else.
- `frontend/tsconfig.tsbuildinfo` is still tracked and still dirties on every build. Left alone again, same as 02-02.

## Known Stubs

None.

## Threat Flags

None. The four threats this plan owed are addressed: T-02-28 (`?expired=1` as session-state input — the query parameter is gone), T-02-29 (poisoned single-flight promise — cleared in a `finally`, mutation-verified), T-02-01 (legacy `ekatva_token` — asserted never written), and T-02-07 (capabilities remain render-only; nothing in `adaptMe` or its consumers grants client-side authority).

## TDD Gate Compliance

Task 3 carried `tdd="true"`, but the behaviour under test was already implemented by Tasks 1-2 and by the pre-existing single-flight guard, so a literal RED-first commit was not available — these are regression tests over standing behaviour. The plan substitutes mutation verification for the RED gate and requires it in the acceptance criteria; both mutations were run and both went red before the test file was committed, which is the same proof a failing-first test provides. The commit sequence is therefore `refactor` → `fix` → `test` rather than `test` → `feat`.

## Self-Check: PASSED

- `frontend/src/lib/__tests__/session-contract.test.ts` — FOUND
- `frontend/src/lib/api.ts` contains `adaptMe` — FOUND
- `frontend/src/lib/types.ts` contains `Capabilities` / `Account` — FOUND
- commit `22fe45f` — FOUND
- commit `a823150` — FOUND
- commit `18bcfc4` — FOUND
