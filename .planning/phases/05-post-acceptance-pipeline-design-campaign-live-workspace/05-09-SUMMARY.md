---
phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
plan: 09
subsystem: ui
tags: [react, typescript, vitest, testing-library, tanstack-query, kanban, structural-gate]

requires:
  - phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
    provides: "05-04 task CRUD routes under /api/v1/activities/<id>/tasks, guarded by assert_campaign_live on the read as well as the three writes"
  - phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
    provides: "05-08 useCampaign / adaptCampaign, the CAMPAIGN_LIVE constant, and usePushLive already invalidating ['tasks', activityId]"
  - phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
    provides: "05-02/05-03 campaign_state, the payload this plan extends with task_statuses"
provides:
  - "task_statuses on the campaign payload — the board's three columns and their headings, sourced from constants.TASK_STATUSES"
  - "KanbanBoard — three server-declared columns, a per-card status Select, an inline add-task row"
  - "KanbanWorkspace at /events/:id/workspace, with the campaign_not_live 403 rendered as an explanation rather than a failure"
  - "api.tasks / createTask / updateTask / deleteTask and the useTasks / useCreateTask / useUpdateTask / useDeleteTask hooks"
  - "no-kanban-polling.test.ts — AC-35 enforced structurally, with a positive control"
affects: [05-10, 05-11, phase 6 post-event report]

actuals:
  tokens: 31000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Column identity comes off the wire: the board renders one column per server-declared status and keys its styling on POSITION in that list, never on the status value"
    - "An expected server refusal gets its own branch: 403 campaign_not_live renders an explanation with a route out of it, and only genuine failures reach ErrorState"
    - "A promise made in prose is kept by a source-scanning test with a positive control, so the matcher cannot decay into one that matches nothing"

key-files:
  created:
    - frontend/src/components/KanbanBoard.tsx
    - frontend/src/components/__tests__/KanbanBoard.test.tsx
    - frontend/src/pages/KanbanWorkspace.tsx
    - frontend/src/pages/__tests__/KanbanWorkspace.test.tsx
    - frontend/src/__tests__/no-kanban-polling.test.ts
  modified:
    - backend/app/constants.py
    - backend/app/services/campaign_service.py
    - backend/tests/test_campaign_package.py
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts
    - frontend/src/lib/types.ts
    - frontend/src/pages/ManageEvent.tsx
    - frontend/src/App.tsx

key-decisions:
  - "The board's columns travel on the campaign payload as task_statuses rather than being written down in the client: TaskSchema validates an incoming status against the same tuple, so a browser-side column list could offer an option the server answers 422 to. The label ships alongside the value because 'To Do' cannot be derived from 'todo' by any rule the client could apply"
  - "Per-column styling is keyed on the INDEX into the server's declared order, not on the status value — keying it on the value would have reintroduced the three status strings in the one file the whole design is trying to keep them out of"
  - "The 403 campaign_not_live gets its own page branch and is never toasted: TEAM-01's whole point is that the board is inert before publication, so reporting that as a failure would tell the organiser something untrue about their own workflow"
  - "The page fails only when the task query errored AND no data ever arrived; a failed refetch with the last good board still on screen keeps the board and offers the column-header retry instead of replacing it — which is what makes the board's isError/onRetry props reachable rather than dead"
  - "The column landmark is a named <section> wrapping the Card, because Card accepts only children, className, hover and onClick and cannot carry an accessible name"
  - "ManageEvent's 'Tasks complete' tile was removed rather than repointed at the real board: the board is inert until the campaign is live, so the tile would have read 0 of 0 on every unpublished event"

patterns-established:
  - "A structural gate scans a NAMED file list rather than all of src/ — a repo-wide scan fails on an unrelated carousel and teaches people to weaken it"
  - "A source-scan gate carries a companion test proving every scanned path still exists, so a rename cannot turn the gate into a no-op that passes for free"

requirements-completed: [TEAM-01, TEAM-02]

