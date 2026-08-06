---
phase: 01-migration-authorization-foundation
plan: 05
subsystem: authorization
tags: [rbac, authorization, predicates, decorators, route-guard, pytest, mutation-testing]

requires:
  - "01-02 — ActivityTeamMember (with the uq_team_meetup_head partial unique index) and ActivityCollaborator, plus TEAM_ROLE_MEETUP_HEAD and COLLAB_ACCEPTED"
  - "01-03 — REGISTRATION_CANCELLED, the status value can_participate_in_activity reads"
  - "01-04 — a live migrated database; these predicates read tables that physically exist"
provides:
  - "can_manage_activity(user, activity) -> bool"
  - "can_participate_in_activity(user, activity) -> bool"
  - "can_manage_org(user, org) -> bool"
  - "is_meetup_head(user, activity) -> bool"
  - "activity_scoped(predicate, param='activity_id') and org_scoped(predicate, param='org_id') decorator factories"
  - "can_manage_activity_required, can_participate_in_activity_required, meetup_head_required, can_manage_org_required — the four ready-made route guards"
  - "_rbac_guards — a tuple marker every guard decorator leaves on its view function, readable from app.view_functions[endpoint]"
  - "ORG_MANAGER_PORS — the six-POR set read by can_manage_org, a strict subset of ORGANISER_PORS"
  - "_active_pors(user), _por_org_ids(por), _activity_org_ids(activity) — shared traversal helpers"
  - "backend/tests/test_rbac_predicates.py (13 tests), backend/tests/test_rbac_enforcement.py (3 tests)"
  - "conftest fixtures crew_headers, meetup_head_headers, second_org + lookup helpers admin_user/rc_user/student_user/crew_user/meetup_head_user/region_org/other_org"
affects:
  - "Phases 2-8 — every activity- or org-scoped endpoint they add imports one of the four ready-made guards; test_rbac_enforcement fails the build if one does not"
  - "Phase 2 (AUTH-03) — must add `Society Deputy Secretary` and `Coordinator` to ORG_MANAGER_PORS at the same time as ORGANISER_PORS; the instruction is recorded inline in constants.py"
  - "Phase 3 (PROPOSAL-05/06), Phase 4 (ORG-01), Phase 5 (CAMPAIGN-06, TEAM-02/03), Phase 6 (REIMB-01, QR-01), Phase 7 (FEEDBACK-01)"

actuals:
  tokens: 8150     # chars/4 over the realized 32,605-char backend diff (estimate was 54,000)
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Authorization predicates are total functions — a bool for every input, including None — so a permission question can never become a 500 a caller might handle permissively"
    - "Resource identity is compared by id only; a lookalike row with the same name and city is a different resource"
    - "Guard decorators self-report via a `_rbac_guards` tuple copied forward by functools.wraps, so a test can police the route table without parsing source"
    - "A frozen allowlist is paired with a dead-entry test, so the exemption list cannot rot into a blanket exemption"
    - "Mutation testing as the acceptance step: break the rule, watch the named test fail, restore, confirm the file is byte-identical"

key-files:
  created:
    - backend/tests/test_rbac_predicates.py
    - backend/tests/test_rbac_enforcement.py
  modified:
    - backend/app/rbac.py
    - backend/app/constants.py
    - backend/tests/conftest.py

key-decisions:
  - "is_meetup_head has no admin short-circuit and no can_manage_activity fallback — reassigning the Meetup Head is a different power from acting as one, and a source assertion plus two matrix tests keep it that way."
  - "can_manage_activity reads BOTH activities.org_id and the activity_collaborators rows, because 01-02 promoted the collaborator table to the source of truth while keeping org_id as a cache of the primary; trusting only one would deny a legitimate organiser whenever the two had not yet been written together."
  - "A POR grants authority over two possible organisations — its membership's org and its own region_id — which is what lets a Regional Coordinator manage the Region organisation while their membership sits in a House."
  - "ORG_MANAGER_PORS excludes Event Lead: that authority is per-activity and flows through can_manage_activity, never to editing an organisation's public identity."
  - "The six pre-existing coarse routes were deliberately NOT retrofitted — that is a behaviour change with no Phase 1 requirement behind it, and RBAC-02 governs endpoints added from this point onward."
  - "The scoped decorators answer 404 before the predicate and 403 after it, accepting the IDOR-probing distinction (T-01-32) because activities are already readable by any authenticated user from the public city feed."

