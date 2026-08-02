# External Integrations

**Analysis Date:** 2026-08-02

## APIs & External Services

**None detected.** This is a closed-loop monorepo with no third-party API integrations. All functionality is self-contained:
- No payment gateway (reimbursement is status-only, FR-E6)
- No SMS/email service
- No external analytics
- No cloud storage
- No social login providers

Frontend communicates exclusively with the local backend API at `http://localhost:5000/api/v1` (configurable via `VITE_API_URL`).

## Data Storage

**Databases:**
- **Development:** SQLite (`ekatva.db` file in backend root)
  - Auto-created by `db.create_all()` in `run.py`
  - Seeded by `backend/seed.py` on first run
  - Connection: `sqlite:///ekatva.db` (from `app/config.py`)
  - ORM Client: SQLAlchemy (via Flask-SQLAlchemy)

- **Production:** PostgreSQL 15
  - Connection via `DATABASE_URL` environment variable
  - Example format: `postgresql://user:password@host:5432/dbname`
  - Auto-upgrade URLs from Heroku/Render format (`postgres://`) to SQLAlchemy format (`postgresql://`)
  - ORM Client: SQLAlchemy (same as dev)

**Schema:** 18 tables (Milestone 2 §5)
- Models defined in `backend/app/models/` (one file per entity)
- Auto-created via `db.create_all()` at application startup
- No migration framework (Alembic not in use; production should add migrations)

**File Storage:** Not applicable
- No S3, GCS, or local file uploads
- Event cover images are deterministically generated (based on event scale and seed hash in `src/lib/api.ts`)
- No user-uploaded files

**Caching:** Not applicable
- No Redis or Memcached
- TanStack Query handles client-side HTTP cache (30s staleTime default)

## Authentication & Identity

**Auth Provider:** Self-hosted (Flask-JWT-Extended)

**Implementation:**
- No external identity provider (Auth0, Okta, Firebase, etc.)
- Credentials stored in `users` table (password hashed with Werkzeug)
- Login/register endpoints: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
- Token issuance: `access_token` (Bearer JWT, 12-hour expiry)
- Server-side validation: Flask-JWT-Extended middleware

**Authorization Model:** POR-RBAC
- Users have `role` field (`admin`, `organiser`, `student`)
- PORs (Positions of Responsibility) are user-assigned relationships that modify effective role
- RBAC decorators in `backend/app/rbac.py`: `@auth_required`, `@admin_required`, `@organiser_required`
- Frontend role resolution: `src/lib/auth.tsx` (derives UI role from PORs, not login role)

**Token Storage:** Client-side `localStorage`
- Key: `ekatva_token`
- Read/set by `src/lib/api.ts` functions `getToken()` and `setToken()`
- Cleared on logout

## Monitoring & Observability

**Error Tracking:** Not detected
- No Sentry, Rollbar, or similar integration
- Backend errors logged via Flask/Python standard logging (not configured in requirements)
- Frontend errors logged to browser console (no error boundary or crash reporting)

**Logs:**
- Backend: Flask development server prints to stdout (no persistent logging)
- Frontend: Browser console and React DevTools only
- Audit trail: Append-only `AuditLog` table for state changes (approve, verify, publish events)

**No observability SDKs in dependencies.**

## CI/CD & Deployment

**Hosting:** Not configured
- No GitHub Actions, GitLab CI, or other CI/CD pipeline detected
- No Docker, docker-compose, or cloud configuration files
- No deployment scripts

**Expected Deployment (not yet implemented):**
- Backend: Python WSGI server (e.g., Gunicorn, Waitress) on port 5000
- Frontend: Static bundle (output of `npm run build`) served via web server (nginx, Apache, CDN)
- Database: PostgreSQL 15 (separate infrastructure)

**Version Control:**
- Git repo (`.git/` directory present)
- Recent commits show monorepo flattening and React 18 + Vite upgrade

## Environment Configuration

**Required Environment Variables (Backend):**

*Development (minimal - all have safe defaults):*
- None strictly required (uses SQLite + dev secrets)

*Production (must be set):*
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Secret key for Flask sessions (any strong random string)
- `JWT_SECRET_KEY` - Secret key for JWT signing (any strong random string)
- `CORS_ORIGINS` - Comma-separated list of allowed frontend domains (e.g., `https://app.ekatva.os,https://www.ekatva.os`)

**Optional Environment Variables (Backend):**
- `FLASK_ENV` - Set to `production` to disable debug mode (not currently in config)

**Frontend:**
- `VITE_API_URL` - Backend API base URL (default: `http://127.0.0.1:5000/api/v1`)
  - Set this to point to production backend
  - Configurable at build time or runtime via `.env.local`

**Secrets Location:**
- Development: Hardcoded defaults in `backend/app/config.py` (never commit to production)
- Production: Must provide via environment variables or `.env` file (not committed to git)
- No secrets stored in code, configuration files, or git history

## Webhooks & Callbacks

**Incoming Webhooks:** Not implemented
- No external systems call Ekatva OS APIs

**Outgoing Webhooks:** Not implemented
- Backend does not make outbound HTTP requests to external services
- Notifications are in-app only (broadcast via `POST /api/v1/events/:id/broadcast` creates `Notification` records)

**Email/SMS:** Not implemented
- No email service integration
- All user communication is in-app (notifications table)

## Frontend-Backend Contract

**API Base URL:**
- Default: `http://127.0.0.1:5000/api/v1`
- Configurable: `VITE_API_URL` environment variable (checked in `src/lib/api.ts`)

**HTTP Method & Content:**
- Content-Type: `application/json` (set by `src/lib/api.ts`)
- Auth: `Authorization: Bearer <token>` header (JWT token from localStorage)

**Response Envelope:**
```typescript
// Success (2xx):
{ ...responseData }

// Error (4xx/5xx):
{ error: string, code: string, details?: unknown }
```

**Defined Endpoints:** See `backend/openapi.yaml` for full OpenAPI 3.0.3 specification covering:
- Auth (register, login, me)
- Community (cities, orgs, PORs)
- Proposals & Approval
- Event Discovery, Registration, Attendance
- Notifications & Broadcasting
- Reimbursement & Expenses
- Leaderboard & Points
- Analytics & Fee Utilisation

## CORS Configuration

**Backend CORS Allowlist:**
- Configured in `backend/app/__init__.py` via Flask-CORS
- Default: `http://localhost:5173,http://localhost:5174,http://localhost:5175` (local dev)
- Customizable: `CORS_ORIGINS` environment variable (comma-separated)
- Applies to all routes matching `/api/*`

**Frontend Requests:**
- All API calls made via fetch from `src/lib/api.ts`
- No cross-domain cookies; Bearer token only

---

*Integration audit: 2026-08-02*