coverage:
  - id: D1
    description: "Three columns come from the server's status list and each card renders under its own status"
    requirement: TEAM-02
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/KanbanBoard.test.tsx#renders one column per server status and puts each card under its own"
        status: pass
      - kind: unit
        ref: "backend/tests/test_campaign_package.py#test_campaign_read_carries_the_task_board_columns"
        status: pass
    human_judgment: false
  - id: D2
    description: "An empty column is a correct column: compact caption, zero/one/many counts, columns render independently"
    requirement: TEAM-02
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/KanbanBoard.test.tsx#shows the compact caption in a column with no tasks"
        status: pass
      - kind: unit
        ref: "frontend/src/components/__tests__/KanbanBoard.test.tsx#counts one task in the singular and several in the plural"
        status: pass
    human_judgment: false
  - id: D3
    description: "A card's status control patches the status alone, bounding last-write-wins to one field"
    requirement: TEAM-02
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/KanbanBoard.test.tsx#sends the status alone when the status control changes"
        status: pass
    human_judgment: false
  - id: D4
    description: "New tasks are created from the inline add row, and Cancel creates nothing"
    requirement: TEAM-02
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/KanbanBoard.test.tsx#creates a task from the inline add row with title, assignee and deadline"
        status: pass
      - kind: unit
        ref: "frontend/src/components/__tests__/KanbanBoard.test.tsx#creates nothing when the add-task form is cancelled"
        status: pass
    human_judgment: false
  - id: D5
    description: "Opening the workspace before the campaign is live shows an explanatory state with a route into the campaign builder, not a crash and not an empty board"
    requirement: TEAM-01
    verification:
      - kind: unit
        ref: "frontend/src/pages/__tests__/KanbanWorkspace.test.tsx#explains the push-live prerequisite when the board is not open yet"
        status: pass
      - kind: unit
        ref: "frontend/src/pages/__tests__/KanbanWorkspace.test.tsx#fails loudly for any other task-query error"
        status: pass
    human_judgment: false
  - id: D6
    description: "The board is fetched on page load only — no polling interval, no timer, no socket"
    requirement: TEAM-02
    verification:
      - kind: unit
        ref: "frontend/src/__tests__/no-kanban-polling.test.ts#no refetch interval, timer or socket appears in the board or its hooks"
        status: pass
      - kind: unit
        ref: "frontend/src/__tests__/no-kanban-polling.test.ts#detects a known-bad fixture, so the scan cannot silently match nothing"
        status: pass
      - kind: manual
        ref: "negative control: refetchInterval injected into useTasks, caught at queries.ts:495, then reverted"
        status: pass
    human_judgment: false
  - id: D7
    description: "A long task title clamps to two lines and exposes its full text through a native tooltip"
    requirement: TEAM-02
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/KanbanBoard.test.tsx#exposes a long title in full through a native tooltip"
        status: pass
    human_judgment: false
  - id: D8
    description: "While tasks are loading, each column shows two pulsing skeleton placeholders in place of cards"
    requirement: TEAM-02
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/KanbanBoard.test.tsx#shows two skeleton placeholders per column and no card while loading"
        status: pass
    human_judgment: false
  - id: D9
    description: "A task survives a hard reload and is visible to another crew member on another device"
    requirement: TEAM-02
    verification: []
    human_judgment: true
    rationale: "Cross-device persistence cannot be observed in jsdom — it needs two browser profiles against a running server, and 05-VALIDATION.md already lists it as manual-only"

duration: 45min
completed: 2026-08-18
status: complete
---

# Phase 5 Plan 09: Kanban Live Workspace Summary

**The team task board is now real: three server-declared columns backed by persisted rows, activated by publication, and structurally forbidden from ever polling.**

## Performance

- **Duration:** 45 min
- **Tasks:** 3 of 3
- **Files modified:** 13 (5 created, 8 modified)

## Accomplishments

- The mock task array that `ActivityTask`'s own docstring names — "the client-side mock array in `frontend/src/lib/mock.ts`, which was never persisted" — no longer backs any surface. `ManageEvent` stopped importing it; nothing else ever did.
- `KanbanBoard` renders one column per entry in the campaign payload's new `task_statuses`, so the browser holds no copy of the three status strings that `TaskSchema` validates against. Even the per-column styling is keyed on position in that list rather than on the value, because keying it on the value would have smuggled the strings back into the one file the design keeps them out of.
- A card's status changes from a `Select` on the card itself (D-09 — no drag-and-drop, no new dependency), and the patch carries the status alone, which bounds the sanctioned last-write-wins resolution to one field (T-05-47).
- `KanbanWorkspace` at `/events/:id/workspace` treats the server's 403 `campaign_not_live` as what it is: an expected state in this workflow. It renders an explanation naming the push-live prerequisite plus a route into the campaign builder, and never toasts it. Every other error still fails loudly.
- AC-35's no-polling promise moved out of prose. `no-kanban-polling.test.ts` scans the board, its page and the query hooks for a refetch interval, an interval timer and a socket constructor, and carries a positive control so the matcher cannot decay into one that matches nothing.