patterns-established:
  - "A gate that cannot fail is not a gate — the enforcement test was run against two deliberately bad throwaway routes and caught both before the file was committed."
  - "Assert the narrow and the broad authority side by side in ONE test (crew CAN manage, crew is NOT the Meetup Head) so a later refactor cannot collapse the distinction without a named failure."
  - "Extend a shared conftest by appending rows, never by reordering them, when existing tests reach for Model.query.first()."

requirements-completed: [RBAC-01, RBAC-02, RBAC-03]

coverage:
  - id: D1
    description: "All four predicates are importable from app.rbac and each returns a plain bool"
    requirement: "RBAC-01"
    verification:
      - kind: unit
        ref: "tests/test_rbac_predicates.py::test_every_predicate_is_total"
        status: pass
      - kind: integration
        ref: "python -c import of all ten symbols + `is False` identity assertions -> 'rbac surface ok'"
        status: pass
    human_judgment: false
  - id: D2
    description: "A plain student is granted participate for an event they registered for and denied manage for an event they are not crew on"
    requirement: "RBAC-01"
    verification:
      - kind: unit
        ref: "test_can_participate_follows_a_live_registration + test_can_manage_activity_grants"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cross-org denial is about id identity — two orgs sharing a name and city do not merge"
    requirement: "RBAC-02"
    verification:
      - kind: unit
        ref: "test_can_manage_org_grants_own_org_and_denies_the_next_one + test_can_manage_org_does_not_merge_two_orgs_that_share_a_name_and_city"
        status: pass
      - kind: other
        ref: "mutation control — the org-id check was removed from can_manage_org; 3 named tests failed; restored, git diff app/rbac.py empty"
        status: pass
    human_judgment: false
  - id: D4
    description: "is_meetup_head rejects a team member who can manage the activity, and rejects an admin holding no Meetup Head row"
    requirement: "RBAC-03"
    verification:
      - kind: unit
        ref: "test_is_meetup_head_is_narrower_than_can_manage_activity + test_is_meetup_head_denies_an_admin_and_the_organiser"
        status: pass
      - kind: other
        ref: "source assertion — inspect.getsource(is_meetup_head) contains no 'ROLE_ADMIN'"
        status: pass
      - kind: other
        ref: "mutation control — an admin bypass was injected into is_meetup_head; 2 named tests failed; restored, git diff app/rbac.py empty"
        status: pass
    human_judgment: false
  - id: D5
    description: "Empty edge — an activity with no team has no Meetup Head; a user with no memberships is denied every manage predicate"
    requirement: "RBAC-02"
    verification:
      - kind: unit
        ref: "test_an_activity_with_no_team_has_no_meetup_head + test_a_user_with_no_relations_is_denied_everything"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every predicate returns False rather than raising for a None user or a None resource"
    requirement: "RBAC-01"
    verification:
      - kind: unit
        ref: "test_every_predicate_is_total — 12 assertions across 4 predicates x (None user, None resource, both None)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Predicates are any-match existence checks over ALL active PORs — an inactive POR grants nothing and a second POR changes no outcome"
    requirement: "RBAC-02"
    verification:
      - kind: unit
        ref: "test_two_pors_do_not_depend_on_traversal_order + test_an_inactive_por_grants_nothing"
        status: pass
    human_judgment: false
  - id: D8
    description: "No scoped route carries the coarse guard outside the six frozen legacy routes, and every allowlist entry still resolves to a live route"
    requirement: "RBAC-02"
    verification:
      - kind: unit
        ref: "test_no_new_scoped_route_uses_the_coarse_guard + test_legacy_allowlist_has_no_dead_entries"
        status: pass
      - kind: other
        ref: "negative control — a throwaway POST /api/v1/tasks/<activity_id>/board behind organiser_required was registered; the gate raised AssertionError naming it; route removed"
        status: pass
    human_judgment: false
  - id: D9
    description: "No scoped route ships with zero authorization decorators"
    requirement: "RBAC-02"
    verification:
      - kind: unit
        ref: "test_every_scoped_route_carries_at_least_one_guard — all 15 live scoped rules carry a non-empty _rbac_guards tuple"
        status: pass
      - kind: other
        ref: "negative control — a throwaway undecorated PATCH /api/v1/orgs/<org_id>/brand-kit was registered; the gate raised AssertionError naming it; route removed"
        status: pass
    human_judgment: false
  - id: D10
    description: "A second Meetup Head row on the same activity is impossible at the database level"
    requirement: "RBAC-03"
    verification:
      - kind: unit
        ref: "inherited from 01-02 — tests/test_schema_spine.py negative control on uq_team_meetup_head; is_meetup_head is written as an existence query so it stays well-defined regardless"
        status: pass
    human_judgment: false
  - id: D11
    description: "The predicates are read-only, hold no cached state and mutate nothing beyond flask.g"
    verification:
      - kind: other
        ref: "backstop — code review of app/rbac.py: only .query reads, no module-level mutable state, the only writes are g.current_user / g.activity / g.org inside request-scoped decorators"
        status: pass
    human_judgment: true
  - id: D12
    description: "No controller changed and the pre-existing suite is unaffected"
    verification:
      - kind: integration
        ref: "git diff --stat HEAD~3 HEAD -- backend/app/controllers/ is empty; pytest -q went 75 -> 91 passing (75 + 16 new), exit 0"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-08-06
