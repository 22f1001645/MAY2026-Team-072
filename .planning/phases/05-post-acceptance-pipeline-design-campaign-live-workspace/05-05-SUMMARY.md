---
phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
plan: 05
subsystem: backend/authorization
tags: [TEAM-03, TEAM-04, AC-36, AC-37, AC-38, PROB-P4, rbac, recognition]
status: complete

requires:
  - 01-05 (rbac.can_manage_activity / can_manage_org and the frozen LEGACY_COARSE_ROUTES gate)
  - 01-02 (the activity_team_members table and its uq_team_meetup_head singleton)
  - 05-04 (backend/tests/test_activity_tasks.py and the task board this plan revokes access to)
provides:
  - "attendance_service.award_volunteer_points crew guard, error code not_crew_member (403)"
  - "backend/tests/test_activity_tasks.py: test_volunteer_points_non_crew, test_volunteer_points_crew, test_team_role_grants_no_org_permission, test_removed_member_loses_access"
  - "_seed_activity(with_crew=False) — an activity nobody is crew on"
affects:
  - "any future caller of POST /api/v1/events/<activity_id>/volunteer — the recipient must now be on the activity's crew roster"
  - "any future <org_id> route — the url_map walk covers it on the day it lands"

tech-stack:
  added: []
  patterns:
    - "An authorization check about the TARGET of an action lives in the service; the route decorator only ever authorises the caller"
    - "The guard precedes the first db.session.add, so a refusal writing nothing is true by construction rather than by rollback"
    - "A negative authorization test asserts the persisted rows after the 403, never the status code alone"
    - "Route-surface rules are asserted by walking app.url_map, so routes that do not exist yet are covered"

key-files:
  created: []
  modified:
    - backend/app/services/attendance_service.py
    - backend/tests/test_activity_tasks.py
    - backend/tests/test_recognition.py
    - backend/tests/test_org_service_and_dashboards.py

decisions:
  - "TEAM-04 landed in attendance_service, not on the route. organiser_required authorises the caller and cannot see the target user_id at all, and the route is one of the six frozen LEGACY_COARSE_ROUTES entries Phase 1 declined to retrofit — so the check has nowhere else to live. The docstring says so, to stop a later reader lifting it into a decorator."
  - "The crew lookup sits before the first db.session.add. A guard placed after it would answer 403 and still leave the ContributionPoint row, which a status-only assertion would score as a pass."
  - "AC-36's HTTP half is differential rather than a flat 403: GET /orgs/<org_id>/profile is deliberately any-authenticated-reader (04-04), so a flat assertion would have been false the day it was written. The test compares the crew user against a plain no-POR student on every <org_id> route and demands identical statuses, which is the claim TEAM-03 actually makes and needs no exemption list to stay true. Non-GET methods are additionally pinned at 403."
  - "The PROB-P4 test reassigns the activity to the Meetup Head first. _seed_activity makes the crew user the organiser, and organiser_id is an independent grant in can_manage_activity — without the reassignment the test would have passed while proving nothing about the crew row."
  - "Two pre-existing tests awarded volunteer points to a student who was not on the crew. They were fixed by putting that student on the roster, not by exempting them: the tests are about the points ledger, and the person receiving volunteer credit being on the crew is the rule this plan introduced."

metrics:
  duration: 40min
  completed: 2026-08-16
  tasks: 2
  commits: 2

actuals:
  tokens: 5600
  tasks: 2
  commits: 2
---

# Phase 5 Plan 05: Crew Authorization Boundaries Summary

Volunteer points can no longer be minted for an arbitrary user id, and crew membership is now provably confined to its own activity — including the day someone is removed from it.

## What Shipped

**Task 1 — TEAM-04, the live hole (AC-37, AC-38).**
`award_volunteer_points` had nothing at all between its 404 and its first `db.session.add`: the target `user_id` came straight off the request body and became a `ContributionPoint` row. The route's `organiser_required` decorator authorises the caller, not the target, so any holder of any organiser POR anywhere could credit points to anybody in the system.

The service now looks for an `ActivityTeamMember` row on `(activity_id, user_id)` and raises `ApiError(..., "not_crew_member", 403)` when there is none. The lookup runs before the first `db.session.add`, which is what makes "a refused award leaves no ledger row" a property of the code's shape rather than a promise about rollbacks — and the test asserts the row count, not just the status.

The route decorator is untouched. `("POST", "/api/v1/events/<activity_id>/volunteer")` is one of the six frozen `LEGACY_COARSE_ROUTES` entries, and `test_rbac_enforcement.py` still passes with the allowlist unchanged.

