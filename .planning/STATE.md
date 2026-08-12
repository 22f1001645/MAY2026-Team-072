---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: milestone
current_phase: 02
current_phase_name: identity-session-dashboard-shell
status: executing
stopped_at: Completed 02-06-PLAN.md
last_updated: "2026-08-12T09:38:29.291Z"
last_activity: 2026-08-12
last_activity_desc: Phase 02 execution started
progress:
  total_phases: 8
  completed_phases: 1
  total_plans: 12
  completed_plans: 9
  percent: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-03)

**Core value:** A Regional Coordinator can propose, get approved, publish, fill, run, and reimburse a city meetup — and a student can discover, register for, and stay updated on it — entirely inside Ekatva OS.
**Current focus:** Phase 02 — identity-session-dashboard-shell

## Current Position

Phase: 02 (identity-session-dashboard-shell) — EXECUTING
Plan: 5 of 7
Status: Ready to execute
Last activity: 2026-08-12 — Phase 02 execution started

Progress: [████████░░] 75%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 25min | 4 tasks | 11 files |
| Phase 01 P02 | 35min | 3 tasks | 4 files |
| Phase 01 P03 | 22min | 3 tasks | 4 files |
| Phase 01 P04 | 30min | 3 tasks | 7 files |
| Phase 01 P05 | 40min | 3 tasks | 5 files |
| Phase 02 P01 | 35min | 3 tasks | 4 files |
| Phase 02 P02 | 20min | 2 tasks | 5 files |
| Phase 02 P03 | 45min | 3 tasks | 4 files |
| Phase 02 P06 | 25min | 3 tasks | 11 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Adopt Flask-Migrate (Alembic) with a metadata naming convention as the literal first commit — retrofitting the convention after tables exist is irrecoverable on SQLite batch migrations.
- [Phase 1]: Declare all ~8 new tables and ~12 new columns in one batch, then reseed once — per-feature schema changes cost 8 destructive wipes across 5 developers.
- [Phase 2]: Refresh token lands before the dashboard switcher (same files; refresh changes the token contract every later fetch rides on).
- [Phase 3/5/6]: One consistent "any team member drafts, only the Meetup Head submits" rule across campaign push-live, reimbursement, and post-event report.
- [Phase 5]: AI campaign ships mail-template generation + poster upload only; poster generation stays behind `AI_IMAGE_ENABLED`, off by default.
- [Phase 1]: USER DECISION (01-01 checkpoint, option-a): adopt Flask-Migrate with the metadata naming convention as the first commit — named constraints from revision 1, not Alembic defaults. Landed in commit 12f07ad; baseline revision 312ea9fc2c96.
- [Phase 1]: USER DECISION (01-01 checkpoint): Flask-Migrate legitimacy verified on PyPI (Miguel Grinberg); pinned Flask-Migrate==4.0.7.
- [Phase 1]: Resolved the 01-01 drift gate vs 01-02 no-migration conflict with PENDING_BATCH_TABLES — a named, self-retiring allowlist in test_migrations.py that keeps the gate live for every table outside the deliberate SCHEMA-02 batch window. Plan 01-04 must empty it with the batch revision.
- [Phase 1]: The two authorization singletons (one primary collaborating org, one Meetup Head per Activity) are partial unique indexes, not service checks — uq_activity_primary_org and uq_team_meetup_head, both verified by negative control.
- [Phase 1]: The SCHEMA-02 batch window was extended by (table, column) pair (PENDING_BATCH_COLUMNS), not by table name — allowlisting users wholesale to cover three academic columns would have blinded the drift gate to every future column on the most security-relevant table.
- [Phase 1]: Columns landing on populated tables must be nullable or carry a server_default, and the two backfills (reports.status='submitted', attendance.method='manual') record what actually happened — enforced by a permanent test, negative-control verified.
- [Phase ?]: Settled the deferred 65-character FK name by naming it explicitly before autogenerate — the last moment it was free, since the table was still unmigrated.
- [Phase ?]: The milestone schema landed as ONE revision (213804635519) and was verified against the LIVE database by inspector, because pytest builds its own schema and would pass either way.
- [Phase ?]: seed.py's destructive path is gated on the resolved database URI alone — no override variable, no flag, and a test naming an invented bypass variable so nobody adds one later.
- [Phase ?]: reset_destructive drops alembic_version explicitly and rebuilds via the migration chain, never create_all, so the version marker and schema stay in agreement.
- [Phase ?]: Path containment in the dev guard is checked in both POSIX and Windows form — Path.is_absolute() reports False for '/var/lib/x.db' on Windows, which had silently disabled the check.
- [Phase ?]: [Phase 1] is_meetup_head ships with no admin short-circuit and no manage fallback, protected by a docstring, a source assertion that ROLE_ADMIN never appears in it, and a mutation-verified test — reassigning the Meetup Head is a different power from acting as one.
- [Phase ?]: [Phase 1] RBAC-02 is enforced by a test that walks app.url_map every run, with a six-entry frozen LEGACY_COARSE_ROUTES allowlist that never grows and a companion dead-entry test so the allowlist cannot rot into a blanket exemption.
- [Phase ?]: [Phase 1] can_manage_activity reads BOTH activities.org_id and the activity_collaborators rows, because 01-02 made the collaborator table the source of truth while keeping org_id as a cache of the primary.
- [Phase ?]: [Phase 1] The six pre-existing coarse routes were deliberately not retrofitted — a behaviour change with no Phase 1 requirement behind it; RBAC-02 governs endpoints added from this point onward.
- [Phase 2]: Decoupled Auth tokens from database reads by extracting `TermRepository` and `BlocklistRepository`.
- [Phase 2]: Added `is_current` to `Term` model and generated migration `17240eb59839` to track the current term.
- [Phase 2]: Introduced dynamic RBAC predicates (`manageable_orgs`, `manageable_activities`) avoiding token bloat.
- [Phase 2]: Handled role-based capability switching entirely in the frontend using `SessionProvider` and a UI `ViewSwitcher` without server-side token modification.
- [Phase ?]: [Phase 2] locations=["cookies"] on both cookie endpoints is the authoritative server-side fix for the stale-Authorization-header lockout — the frontend needs no change for correctness (T-02-17, mutation-verified).
- [Phase ?]: [Phase 2] The blocklist loader stays a pure predicate; revocation side effects live in auth_service.refresh behind skip_revocation_check=True, which is what makes reuse detection reachable for 02-03.
- [Phase ?]: [Phase 2] The never-500 guard asserts a status set {200,401,422} rather than exact per-state codes, so 02-03's CSRF and reuse work cannot make it brittle.
- [Phase ?]: [Phase 2] D-12's frontend gate exempts exactly one file (src/pages/Orgs.tsx, the admin POR-assignment surface) via a frozen POR_LITERAL_ALLOWLIST with a companion dead-entry test — mirroring Phase 1's LEGACY_COARSE_ROUTES rather than exempting src/pages by pattern, which would have blinded the gate.
- [Phase ?]: [Phase 2] The POR scan reads sources through vite's import.meta.glob('?raw') instead of node:fs, because frontend/ has no @types/node and the test file is inside the tsc -b program — this keeps the runner at exactly the six approved packages.
- [Phase ?]: [Phase 2] The D-02a grace-window replay mints a NEW refresh token in the same family rather than returning the already-issued successor — same no-logout outcome without the server retaining issued tokens; recorded in auth_service.refresh's docstring.
- [Phase ?]: [Phase 2] revoke_family makes the tombstone jti unique by uuid suffix rather than catching IntegrityError, so a second reuse detection or logout on one family cannot 500 (T-02-19) and the extra rows are a truthful audit trail.
- [Phase ?]: [Phase 2] The blocklist-loader efficiency test uses logout as its positive control, not refresh — refresh runs under 02-01's skip_revocation_check and never reaches the loader (probe-verified: 0 calls).
- [Phase ?]: Session expiry travels as router state { from, expired }, never a query parameter
- [Phase ?]: The expiry callback fires from _doRefresh's shared catch, so queued 401s produce one toast
- [Phase ?]: Account and Capabilities live in types.ts as camelCase, adapted once by adaptMe in api.ts

