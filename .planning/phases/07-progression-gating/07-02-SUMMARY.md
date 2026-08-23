---
phase: 07-progression-gating
plan: 02
subsystem: backend
tags: [progression, authorization, proposals, consent, api, seed-data]
status: complete

requires:
  - "progression_service.fest_eligibility / assert_fest_eligible (plan 07-01)"
  - "OrgProgressionUnlock model + uq_org_progression (Phase 1 schema batch)"
  - "proposal_service.decide (Phase 3)"
provides:
  - "progression_service.assert_fest_collaborators_accepted"
  - "progression_service.record_unlock"
  - "progression_service.progression_for"
  - "GET /api/v1/orgs/<org_id>/progression"
  - "approve-time enforcement of fest_locked and fest_collaborators_required"
affects:
  - "POST /api/v1/proposals/<activity_id>/decision — regional_fest approvals now refusable"
  - "every successful approval — writes an OrgProgressionUnlock row when the org is fest-eligible"
  - "backend/seed.py — one extra completed regional meetup in Hyderabad"

tech-stack:
  added: []
  patterns:
    - "Both approve-time guards sit above the first write in decide()'s approve branch, which has no rollback path"
    - "record_unlock is get-or-create with no commit, so the marker and the approval it records land in one transaction"
    - "One read route serves two frontend callers: ?city= for the fest card, no city for the profile banner"

key-files:
  created: []
  modified:
    - backend/app/services/progression_service.py
    - backend/app/services/proposal_service.py
    - backend/app/controllers/org_profile_controller.py
    - backend/tests/test_progression_gating.py
    - backend/seed.py

decisions:
  - "A1 adopted: record_unlock fires on EVERY successful approval that leaves the org fest-eligible, not only on fest approvals — otherwise the banner would lag the fest card by one event"
  - "A2 adopted: auth_required, not can_manage_org_required, on the read route — an admin proposing on behalf of an org holds no POR in it"
  - "A4 adopted: no AuditLog row on a refused approval, matching the quota refusal already in decide()"
  - "The accepted-collaborator count mirrors Activity.is_mega_meetup's expression in the service rather than adding a second @property beside it — the two thresholds are different rules"
  - "Revocation in tests goes through proposal_service.decide directly; DecisionSchema exposes only approve/changes/reject over HTTP"

metrics:
  duration: 55min
  completed: 2026-08-23
  tasks: 3
  files: 5

actuals:
  tokens: 6015
  tasks: 3
  commits: 5
---

# Phase 7 Plan 02: Approve-Time Checkpoint and the Progression Read Surface Summary

The fest-tier rule is now checked at both ends of the proposal lifecycle — submit and approve — with the approve side additionally requiring that every named collaborator has actually accepted, and a successful approval records the PROG-03 unlock marker inside its own transaction.

## What was built

`decide()`'s approve branch gained two guards for `regional_fest` scale, placed immediately after the FR-B2 quota re-check and above `proposal.status = PROPOSAL_APPROVED`. That placement is the whole point: `decide()` has no rollback path, so a guard below the first write would leave `proposal.status` mutated in the session after the raise.

The first guard re-runs `assert_fest_eligible()`. Eligibility can lapse while a proposal sits in the admin queue — the qualifying regional meetup can be revoked — and without this the rule was enforced only against the caller honest enough to use the form.

The second, `assert_fest_collaborators_accepted()`, counts **accepted** invites rather than named ones. A proposal can name six organisations without one of them having said yes; approving it would commit five other organisations to an event they never agreed to. A declined invite holds the count short, which is the consent guarantee D-02 protected.

`record_unlock()` runs at the end of every successful approval, guarded by `if fest_eligibility(...)["fest_eligible"]` — not only on fest approvals (assumption A1). It is get-or-create against `uq_org_progression`, deliberately not `try/except IntegrityError`: this runs inside `decide()`'s transaction and a caught integrity error there would force a rollback that also discarded the approval it was recording.

`GET /api/v1/orgs/<org_id>/progression` serves both frontend callers from one route.

## The endpoint response (plan 07-03 adapts these keys)

