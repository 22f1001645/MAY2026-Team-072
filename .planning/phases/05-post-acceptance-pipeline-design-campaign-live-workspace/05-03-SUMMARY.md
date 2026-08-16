---
phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
plan: 03
subsystem: backend/campaign
tags: [CAMPAIGN-06, RBAC-03, AC-24, AC-25, AC-26, publication-gate]
status: complete

requires:
  - 05-01 (schedule_service.assert_schedule_non_empty, campaign_service.assert_editable)
  - 05-02 (_get_or_create_campaign, campaign_state, campaign_controller)
  - 01-05 (rbac.is_meetup_head, meetup_head_required)
provides:
  - campaign_service.push_live
  - "POST /api/v1/activities/<activity_id>/campaign/push-live"
  - "is_meetup_head flag on the GET /campaign payload"
affects:
  - 05-04 (workspace activation reads campaign.status == live via assert_campaign_live)
  - 05-07/05-08 (D-07 push-live button + D-06 stepper render from is_meetup_head)

tech-stack:
  added: []
  patterns:
    - "Idempotence by early return before any assignment, not by re-stamping equal values"
    - "Route guard is the enforcement; the payload flag is advisory rendering data computed from the same predicate"

key-files:
  created: []
  modified:
    - backend/app/services/campaign_service.py
    - backend/app/controllers/campaign_controller.py
    - backend/tests/test_campaign_package.py

decisions:
  - "USER DECISION (05-03 Task 1, option-a): Phase 5 ships the two-state campaign machine draft → live. CAMPAIGN_PENDING_APPROVAL stays declared-but-unused and is never written to a row."
  - "push_live is idempotent by early return before any assignment, so a replay cannot re-stamp the approval trail with a later time or a different approver."
  - "campaign_state gained an is_meetup_head key computed from rbac.is_meetup_head, because manageableActivityIds is true for every crew member and cannot express Meetup Head identity."
  - "push_live writes an AuditLog row via AuditRepository.record in the same uncommitted unit of work as the status change, per CLAUDE.md's rule that every state change is audited."

metrics:
  duration: 25min
  completed: 2026-08-16
  tasks: 3
  commits: 4

actuals:
  tokens: 3700
  tasks: 3
  commits: 4
---

# Phase 5 Plan 03: Push Live — the Meetup Head Publication Gate Summary

The campaign now reaches students only when the one assigned Meetup Head says so, and the server refuses everyone else — including an admin — independently of what the browser believes.

## Decision

**Task 1 (checkpoint:decision) — selected: option-a.**

> **Two states: draft → live**
>
> **Pros:** Fewest moving parts; matches AC-24 verbatim; `pending_approval` stays declared-but-unused exactly as `EXPENSE_DRAFT` already is (`constants.py:176-184`), which is an established precedent in this codebase; nothing else in Phase 5 or Phase 6 reads the intermediate state.
>
> **Cons:** D-06's step 5 "Meetup Head Approval" shows as incomplete until the moment of publication, with no way for a non-Meetup-Head member to signal "the package is ready for you".

Consequences, honoured by Tasks 2 and 3:

- `CAMPAIGN_PENDING_APPROVAL` remains declared in `constants.py` and in `CAMPAIGN_STATES`, but is **never written to a row** anywhere in this plan. It is not imported by any service or controller; its only mention outside `constants.py` is the sentence in `push_live`'s docstring recording that it stays unreachable.
- No `submit_for_approval` service function and no `POST /campaign/submit` route were written — those were option-b only.
- `push_live` accepts exactly one starting state, `draft`, plus the already-`live` no-op.

The decision is one-way (`campaign_packages.status` values persist), which is why it was settled before any code was written rather than after.

## What Was Built