## Task Commits

1. **Task 1: KanbanBoard** — `0fc4c3a` (test, RED) → `0c830cc` (feat, GREEN)
2. **Task 2: KanbanWorkspace, its route, and retiring the mock array** — `b1847af`
3. **Task 3: the AC-35 structural gate** — `ad002e1`

## Files Created/Modified

- `frontend/src/components/KanbanBoard.tsx` — the three columns, the card, the status control, the add-task row
- `frontend/src/components/__tests__/KanbanBoard.test.tsx` — the eight board behaviours
- `frontend/src/pages/KanbanWorkspace.tsx` — the page, its header, and the `campaign_not_live` branch
- `frontend/src/pages/__tests__/KanbanWorkspace.test.tsx` — the not-live explanation, the genuine-error path, the live board
- `frontend/src/__tests__/no-kanban-polling.test.ts` — the AC-35 gate, its dead-path check and its positive control
- `backend/app/constants.py` — `TASK_STATUS_LABELS` beside `TASK_STATUSES`
- `backend/app/services/campaign_service.py` — `task_statuses` on `campaign_state`
- `backend/tests/test_campaign_package.py` — asserts the payload's column list against the constants
- `frontend/src/lib/types.ts` — `ApiTask`, `ApiTaskStatus`, `taskStatuses` on `ApiCampaignState`
- `frontend/src/lib/api.ts` — `adaptTask`, the four task wrappers, and the date-widening helper
- `frontend/src/lib/queries.ts` — the four task hooks, none of them carrying a refetch option
- `frontend/src/pages/ManageEvent.tsx` — mock import gone, task tab now links to the workspace
- `frontend/src/App.tsx` — the `/events/:id/workspace` route

## Decisions Made

- **The columns travel on the wire.** `TaskSchema` validates a status against `constants.TASK_STATUSES`, so a column list assembled in the browser could offer an option the server answers 422 to. The label ships alongside the value because `"To Do"` cannot be derived from `"todo"` by any rule the client could apply — title-casing gives `"Todo"`.
- **Column chrome is keyed on index, not value.** In Progress is teal and Done is muted because they are the second and third entries the server declared, not because their values are `in_progress` and `done`. A fourth status would render with the last entry's chrome rather than crash, which is the better failure mode.
- **The 403 is an explanation, never a toast.** Reporting an expected pre-publication state as a failure tells the organiser something untrue about their own workflow. The branch names the prerequisite and links to the campaign builder.
- **The page fails only when nothing ever arrived.** `tasksQuery.isError && !tasksQuery.data` is the page-level failure; a failed *refetch* keeps the last good board and surfaces the column-header retry instead. This is what makes the board's `isError`/`onRetry` props reachable rather than decorative — with a flat `isError` check the page would always win and the retry control could never render.
- **The column landmark is a `<section>`, not the `Card`.** `Card` accepts only `children`, `className`, `hover` and `onClick`, so the accessible name UI-SPEC §7 asks for has nowhere to live on it. Same class of upstream correction as the plan's `Badge`-cannot-take-`onClick` note.
- **`ManageEvent`'s "Tasks complete" tile was deleted, not repointed.** The board is inert until publication, so a tile counting real tasks would read 0 of 0 on every unpublished event. The grid dropped to two columns; the task tab now carries the link.

## Deviations from Plan

**1. [Rule 2 — missing critical functionality] The board's status list had no server source**

- **Found during:** Task 1 (started by the previous executor, verified and kept)
- **Issue:** The plan requires the three columns to come from "the campaign or task payload rather than a client-side literal", but `campaign_state` carried no such key — `form_field_types` was the only precedent. Without it there was no way to satisfy the requirement except by writing the statuses into the client.
- **Fix:** Added `TASK_STATUS_LABELS` to `constants.py` beside `TASK_STATUSES`, and `task_statuses` to `campaign_state`, following the `form_field_types` precedent 05-07 set. Asserted against the constants in `test_campaign_package.py`.
- **Files modified:** `backend/app/constants.py`, `backend/app/services/campaign_service.py`, `backend/tests/test_campaign_package.py`
- **Verification:** `test_campaign_read_carries_the_task_board_columns`, plus the full backend suite.
- **Committed in:** `0c830cc`

