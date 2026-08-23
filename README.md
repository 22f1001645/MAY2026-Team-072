# Ekatva OS

> **The Community Operating System for the IIT Madras BS Degree Ecosystem.**  
> *Unite. Inspire. Celebrate.*

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite%20%7C%20TypeScript-61DAFB?logo=react&logoColor=black)](frontend/)
[![Backend](https://img.shields.io/badge/Backend-Flask%203%20%7C%20SQLAlchemy%20%7C%20JWT-000000?logo=flask&logoColor=white)](backend/)
[![API Spec](https://img.shields.io/badge/OpenAPI-3.0.3%20Spec-green?logo=openapi-initiative&logoColor=white)](api-doc.yaml)
[![License](https://img.shields.io/badge/Project-IITM%20BSCS3001%20Team--072-blue)]()

---

## 🌟 Overview

**Ekatva OS** is an enterprise-grade community operating platform engineered for the students, organisers, societies, forest houses, regional chapters, and administrative leadership of the **IIT Madras BS in Data Science and Applications / Electronic Systems** degree programs.

Ekatva OS streamlines the entire end-to-end lifecycle of student initiatives—from collaborative proposals and budget guardrails to AI-driven promotional campaigns, live QR-scanner check-ins, multi-stage expense reimbursements, and gamified recognition.

---

## 🏗️ System Architecture

Ekatva OS is organized as a clean two-part monorepo:

```
ekatva-os/
├── frontend/             # Single-Page Application (SPA)
│   ├── src/
│   │   ├── components/   # Atomic UI system, Modals, Nav, QR Scanner, State views
│   │   ├── pages/        # Route views (Feed, Proposal, ManageEvent, CheckIn, ApprovalQueue, etc.)
│   │   ├── lib/          # API client, TanStack Query hooks, Mock data, Formatters, Types
│   │   └── index.css     # EKATVA design tokens & Tailwind utilities
├── backend/              # Three-tier RESTful API Service
│   ├── app/
│   │   ├── controllers/  # Route blueprints & HTTP serialization (17 modular controllers)
│   │   ├── services/     # Core domain logic & business rules
│   │   ├── repositories/ # Abstracted database queries and mutations
│   │   ├── models/       # SQLAlchemy ORM models (25+ entities)
│   │   ├── schemas/      # Marshmallow request validation & serialization
│   │   └── rbac.py       # Resource-scoped RBAC decorators & capability engine
│   ├── migrations/       # Versioned Flask-Migrate (Alembic) schema revisions
│   ├── run.py            # Development server runner
│   └── seed.py           # Demo environment & reference data provisioner
├── api-doc.yaml          # Complete OpenAPI 3.0.3 API Specification (Root)
└── final-report.html     # Comprehensive visual project deliverable report
```

### Architectural Principles
- **Layered Decoupling:** Controllers handle HTTP only; services encapsulate all business rules; repositories isolate data access.
- **Resource-Scoped RBAC:** Permission predicates verify access at the individual resource level (`can_manage_activity`, `can_manage_org`, `is_meetup_head`).
- **Server-Driven Capability Snapshots:** Organiser state is never hardcoded on the client; capabilities and permissions are computed securely on `/api/v1/auth/me`.
- **Zero-Loss Schema Evolution:** Database changes are tracked with forward-only Alembic migrations configured with batch support for SQLite/PostgreSQL parity.

---

## ✨ Core Feature Highlights

### 1. Proposal & Collaboration Pipeline (Phases 1–3)
- **Multi-Tier Form**: Proposal submission with scale tiering (*Local Meetup*, *Regional Meetup*, *Regional Fest*).
- **Consented Collaboration**: Invite co-organising societies and houses with formal accept/decline workflows.
- **Team Assembly**: Role-based crew delegation (Logistics, Technical, Creative, Registration).
- **Budget Ceilings & Guardrails**: Automatic category-based budget caps with line-item validation.

### 2. Organisation Profiles & Progression Gating (Phase 4)
- **Public Brand Kits**: Customizable brand colors, banner imagery, logos, and verified social channels.
- **Fest Progression Engine**: Automated track-record auditing requiring verified past meetups in a target city before unlocking fest-scale proposal privileges.

### 3. Post-Acceptance Campaign & Operations (Phase 5)
- **AI-Assisted Email Generator**: Automated marketing copy drafting with fallback resilience.
- **Custom Registration Questionnaires**: Dynamic form builder supporting checkboxes, dropdowns, and text prompts.
- **Public Registration Slugs**: Vanity shareable URLs for event registration.
- **Crew Operational Workspace**: Kanban-style task assignment and agenda schedule manager.

### 4. Live Event Execution & Close-Out (Phase 6)
- **High-Speed QR Code Check-In**: Camera-based QR verification and manual attendee roster check-ins opening strictly $T-2\text{h}$ before start time.
- **Push Broadcast Alerts**: Urgent organizer announcements pushed directly to attendee notification centers.
- **Post-Event Reflection**: Two-stage Meetup Head reflection report detailing metrics, learnings, and challenges.
- **5-Star Attendee Feedback**: Real-time rating collection with duplicate prevention.
- **Multi-Stage Reimbursement Pipeline**: Receipt/bill document uploads with four-stage verification (`Submitted` $\rightarrow$ `Verified` $\rightarrow$ `Approved` $\rightarrow$ `Paid`).

### 5. Gamification & Governance
- **Student Contribution Ledger**: Transparent point accumulation for attendees, volunteers (+20 pts), and organizers (+50 pts).
- **City & National Leaderboards**: Real-time ranking feeds.
- **Administrative Telemetry**: Global immutable audit trail and ₹100 Student Activity Fee city-level utilisation metrics.

---

## 🎨 Design System & Aesthetics

Ekatva OS implements a custom luxury dark-mode design system built strictly to the **EKATVA Brand Kit**:

| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Ekatva Teal** | `#5CE6C9` | Primary actions, live indicators, active states |
| **Unity Gold** | `#FFCF96` | Highlights, badges, fest tier accents, warnings |
| **Oneness Black** | `#050505` | Canvas background, deep surfaces |
| **Surface Dark** | `#0f172a` | Glassmorphic card backdrops, modals, inputs |
| **Offwhite** | `#F8FAFC` | High-contrast readable typography |

- **Typography**: Poppins (Headings & Eyebrows) + Inter / System (Data tables & body copy).
- **Micro-Interactions**: Glassmorphic blur backdrops, subtle card borders (`border-white/5`), reactive button active states, and custom animated load states.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **Package Managers**: `npm` and `pip`

---

### Step 1: Start Backend Server

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations and seed demo data
python seed.py

# Launch development server (Runs on port 5000)
python run.py
```

> **Database Seed Modes:**
> - `python seed.py` : Resets database and seeds full demo environment (Dev only).
> - `python seed.py --reference-only` : Non-destructive seed of Forest Houses, Regions, and Cities.

---

### Step 2: Start Frontend Application

In a separate terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server (Runs on port 5173)
npm run dev
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 🔑 Pre-Seeded Demo Accounts

The database comes pre-populated with realistic personas across all ecosystem roles:

| Role / Persona | Email | Password | Access & Responsibilities |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@ekatva.os` | `admin123` | Proposal approvals, POR management, reimbursement verification, global audit logs |
| **Regional Coordinator (POR)** | `saiteja@ekatva.os` | `rc12345` | Organiser workspace, proposal creation, QR check-in, campaign publishing |
| **House Secretary (POR)** | `priya@ekatva.os` | `student123` | Forest house event proposals, crew collaboration |
| **Student Member** | `arav@ekatva.os` | `student123` | Event discovery, one-click registration, attendee feedback, points ledger |

---

## 📖 API Documentation

Complete REST API documentation is available via the OpenAPI 3.0.3 specification file:
- **Root Specification**: [api-doc.yaml](api-doc.yaml)
- **Backend Specification**: [backend/api-doc.yaml](backend/api-doc.yaml)

### Summary of API Endpoints

```
Auth & Identity            POST   /api/v1/auth/login
                           POST   /api/v1/auth/register
                           POST   /api/v1/auth/refresh
                           GET    /api/v1/auth/me
                           PATCH  /api/v1/auth/me/profile
                           PATCH  /api/v1/auth/academic-status

Community & Governance     GET    /api/v1/cities
                           GET    /api/v1/orgs
                           POST   /api/v1/orgs
                           GET    /api/v1/houses
                           GET    /api/v1/regions
                           GET    /api/v1/pors
                           POST   /api/v1/orgs/{id}/pors
                           PATCH  /api/v1/pors/{id}/deactivate

Org Profiles (Phase 4)     GET    /api/v1/orgs/{id}/profile
                           PATCH  /api/v1/orgs/{id}/profile
                           POST   /api/v1/orgs/{id}/logo
                           PUT    /api/v1/orgs/{id}/social-links
                           GET    /api/v1/orgs/{id}/progression

Proposals & Feed           POST   /api/v1/activities
                           GET    /api/v1/proposals
                           POST   /api/v1/proposals/{id}/decision
                           GET    /api/v1/events
                           GET    /api/v1/events/{id}
                           PUT    /api/v1/events/{id}
                           DELETE /api/v1/events/{id}

Registrations & Check-In   POST   /api/v1/events/{id}/register
                           GET    /api/v1/events/{id}/registrations
                           POST   /api/v1/events/{id}/attendance
                           POST   /api/v1/events/{id}/scan
                           POST   /api/v1/events/{id}/broadcast

Campaigns (Phase 5)        GET    /api/v1/activities/{id}/campaign
                           POST   /api/v1/activities/{id}/campaign/generate-slug
                           POST   /api/v1/activities/{id}/campaign/poster
                           POST   /api/v1/activities/{id}/campaign/generate-mail
                           POST   /api/v1/activities/{id}/campaign/push-live
                           GET    /api/v1/activities/{id}/form-fields

Tasks & Schedules          GET    /api/v1/activities/{id}/schedule
                           POST   /api/v1/activities/{id}/schedule
                           GET    /api/v1/activities/{id}/tasks
                           POST   /api/v1/activities/{id}/tasks
                           GET    /api/v1/activities/{id}/timeline

Expenses & Reports         POST   /api/v1/expenses
                           PATCH  /api/v1/activities/{id}/expenses
                           POST   /api/v1/activities/{id}/expenses/bill
                           PATCH  /api/v1/expenses/{id}/verify
                           POST   /api/v1/activities/{id}/report
                           POST   /api/v1/activities/{id}/feedback
```

---

## 🧪 Testing & Verification

Both frontend and backend suites maintain rigorous test coverage:

### Backend Pytest Suite
```bash
cd backend
pytest -v
```
- Tests cover JWT rotation, multi-tab grace periods, resource-scoped authorization decorators, proposal quota enforcement, QR scanning, and multi-stage expense state machines.

### Frontend Vitest Suite
```bash
cd frontend
npm run test
```
- Component tests, router guard assertions, capability contract adapters, and state mutation verifications.

---

## 👥 Engineering Team

**Team-072 · CodeCrafters**  
*BSCS3001 Software Engineering Project — May 2026 Term*  
*IIT Madras BS Degree in Data Science & Applications*

- **Atharva Shree**
- **Harsh Raj**
- **Kavya Jain**
- **Mili Parashar**
- **Vishal Bhandari**

---

<div align="center">
  <sub>Built with ❤️ for the IIT Madras BS Community Ecosystem.</sub>
</div>
