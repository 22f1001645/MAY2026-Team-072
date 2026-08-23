# Phase 7 — deferred items

Out-of-scope discoveries logged during execution. Not fixed by this phase.

## 1. `send_24h_reminders` cron job raises outside an application context

**Found:** plan 07-05, while starting `python run.py` for the manual verification gate.

The APScheduler cron job registered for `reminder_service.send_24h_reminders` runs on
the scheduler's own thread with no Flask application context, so the first
`Activity.query` inside `ActivityRepository.get_starting_in_window` raises
`RuntimeError: Working outside of application context.` on every fire.

- File: `backend/app/services/reminder_service.py:12` (via `backend/app/repositories/repos.py:154`)
- Effect: 24-hour reminders never send; a traceback is printed hourly in the dev server log.
- Pre-existing — unrelated to progression gating, and `reminder_service.py` sits at 31%
  coverage, so no test exercises the scheduled path.
- Fix shape: wrap the job body in `with app.app_context():`, or register it through a
  wrapper that pushes one.

## 2. Fresh seed data contains no `org_progression_unlocks` row

**Found:** plan 07-05, preparing the manual verification gate.

Plan 07-02 seeded the Hyderabad chapter to be *fest-eligible*, but the unlock row itself is
written by `record_unlock` at approve time, and every proposal in the seed file is already
approved. So a freshly seeded database has zero unlock rows and the PROG-03 sponsorship
banner — the phase's headline visible outcome — is not reachable without first pushing one
proposal through the approval queue.

- File: `backend/seed.py` (demo-activity section)
- Not fixed here: `seed.py` belongs to plan 07-02, and re-running it is destructive to the
  developer's local demo data. Flagged rather than changed.
- Fix shape: leave one Hyderabad proposal in `submitted` status so the demo has something to
  approve, or seed the unlock row alongside the completed meetups.
