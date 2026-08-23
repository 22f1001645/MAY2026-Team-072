---
phase: 07-progression-gating
plan: 01
subsystem: backend
tags: [progression, authorization, proposals, rbac, security]
status: complete

requires:
  - "Activity / Proposal / OrgProgressionUnlock models (Phase 1 schema batch)"
  - "proposal_service.submit_proposal (Phase 3)"
provides:
  - "FEST_COLLAB_THRESHOLD"
  - "ActivityRepository.completed_meetups_by_scale"
  - "progression_service.fest_eligibility"
  - "progression_service.assert_fest_eligible"
  - "error code fest_locked (403)"
  - "error code fest_collaborators_required (403)"
affects:
  - "POST /api/v1/activities — regional_fest submissions now refusable"

tech-stack:
  added: []
  patterns:
    - "Eligibility computed per call from activities JOIN proposals; never read from a stored unlock flag"
    - "Both new guards sit above submit_proposal's write marker, so a refusal writes nothing"

key-files:
  created:
    - backend/app/services/progression_service.py
    - backend/tests/test_progression_gating.py
  modified:
    - backend/app/constants.py
    - backend/app/repositories/repos.py
    - backend/app/services/proposal_service.py

decisions:
  - "A3 adopted: eligibility counts only activities the org owns as primary (Activity.org_id); an accepted collaboration invite does not unlock fest tier"
  - "The completion test is (Proposal.status == approved AND starts_at < now()), never Activity.status — sync_past_events() writes that column with no reference to proposal status"
  - "The submit-side collaborator count reads valid_collab_orgs (post-dedup), never the raw request list"
  - "No admin carve-out on the progression gate; asserted inside test_direct_submit_of_locked_scale_is_403 rather than as a 14th case"

metrics:
  duration: 40min
  completed: 2026-08-23
  tasks: 2
  files: 5

actuals:
  tokens: 5950
  tasks: 2
  commits: 2
---

# Phase 7 Plan 01: Fest-Tier Progression Gate Summary

Server-computed fest-tier eligibility (one completed local meetup + one completed regional meetup, per organisation per city) enforced at proposal submit with two distinct 403 codes, backed by 13 tests including a forged-unlock-row negative control.

## What was built

`progression_service` is now the only place in the codebase that knows the fest-tier rule. `fest_eligibility(org_id, city)` returns both halves of the track record separately (the UI must name which half is missing, and the refusal must state the shortfall numerically — neither is derivable from a boolean). `assert_fest_eligible` is the guard, called from `submit_proposal` for `regional_fest` scale only.

The counting query, `ActivityRepository.completed_meetups_by_scale`, deliberately does not read `Activity.status`. `sync_past_events()` in the same class flips that column to `completed` on any past-dated activity with no reference to proposal status, so reading it would count a rejected proposal as a track record. The formula is `Proposal.status == "approved" AND Activity.starts_at < datetime.now()`, filtered on `Activity.org_id` and `Activity.city`.

The PROG-02 named-collaborator check sits after the existing dedup loop, so six repeats of a single org id collapse to two (partner + primary) and still fail.

## The two 403 messages (rendered verbatim by plans 07-04 and 07-05)

`fest_locked`, raised from `progression_service.assert_fest_eligible`:

```
Regional Fest is locked in {city}: your organisation has completed {met} of {total} progression requirements there. Still needed: {missing}.
```

`{missing}` is the human-readable scale name(s) still outstanding, joined with " and " — `local meetup`, `regional meetup`, or `local meetup and regional meetup`. A worked example:

```
Regional Fest is locked in Hyderabad: your organisation has completed 1 of 2 progression requirements there. Still needed: regional meetup.
```

`fest_collaborators_required`, raised from `proposal_service.submit_proposal`:

```
A Regional Fest needs at least 6 collaborating organisations; this proposal names 5 of 6 (counting your own organisation).
```

Both numbers interpolate `FEST_COLLAB_THRESHOLD`; changing the constant changes the message and both threshold tests together.

## Adopted assumption A3 — primary-only counting

PROG-01 counts activities where `Activity.org_id` is this org. An organisation that co-hosted a local and a regional meetup by accepting a collaboration invite does **not** unlock fest tier in that city. This matches REQUIREMENTS.md's narrow "that org has completed" reading, matches the existing `meetups_in_region_month` precedent, and is the tighter security posture. Reversal is one added clause on the query's join.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan named the wrong route path**