status: complete
---

# Phase 01 Plan 05: Resource-Scoped Authorization Summary

**Authorization stopped asking "is this person an organiser?" and started asking "may this person act on THIS event, or THIS organisation?" — four total-function predicates, four ready-made route guards, and a test that walks the live route table so no phase between now and Phase 8 can quietly ship a scoped endpoint behind the coarse guard.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-08-06
- **Tasks:** 3 of 3, all autonomous (no checkpoints in this plan)
- **Files:** 5 (2 created, 3 modified)
- **Estimate accuracy:** 54,000 tokens estimated, ~8,150 actual (chars/4 over a 32,605-char diff). ~6.6x high, back near the 01-02 (7.5x) and 01-03 (5x) range rather than 01-04's 3.7x. Four plans now agree in the same direction, and the reason is visible: 01-04 was operational (running migrations, debugging a guard on real data) while this plan, like 01-02 and 01-03, is mostly declarative — one module and two test files, with no external system to fight. **The signal for Phase 2's planner: for declaration-shaped plans in this codebase, divide the estimator's number by roughly 6; for operational plans, by roughly 4.**

## The four predicates

| Predicate | Grants | Deliberately does NOT grant |
|---|---|---|
| `can_manage_org(user, org)` | admin; an active POR in `ORG_MANAGER_PORS` whose membership org **or** `region_id` is this org's id | any team membership; any POR scoped to a different org, even one with the same name and city |
| `can_manage_activity(user, activity)` | admin; `activity.organiser_id`; **any** `ActivityTeamMember` row; an active POR in `ORGANISER_PORS` in an owning/co-owning org | nothing org-wide from the team row — that branch returns immediately and performs zero org lookups (TEAM-03) |
| `can_participate_in_activity(user, activity)` | a `Registration` whose status is not `cancelled`; otherwise falls back to `can_manage_activity` | a cancelled registration |
| `is_meetup_head(user, activity)` | **only** the `ActivityTeamMember` row with role `Meetup Head` | admins, the activity's own organiser, Co-Heads, and anyone else who can manage it |

Applied to routes through `can_manage_activity_required`, `can_participate_in_activity_required`, `meetup_head_required` and `can_manage_org_required`. The `activity_scoped(predicate, param=...)` / `org_scoped(predicate, param=...)` factories exist for the rarer route whose id parameter is named something else.

## The six frozen legacy routes

`LEGACY_COARSE_ROUTES` in `tests/test_rbac_enforcement.py`, verbatim. These are the activity-scoped routes that already used `organiser_required` before Phase 1; they were not retrofitted.

| Method | Rule |
|---|---|
| GET | `/api/v1/events/<activity_id>/expenses` |
| POST | `/api/v1/activities/<activity_id>/report` |
| GET | `/api/v1/events/<activity_id>/registrations` |
| POST | `/api/v1/events/<activity_id>/attendance` |
| POST | `/api/v1/events/<activity_id>/broadcast` |
| POST | `/api/v1/events/<activity_id>/volunteer` |

**This list never grows.** The file says so in a comment at the definition, and the failure message of `test_no_new_scoped_route_uses_the_coarse_guard` says so again at the moment someone would be tempted.

## Accomplishments

