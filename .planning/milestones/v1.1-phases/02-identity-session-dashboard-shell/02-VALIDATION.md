---
phase: 2
slug: identity-session-dashboard-shell
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

### Backend (exists)

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3.2 + pytest-cov 5.0.0 |
| **Config file** | `backend/pytest.ini` — `testpaths = tests`, `addopts = -q --cov=app --cov-report=term-missing` |
| **Quick run command** | `cd backend && pytest tests/test_auth_session.py -x -q` |
| **Full suite command** | `cd backend && pytest` |
| **Fixtures** | `backend/tests/conftest.py` — `app`, `client`, `admin_headers` / `rc_headers` / `student_headers` / `crew_headers` / `meetup_head_headers` |

### Frontend (**does not exist — largest Wave 0 gap**)

`frontend/package.json` has no test script and no test dependency of any kind. Scripts are exactly `dev`, `build`, `preview`. This blocks **D-12** and **D-18** outright.

| Property | Value |
|----------|-------|
| **Framework** | vitest **3.2.7** (pinned) + jsdom **26.1.0** (pinned) |
| **Config file** | none — Wave 0 installs (`frontend/vitest.config.ts`) |
| **Quick run command** | `cd frontend && npx vitest run <file>` |
| **Full suite command** | `cd frontend && npx vitest run && npm run build` |

**Version pins are mandatory, not preference** — both naive picks are broken against this repo:

| Package | Naive pick | Why it fails | Use |
|---------|-----------|--------------|-----|
| vitest | 4.1.10 | peer `vite: ^6\|^7\|^8`; repo resolves vite 5.4.21 | **3.2.7** |
| jsdom | 30.0.1 | engines `node: ^22.22.2\|^24.15.0\|>=26`; local node v20.16.0 | **26.1.0** |
| @testing-library/react | 16.3.2 | needs `@testing-library/dom ^10` as an explicit peer install | 16.3.2 + `@testing-library/dom` 10.4.1 |

All are devDependencies, so the UI-SPEC's "zero new runtime dependencies" still holds.

---

## Sampling Rate

- **After every task commit:** `cd backend && pytest tests/<module touched> -x -q`
- **After every plan wave:** `cd backend && pytest` **and** `cd frontend && npx vitest run && npm run build`
- **Before `/gsd-verify-work`:** both suites green and `npm run build` (`tsc -b && vite build`) clean
- **Max feedback latency:** ~30 seconds for the per-task quick run

---

## ⚠ Migration correctness — GSD's schema gate does NOT cover this stack

GSD's schema-push detection recognises Payload / Prisma / Drizzle / Supabase / TypeORM patterns only. This project uses **Flask-Migrate / Alembic**, so that automated protection **does not fire**. Migration safety here is carried entirely by the tests below — they are load-bearing, not nice-to-have.

**Phase 1 left a gate that must not be reopened.** `backend/tests/test_migrations.py` holds `PENDING_BATCH_TABLES = frozenset()` and `PENDING_BATCH_COLUMNS = frozenset()`, both deliberately empty, commented *"THE WINDOW IS CLOSED… any model changed from here on without a migration fails `test_models_match_migrations_no_drift`."* Declaring the `terms` model or the two `refresh_token_blocklist` columns **without generating the revision will fail the suite**. Do not re-add entries to the allowlist to make it pass.

