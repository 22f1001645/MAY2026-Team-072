---
phase: 07-progression-gating
plan: 03
subsystem: frontend
tags: [progression, data-layer, adapter, tanstack-query, types]
status: complete

requires:
  - "GET /api/v1/orgs/<org_id>/progression (plan 07-02)"
  - "progression_service.progression_for (plan 07-02)"
  - "lib/api.ts request() + ApiError envelope parsing (Phase 2)"
provides:
  - "types.FestEligibility / types.OrgUnlock — the camelCase shapes plans 07-04 and 07-05 render"
  - "api.orgProgression(orgId, city?)"
  - "adaptFestEligibility — the single snake→camel adapter for progression state"
  - "useOrgProgression(orgId?, city?) — one hook, both Phase 7 read surfaces"
  - "['orgProgression'] invalidation inside useDecision"
affects:
  - "useDecision — every approval/rejection now also invalidates the progression cache family"

tech-stack:
  added: []
  patterns:
    - "One endpoint, two callers, two cache entries: `city ?? null` in the query key keeps the with-city and no-city reads from overwriting each other"
    - "The adapter defaults `unlocks` to `[]` so a consumer's visibility test can be a bare length check"
    - "Server-sourced `collaboratorThreshold` on the payload, so no component carries the literal 6"

key-files:
  created:
    - frontend/src/lib/__tests__/fest-eligibility-adapter.test.ts
  modified:
    - frontend/src/lib/types.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts

decisions:
  - "Shipped the hook as `useOrgProgression`, resolving the naming conflict the plan flagged — 07-UI-SPEC's `useFestEligibility` is the same hook and must not be created a second time"
  - "Added a two-case vitest file for the adapter: `npm run build` type-checks the shape but cannot assert that `unlocks` defaults to `[]` or that the no-city counts stay null, which are the two must_haves the consuming pages depend on"
  - "Reworded a doc comment that contained the literal `refetchInterval` — the plan's no-polling grep strips only `//` comments, so a JSDoc mention read as a third polling site"

metrics:
  duration: 12min
  completed: 2026-08-23
  tasks: 2
  files: 4

actuals:
  tokens: 2490
  tasks: 2
  commits: 2
---

# Phase 7 Plan 03: Progression Data Layer Summary

The three Phase 7 surfaces now share one typed, adapted, cached read of the progression endpoint: two exported types, one adapter, one fetch function, one hook, and one added invalidation — no page reshapes backend JSON.

## The `FestEligibility` shape (plans 07-04 and 07-05 read these names verbatim)

```ts
export interface FestEligibility {
  orgId: string
  city: string | null
  localMeetupsCompleted: number | null
  regionalMeetupsCompleted: number | null
  requirementsMet: number
  requirementsTotal: number
  festEligible: boolean
  collaboratorThreshold: number
  unlocks: OrgUnlock[]
}

export interface OrgUnlock {
  id: string
  orgId: string
  city: string
  unlockedAt: string   // ISO timestamp — the banner's city chips are built from it
}
```

`unlocks` is always an array. The wire type marks the key optional and the adapter defaults it, so a consumer's visibility test can be `unlocks.length > 0` with no guard in front of it.

The two `*MeetupsCompleted` counts stay `null` on a no-city call rather than collapsing to `0`. "The form has not been told which city yet" and "zero completed there" are different statements, and only the first should render as "Pick a city to check eligibility".

`collaboratorThreshold` is doc-commented as server-sourced. No TSX file in this phase should carry the number 6.

## Reconciliation against 07-02's actual response

**None needed.** 07-02's summary documents the nine top-level keys and `unlocks[].{id, org_id, city, unlocked_at}` exactly as this plan's Task 1 specified them, including the no-city behaviour (`city` null, both counts null, `requirements_met` 0, `fest_eligible` false, `collaborator_threshold` still served, `unlocks` populated across every unlocked city). `ApiFestEligibility` mirrors that shape one-for-one and `adaptFestEligibility` needed no fixups. If the shape ever moves, that function stays the single place to reconcile it — no page change is required.

## The hook

`useOrgProgression(orgId?, city?)` sits beside `useOrgProfile` and copies its convention: `enabled: !!orgId`, so no request is issued before an org is known.

Query key `['orgProgression', orgId, city ?? null]`. The `?? null` is what keeps `OrgProfile`'s banner query and `ProposalNew`'s lock query as distinct cache entries — collapsed into one key they would overwrite each other and the banner would flicker between an org-wide answer and a city-specific one.

`refetchOnWindowFocus: false`, no polling interval, no `staleTime` refresh. The key change is the only refetch trigger. Eligibility changes when an admin approves, and the invalidation below is what reports that — which is why polling for it would be the structural mistake the 05-09 gate exists to catch.

