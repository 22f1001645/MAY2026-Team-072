---
phase: 07-progression-gating
fixed_at: 2026-08-23T18:07:00Z
review_path: .planning/phases/07-progression-gating/07-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 12
skipped: 0
status: all_fixed
---

# Phase 7: Code Review Fix Report

**Fixed at:** 2026-08-23
**Source review:** `.planning/phases/07-progression-gating/07-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (5 critical, 7 warning — `fix_scope: critical_warning`)
- Fixed: 12
- Skipped: 0

**Where verification ran:** fixes were applied and committed in an isolated git
worktree; the backend suite (`pytest tests/`) ran there against the main
checkout's `.venv` interpreter. The frontend gates (`npm run build`, which is
`tsc -b && vite build`, and `npx vitest run`) ran in the **main checkout** after
the fast-forward, because the worktree has no `node_modules`. Both results are
reproducible from the main checkout at `59722a5`.

| Gate | Where | Result |
|------|-------|--------|
| `pytest tests/` (backend, full) | worktree | pass, exit 0 |
| `npm run build` (tsc + vite) | main checkout | pass |
| `npx vitest run` | main checkout | 27 files, 183 tests pass |

## Fixed Issues

### CR-01: A cancelled meetup still counts toward fest eligibility

**Files modified:** `backend/app/repositories/repos.py`, `backend/tests/test_progression_gating.py`
**Commit:** `783ca07`
**Applied fix:** Added `Activity.status != EVENT_CANCELLED` to
`completed_meetups_by_scale` and imported the constant. Rewrote the docstring so
it says what it now means: `Activity.status` is not the completion *test* but is
a valid *dis*qualifier. Added `test_cancelled_meetups_do_not_count`, which
needed a new `activity_status` parameter on the `_seed_completed_meetup` helper
(default unchanged, so no existing test moved).

### CR-02: The completion test compares UTC-stored timestamps against local time

**Files modified:** `backend/app/repositories/repos.py`, `backend/tests/test_progression_gating.py`
**Commit:** `84788b6`
**Applied fix:** Both `completed_meetups_by_scale` and `sync_past_events` now
compare against naive UTC. **Adapted from the review's suggestion:** the review
proposed `datetime.utcnow()`, but that is deprecated on this project's Python
(the suite emits `DeprecationWarning` for it from three other call sites), so I
used `datetime.now(UTC).replace(tzinfo=None)` — identical semantics, no
deprecation, and consistent with the aware `datetime.now(UTC)` used in
`models/__init__.py`. Added `test_completion_boundary_is_utc_not_local`, which
seeds at `utcnow() + 3h` and asserts it does not count.

### CR-03: The month quota has no upper bound, so it blocks unrelated months

**Files modified:** `backend/app/repositories/repos.py`, `backend/tests/test_proposal_flow.py`
**Commit:** `3e1d698`
**Applied fix:** Extracted a module-level `_month_window(ref)` returning
`[first of month, first of next month)` and used it in both
`meetups_in_region_month` and `approved_meetups_in_region_month`. A shared helper
rather than the review's inlined pair, because the same two-line window was about
to be duplicated three times in one file. Pinned with
`test_quota_guardrail_does_not_block_an_earlier_month` (September meetup exists,
August proposal must still be accepted).

### CR-04: The proposal form silently submits for a different organisation and city

**Files modified:** `frontend/src/pages/ProposalNew.tsx`
**Commit:** `960080c`
**Applied fix:** `isStep1Valid` now requires `form.org_id` and `form.city` to be
chosen rather than merely available; `submit()` sends the chosen values with no
`manageableHouses[0]` / `cities[0]` fallback. `effectiveOrgId` / `effectiveCity`
were changed to the raw form fields in the same commit — their whole purpose was
to mirror the fallbacks, so leaving them would have re-introduced the mismatch
the review describes, in the fest lock caption. The single-house auto-select
effect is untouched, so the common path is unchanged.

### CR-05: The unlocked fest path is unreachable from fresh seed data

**Files modified:** `backend/seed.py`
**Commit:** `59722a5`
**Applied fix:** Re-attributed both halves of the qualifying pair (Hyderabad
Coffee & Code, and the Winter Edition regional meetup) from `orgs["hyd_region"]`
to `orgs["neelgiri"]` — Nilgiri House, the house-type org where the seeded
organiser's POR actually lives and the only kind the proposal form offers. Also
seeded the `OrgProgressionUnlock` row for that org+city so the sponsorship banner
renders. `orgs["neelgiri"]` already existed in the seed dict and was previously
unused.

Verified by running `seed.py` inside the worktree (against the worktree's own
`instance/ekatva.db`, never the user's dev database) and querying the service
directly:

```
org type: house
eligibility: {'local_meetups_completed': 1, 'regional_meetups_completed': 1,
              'requirements_met': 2, 'requirements_total': 2,
              'fest_eligible': True, 'collaborator_threshold': 6}
