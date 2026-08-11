# Concerns

**Analysis Date:** 2026-08-11

## Technical Debt & Issues
- **Frontend Testing:** No automated testing framework configured for the frontend.
- **Database:** `psycopg2-binary` is commented out in `backend/requirements.txt`, suggesting the app is running on SQLite and may need configuration for production PostgreSQL.
- **Seed Script:** `backend/seed.py.tmp` exists alongside `backend/seed.py`, which might indicate unresolved changes or temporary files tracked in source control.

<!-- refreshed: 2026-08-11 -->
