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

## Database migrations

Schema changes go through **Flask-Migrate (Alembic)** — editing a model and rerunning the
destructive `seed.py` is no longer the way to change the schema. `migrations/` is committed
to git, so every revision is a reviewable diff.

```bash
cd backend
flask db migrate -m "describe the change"   # autogenerate a revision from the models
flask db upgrade                            # apply pending revisions (safe to rerun; no-op at head)
flask db downgrade                          # step back one revision — DEVELOPMENT ONLY
```

`flask db current` prints the revision the database sits at. The Flask CLI finds the app via
`.flaskenv` (`FLASK_APP=run.py`), which is committed.

## Optional environment variables

Both are server-side only. Never re-expose either under a `VITE_*` name — Vite inlines
those into the client bundle.

| Variable | Unset behaviour |
|---|---|
| `GEMINI_API_KEYS` | Comma-separated **pool** of Gemini keys. Unset (and no `GEMINI_API_KEY`): AI-drafted brand kit and campaign mail answer 503, and the assistant falls back to deterministic answers. |
| `GEMINI_API_KEY` | The original single-key form. Still supported, and appended to the pool above, so an existing setup needs no change. |
| `GEMINI_MODEL` | Defaults to `gemini-3.6-flash`. |
| `MAPPLS_CLIENT_ID` + `MAPPLS_CLIENT_SECRET` | Venue autocomplete is off; `GET /venues/autocomplete` answers 501 and the proposal form's venue field behaves as a plain text input. Both are required — one alone counts as unset. |

The app is fully usable with none of them set, which is how it should be run by anyone
who has not signed up for those services.

### Gemini key pool and failover

A free-tier Gemini key has a small daily quota and a per-minute rate limit. With one
key, the first hit of either turns every AI surface into a 503 for the rest of the day —
which during a demo reads as "the feature is broken" rather than "the quota is spent".

So `GEMINI_API_KEYS` takes a list, tried in order:

```bash
GEMINI_API_KEYS=key_one,key_two,key_three
```

`app/services/gemini.py` calls them in order. When one answers with a quota or
rate-limit error it is parked for 15 minutes and the next key answers **inside the same
request** — the caller never sees the switch, and no error reaches the user. A parked
key is retried after its cooldown rather than discarded, because per-minute limits clear
in a minute and daily quotas clear overnight.

Two things deliberately do *not* rotate:

- **Non-quota failures.** A safety block, a malformed request or a dead network fails
  identically on every key, so retrying would turn one bad request into an outage.
- **Nothing, once the pool is dry.** When every key is exhausted the caller degrades on
  its own terms — the assistant answers from its keyword catalogue and says so, rather
  than erroring.

A note on the model: `gemini-2.5-flash` was the previous default, but Google now refuses
it for keys issued after its deprecation, returning a 404 on the *model* rather than an
auth error on the key. The default is now `gemini-3.6-flash`.

### Venue autocomplete setup (Mappls)

Mappls issues no static API key. Create an account at
<https://apis.mappls.com/console/>, create a project, and copy its **`client_id`** and
**`client_secret`** — not the "REST API key", which belongs to a different auth path.
`venue_service` exchanges the pair for a bearer token (valid ~24h) and caches it, so
the token endpoint is hit about once a day per process rather than per request.

```bash
export MAPPLS_CLIENT_ID=...
export MAPPLS_CLIENT_SECRET=...
```

Never commit these and never re-expose them under a `VITE_*` name — Vite inlines those
into the client bundle, which would hand the credential to every visitor. Rejected
credentials degrade the same way as an outage: the field keeps working as plain text.

**`downgrade` is a development-only affordance.** It is never part of a deployment step: on
SQLite a downgrade is executed as a table copy, and rolling one back against real data is a
data-loss risk rather than a rollback strategy. To undo a bad revision in production, write a
new forward revision.

Two details make this work and must not be edited casually:

- `app/extensions.py` attaches a `NAMING_CONVENTION` to `db.metadata`, so every constraint has
  a deterministic name. SQLite batch migrations can only reflect and recreate constraints that
  are named. This convention landed in the same commit that added Flask-Migrate, before the
  first revision existed; changing it now would mean rewriting migration history.
- `app/__init__.py` initialises Flask-Migrate with `render_as_batch=True`, which is what makes
  `ALTER`/`DROP COLUMN` possible on SQLite at all, and `compare_type=True` so autogenerate
  notices column type changes.

## Database migrations & seeding

### The milestone v1.1 schema landed as one batch

There are exactly two revisions, and there is no third one coming for this milestone:

| Revision | What it is |
|---|---|
| `312ea9fc2c96` | baseline — the 18 tables that existed before Flask-Migrate |
| `213804635519` | **the milestone v1.1 batch** — 16 new tables and 11 new columns, in a single revision |

The whole milestone schema was declared up front and migrated once, on purpose. Per-feature
schema changes would have cost a destructive wipe per feature across five developers; one batch
costs one. **To pick it up, you run one command:**

```bash
cd backend
flask db upgrade
```

That is the entire upgrade path, and it is safe on a database that already has your data — the
11 new columns are all either nullable or carry a `server_default`, so existing rows are
backfilled rather than rejected. **No destructive reset is required for this milestone**, and no
later phase in this milestone should ask you for one. If a future phase does need a schema
change, it writes a new forward revision; it does not reseed.

### Seeding

`seed.py` has two modes, and only one of them destroys anything:

```bash
python seed.py                    # DESTRUCTIVE — drops everything, re-runs the migration
                                  # chain, then seeds reference + demo data
python seed.py --reference-only   # safe & idempotent — Houses, Regions and Cities only,
                                  # no user accounts, no data destroyed, re-runnable anywhere
```

The destructive path refuses to run against anything that is not a local SQLite file under
`backend/`. That refusal reads the resolved `SQLALCHEMY_DATABASE_URI` and nothing else — there
is deliberately **no environment variable and no flag that turns it off**, because a production
Postgres URL and a dev SQLite URL are one `export` apart, and a guard with an escape hatch is
not a guard. `--reference-only` is unguarded precisely because it is non-destructive: reference
data is meant to be seedable against a real deployment.

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