```json
{
  "org_id": "1ff9d39055b3426a9a15a8156cea643d",
  "city": "Hyderabad",
  "local_meetups_completed": 1,
  "regional_meetups_completed": 1,
  "requirements_met": 2,
  "requirements_total": 2,
  "fest_eligible": true,
  "collaborator_threshold": 6,
  "unlocks": [
    {
      "id": "…",
      "org_id": "1ff9d39055b3426a9a15a8156cea643d",
      "city": "Hyderabad",
      "unlocked_at": "2026-08-23T11:04:07"
    }
  ]
}
```

With **no** `?city=` parameter: `city` is `null`, both `*_meetups_completed` fields are `null`, `requirements_met` is `0`, `fest_eligible` is `false`, `collaborator_threshold` is still served, and `unlocks` is populated for every city the org has unlocked. The counts are `null` rather than `0` because "the form has not been told which city yet" is a different statement from "zero completed", and the fest card's caption must not read "0 of 2 completed" before a city is picked.

`unlocks` is always a list, never `null`. An org with no unlock rows gets `[]` and a 200.

## The two approve-time 403 messages (rendered verbatim by plan 07-05's `ErrorStrip`)

`fest_locked` — unchanged from plan 07-01, raised by the same `assert_fest_eligible()` the submit checkpoint calls:

```
Regional Fest is locked in {city}: your organisation has completed {met} of {total} progression requirements there. Still needed: {missing}.
```

`fest_collaborators_required` at approve — a **different sentence** from the submit-side one, because it is a different fact (accepted, not named):

```
A Regional Fest needs 6 collaborating organisations to have accepted their invitations; only 3 of 6 have accepted so far (counting your own organisation).
```

For contrast, plan 07-01's submit-side message, still raised by `submit_proposal`:

```
A Regional Fest needs at least 6 collaborating organisations; this proposal names 5 of 6 (counting your own organisation).
```

Both interpolate `FEST_COLLAB_THRESHOLD`. The 07-05 error strip must not assume the two `fest_collaborators_required` bodies are identical — the code is shared, the wording is not.

## Seed data: which org reaches fest tier

**`Hyderabad (AP & Telangana)` in city `Hyderabad`** — this is the pair plan 07-05's manual UAT should use. Log in as the seeded organiser `saiteja@ds.study.iitm.ac.in / rc12345`, who holds the Regional Coordinator POR in that org.

**`seed.py` did need a change.** Against a freshly seeded database the Hyderabad chapter had exactly one completed local meetup (`Hyderabad Coffee & Code`, 18 days past, approved) and **no** completed regional meetup anywhere in the seed data, so no organisation was fest-eligible and neither headline UI state was reachable without hand-editing the database. Added one `make_activity(...)` call in the demo-activity section:

- `Hyderabad Regional Meetup — Winter Edition`, `regional_meetup`, Hyderabad, 45 days past, approved

Confirmed after `python seed.py`:

```
{'local_meetups_completed': 1, 'regional_meetups_completed': 1, 'requirements_met': 2,
 'requirements_total': 2, 'fest_eligible': True, 'collaborator_threshold': 6}
```

The destructive-reset guard and the idempotent reference-data path were not touched (`git diff --stat backend/seed.py` → 14 insertions, 0 deletions, all inside the demo section). `tests/test_seed_guard.py` stays green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's revoke step has no HTTP route**

- **Found during:** Task 1
- **Issue:** `test_direct_approve_of_locked_scale_is_403` was specified as "revoke the qualifying regional meetup's proposal via the decide endpoint". `DecisionSchema.decision` validates `OneOf(["approve", "changes", "reject"])` — `revoke` is not accepted, and no other controller exposes it. The step would have produced a 422, not a revocation.
- **Fix:** The helper `_revoke_qualifying_regional()` calls `proposal_service.decide(id, "revoke", "", admin)` directly inside an app context. That is the real revoke code path; only its HTTP surface is missing. The TOCTOU assertion the test exists for is unaffected — the fest is still approved over HTTP.
- **Files modified:** `backend/tests/test_progression_gating.py`
- **Commit:** 4406f0c

**2. [Rule 3 - Blocking] Seeded activities had no organiser, and decide() notifies one**

