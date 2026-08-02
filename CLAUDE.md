# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ekatva OS — community operating system for the IIT Madras BS ecosystem (BSCS3001 Software Engineering Project, CodeCrafters · Team-072). Built to the **Unified PRD v2.2** and **Milestone 2 design** docs (see `prod documents/`, gitignored). v1 scope is the **city-meetup lifecycle**: propose → admin approve (audit trail) → auto-publish → discovery feed → register → attendance check-in → points & leaderboard → reimbursement pipeline → community analytics + fee-utilisation.

Two-part monorepo, no shared package/build tooling between the two:

```
frontend/   React 18 + Vite + TypeScript + Tailwind + TanStack Query
backend/    Flask 3 + SQLAlchemy + JWT REST API (SQLite dev / Postgres prod)
```

## Commands

**Backend** (`cd backend`):
```bash
python -m venv .venv && .venv/Scripts/activate      # Windows; macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python seed.py                                      # (re)create tables + seed demo data — destructive, resets the DB
python run.py                                        # → http://localhost:5000
pytest                                                # full suite, coverage gate via pytest.ini (--cov=app --cov-report=term-missing)
pytest tests/test_proposal_flow.py                   # single file
pytest tests/test_proposal_flow.py::test_name -v      # single test
```

**Frontend** (`cd frontend`):
```bash
npm install
npm run dev        # → http://localhost:5173 (expects backend on :5000; VITE_API_URL overrides, see .env.example)
npm run build       # tsc -b && vite build — this is also the type-check step, there is no separate `tsc --noEmit` script
npm run preview
```

There is no lint script configured in either package. Start backend before frontend — pages without a reachable API show an on-brand "backend unavailable" state rather than failing silently.

**Seeded accounts** (same across both, reset any time with `python seed.py`):
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@ekatva.os` | `admin123` |
| Organiser (RC POR) | `saiteja@ekatva.os` | `rc12345` |
| Student | `arav@ekatva.os` | `student123` |

## Backend architecture

Three-tier, one direction of dependency: **controllers (Blueprints) → services → repositories → models**. Cross-cutting concerns run as middleware on every request: JWT auth → POR-RBAC (deny by default) → Marshmallow validation (422 on failure) → central `{ error, code, details? }` error envelope (`app/errors.py`, `ApiError`). Every state-changing action (approve/verify/publish/etc.) writes an append-only `AuditLog` row.

```
backend/app/
  __init__.py     app factory: extensions, CORS, JWT error handlers, blueprint registration
  config.py       Config/TestConfig — SQLite dev default, DATABASE_URL for Postgres, CORS_ORIGINS list
  constants.py    single source of truth for roles, POR types, state machines, points economy, quotas
  rbac.py         auth_required / admin_required / organiser_required decorators
  models/         18 SQLAlchemy models in one __init__.py (User, Organisation, Membership, PORAssignment,
                  Activity, Proposal, BudgetLine, Registration, Attendance, Expense, ContributionPoint,
                  ActivityFeeRecord, AuditLog, etc.)
  schemas/        Marshmallow request validation
  repositories/    persistence queries only — no business logic
  services/       business rules (quota checks, proposal approval state machine, points calc, fee utilisation)
  controllers/    one Blueprint per PRD module (A–H), registered via ALL_BLUEPRINTS
