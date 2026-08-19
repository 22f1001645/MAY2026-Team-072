---
phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
plan: 04
subsystem: backend/team-workspace
tags: [TEAM-01, TEAM-02, AC-27, AC-28, AC-29, AC-30, AC-31, AC-32, AC-33, AC-34, kanban]
status: complete

requires:
  - 05-01 (campaign_service.assert_campaign_live)
  - 05-03 (push_live — the only way a campaign reaches the live state)
  - 01-05 (rbac.can_manage_activity_required)
  - 01-04 (the activity_tasks table and its ordered backref)
provides:
  - task_service.list_tasks / create_task / update_task / delete_task
  - "GET|POST /api/v1/activities/<activity_id>/tasks"
  - "PATCH|DELETE /api/v1/activities/<activity_id>/tasks/<task_id>"
  - schemas TaskSchema, TaskPatchSchema
  - backend/tests/test_activity_tasks.py (the file plan 05-05 extends)
affects:
  - 05-05 (crew roster and per-member workload extend this test file and these rows)
  - frontend Kanban board (replaces the unpersisted mock array in src/lib/mock.ts)

tech-stack:
  added: []
  patterns:
    - "The gate is one shared helper called from every service function, reads included — never an inline status comparison per route"
    - "Ordering is declared once on the model backref; the service adds no sort and the test guards that"
    - "A partial PATCH applies only non-None keys, so a one-field write cannot blank the rest"

key-files:
  created:
    - backend/app/services/task_service.py
    - backend/app/controllers/task_controller.py
    - backend/tests/test_activity_tasks.py
  modified:
    - backend/app/schemas/__init__.py
    - backend/app/controllers/__init__.py

decisions:
  - "assert_campaign_live guards the READ as well as the three writes — a workspace readable before publication is the disclosure T-05-21 names, and a gate on writes alone would have passed a status-code-only test."
  - "TaskPatchSchema subclasses TaskSchema and overrides only `title`, so the two schemas cannot drift about which statuses are legal."
  - "The equal-position tiebreak test creates task B before task A and asserts B first — inserted in the order a position-only sort would get wrong, so it proves the backref's three-element order_by tuple rather than any code this plan wrote."
  - "The invalid-status test asserts the persisted row after the 422, not just the status code: a response-only assertion would pass even if the bad value had been written and echoed back."
  - "No audit rows for task CRUD. AuditLog covers state-changing governance actions (approve, verify, publish); a Kanban card moving between columns is ordinary crew working state, and auditing it would bury the approval trail in noise."

metrics:
  duration: 30min
  completed: 2026-08-16
  tasks: 2
  commits: 5

actuals:
  tokens: 4300
  tasks: 2
  commits: 5
---

# Phase 5 Plan 04: Team Workspace Task Board Summary

The Kanban board is now server-persisted rows a second team member on a second device can see, and it stays closed until the Meetup Head has pushed the campaign live.

## What Shipped

**Task 1 — task CRUD (AC-28/29/30, AC-34).**
`TaskSchema` / `TaskPatchSchema` validate the write paths, taking the legal status set from `constants.TASK_STATUSES` rather than restating the three strings; an out-of-tuple value becomes a 422 through the central Marshmallow handler and never reaches a column. `task_service` holds the four functions, `task_controller` the four `can_manage_activity_required` routes, and `task_bp` is registered with both halves of the two-edit contract in `controllers/__init__.py`.

`update_task` writes only the keys whose loaded value is not `None`, so a PATCH carrying just a status leaves `deadline` and `assignee_id` alone (T-05-24). The cross-activity guard is a per-row `activity_id` identity check on top of the route guard, so addressing another activity's task through your own activity's URL is a 404 rather than a write (T-05-20).

**Task 2 — the publication gate and the ordering proof (AC-27/AC-31/AC-32/AC-33).**
`campaign_service.assert_campaign_live` is the first statement of all four service functions. The status comparison is not restated here: the helper was written in plan 05-01 precisely so a route added in Phase 6 cannot forget it, and 403/`campaign_not_live` comes from the helper's own `ApiError`.

The gate test covers both the absent-campaign case and the draft case. Testing only the absent case would have let a half-built draft campaign open the workspace, which is the failure mode T-05-21 describes.

## Deviations from Plan

None on behaviour. One wording fix: the `task_service` module docstring originally quoted the very sort call the module is required not to contain, which made a plain text search for it report a false positive against the plan's own success criterion. Reworded in a separate commit; no code change.

## Verification

| Check | Result |
|-------|--------|
| `pytest tests/test_activity_tasks.py -k "crud"` | pass |
| `pytest tests/test_activity_tasks.py -k "invalid_status_422"` | pass |
| `pytest tests/test_activity_tasks.py -k "not_live"` | pass |
| `pytest tests/test_activity_tasks.py -k "ordering"` | pass |
| `pytest tests/test_rbac_enforcement.py tests/test_blueprint_registration.py` | pass |
| `cd backend && python -m pytest -q` | exit 0, `task_service.py` at 100% statement coverage |
| `grep -c "order_by(" app/services/task_service.py` | 0 |
| modules calling `assert_campaign_live` | exactly one (`task_service.py`) |

## Known Stubs

None.

## Threat Flags

None — this plan adds no security surface beyond the four routes already in the plan's threat register, and each carries the mitigation named there.

## Self-Check: PASSED

- `backend/app/services/task_service.py` — FOUND
- `backend/app/controllers/task_controller.py` — FOUND
- `backend/tests/test_activity_tasks.py` — FOUND
- Commits `578f930`, `453b99e`, `ce735d9`, `1384e8f`, `46076bc` — all FOUND in `git log`