unlocks: [(True, 'Hyderabad')]
```

The upcoming demo fest itself was left on `hyd_region`: it is not part of the
eligibility pair, and moving it would have shifted registration and analytics
attribution for reasons the finding does not call for.

### WR-01: The fest collaborator threshold is hardcoded as "6" in the error copy

**Files modified:** `frontend/src/pages/ProposalNew.tsx`
**Commit:** `ae815cb`
**Applied fix:** Heading is now `'Not enough collaborating organisations'`, with
a comment saying why it carries no numeral. The server's message already states
the shortfall numerically.

### WR-02: Every decision failure is labelled "Not approvable yet"

**Files modified:** `frontend/src/pages/ApprovalQueue.tsx`
**Commit:** `e7d5fed`
**Applied fix:** Added a `DECISION_HEADINGS` map plus a `decisionHeading(code)`
lookup, mirroring `ProposalNew`'s `ERROR_HEADINGS` idiom, and keyed the
`ErrorStrip` on `(decisionMut.error as ApiError).code`. Added `proposal_not_found`
to the review's suggested map (it is reachable from the same mutation) and a
generic fallback of "Couldn't record that decision".

### WR-03: `record_unlock` get-or-create can 500 and discard the approval it recorded

**Files modified:** `backend/app/services/progression_service.py`
**Commit:** `56c89ec`
**Applied fix:** Took the portable option from the review — the insert runs
inside `db.session.begin_nested()` (a SAVEPOINT), and an `IntegrityError` there
rolls back only the marker and re-reads the row the winner wrote, leaving
`decide()`'s approval intact. Chose the savepoint over `ON CONFLICT DO NOTHING`
because dev runs on SQLite and prod on Postgres; the savepoint is correct on both.

### WR-04: A revoked qualifying meetup leaves the unlock marker (and banner) standing

**Files modified:** `backend/app/services/progression_service.py`, `backend/app/services/proposal_service.py`, `backend/tests/test_progression_gating.py`
**Commit:** `059a9f8`
**Applied fix:** Took the first of the review's two options (delete the marker),
because it is the one that keeps the two surfaces agreeing rather than explaining
why they disagree. Added `clear_unlock_if_ineligible(org_id, city)` beside
`record_unlock`, called from `decide()`'s `revoke` branch after a `flush()` (same
reason as WR-06). Pinned with
`test_unlock_row_cleared_when_revoke_breaks_the_pair`: approve → 1 unlock →
revoke the regional → 0 unlocks.

### WR-05: `decide()` hardcodes the quota constant it imports elsewhere

**Files modified:** `backend/app/services/proposal_service.py`
**Commit:** `6db06a1`
**Applied fix:** Replaced the literal `1` with `MEETUPS_PER_REGION_PER_MONTH`.
Per the review's note about the back-compat alias, the import and the submit-side
check at line 107 were both switched from `MEETUPS_PER_CITY_PER_MONTH` to the
canonical name, so the file no longer references the alias at all.

### WR-06: The unlock write depends on implicit autoflush ordering

**Files modified:** `backend/app/services/proposal_service.py`
**Commit:** `743646b`
**Applied fix:** Explicit `db.session.flush()` immediately before the eligibility
recompute in the approve branch, with a comment naming what breaks without it.

### WR-07: snake_case leaks into the camelCase domain types and into a page

**Files modified:** `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/pages/ApprovalQueue.tsx`, `frontend/src/pages/EventDetail.tsx`, `frontend/src/pages/ManageEvent.tsx`, `frontend/src/pages/KanbanWorkspace.tsx`
**Commit:** `1c3ab9f`
**Applied fix:** Camelised `Collaborator` and `TeamMember` in `types.ts` and moved
the snake→camel step into `adaptEvent` (which was previously passing both arrays
straight through, one of them via an `as` cast that hid the mismatch). Updated
every read site: the three in `ApprovalQueue` the review names, seven in
`EventDetail`, one in `ManageEvent` (the `m.userId || m.user_id` belt-and-braces
check collapses to one branch now), and one in `KanbanWorkspace`. Verified by
grep that the only remaining snake_case for these fields is the `ApiActivity`
wire interface in `api.ts`, which is where the review says it belongs. Many read
sites are `(c: any)`-typed and so invisible to `tsc`, which is why this was
checked by exhaustive grep rather than trusting the build.

## Skipped Issues

None.

## Notes for the human

Three things worth a look, none of them blocking:

1. **A stray git worktree exists at `<repo>/$wt`**, registered on branch
   `gsd-reviewfix/07-$$` (literal `$$` — an unexpanded shell variable from some
   earlier run, not this one). It is a clean checkout of `01db3f1` with no unique
   commits and no uncommitted changes, and it shows as `?? $wt/` in
   `git status`. I did **not** remove it: it is not mine, and the possibility of
   a concurrent run holding it outweighs the tidiness. To clear it:
   `git worktree remove '$wt' --force && git branch -D 'gsd-reviewfix/07-$$'`.

2. **WR-03 has no test.** The savepoint only matters under genuine concurrency,
   which the in-memory SQLite test setup cannot produce. Adding a test that
   exercises the happy path only would have implied coverage that does not exist.

3. **Info findings were out of scope** (`fix_scope: critical_warning`), so
   IN-01 through IN-07 are untouched. Two are adjacent to what was fixed and may
   be worth folding in next: **IN-05** (`meetups_in_city_month` is dead code that
   still carries CR-03's missing upper bound — a future caller would inherit the
   bug; the new `_month_window` helper makes fixing it a one-line change), and
   **IN-06** (its two suggested tests are now both present, added under CR-01 and
   CR-02, so IN-06 can likely be closed as-is).

---

_Fixed: 2026-08-23_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
