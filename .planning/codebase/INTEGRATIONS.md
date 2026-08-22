# Integrations

**Analysis Date:** 2026-08-11

## Databases
- **SQL Database:** Uses SQLAlchemy (likely SQLite for dev, PostgreSQL supported via `psycopg2-binary` which is commented out in `backend/requirements.txt`)

## External APIs & Services
- None explicitly identified in basic dependencies, though `react-simple-maps` and `d3-geo` might load topojson data (e.g. `frontend/extract_topo.py`).

## Authentication Providers
- Custom JWT auth using `Flask-JWT-Extended`.

<!-- refreshed: 2026-08-11 -->