- **Found during:** Task 1
- **Issue:** `_seed_completed_meetup` (plan 07-01) leaves `Activity.organiser_id` unset. Both the approve and the revoke branch of `decide()` call `_notify(activity.organiser_id, ...)`, and `Notification.user_id` is `nullable=False`, so pushing a seeded row through `decide()` failed on commit.
- **Fix:** Added an `organiser_id=None` keyword to the helper, defaulting to the previous behaviour so no existing case changed. Only the new cases that drive `decide()` pass it.
- **Files modified:** `backend/tests/test_progression_gating.py`
- **Commit:** 4406f0c

### Documented departures

- **Test dates are months apart on purpose.** `ActivityRepository.approved_meetups_in_region_month` counts approved meetups from the start of the target month *onward with no upper bound*, so the unlock tests seed at 400 / 200 / 100 days past to keep the FR-B2 approve-time quota from firing on the row under test. This is a pre-existing quirk of that query, noted rather than fixed (out of scope).
- **Collaborator invites are accepted with the admin token.** `can_manage_org` returns True for `ROLE_ADMIN`, so one token can answer every partner org's invite. The requests still go through the real `POST /activities/<id>/collaborators/<id>/respond` endpoint, which is what the "consent goes over HTTP, never by mutating rows" requirement asked for.
- **No tracer checkpoint.** `workflow.auto_advance` is false and the plan declares `autonomous: true` with zero checkpoint tasks; every `<verify>` here is an automated pytest run with nothing for a human to inspect. Verifies were re-run end to end and passed.
- **`seed.py` was re-run, which is destructive.** CLAUDE.md asks that this be flagged. The dev database at `backend/instance/ekatva.db` was rebuilt twice (once to establish the baseline, once to confirm the fix). It is gitignored demo data and the plan's acceptance criteria required a fresh seed.

## Verification

| Check | Result |
|---|---|
| `pytest tests/test_progression_gating.py -q` | 25 passed |
| `pytest tests/test_progression_gating.py tests/test_blueprint_registration.py -q` | 27 passed |
| `pytest -q --tb=short` (full backend suite, after each task) | exit 0, 91% coverage, 0 failures |
| `pytest tests/test_seed_guard.py -q` | 8 passed after the seed change |
| `progression_service` coverage | 100% |
| `git status backend/migrations/` | clean — no revision file generated |
| `fest_eligibility` on freshly seeded data | `fest_eligible: True` for Hyderabad (AP & Telangana) / Hyderabad |

No existing suite needed adjustment. Neither approve-time guard fires on a `local_meetup` or `regional_meetup`, which is every proposal the existing suites approve.

## Known Stubs

None. Both guards are live, the unlock write is live, and the read route is registered and tested.

## Threat Flags

None beyond the plan's own register. The one new endpoint (`GET /orgs/<org_id>/progression`) is T-07-06, dispositioned `accept` in the plan: every fact it returns is already public through `published_feed`, and `unlocks` is a status marker with no capability behind it. The `city` query parameter is used only as a bound SQLAlchemy filter value and inside an f-string message (T-07-10).

## Notes for later plans

- **07-03** adapts the nine top-level keys listed above plus `unlocks[].{id, org_id, city, unlocked_at}`. All snake_case; adapt once in `lib/api.ts`.
- **07-04** should read `collaborator_threshold` from the payload rather than hardcoding 6, and render the "N of 2 completed" caption from `requirements_met` / `requirements_total` without arithmetic.
- **07-05**'s error strip handles two distinct `fest_collaborators_required` sentences (submit vs approve) under one code — render `error` verbatim, do not match on wording.
- Manual UAT org/city: **Hyderabad (AP & Telangana) / Hyderabad**, organiser `saiteja@ds.study.iitm.ac.in`.

## Self-Check: PASSED

- `backend/app/services/progression_service.py` — FOUND
- `backend/app/controllers/org_profile_controller.py` — FOUND
- `backend/tests/test_progression_gating.py` — FOUND
- `backend/seed.py` — FOUND
- commit `4406f0c` (test, task 1) — FOUND
- commit `b56185a` (feat, task 1) — FOUND
- commit `9e20f45` (test, task 2) — FOUND
- commit `16586eb` (feat, task 2) — FOUND
- commit `01b6e25` (chore, task 3) — FOUND
