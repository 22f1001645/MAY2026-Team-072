# Structure

**Analysis Date:** 2026-08-11

## Top-Level Layout
- `frontend/` - React/Vite SPA
- `backend/` - Flask API application
- `.planning/` - GSD project planning and context

## Backend (`backend/`)
- `app/` - Core application logic, models, routes
- `instance/` - Instance-specific data (e.g., local SQLite DBs)
- `migrations/` - Alembic/Flask-Migrate scripts
- `tests/` - Pytest suites
- `run.py` - Application entry point
- `seed.py` - Database seeding script

## Frontend (`frontend/`)
- `src/` - React components, pages, hooks, utils
- `public/` - Static assets
- `dist/` - Build output

<!-- refreshed: 2026-08-11 -->