1. **`campaign_service.push_live(activity, actor)` (AC-24, AC-26)**
   - Calls `schedule_service.assert_schedule_non_empty(activity)` first — the same helper the 05-01 unlock-check route calls, so "what counts as an empty schedule" keeps exactly one definition rather than gaining a second copy here.
   - Resolves the row through `_get_or_create_campaign`, so publication needs no separate "does a campaign exist yet" branch.
   - Sets `status`, `approved_by`, `approved_at` and `pushed_live_at` in one commit, with `approved_at` and `pushed_live_at` taking the same instant. The three fields are kept separate on purpose (the model docstring's reason): the approval trail must stay readable after the fact even once publication time is known.
   - **Idempotent by early return.** An already-live campaign is returned untouched and uncommitted. The alternative — assigning the same values again — would look identical in a status assertion and would silently move `approved_at` forward on every replay (threat T-05-18).
   - Writes an `AuditLog` row via `AuditRepository.record` in the same unit of work. The plan did not spell this out, but CLAUDE.md makes every state-changing publish action auditable; `record` adds without committing, so it rides the same transaction (see Deviations).

2. **`POST /api/v1/activities/<activity_id>/campaign/push-live` behind `@meetup_head_required`**
   - The only route in the codebase carrying this decorator. Every other campaign route is the looser `@can_manage_activity_required`: any crew member may build the package, only the one accountable person may ship it.
   - Its docstring records why `meetup_head_required` has no admin short-circuit and no `can_manage_activity` fallback — an admin's power is to *reassign* the Meetup Head (PROPOSAL-05), which is a different power from acting as one.

3. **`is_meetup_head` on the campaign payload (D-07 input)**
   - `campaign_state(activity, actor=None)` now returns an `is_meetup_head` boolean computed from `rbac.is_meetup_head` — the same predicate behind the route guard, so the button's disabled state and the server's 403 cannot disagree.
   - The flag exists because the frontend's only authorization signal, `capabilities.manageableActivityIds`, answers "may this person manage this activity" — true for every crew member — and can never answer "is this person the Meetup Head".
   - It is advisory rendering data only. The guard is the enforcement, and AC-25 proves the server refuses regardless of what the client sent (threat T-05-16).

## Verification

| Gate | Result |
|------|--------|
| `pytest tests/test_campaign_package.py -x -q` | 16 passed |
| `pytest tests/test_rbac_enforcement.py -x -q` | 3 passed |
| `pytest -q` (full backend suite) | exit 0, 92% coverage |

Five named tests cover the three acceptance criteria:

- `test_push_live_sets_audit_fields` — AC-24: 200, `status == "live"`, all three approval fields non-null, `approved_by` equal to the Meetup Head's id.
- `test_push_live_idempotent` — AC-26: a second call returns 200 and `approved_at` / `pushed_live_at` byte-identical to the first response.
- `test_push_live_schedule_empty` — 400 with `code == "schedule_empty"`, campaign still `draft`.
- `test_push_live_non_meetup_head_403` — AC-25: a crew member gets 403/`forbidden`, **and so does an admin**, proving there is no admin short-circuit. The test asserts the persisted `CampaignPackage` row afterwards (`status` still `draft`, `approved_by` still null), not only the status code — a 403 that still wrote `approved_by` would pass a status-only assertion.
- `test_campaign_state_carries_is_meetup_head` — `true` for the Meetup Head, `false` for a crew member on the same activity.

The `seeds` fixture in `test_campaign_package.py` gained two subjects that make AC-25 meaningful: a crew member with an `ActivityTeamMember` row (so `can_manage_activity` says yes) and an off-team admin (so the role short-circuit says yes). Both are refused. The conftest-level `crew_headers` / `meetup_head_headers` fixtures could not be used here — this module defines its own `app` fixture which does not run `_seed_minimal`, so those logins do not exist inside it.

## Deviations from Plan

### Auto-fixed / added

**1. [Rule 2 - Missing critical functionality] `push_live` writes an `AuditLog` row**
- **Found during:** Task 2
- **Issue:** The plan's `<action>` listed four steps and none of them was an audit row, but CLAUDE.md states every state-changing action (approve/verify/publish) writes an append-only `AuditLog` row, and `AuditLog`'s own docstring names publish explicitly. Publication with no attributable approver is also threat T-05-17.
- **Fix:** `AuditRepository.record("campaign", campaign.id, "campaign_pushed_live", actor, note=activity.id)` before the commit. `record` adds without committing, so the audit row and the status change land in the same transaction rather than as two.
- **Files modified:** `backend/app/services/campaign_service.py`
- **Commit:** 5f9dd06

**2. [Rule 1 - Deprecation] `datetime.now(UTC)` instead of the plan's `datetime.utcnow()`**
- **Found during:** Task 2
- **Issue:** The plan specified `datetime.utcnow()`, which emits a `DeprecationWarning` on Python 3.12 and is scheduled for removal.
- **Fix:** `datetime.now(UTC)` — the same aware-UTC value `models._utcnow` already stamps every `created_at` with, so the payload's timestamps stay consistent with the rest of the schema. Both fields still take one shared instant, which is what AC-24 and AC-26 actually depend on.
- **Files modified:** `backend/app/services/campaign_service.py`
- **Commit:** 5f9dd06

### Signature change

`campaign_state(activity)` → `campaign_state(activity, actor=None)`. The plan flagged this as expected changed behaviour. `actor` defaults to `None` because `is_meetup_head` is a total function that returns `False` for a `None` user, so any future caller without an acting user gets a truthful `false` rather than a crash. The single existing caller (`GET /campaign`) now passes `g.current_user`.

## Known Stubs

None. No placeholder values, no unwired data paths, no skipped tests.

## Threat Flags

None. This plan added one route, and it is the most tightly guarded route in the phase. No new network surface, file access, or schema change was introduced.

## Commits

| Task | Gate | Commit | Message |
|------|------|--------|---------|
| 2 | RED | `4a85667` | Add failing tests for the campaign push-live transition |
| 2 | GREEN | `5f9dd06` | Add the campaign push-live transition behind the Meetup Head guard |
| 3 | RED | `3f9aafd` | Add the negative control for push-live and a failing test for the is_meetup_head flag |
| 3 | GREEN | `a6d0a7f` | Carry a server-computed is_meetup_head flag on the campaign payload |

Task 1 was a decision checkpoint and produced no code commit; its output is the `## Decision` section above.

## TDD Gate Compliance

Both behavioural tasks ran RED → GREEN with separate commits. One note for honesty: in Task 3's RED run, `test_push_live_non_meetup_head_403` passed immediately, because Task 2's `@meetup_head_required` decorator already produced the refusal. That test is a **negative control** — it exists to prove and to keep proving that the guard refuses, not to drive new code. Only `test_campaign_state_carries_is_meetup_head` was genuinely red (`KeyError: 'is_meetup_head'`), and it drove Task 3's implementation.

## Next Steps

`CAMPAIGN-06` is deliberately left **unchecked** in `REQUIREMENTS.md`. Its server half is done and proven, but 05-08 (`PipelineStepper` + `PushLiveGate`) also carries CAMPAIGN-06, and the requirement as written spans the whole package-approval experience. Checking it off now would claim a half-built requirement as finished. `ROADMAP.md`'s 05-03 plan row is checked, since that is what actually completed.

`campaign.status == "live"` is now reachable, which unblocks `assert_campaign_live` (already written in 05-01) and therefore 05-04's workspace activation. The frontend work (05-07/05-08) can render D-07's push-live button and its disabled state directly from the `is_meetup_head` flag — it must not re-derive the answer from `manageableActivityIds`, which is the exact mistake this flag exists to prevent.

## Self-Check: PASSED

- `backend/app/services/campaign_service.py` — FOUND, defines `def push_live(`, calls `schedule_service.assert_schedule_non_empty(`, calls `is_meetup_head(`
- `backend/app/controllers/campaign_controller.py` — FOUND, contains `@meetup_head_required` exactly once
- `backend/tests/test_campaign_package.py` — FOUND, 5 new tests
- Commits `4a85667`, `5f9dd06`, `3f9aafd`, `a6d0a7f` — all FOUND in `git log`
