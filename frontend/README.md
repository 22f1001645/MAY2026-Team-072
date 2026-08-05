# Ekatva OS — v1 Frontend

> The Community Operating System for the IIT Madras BS ecosystem.
> **Unite. Inspire. Celebrate.**

This is the **v1 frontend prototype** for Ekatva OS (CodeCrafters · Team-072), built to the
**Milestone 2 design spec** and styled end-to-end to the **EKATVA Brand Kit & Design System v1.0**.
It renders the full v1 city-meetup lifecycle — one event object seen from three faces
(Student, Organiser, Admin) — with realistic mock data. No backend required.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (production bundle) · `npm run preview`.

## Tech stack

Matches the Milestone 2 design doc (frontend half):

- **React 18 + Vite + TypeScript**
- **Tailwind CSS** with brand tokens (teal / gold / onyx, Poppins, 8px system)
- **React Router** with role-based navigation
- **TanStack Query** for server state (fetch cache, retries, invalidation)

The SPA talks to the **live backend API** — `src/lib/api.ts` (fetch wrapper: base
URL, JWT, `{ error, code }` envelope) and `src/lib/queries.ts` (query/mutation hooks).
**Run the backend first** (below); the app expects it on `:5000`. If it's down, pages
show an on-brand "backend unavailable" state.

## Backend (run this first)

The **Flask 3 + SQLAlchemy + JWT** REST API lives in [`backend/`](backend/) — layered
controllers → services → repositories → models, POR-based RBAC, the 18-table schema,
a seed that mirrors this frontend, and a passing pytest suite (~85% coverage).

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
python seed.py && python run.py     # → http://localhost:5000
```

See [backend/README.md](backend/README.md) for the full endpoint map. Point the
frontend elsewhere with `VITE_API_URL` (see `.env.example`).

## Auth flow

The app has a public front (`/` landing → `/login` / `/register`) and a protected
interior. Auth is **real JWT** against the backend: `/auth/login` and `/auth/register`
return an access token (stored in `localStorage` as `ekatva_token`); on cold load the
session is resolved via `/auth/me`.

- **Login** (`/login`) posts credentials to the API and drops you on the right
  dashboard for your role.
- **Register** (`/register`) creates a **new Student** account (organiser access is an
  Admin-assigned POR, per the PRD — not self-service) and signs you straight in.
- The UI is **POR-driven** (principle P3): the effective role is derived from your
  PORs — a student holding a Regional-Coordinator POR sees the organiser surfaces.

### Seeded accounts (also tap-to-login on the login screen)

| Role | Email | Password |
|------|-------|----------|
| **Admin** (pre-provisioned) | `admin@ekatva.os` | `admin123` |
| **Organiser** (RC POR) | `saiteja@ekatva.os` | `rc12345` |
| **Student** | `arav@ekatva.os` | `student123` |

> Reset the world any time with `python seed.py` in `backend/`.

## The 13 screens (per Milestone 2 §8)

| Role | Screens |
|------|---------|
| **Student** | Discovery feed · Event detail + register · My registrations · Leaderboard / points · Notifications |
| **Organiser** | Dashboard · New proposal (+ budget) · Registrations & tasks · Reimbursement tracker · Attendance check-in |
| **Admin** | Approval queue (+ audit trail) · Reimbursement verification · Community analytics + fee utilisation · Orgs, PORs & cities |

Every screen traces to a functional requirement (FR-A…H) — see comments in each page file.

## Brand system

All colours, type and motion come straight from the brand kit:

- **Ekatva Teal `#5CE6C9`** — interactive elements, CTAs, links
- **Unity Gold `#FFCF96`** — headings, warmth, celebration
- **Oneness Black `#050505`** — grounding background
- **Poppins** type hierarchy · 8px spacing · Material easing `cubic-bezier(0.4, 0, 0.2, 1)`
- Mandala/oneness motif, gradient blends, fade-up reveals, film-grain texture

Tokens live in `tailwind.config.js`; primitives in `src/components/ui.tsx`.

## Project structure

```
src/
  components/   Layout (sidebar + role switcher), ui.tsx (design system)
  lib/          types, mock data, session context, formatting helpers
  pages/        13 screens grouped by role
  App.tsx       route tree
```