| Check | Command / assertion |
|-------|--------------------|
| Existing gate still green | `pytest tests/test_migrations.py -q` — all four tests |
| Upgrade applies on a **populated** DB | Seed users + a POR, `flask db upgrade`, assert row count unchanged and `academic_*` values preserved |
| Downgrade works | `upgrade` → `downgrade` → assert `terms` gone and both blocklist columns gone, no orphan rows |
| Nullable rule (D-23) | `terms` is a new table (rule N/A); both new `refresh_token_blocklist` columns report `nullable=True` via `sa.inspect().get_columns()` |
| Single head | `flask db heads` returns exactly one revision; `down_revision` is `213804635519` |

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| AUTH-01 | Login sets httpOnly refresh cookie; `/auth/refresh` returns a new access token | integration | `pytest tests/test_auth_session.py -k refresh -x` | ❌ W0 | ⬜ pending |
| AUTH-01 | Refresh cookie is **not** a session cookie (`Max-Age` present) — guards criterion 1 | integration | `pytest tests/test_auth_session.py -k max_age -x` | ❌ W0 | ⬜ pending |
| AUTH-01 | Rotation: old `jti` blocklisted, new token differs | integration | `pytest tests/test_auth_session.py -k rotation -x` | ❌ W0 | ⬜ pending |
| AUTH-01 | Reuse detection: replaying a rotated token revokes the family; a later valid successor is also rejected | integration | `pytest tests/test_auth_session.py -k reuse -x` | ❌ W0 | ⬜ pending |
| AUTH-01 | Grace window (D-02a): a replay inside ~10s re-issues rather than revoking | integration | `pytest tests/test_auth_session.py -k grace -x` | ❌ W0 | ⬜ pending |
| AUTH-01 | CSRF: `POST /auth/refresh` without `X-CSRF-TOKEN` → 401 | integration | `pytest tests/test_auth_session.py -k csrf -x` | ❌ W0 | ⬜ pending |
| AUTH-01 | Blocklist loader does **not** query the DB for access tokens | unit | `pytest tests/test_auth_session.py -k loader_short_circuit -x` | ❌ W0 | ⬜ pending |
| AUTH-02 | `/auth/me` returns `is_organiser` + `manageable_org_ids` + `manageable_activity_ids` | integration | `pytest tests/test_capabilities.py -x` | ❌ W0 | ⬜ pending |
| AUTH-02 | Capabilities recomputed live — deactivating a POR flips `is_organiser` with no new token | integration | `pytest tests/test_capabilities.py -k live -x` | ❌ W0 | ⬜ pending |
| AUTH-02 | No capability data in the JWT (D-11) — decode access token, assert absence | unit | `pytest tests/test_capabilities.py -k no_claims -x` | ❌ W0 | ⬜ pending |
| AUTH-03 | Both new POR types in `ORGANISER_PORS` **and** `ORG_MANAGER_PORS` | unit | `pytest tests/test_rbac_predicates.py -k new_por -x` | ❌ W0 | ⬜ pending |
| AUTH-03 | All four of Deputy House Secretary / Web Admin / Society Deputy Secretary / Coordinator get the organiser surface (criterion 3) | integration | `pytest tests/test_capabilities.py -k por_matrix -x` | ❌ W0 | ⬜ pending |
| AUTH-04 | Staleness computed from the `terms` table, not a rolling window | unit | `pytest tests/test_academic_status.py -k stale -x` | ❌ W0 | ⬜ pending |
| AUTH-04 | Decoupling: neither login nor refresh branches on academic fields — a withdrawn/stale user still logs in and refreshes | integration | `pytest tests/test_academic_status.py -k decoupled -x` | ❌ W0 | ⬜ pending |
| AUTH-04 | Admin override writes an `audit_log` row carrying actor, target, old and new | integration | `pytest tests/test_academic_status.py -k override_audit -x` | ❌ W0 | ⬜ pending |
| DASH-01 | Identical responses under student vs organiser view (D-18) | integration | `pytest tests/test_view_switcher.py -x` | ❌ W0 | ⬜ pending |
| DASH-01 | View value never appears in any header / query / body | frontend | `npx vitest run src/lib/__tests__/view-not-sent.test.ts` | ❌ W0 | ⬜ pending |
| D-12 | No POR-type string literal anywhere in `frontend/src` | frontend | `npx vitest run src/__tests__/no-por-literals.test.ts` | ❌ W0 | ⬜ pending |
| D-14 | Audit reports `PORAssignment` rows matching neither POR set | integration | `pytest tests/test_por_audit.py -x` | ❌ W0 | ⬜ pending |
| D-23 | Migration applies on a populated DB, downgrades cleanly, drift gate green | integration | `pytest tests/test_migrations.py -q` | ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm i -D vitest@3.2.7 jsdom@26.1.0 @testing-library/react@16.3.2 @testing-library/dom@10.4.1 @testing-library/jest-dom @testing-library/user-event`
- [ ] `frontend/vitest.config.ts` (or a `test` block in `vite.config.ts`) with `environment: 'jsdom'`
- [ ] `"test": "vitest run"` script in `frontend/package.json`
- [ ] `frontend/src/test/setup.ts` — jest-dom matchers
- [ ] `backend/tests/test_auth_session.py` — stubs for AUTH-01
- [ ] `backend/tests/test_capabilities.py` — stubs for AUTH-02, AUTH-03
- [ ] `backend/tests/test_academic_status.py` — stubs for AUTH-04
- [ ] `backend/tests/test_view_switcher.py` — stubs for DASH-01
- [ ] `backend/tests/test_por_audit.py` — stubs for D-14
- [ ] Extend `backend/tests/conftest.py` — a cookie-aware client fixture, and a `terms` seed fixture (the existing `_seed_minimal` creates no terms rows)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Switcher segments do not wrap or clip inside the 256px sidebar rail | DASH-01 / UI-SPEC S1 | Visual geometry — measured, not proven | Load an organiser account at 320px, 768px and 1440px viewports; confirm neither segment wraps or clips |
| Banner + switcher + nav + page title coexist without displacement | AUTH-04 / UI-SPEC S4 | Composed-layout visual | At 768px height with the switcher present, confirm the sidebar gains no scrollbar and `mb-6` keeps the banner clear of `SectionTitle` |
| Admin-override header truncates a long name/email rather than overflowing | D-22 / UI-SPEC S6 | Visual, depends on real data widths | Open the override dialog for a user with a long name and email; confirm each truncates on its own line within `max-w-md` with the full value in `title` |
| Session survives a full browser quit and relaunch | AUTH-01 / criterion 1 | Requires real browser lifecycle, not a test client | Log in, fully quit the browser, relaunch, load the app; confirm still logged in (this is the `JWT_SESSION_COOKIE` trap, D-05b) |

*These three visual rows correspond to the UI-SPEC's `verification: backstop` items — absent evidence must fail as `insufficient_spec`, never pass silently.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags (`vitest run`, never bare `vitest`)
- [ ] Feedback latency < 30s for per-task runs
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