**Task 2 — TEAM-03 and PROB-P4, the proof (AC-36).**
`rbac.py` was already correct; what was missing was anything that would notice if it stopped being. `test_team_role_grants_no_org_permission` states the asymmetry twice: at the predicate level (`can_manage_activity` True, `can_manage_org` False for every seeded organisation), and over HTTP by walking `app.url_map` for every rule naming an `<org_id>` and issuing each of its non-HEAD/OPTIONS methods. A future org route is covered on the day it appears rather than the day someone remembers to add it here.

`test_removed_member_loses_access` runs the real request path: the crew member GETs the task board (200), the `ActivityTeamMember` row is deleted, and the same bearer token GETs again (403). Using the same token is the point — a capability cached in the JWT at login would pass step one and fail here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan fact wrong] AC-36's HTTP assertion is differential, not a flat 403**
- **Found during:** Task 2
- **Issue:** The plan said "Assert every response is 403" for every `<org_id>` route. That is false today: `GET /orgs/<org_id>/profile` carries only `@auth_required` and answers any authenticated reader by deliberate design from 04-04. A literal implementation would have shipped a test that fails on the current codebase.
- **Fix:** The walk compares the crew user against a plain student holding neither a POR nor a crew row, and asserts identical statuses on every route and method — which is precisely TEAM-03's claim that crew membership buys nothing org-wide, and stays true without a hand-maintained exemption list. Every non-GET method is additionally pinned at 403. The plan's own instruction anticipated this case ("if a future org route legitimately allows any authenticated user, this assertion is the right place to have that conversation"); the conversation is recorded in the test's docstring.
- **Files modified:** backend/tests/test_activity_tasks.py
- **Commit:** 847cb46

**2. [Rule 1 - Bug] The PROB-P4 fixture would have proved nothing**
- **Found during:** Task 2
- **Issue:** `_seed_activity` sets `organiser_id=crew.id`, and `can_manage_activity` grants on `organiser_id` independently of any crew row. Deleting the `ActivityTeamMember` row would have left access intact and the test green for the wrong reason — or rather, red, exposing that it was measuring the wrong grant.
- **Fix:** The test hands the activity to the Meetup Head before the deletion, so the crew row is the only grant under test. Commented in place.
- **Files modified:** backend/tests/test_activity_tasks.py
- **Commit:** 847cb46

**3. [Rule 3 - Blocking] Two pre-existing tests awarded points to a non-crew user**
- **Found during:** Task 1 (GREEN)
- **Issue:** `test_recognition.py::test_leaderboard_and_points` and `test_org_service_and_dashboards.py::test_award_volunteer_points_flow` both awarded volunteer points to `arav@ekatva.os`, who holds no crew row. Both went red on the new guard.
- **Fix:** Both now include that student in the activity's `team` payload, so `proposal_service` writes the roster row. The tests are about the points ledger; the recipient being on the crew is the new rule, not an obstacle to route around. While editing `test_recognition.py` a redundant function-local `from app.models import User` was removed — it shadowed the module-level import and made the name unbound earlier in the same function.
- **Files modified:** backend/tests/test_recognition.py, backend/tests/test_org_service_and_dashboards.py
- **Commit:** 55a5fde

### Structural note

Task 2 needed no implementation — `rbac.py` was already correct, as the plan states, so its tests were written and committed alongside Task 1's failing test in `847cb46` and passed on arrival. The plan's two tasks therefore landed in two commits (RED then GREEN) rather than one commit each.

## Verification

| Check | Result |
|-------|--------|
| `pytest tests/test_activity_tasks.py -k "volunteer_points_non_crew" -x -q` | exit 0 |
| `pytest tests/test_activity_tasks.py -k "volunteer_points_crew" -x -q` | exit 0 |
| `pytest tests/test_activity_tasks.py -k "team_role_grants_no_org_permission" -x -q` | exit 0 |
| `pytest tests/test_activity_tasks.py -k "removed_member_loses_access" -x -q` | exit 0 |
| `pytest tests/test_rbac_enforcement.py -x -q` | exit 0 — allowlist unchanged, no dead entries |
| `python -m pytest` (full backend suite) | 360 passed, exit 0 |
| `POST /events/<activity_id>/volunteer` still `@organiser_required` | unchanged |
| `LEGACY_COARSE_ROUTES` | unchanged |

RED was observed before GREEN: `test_volunteer_points_non_crew` failed with `assert 200 == 403` and a `{'action': 'volunteered', 'points': 20}` body, which is the hole itself printed in a test report.

## Known Stubs

None.

## TDD Gate Compliance

`test(05-05)` at 847cb46 (RED), `feat(05-05)` at 55a5fde (GREEN). No refactor gate was needed.

## Threat Flags

None. This plan added no route, no dependency and no new surface — it closed one.

## Self-Check: PASSED

All modified files present; commits 847cb46 and 55a5fde both in history; no files deleted by either commit.
