# Technology Stack

**Analysis Date:** 2026-08-02

## Languages

**Primary:**
- TypeScript 5.6.2 - Frontend (React SPA)
- Python 3 - Backend (Flask API)

**Secondary:**
- JavaScript - Build tools (Vite, PostCSS, Tailwind)
- CSS - Styling (Tailwind CSS + PostCSS)

## Runtime

**Frontend Environment:**
- Node.js (version managed by project, no .nvmrc/engines field specified)
- Package Manager: npm (lockfile: `package-lock.json` present)

**Backend Environment:**
- Python 3 (version unspecified in requirements.txt)
- Virtual Environment: `.venv/` directory expected
- Entrypoint: `python run.py` (dev) or `gunicorn` (production implied)

## Frameworks

**Frontend:**
- React 18.3.1 - UI library and component model
- Vite 5.4.8 - Build tool and dev server (port 5173)
- React Router 6.26.2 - Client-side routing
- Vite React Plugin (@vitejs/plugin-react 4.3.1) - JSX/Fast Refresh support

**Backend:**
- Flask 3.0.3 - HTTP framework, WSGI application
- Flask-SQLAlchemy 3.1.1 - ORM/database abstraction
- Flask-JWT-Extended 4.6.0 - JWT authentication (Bearer tokens)
- Flask-CORS 4.0.1 - Cross-Origin Resource Sharing

**Styling:**
- Tailwind CSS 3.4.13 - Utility-first CSS framework
- PostCSS 8.4.47 - CSS transformation pipeline
- Autoprefixer 10.4.20 - CSS vendor prefixes

**Data Management:**
- TanStack React Query 5.101.4 - Server state (caching, retries, invalidation)
- Marshmallow 3.22.0 - Backend request/response serialization & validation

**Geospatial:**
- React Simple Maps 3.0.0 - Map rendering component
- D3-Geo 3.1.1 - Geospatial projection and topology

## Key Dependencies

**Critical Backend:**
- Werkzeug 3.0.3 - WSGI utilities and password hashing (via Flask)
- SQLAlchemy (via Flask-SQLAlchemy) - Database ORM for 18-table schema
- Flask-JWT-Extended - JWT creation, validation, and error handlers

**Critical Frontend:**
- React 18 - Component lifecycle, hooks, state management
- TanStack Query - Server state cache (prevents N+1 queries, enables optimistic updates)
- TypeScript - Type safety for 13-screen multi-role SPA

**Testing:**
- pytest 8.3.2 - Test runner
- pytest-cov 5.0.0 - Coverage reporting

**Development Utilities:**
- python-dotenv 1.0.1 - Environment variable loading from `.env`

## Configuration

**Backend Environment Variables:**

*Development (SQLite zero-config):*
- `DATABASE_URL` - Optional; defaults to `sqlite:///ekatva.db` in project root
- `SECRET_KEY` - Optional; defaults to dev fallback (hardcoded)
- `JWT_SECRET_KEY` - Optional; defaults to dev fallback (hardcoded)
- `CORS_ORIGINS` - Optional; defaults to `http://localhost:5173,http://localhost:5174,http://localhost:5175`

*Production (PostgreSQL):*
- `DATABASE_URL` - PostgreSQL 15 connection string (e.g., `postgresql://user:pwd@host/db`)
  - Supports Heroku/Render style `postgres://` URLs (auto-converted to SQLAlchemy format)
- `SECRET_KEY` - Cryptographic key for Flask sessions
- `JWT_SECRET_KEY` - Key for signing JWT tokens (12-hour expiry hardcoded in `config.py`)
- `CORS_ORIGINS` - Comma-separated list of allowed frontend origins

**Frontend Environment Variables:**
- `VITE_API_URL` - Backend API base URL (defaults to `http://127.0.0.1:5000/api/v1`)
  - Used in `src/lib/api.ts` for all HTTP requests
  - Configurable via `.env.local` or CI/CD build args

**Config Files:**
- Backend: `app/config.py` - Hardcoded defaults, environment overrides
- Frontend: `vite.config.ts` - Dev server (port 5173), React plugin
- Frontend: `tsconfig.json` - Target ES2020, strict mode, path aliases (`@/*`)
- Frontend: `tailwind.config.js` - Brand color tokens, custom typography, animations
- Frontend: `postcss.config.js` - Tailwind + Autoprefixer pipeline
- Backend: `pytest.ini` - Test discovery (tests/), coverage thresholds

## Database

**Development:**
- SQLite file (`ekatva.db`)
- Schema: 18 tables (auto-created via SQLAlchemy `db.create_all()` in `run.py`)
- Seeded via `seed.py` (creates demo data for all roles)

**Production:**
- PostgreSQL 15
- Connection via `DATABASE_URL` environment variable
- Schema created via Alembic migrations (not yet implemented - uses `create_all()` in dev)

**ORM:**
- SQLAlchemy via Flask-SQLAlchemy
- Models in `app/models/` (one table per file, imported by `__init__.py`)

## Authentication & Security

**Auth Method:** JWT (JSON Web Tokens)
- Issued by `POST /api/v1/auth/login` and `POST /api/v1/auth/register`
- Token stored client-side in `localStorage` (key: `ekatva_token`)
- Attached to requests via `Authorization: Bearer <token>` header
- Server-side validation via Flask-JWT-Extended middleware

**Token Lifespan:** 12 hours (hardcoded in `app/config.py`: `JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)`)

**Authorization Model:** POR-RBAC (Position of Responsibility based Role Based Access Control)
- Roles: `admin`, `organiser`, `student`
- UI role derived from user's POR assignments (not login role)
- Decorators: `@auth_required`, `@admin_required`, `@organiser_required` in `app/rbac.py`

**Password Hashing:** Werkzeug (via Flask default)

## Build & Dev Tools

**Frontend Build:**
- Command: `npm run build` - Produces optimized Vite bundle
- TypeScript check: `tsc -b` (run before Vite bundle)
- Dev server: `npm run dev` (Vite on port 5173 with React Fast Refresh)
- Preview: `npm run preview` (local production bundle preview)

**Backend Build:**
- No build step; pure Python
- Dev: `python run.py` (Flask debug mode on port 5000)
- Test: `pytest` (discovers tests/, runs coverage gate)

## Platform Requirements

**Development:**
- Node.js + npm (any recent version; no .nvmrc lock)
- Python 3.x + pip (any recent version)
- SQLite (included in Python stdlib)
- Supported OS: Windows, macOS, Linux

**Production:**
- Python 3.x application server (e.g., Gunicorn, Waitress)
- PostgreSQL 15+ database
- Static file server for frontend bundle (e.g., nginx, CDN)
- Secrets management (`.env` via environment variables or secret store)

**API Server:**
- Listens on `http://0.0.0.0:5000` (dev)
- Expected by frontend as `http://localhost:5000/api/v1`

---

*Stack analysis: 2026-08-02*