`useDecision`'s `onSuccess` gained `qc.invalidateQueries({ queryKey: ['orgProgression'] })` beside the existing `['proposals']` and `['events']`. The server writes the unlock row inside the approval's own transaction; without this line the fest card stays locked and the sponsorship banner stays absent until a manual reload — the two states PROG-01 and PROG-03 exist to make visible.

## Naming, resolved

Shipped as **`useOrgProgression`**, per the plan's instruction. 07-UI-SPEC.md §5.1's `useFestEligibility` names the same hook; plan 07-04 must import `useOrgProgression` from `../lib/queries` and must not create a second hook.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing verification] The plan's gates cannot check the adapter's two defaulting rules**

- **Found during:** Task 1
- **Issue:** Both must_haves that consumers actually depend on — `unlocks` arriving as `[]` rather than `undefined`, and the no-city counts staying `null` rather than `0` — are runtime behaviours of `adaptFestEligibility`. `npm run build` type-checks the declaration and the greps check that snake_case stayed in `lib/api.ts`; neither one would fail if the adapter dropped the `?? []`. The banner's bare length check would then throw at render.
- **Fix:** Added `frontend/src/lib/__tests__/fest-eligibility-adapter.test.ts`, two cases against the existing vitest setup (`npm test` = `vitest run`, already configured). No new dependency.
- **Files modified:** `frontend/src/lib/__tests__/fest-eligibility-adapter.test.ts` (created)
- **Commit:** 1f1e312

**2. [Rule 3 - Blocking] A doc comment tripped the no-polling acceptance check**

- **Found during:** Task 2
- **Issue:** The criterion is `grep -v '^\s*//' queries.ts | grep -c "refetchInterval"` unchanged from its pre-task value of 2. The hook's JSDoc explained the decision using the literal token `refetchInterval`, and the filter strips only `//` comments — a `/** */` block line is not stripped, so the count read 3 and the check failed on a comment rather than on behaviour.
- **Fix:** Reworded the comment to "no polling interval". The count is back to 2 and the explanation is unchanged in substance.
- **Files modified:** `frontend/src/lib/queries.ts`
- **Commit:** 8e7b05a

## Verification

| Check | Result |
|---|---|
| `cd frontend && npm run build` (`tsc -b && vite build`, after each task) | exit 0 |
| `npx vitest run` (full frontend suite) | 27 files, 183 tests passed |
| `npx vitest run src/lib/__tests__/fest-eligibility-adapter.test.ts` | 2 passed |
| `grep -n "adaptFestEligibility" frontend/src/lib/api.ts` | definition at :386, used inside `api.orgProgression` at :783 |
| `grep -rn "local_meetups_completed\|collaborator_threshold" frontend/src/pages/` | no match — snake_case never leaves `lib/api.ts` |
| `grep -n "orgProgression" frontend/src/lib/queries.ts` | query key :127, queryFn :128, invalidation :225 |
| `grep -v '^\s*//' queries.ts \| grep -c "refetchInterval"` | 2 — unchanged from pre-task |
| `git diff --stat frontend/package.json frontend/package-lock.json` | empty — zero new dependencies |

## Known Stubs

None. Every artifact this plan promised is live and typed; the two consuming pages are 07-04 and 07-05's work.

## Threat Flags

None beyond the plan's register. T-07-11 holds as dispositioned: nothing in this layer authorizes anything — `festEligible` is presentation input, and both enforcing 403s are raised server-side by plans 07-01 and 07-02. T-07-13 is closed by construction: `collaboratorThreshold` is read from the response, so the client cannot disagree with `FEST_COLLAB_THRESHOLD`. T-07-SC is not applicable — no install ran.

## Notes for later plans

- **07-04** imports `useOrgProgression` (not `useFestEligibility`) and renders the caption from `requirementsMet` / `requirementsTotal` with no client arithmetic. Treat `localMeetupsCompleted === null` as the "pick a city" state, not as zero. Fail the lock closed on a fetch error — this layer deliberately does not decide that for you.
- **07-05** reads `unlocks` from the same hook called with no city; it is always an array, so the banner's visibility is `unlocks.length > 0`.
- Neither page should add a `staleTime` or an interval to this query. An approval invalidates the family already.

## Self-Check: PASSED

- `frontend/src/lib/types.ts` — FOUND
- `frontend/src/lib/api.ts` — FOUND
- `frontend/src/lib/queries.ts` — FOUND
- `frontend/src/lib/__tests__/fest-eligibility-adapter.test.ts` — FOUND
- commit `1f1e312` (feat, task 1) — FOUND
- commit `8e7b05a` (feat, task 2) — FOUND