```

**RBAC is POR-driven, not role-driven (PRD principle P3).** There are exactly two login roles — `ROLE_ADMIN` and `ROLE_STUDENT` (`constants.LOGIN_ROLES`) — but a student holding an organiser-capable POR (Regional Coordinator, Society/House Secretary, Deputy House Secretary, Event Lead, Technical Secretary, Web Admin — see `ORGANISER_PORS`) gets organiser surfaces via `organiser_required`, computed from active `PORAssignment` rows at request time, not from a stored role flag. When touching authorization, check `is_organiser()` in `rbac.py` rather than assuming `user.role` is authoritative.

State machines and business constants live in `constants.py` — proposal lifecycle (`draft → submitted → changes_requested/approved/rejected/revoked`), event lifecycle, the 4-stage expense/reimbursement pipeline (`submitted → verified → approved → paid`), the points economy (attended/organised/volunteered), and the one-meetup-per-region-per-month quota. Change business rules there, not inline in services.

Points/leaderboard/analytics are a **computed lens over attendance data**, not a separate ledger store — don't design a second source of truth for them.

Dev tables are created via `db.create_all()` in `seed.py`; there is no Alembic migration setup yet (noted as a production TODO in backend README) — schema changes currently mean editing models and re-running `seed.py` (which wipes and reseeds).

## Frontend architecture

```
frontend/src/
  lib/api.ts       fetch wrapper: base URL (VITE_API_URL), JWT header injection, parses backend's
                   { error, code } envelope into ApiError, snake_case→camelCase adapters (e.g. adaptEvent)
  lib/auth.tsx     AuthProvider/useAuth — JWT stored in localStorage under ekatva_token, session resolved
                   via /auth/me on cold load
  lib/queries.ts   TanStack Query hooks built on lib/api.ts
  lib/types.ts     camelCase domain types the pages render (contrast with the API's snake_case JSON)
  components/ui.tsx        design system primitives (brand tokens)
  components/Layout.tsx    sidebar + role switcher shell
  pages/           13 screens grouped by role, each traceable to a functional requirement (FR-A…H) —
                   see the comment at the top of each page file
  App.tsx          route tree: public routes (/, /login, /register) vs. AppShell (everything else,
                   gated on useAuth().currentUser, redirects to /login with `from` state if absent)
```

Effective role in the UI is derived from the user's PORs, mirroring the backend's POR-driven RBAC — don't gate frontend routes/components on a naive admin/student check without accounting for organiser PORs.

Backend responses are snake_case; page code expects the camelCase shapes in `lib/types.ts`. Do adaptation once in `lib/api.ts` (see `adaptEvent`) rather than in individual pages.

Brand system (Ekatva Teal `#5CE6C9`, Unity Gold `#FFCF96`, Oneness Black `#050505`, Poppins, 8px spacing, Material easing) is encoded as Tailwind tokens in `tailwind.config.js`; primitives in `src/components/ui.tsx`. Match these tokens rather than hardcoding colors/spacing in new components.

## Working guidelines

- **State machines live in `constants.py`, not inline.** Adding a proposal/expense/event status? Edit the state machine there first.
- **RBAC checks POR, not `user.role`.** Use `is_organiser()` / `organiser_required` — never gate on the two login roles directly.
- **Adapt snake_case→camelCase once, in `lib/api.ts`.** Don't reshape backend JSON inside page components.
- **No Alembic yet.** Schema change = edit models + rerun `seed.py` (destructive). Flag this to the user before running it if seed data matters.
- **Match existing brand tokens** (`tailwind.config.js`, `components/ui.tsx`) instead of hardcoding colors/spacing.
- **Minimum diff for the ask.** Don't refactor adjacent controllers/services/pages while fixing one FR. Note unrelated issues, don't fix them inline.
- **Verify with the real gate**: `pytest` (backend) or `npm run build` (frontend, doubles as typecheck) before calling a change done — "looks right" isn't verification.

## Git commit rules

- **Never add a `Co-Authored-By: Claude` (or any AI attribution) trailer.** Proctors/graders fail the team if commits visibly show AI involvement.
- **Write commit messages in normal, full-sentence English — plain human style, no AI-sounding phrasing.** This applies even when the chat session itself is in caveman/fragment mode — that's a chat-reply style, never a commit-message style.
- **Every commit in this repo must be authored as GitHub account `22f1001645`**, not any other account. Repo-local git identity is already set (`git config --local user.name "22f1001645"` / matching noreply email) — verify it resolves before committing, don't rely on global config.
- Why: a past commit had both a Claude co-author trailer and the wrong GitHub author, which got flagged by graders and also blocked Vercel deploys (Hobby plan blocks deploys from commit authors without contributing access).