### Pending Todos

None yet.

### Blockers/Concerns

- ~~**Deployment target unconfirmed**~~ RESOLVED 2026-08-06: no live deploy — `.vercel/project.json` is unused leftover, dropped from scope. Course deliverable graded via code + local run. Phase 8 polling design no longer needs to account for a hosted rate-limiter/blocklist store; Phase 2 session design targets local/dev only.
- ~~**No blob storage anywhere**~~ RESOLVED 2026-08-06: poster/receipt uploads (Phase 5 CAMPAIGN-03) land on local filesystem (`backend/instance/uploads`), served via Flask — no cloud provider, no new dependency.
- ~~**QR library conflict**~~ RESOLVED 2026-08-06: research/ARCHITECTURE.md was stale, not a real conflict — research/STACK.md's live-verified picks (`@yudiel/react-qr-scanner` 2.6.0 scan + `qrcode.react` 4.2.0 render) adopted; ARCHITECTURE.md's QR sections updated to match.
- **Progression gating is unvalidated** — the milestone's only feature with no market analogue. Not fixable by investigation; needs real Regional Coordinators. Keeping mitigation as-is: build now, validate in parallel with Phases 1-6. No action pending.
- ~~**Doc drift**~~ RESOLVED 2026-08-06: git archaeology showed `constants.ACTIVITY_FEE_INR` has been 200 since introduction (never 100 in code history) — ₹200 confirmed correct, docs/UI (README, PROJECT.md, Analytics.tsx, CheckIn.tsx, Landing.tsx) updated to match.
- ~~**Requirement count drift**~~ RESOLVED (already fixed at source): REQUIREMENTS.md already states 52 with a correction note; the "51" only survives elsewhere as historical explanation, not a live error.

## Session Continuity

Last session: 2026-08-12T09:37:52.894Z
Stopped at: Completed 02-06-PLAN.md
Resume file: None

Next: `/gsd:next`