- **RBAC-02 became mechanical rather than aspirational.** The requirement covers endpoints that mostly do not exist yet — Phases 3 through 8 add them, in other sessions, months from now. `test_no_new_scoped_route_uses_the_coarse_guard` walks `app.url_map` on every suite run and fails the build the moment a scoped rule carries the coarse guard outside the frozen six. That is the only mechanism that could have made ROADMAP success criterion 5 enforceable.
- **The gate was proven able to fail before it was committed.** A throwaway `POST /api/v1/tasks/<activity_id>/board` behind `organiser_required` and an undecorated `PATCH /api/v1/orgs/<org_id>/brand-kit` were registered on the test app; both gates raised `AssertionError` naming the offending rule. The throwaway file was then deleted and never committed.
- **The predicate matrix was proven non-vacuous by mutation.** Injecting an admin bypass into `is_meetup_head` failed 2 named tests; removing the org-id comparison from `can_manage_org` failed 3. Both times `app/rbac.py` was restored from a backup and `git diff` confirmed it byte-identical to the committed version.
- **The third gate catches what the first would miss.** `test_every_scoped_route_carries_at_least_one_guard` covers the genuinely dangerous case — a scoped route shipped with no authorization decorator at all, which the coarse-guard test passes in silence, because a route with no decorators trivially does not carry the coarse one. All 15 live scoped rules currently carry a guard.
- **Adding the marker cost nothing at the call sites.** Because `functools.wraps` copies `__dict__` from the wrapped function onto the wrapper, `_rbac_guards` survives further decoration and accumulates in order, so stacked guards all report. No controller changed and no route behaviour changed — `git diff --stat` on `app/controllers/` across all three commits is empty.
- **The suite grew 75 → 91 with no regressions,** and the conftest extension was designed to be invisible: the new organisation and the two POR-less users are **appended**, so `Organisation.query.first()` and `User.query.filter_by(role="student").first()` still return the rows the seven pre-existing test files rely on. The new users carry no `region_id`, so they cannot shift a regional analytics count.

## Task Commits

1. **Task 1: Add ORG_MANAGER_PORS to constants.py** — `f845559` (feat)
2. **Task 2: The four predicates, the scoped decorators, and the guard marker** — `e0cd3c8` (feat)
3. **Task 3: Predicate matrix tests and the route-guard enforcement gate** — `0d89629` (test)

## Decisions Made

- **`is_meetup_head` has no escape hatch, and three separate mechanisms keep it that way.** PROPOSAL-05 gives an admin the power to *reassign* the Meetup Head; that is not the power to *act* as one. CAMPAIGN-06, FEEDBACK-01 and REIMB-01 all read this one function as "the one accountable submitter", so a convenience fallback here would silently convert three "only the Meetup Head submits" rules into "the Meetup Head or anyone senior". Guarded by: a docstring stating the reasoning at the point of temptation, a source assertion that `ROLE_ADMIN` never appears in the function, and two matrix tests — one of which asserts `can_manage_activity(crew) is True` and `is_meetup_head(crew) is False` **in the same test**, so the distinction cannot be collapsed without a named failure.
- **`_activity_org_ids` reads both sides of the org pointer.** 01-02 promoted `activity_collaborators` to the source of truth for "which organisations run this activity" while keeping `activities.org_id` as a denormalised cache of the primary. A predicate trusting only the collaborator table would deny a legitimate organiser for any activity Phase 3 had not yet written both sides for; trusting only `org_id` would deny every co-organiser of a Mega Meetup. It reads `org_id` plus every collaborator row that is primary or accepted.
- **A POR carries authority over up to two organisations.** `_por_org_ids` returns `{membership.org_id, por.region_id}` because a Regional Coordinator's membership may sit in a House while `region_id` points at the Region they actually coordinate — different rows, both legitimate. Ids only; the lookalike-organisation test proves name and city play no part.
- **The six legacy routes were left alone.** Retrofitting them is a behaviour change with no Phase 1 requirement behind it, and it would have widened this plan's blast radius into four controllers on the last plan of the phase. RBAC-02 explicitly governs endpoints added *from this point onward*, and the allowlist makes the exemption visible and time-stamped rather than implicit.
- **404 before the predicate, 403 after it.** Threat T-01-32 (an unauthorized user distinguishing "exists" from "does not exist") is accepted, not mitigated: activities are already readable by any authenticated user from the public city feed via `GET /api/v1/events/<activity_id>`, so their existence is not a secret. Uniform-404 masking would cost organisers real debuggability and protect nothing this application treats as confidential.
- **`ORG_MANAGER_PORS` is written as a literal set, not derived from `ORGANISER_PORS`.** A derived expression (`ORGANISER_PORS - {"Event Lead"}`) would be shorter and would make the membership ungreppable — someone auditing "who can edit an org profile?" would have to evaluate set arithmetic in their head. It is a literal, and a test asserts it stays a strict subset.