**2. [Rule 2 — missing critical functionality] Task 2's must-have truth had no test**

- **Found during:** Task 2
- **Issue:** The plan lists "Opening the workspace before the campaign is live shows an explanatory state, not a crash and not an empty board" as an explicit must-have truth, but Task 2's file list contains no spec file, so the branch would have shipped with `npm run build` as its only check — and both branches render "a page that is not a board", which a build cannot tell apart.
- **Fix:** Added `frontend/src/pages/__tests__/KanbanWorkspace.test.tsx` with three cases: the not-live explanation and its link target, the genuine-error path, and the live board with its server-declared columns.
- **Files modified:** `frontend/src/pages/__tests__/KanbanWorkspace.test.tsx` (created)
- **Verification:** 3 passed; the first case fails if the `campaign_not_live` branch is removed.
- **Committed in:** `b1847af`

**3. [Rule 1 — bug] The spec's mock helpers were typed too loosely to compile**

- **Found during:** Task 1
- **Issue:** `props.onUpdate ?? vi.fn()` widens to a union of the prop type and `Mock`, so `onUpdate.mock.calls` failed `tsc -b` even though the test passed under vitest. A test that runs green and breaks the build is worse than either.
- **Fix:** The two asserted handlers are always fresh `vi.fn()`s applied after the prop spread, so they cannot be overridden and cannot widen.
- **Files modified:** `frontend/src/components/__tests__/KanbanBoard.test.tsx`
- **Verification:** `npm run build` exit 0.
- **Committed in:** `0c830cc`

---

**Total deviations:** 3 auto-fixed (2 × Rule 2, 1 × Rule 1)
**Impact on plan:** All three were required by the plan's own acceptance criteria or must-have truths. No scope creep; `frontend/src/lib/mock.ts` was left entirely alone as instructed.

## Issues Encountered

A previous execution of this plan stopped mid-task on an account spend limit, leaving five files uncommitted: the backend `task_statuses` work, the `ApiTask`/`ApiTaskStatus` types, and the `adaptTask` / `TASK_WIRE_KEYS` / `taskDeadlineToWire` helpers in `api.ts` with no callers yet. All of it was read against the plan spec before anything was built on top; it was correct and was kept and completed rather than redone. The `TASK_WIRE_KEYS` map was dangling — `tsconfig` has `noUnusedLocals: false`, so it would have shipped silently unused; `api.updateTask` now uses it.

## Verification

- `cd frontend && npx vitest run src/components/__tests__/KanbanBoard.test.tsx` — 8 passed
- `cd frontend && npx vitest run src/pages/__tests__/KanbanWorkspace.test.tsx` — 3 passed
- `cd frontend && npx vitest run src/__tests__/no-kanban-polling.test.ts` — 3 passed
- `cd frontend && npm run build` — exit 0
- `cd frontend && npm test` — 22 files, 155 tests passed
- `cd backend && pytest` — full suite passed, 93% coverage
- Negative control (plan Task 3 acceptance criterion): `refetchInterval: 5000` injected into `useTasks`, caught by the gate at `queries.ts:495` with the right token and reason, then reverted to a byte-identical file.

## Known Stubs

None. Every surface this plan added reads server data. `frontend/src/lib/mock.ts` still exports `TASKS`, deliberately — the plan scopes the residual mock cleanup to Phase 6 and widening this diff to chase it would have put unrelated surfaces in a Phase 5 commit. It now has zero consumers.

## Manual verification still owed

Create a task as crew member A, open the same board as crew member B in a different browser profile, and confirm the task, its assignee and its deadline appear after a hard reload. `05-VALIDATION.md` already lists this as manual-only; carried into the phase's UAT.

## Self-Check: PASSED

- `frontend/src/components/KanbanBoard.tsx` — FOUND
- `frontend/src/components/__tests__/KanbanBoard.test.tsx` — FOUND
- `frontend/src/pages/KanbanWorkspace.tsx` — FOUND
- `frontend/src/pages/__tests__/KanbanWorkspace.test.tsx` — FOUND
- `frontend/src/__tests__/no-kanban-polling.test.ts` — FOUND
- Commits `0fc4c3a`, `0c830cc`, `b1847af`, `ad002e1` — all FOUND in `git log`