- **Found during:** Task 1
- **Issue:** The plan, its acceptance criteria and its threat register all say `POST /api/v1/proposals`. That route does not exist — `/api/v1/proposals` is the admin `GET` queue. Proposal submission is `POST /api/v1/activities` (`proposal_controller.py:26`), which is what `test_proposal_collaboration.py` already drives.
- **Fix:** Every new test posts to `/api/v1/activities`. The service-layer call site the plan specifies is unaffected, so this changed only the test file.
- **Files modified:** `backend/tests/test_progression_gating.py`
- **Commit:** 96ce65f

**2. [Rule 2 - Missing coverage] The no-admin-bypass prohibition had no test**

- **Found during:** Task 1
- **Issue:** `must_haves.prohibitions` requires that a `ROLE_ADMIN` caller proposing for a locked org is refused identically, but neither task's case list contained a test for it. Task 2's acceptance criteria pin the file at exactly 13 cases, so a 14th test was not available.
- **Fix:** Folded the admin assertion into `test_direct_submit_of_locked_scale_is_403`, which now loops over an RC POR holder and an admin and asserts both get 403 `fest_locked`. Both T-07-02 and T-07-03 are covered by that one case, and the count stays at 13.
- **Files modified:** `backend/tests/test_progression_gating.py`
- **Commit:** 96ce65f

### Documented departures

- **`_seed_user_with_por` was not copied.** The plan asked for the `test_proposal_collaboration.py` helper block verbatim, but no case in this file seeds a POR holder — the conftest `rc@ekatva.os` fixture already holds a Regional Coordinator POR in the region org, which is the primary org for every case here. Copying it would have shipped a dead helper. `_seed_org` was copied because `_seed_secondary_orgs` needs it.
- **`_seed_completed_meetup` gained two keyword arguments** beyond the planned `(org, city, scale, days_ago=30)`: `proposal_status="approved"` (Task 2's rejected/revoked/submitted exclusion cases) and a negative `days_ago` for the future-dated case. Defaults match the plan's signature exactly.
- **Tracer feedback gate was resolved automatically, not by checkpoint.** `workflow.auto_advance` is `false`, which would normally mean a human-verify checkpoint after the tracer. The tracer's `<verify>` is a fully automated pytest run with nothing for a human to inspect, and the plan declares `autonomous: true` with zero checkpoint tasks. The verify was re-run end-to-end and passed, and execution continued.

## Verification

| Check | Result |
|---|---|
| `pytest tests/test_progression_gating.py -q` | 13 passed |
| `pytest -q --tb=short` (full backend suite) | exit 0, 91% coverage, 0 failures |
| `pytest tests/test_proposal_flow.py tests/test_proposal_collaboration.py -q` | passed, no regression |
| `pytest tests/test_blueprint_registration.py -q` | passed (this plan adds no route) |
| `python -c "from app.constants import FEST_COLLAB_THRESHOLD; assert FEST_COLLAB_THRESHOLD == 6"` | exit 0 |
| `git status backend/migrations/` | clean — no migration generated |

The full backend suite needed **no adjustment**. Neither guard fires on a `local_meetup` or `regional_meetup` submit, which is every fest-free proposal the existing suites create, so nothing pre-existing changed behaviour.

## Known Stubs

None. No placeholder values, no unwired data paths — both guards are live and enforced.

## Threat Flags

None. This plan adds no endpoint, no schema change, no new file access and no package. The only new trust-boundary surface is the two refusal paths, both already in the plan's threat register (T-07-01 through T-07-05), and each has a test.

## Notes for later plans

- Plan 07-02 owns the second enforcement checkpoint (approve time) and the accepted-count half of D-01. `fest_eligibility()` is ready to serve `GET /orgs/<org_id>/progression` as-is; its dict does not carry `org_id` or `city` keys, since both are already in that route's URL.
- `FEST_REQUIRED_SCALES` in `progression_service` is the ordered pair the UI should list requirements in.

## Self-Check: PASSED

- `backend/app/services/progression_service.py` — FOUND
- `backend/tests/test_progression_gating.py` — FOUND
- commit `96ce65f` — FOUND
- commit `5e7d3d4` — FOUND