## Deviations from Plan

### 1. [Rule 2 - Missing critical coverage] An explicit lookalike-organisation test was added

- **Found during:** Task 3
- **Issue:** The plan's `must_haves` truth requires that "two distinct orgs that share a name or city do not merge", but the two organisations available for the A/B assertion differ in name, type **and** city. That test would pass even if `can_manage_org` compared names, so it does not actually assert id identity.
- **Fix:** `test_can_manage_org_does_not_merge_two_orgs_that_share_a_name_and_city` creates a third organisation with the region org's exact name, type and city, asserts the ids differ, and asserts the grant is True for the original and False for the twin.
- **Files modified:** `backend/tests/test_rbac_predicates.py`
- **Committed in:** `0d89629`

### 2. [Rule 2 - Missing critical coverage] A TEAM-03 test was added to the can_manage_org group

- **Found during:** Task 3
- **Issue:** The threat register's T-01-28 (a crew row widening into org-wide permission) was covered only by inspection of `can_manage_activity`'s early return. Nothing asserted the other direction — that `can_manage_org` never consults team rows.
- **Fix:** `test_can_manage_org_ignores_team_membership` asserts, for the same user in one test, that `can_manage_activity` is True and `can_manage_org` is False for both organisations.
- **Files modified:** `backend/tests/test_rbac_predicates.py`
- **Committed in:** `0d89629`

### 3. [Deliberate, documented] Task 2 has no separate `test(...)` RED commit

- **Task 2 is marked `tdd="true"`,** but its `<files>` element names only `backend/app/rbac.py` and the plan assigns both test files to Task 3. Writing tests in Task 2 would have violated the plan's own file boundary and duplicated Task 3's matrix.
- **What was done instead:** the RED gate was executed as a pre-implementation run of Task 2's own `<verify>` command, which failed with `ImportError: cannot import name 'can_manage_activity' from 'app.rbac'`. The GREEN gate is commit `e0cd3c8`. The genuine RED evidence for the behaviour contract is the mutation testing described above — two independent mutations, five named test failures — which is stronger than a temporarily-red test file, because it proves the tests fail for the *right* reason.
- This matches the shape of 01-02, 01-03 and 01-04, all of which committed `feat(...)` before `test(...)`.

## For the Phase 2 planner

- **AUTH-03 adds `Society Deputy Secretary` and `Coordinator` to the POR taxonomy.** Both belong in `ORG_MANAGER_PORS` as well as `ORGANISER_PORS`, and the instruction is recorded as a comment directly above the set in `constants.py` — at the point of change, not in a plan file.
- **The four guard names to import** are `can_manage_activity_required`, `can_participate_in_activity_required`, `meetup_head_required` and `can_manage_org_required`. They expect the URL parameter to be named `activity_id` or `org_id`; for anything else, build one from `activity_scoped(predicate, param="...")`.
- **`g.activity` and `g.org`** are set by the scoped decorators on success, so a guarded view must not re-query the resource.
- **If `test_no_new_scoped_route_uses_the_coarse_guard` fails on your route, switch the decorator.** Do not add a line to `LEGACY_COARSE_ROUTES`.

## Known Stubs

None. Every function shipped in this plan is fully implemented and exercised by a named test.

## Threat Flags

None. No network endpoint, auth path, file access pattern or schema change was added — this plan added read-only predicates and did not register a single route.

## Self-Check: PASSED

- `backend/app/rbac.py` — FOUND (modified)
- `backend/app/constants.py` — FOUND (modified)
- `backend/tests/conftest.py` — FOUND (modified)
- `backend/tests/test_rbac_predicates.py` — FOUND (created)
- `backend/tests/test_rbac_enforcement.py` — FOUND (created)
- Commit `f845559` — FOUND
- Commit `e0cd3c8` — FOUND
- Commit `0d89629` — FOUND
- `pytest -q` — 91 passed, exit 0
- `git diff --stat HEAD~3 HEAD -- backend/app/controllers/` — empty
