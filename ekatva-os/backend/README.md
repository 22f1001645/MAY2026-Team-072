# Ekatva OS — Backend API (v1)

Flask 3 REST API for Ekatva OS, built to the **Milestone 2 design**: a three-tier,
layered architecture (**controllers → services → repositories → models**) with
**JWT auth + POR-based RBAC**, Marshmallow validation, and a uniform error envelope.

Dev runs on **SQLite with zero config**; point `DATABASE_URL` at **PostgreSQL 15**
(the design's production store) and nothing else changes.

## Quick start

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate         # Windows PowerShell:  .venv\Scripts\Activate.ps1
pip install -r requirements.txt

python seed.py                 # create tables + seed the demo world
python run.py                  # → http://localhost:5000
```

Run the tests (course deliverable — currently **19 passing, ~85% coverage**):

```bash
pytest                         # coverage gate configured in pytest.ini
```

## Seeded accounts (match the frontend demo logins)

| Role | Email | Password |
|------|-------|----------|
| Admin (pre-provisioned) | `admin@ekatva.os` | `admin123` |
| Organiser (RC POR) | `saiteja@ekatva.os` | `rc12345` |
| Student | `arav@ekatva.os` | `student123` |

## Architecture

```
app/
  __init__.py        app factory: extensions, CORS, JWT handlers, blueprints, errors
  config.py          SQLite dev / Postgres via DATABASE_URL
  constants.py       enums, state machines, points economy, quota rule
  extensions.py      db (SQLAlchemy), jwt
  errors.py          ApiError + { error, code, details? } envelope
  rbac.py            auth_required / admin_required / organiser_required (POR-based)
  models/            18 tables (Milestone 2 §5)
  schemas/           Marshmallow request validation
  repositories/      persistence queries only
  services/          business rules (quotas, approval SM, points, fee utilisation)
  controllers/       Blueprints — one per PRD module (A–H)
seed.py  run.py  tests/
```

Every request passes cross-cutting middleware: **JWT auth** → **POR-RBAC** (deny by
default) → **Marshmallow validation** (422) → central **error envelope**; every state
change (approve, verify, publish) writes an append-only **AuditLog** row.

## Endpoint map (`/api/v1`)

| Module | Method & path | Access | FR |
|--------|---------------|--------|-----|
| A Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` | public / JWT | A1 |
| A Community | `GET /cities` · `GET/POST /orgs` · `POST /orgs/:id/pors` · `GET /pors` | JWT / Admin | A1–A2 |
| B Proposal | `POST /activities` | Organiser | B1 |
| B Approval | `GET /proposals?status=` · `POST /proposals/:id/decision` · `GET /activities/:id/audit` | Admin | B3–B4 |
| C Discovery | `GET /events?city=` · `GET /events/:id` | JWT | C1–C3 |
| D Registration | `POST /events/:id/register` · `GET /me/registrations` | Student | D1 |
| D Attendance | `GET /events/:id/registrations` · `POST /events/:id/attendance` | Organiser | D5–D6 |
| D Notify | `POST /events/:id/broadcast` · `GET /notifications` | Organiser / JWT | D3–D4 |
| E Reimbursement | `POST /expenses` · `GET /events/:id/expenses` · `PATCH /expenses/:id/verify` · `GET /reimbursements` | Organiser / Admin | E2–E4 |
| F Dashboard | `GET /dashboard` | JWT (role-based) | F4 |
| G Recognition | `GET /leaderboard?city=` · `GET /me/points` | JWT | G4–G5 |
| H Analytics | `GET /analytics` · `GET /analytics/fee-utilisation` | Admin | H1–H5 |
| — | `GET /health` | public | — |

## Auth quick reference

```bash
# Log in → copy the access_token
curl -X POST localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ekatva.os","password":"admin123"}'

# Call a protected endpoint
curl localhost:5000/api/v1/analytics -H "Authorization: Bearer <token>"
```

## Notes

- **No real money moves** — reimbursement tracks status only (FR-E6).
- Points are a simple ledger (attend 30 / organise 50 / volunteer 20), computed over
  attendance; analytics and the leaderboard are a **computed lens**, not a second store.
- Passwords are hashed (Werkzeug); JWTs are short-lived. Dev tables are created via
  `create_all()` / `seed.py`; production would use Alembic migrations.
