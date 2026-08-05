# Ekatva OS

> The Community Operating System for the IIT Madras BS ecosystem.
> **Unite. Inspire. Celebrate.**

The v1 **city-meetup lifecycle** built end-to-end for the BSCS3001 Software
Engineering Project (CodeCrafters · Team-072), to the Unified PRD v2.2 and the
Milestone 2 design. This repo is a two-part monorepo:

```
├── frontend/   React 18 + Vite + TypeScript + Tailwind (+ TanStack Query)
└── backend/    Flask 3 + SQLAlchemy + JWT REST API (SQLite dev / Postgres prod)
```

## Run it (two terminals)

**1 · Backend** (start first — the frontend expects it on `:5000`):

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python seed.py                  # create + seed the demo world
python run.py                   # → http://localhost:5000
pytest                          # 19 tests, ~85% coverage
```

**2 · Frontend:**

```bash
cd frontend
npm install
npm run dev                     # → http://localhost:5173
```

## Seeded accounts

| Role | Email | Password |
|------|-------|----------|
| Admin (pre-provisioned) | `admin@ekatva.os` | `admin123` |
| Organiser (RC POR) | `saiteja@ekatva.os` | `rc12345` |
| Student | `arav@ekatva.os` | `student123` |

## What's inside

- **Full v1 spine, end to end:** propose → admin approve (audit trail) →
  auto-publish → city discovery feed → register → attendance check-in →
  points & leaderboard → reimbursement pipeline → community analytics + ₹100
  fee-utilisation.
- **Three role surfaces** (Student · Organiser · Admin), POR-driven — a student
  holding a Regional-Coordinator POR sees the organiser surfaces (PRD P3).
- **Real auth:** JWT login/register; RBAC enforced at the API.
- **Design system** straight from the EKATVA Brand Kit (Ekatva Teal `#5CE6C9`,
  Unity Gold `#FFCF96`, Oneness Black `#050505`, Poppins).

See `frontend/README.md` and `backend/README.md` for detail and the endpoint map.

**Team-072:** Atharva Shree · Harsh Raj · Kavya Jain · Mili Parashar · Vishal Bhandari
