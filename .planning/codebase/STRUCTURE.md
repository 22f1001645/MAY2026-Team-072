# Codebase Structure

**Analysis Date:** 2026-08-02

## Directory Layout

```
ekatva-os/                                # Project root
├── backend/                               # Flask backend server
│   ├── app/
│   │   ├── __init__.py                    # App factory (create_app)
│   │   ├── config.py                      # Configuration (dev/prod)
│   │   ├── constants.py                   # Domain enums & business rules
│   │   ├── errors.py                      # Error handling & envelope
│   │   ├── extensions.py                  # Flask extensions (db, jwt, cors)
│   │   ├── rbac.py                        # POR-based authorization decorators
│   │   ├── controllers/                   # HTTP layer (Blueprints)
│   │   │   ├── __init__.py                # Blueprint registry
│   │   │   ├── auth_controller.py         # /api/v1/auth/* routes
│   │   │   ├── community_controller.py    # /api/v1/(regions|cities|orgs|pors|users) routes
│   │   │   ├── event_controller.py        # /api/v1/events/* routes (feed, detail)
│   │   │   ├── proposal_controller.py     # /api/v1/(activities|proposals)/* routes
│   │   │   ├── registration_controller.py # /api/v1/events/{id}/register routes
│   │   │   ├── expense_controller.py      # /api/v1/(expenses|reimbursements)/* routes
│   │   │   ├── recognition_controller.py  # /api/v1/(leaderboard|points) routes
│   │   │   ├── analytics_controller.py    # /api/v1/analytics routes
│   │   │   └── misc_controller.py         # /api/v1/dashboard, /api/v1/notifications
│   │   ├── services/                      # Business logic layer
│   │   │   ├── __init__.py                # Service imports
│   │   │   ├── auth_service.py            # register, login, token logic
│   │   │   ├── org_service.py             # Organization/POR management
│   │   │   ├── registration_service.py    # Event registration logic
│   │   │   ├── proposal_service.py        # Proposal lifecycle (submit, approve, reject)
│   │   │   ├── expense_service.py         # Expense submission, verification
│   │   │   ├── recognition_service.py     # Leaderboard, points calculation
│   │   │   ├── attendance_service.py      # Check-in, attendance tracking
│   │   │   └── analytics_service.py       # Analytics aggregations
│   │   ├── repositories/                  # Data access layer
│   │   │   ├── __init__.py                # Repository exports
│   │   │   └── repos.py                   # All repository classes (UserRepository, OrgRepository, etc.)
│   │   ├── schemas/                       # Marshmallow validation schemas
│   │   │   └── __init__.py                # LoginSchema, RegisterSchema, etc.
│   │   └── models/                        # SQLAlchemy ORM entities
│   │       └── __init__.py                # User, Organisation, Activity, Proposal, Expense, etc. (18 models)
│   ├── tests/                             # Pytest test files
│   ├── requirements.txt                   # Python dependencies
│   ├── run.py                             # Dev entry point
│   ├── pytest.ini                         # Pytest configuration
│   └── README.md                          # Backend API docs
│
├── frontend/                              # Vite + React SPA
│   ├── src/
│   │   ├── main.tsx                       # Entry point (React root, providers)
│   │   ├── App.tsx                        # Router, role-based route setup
│   │   ├── index.css                      # Tailwind CSS imports
│   │   ├── vite-env.d.ts                  # Vite type declarations
│   │   ├── components/
│   │   │   ├── Layout.tsx                 # Main layout (nav, search), role-based nav items
│   │   │   ├── ui.tsx                     # Primitive components (Button, Card, Badge, Modal, Toast, Mandala)
│   │   │   ├── states.tsx                 # Loading, ErrorState, Empty skeletons
│   │   │   └── IndiaMap.tsx               # Geographic visualization
│   │   ├── pages/
│   │   │   ├── AuthShell.tsx              # (deprecated or wrapper?)
│   │   │   ├── Landing.tsx                # Public landing page
│   │   │   ├── Login.tsx                  # Public login + demo account selector
│   │   │   ├── Register.tsx               # Public signup (region/city selection)
│   │   │   ├── Discover.tsx               # Student: event feed discovery
│   │   │   ├── EventDetail.tsx            # Student: event detail + register button
│   │   │   ├── MyRegistrations.tsx        # Student: registered events list
│   │   │   ├── Leaderboard.tsx            # Student: contribution points leaderboard
│   │   │   ├── Notifications.tsx          # Student: notifications inbox
│   │   │   ├── OrganiserDashboard.tsx     # Organiser: events summary, proposals
│   │   │   ├── ProposalNew.tsx            # Organiser: submit event proposal
│   │   │   ├── ManageEvent.tsx            # Organiser: manage registrations & tasks
│   │   │   ├── Expenses.tsx               # Organiser: submit/track expenses for event
│   │   │   ├── CheckIn.tsx                # Organiser: check-in attendees
│   │   │   ├── ApprovalQueue.tsx          # Admin: pending proposals to approve/reject
│   │   │   ├── Reimbursements.tsx         # Admin: expense verification queue
│   │   │   ├── Analytics.tsx              # Admin: community analytics dashboard
│   │   │   └── Orgs.tsx                   # Admin: manage organisations, PORs, cities
│   │   ├── lib/
│   │   │   ├── auth.tsx                   # AuthProvider context, useAuth hook, Account type
│   │   │   ├── api.ts                     # HTTP client wrapper (JWT injection, error parsing, adaptation)
│   │   │   ├── queries.ts                 # React Query hooks (useEvents, useMutations, etc.)
│   │   │   ├── types.ts                   # TypeScript domain types (Role, EkatvaEvent, etc.)
│   │   │   ├── session.tsx                # useSession hook (role/name/city from auth)
│   │   │   ├── format.ts                  # Utility helpers (cx, daysUntil, formatDate, formatTime)
│   │   │   └── mock.ts                    # Development mock data (CITIES, DEMO_ACCOUNTS)
│   │   └── data/                          # (if used for static data)
│   ├── public/
│   │   ├── houses/                        # House image assets
│   │   └── (favicon, etc.)
│   ├── package.json                       # Dependencies (React, Vite, Tailwind, React Query, React Router)
│   ├── tsconfig.json                      # TypeScript config
│   ├── vite.config.ts                     # Vite build config (React plugin, API proxy)
│   ├── tailwind.config.js                 # Tailwind customization (colors, fonts)
│   ├── index.html                         # HTML entry point
│   └── README.md                          # Frontend setup docs
│
├── .planning/
│   └── codebase/                          # GSD analysis docs
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       └── (CONVENTIONS.md, TESTING.md, STACK.md, etc.)
│
├── .claude/                               # Project Claude instructions
├── .gitignore                             # Git ignore rules
├── package.json                           # (If monorepo at root)
└── README.md                              # Project overview
```

## Directory Purposes

**backend/app/:**
- Purpose: Flask application package
- Contains: Layered code (controllers → services → repositories → models)
- Key files: `__init__.py` (app factory), `extensions.py` (db, jwt), `config.py` (settings), `constants.py` (domain rules)

**backend/app/controllers/:**
- Purpose: HTTP request handling and routing
- Contains: Flask Blueprints, one per module
- Key files: `__init__.py` (blueprint registry), each controller decorated with `@auth_required` or `@admin_required`
- Pattern: Controller → call service → return jsonify() with status code

**backend/app/services/:**
- Purpose: Business logic encapsulation
- Contains: Service functions (mostly static methods)
- Key files: `auth_service.py` (auth logic), `org_service.py` (org/POR logic), `proposal_service.py` (lifecycle), `recognition_service.py` (points)
- Pattern: Service → call repository → raise ApiError on failure → return dict for controller

**backend/app/repositories/:**
- Purpose: Data access abstraction
- Contains: Repository classes with query methods
- Key file: `repos.py` (single module with UserRepository, OrgRepository, ActivityRepository, etc.)
- Pattern: Repo.method(filter) → SQLAlchemy query → return model(s)

**backend/app/schemas/:**
- Purpose: Request validation and deserialization
- Contains: Marshmallow schema classes
- Pattern: Controller calls `Schema().load(request.get_json())` → returns dict or raises ValidationError

**backend/app/models/:**
- Purpose: Relational schema as ORM entities
- Contains: Base model class, 18 domain models
- Key file: `__init__.py` (all models defined)
- Pattern: Model inherits Base (id, created_at, updated_at), defines columns, relationships, to_dict() serializer

**backend/tests/:**
- Purpose: Pytest test suite
- Contains: Unit tests for services, controllers, models
- Pattern: Fixtures, mocks, assertions

**frontend/src/components/:**
- Purpose: Reusable UI components
- Key files: `Layout.tsx` (main shell with nav), `ui.tsx` (primitives: Button, Card, Badge, Modal), `states.tsx` (Loading, ErrorState)
- Pattern: React functional components, Tailwind styling, prop-driven behavior

**frontend/src/pages/:**
- Purpose: Page/route components
- Contains: One component per route
- Grouping: No subdirectories; named by feature (Discover, EventDetail, OrganiserDashboard, ApprovalQueue, etc.)
- Pattern: Page-level state (filters, pagination), React Query hooks, render from data states

**frontend/src/lib/:**
- Purpose: Shared utilities and abstractions
- Key files: `auth.tsx` (auth state + useAuth hook), `api.ts` (HTTP client), `queries.ts` (React Query hooks), `types.ts` (types), `session.tsx` (useSession hook)
- Pattern: Centralizes cross-cutting concerns; no UI rendering in lib

**frontend/public/:**
- Purpose: Static assets
- Contains: House images (`houses/`), favicon
- Access: Served at root; import as `/houses/{name}.jpg`

## Key File Locations

**Entry Points:**
- `backend/run.py`: Dev server entry point - runs `create_app()`, initializes DB, starts Flask on :5000
- `frontend/src/main.tsx`: React root - providers setup, app render
- `frontend/src/App.tsx`: Router - public vs. protected, role-based route definition

**Configuration:**
- `backend/app/config.py`: Flask config (DEBUG, SQLALCHEMY_DATABASE_URI, CORS_ORIGINS, JWT_SECRET_KEY)
- `frontend/vite.config.ts`: Vite build config (API proxy, React plugin)
- `frontend/tsconfig.json`: TypeScript config (target, lib, jsx)
- `frontend/tailwind.config.js`: Tailwind customization (colors, fonts, spacing)

**Core Logic:**
- `backend/app/services/*.py`: Domain logic per module
- `backend/app/repositories/repos.py`: All query methods
- `backend/app/models/__init__.py`: All ORM definitions
- `backend/app/rbac.py`: Authorization logic
- `frontend/src/lib/auth.tsx`: Auth state management
- `frontend/src/lib/api.ts`: API client, error handling, adaptation
- `frontend/src/lib/queries.ts`: React Query hooks

**Testing:**
- `backend/tests/`: Pytest files (fixtures, test_*.py)
- `frontend/`: No organized test directory (tests would be co-located with components or in `__tests__/`)

**Assets:**
- `frontend/public/`: Static files (images, favicon)
- `frontend/src/index.css`: Tailwind imports
- `backend/`: No assets

## Naming Conventions

**Files:**

- **Controllers:** `*_controller.py` (e.g., `auth_controller.py`, `event_controller.py`)
- **Services:** `*_service.py` (e.g., `auth_service.py`, `proposal_service.py`)
- **Repositories:** Single module `repos.py` with multiple classes
- **Schemas:** Marshmallow classes in `schemas/__init__.py`
- **Models:** ORM classes in `models/__init__.py`
- **Pages:** PascalCase, feature-named (e.g., `Discover.tsx`, `OrganiserDashboard.tsx`, `ApprovalQueue.tsx`)
- **Components:** PascalCase (e.g., `Layout.tsx`, `ui.tsx`, `states.tsx`)
- **Utilities/Hooks:** camelCase files (e.g., `auth.tsx`, `api.ts`, `queries.ts`, `types.ts`)

**Directories:**

- **Modules/layers:** snake_case (e.g., `controllers/`, `services/`, `repositories/`)
- **Feature folders:** snake_case (e.g., `pages/`, `components/`, `lib/`)

**Functions/Methods:**

- **Python:** snake_case (e.g., `register()`, `by_email()`, `published_feed()`, `_load_current_user()`)
- **TypeScript:** camelCase (e.g., `login()`, `useEvents()`, `adaptEvent()`, `formatDate()`)
- **Private/internal:** Prefix `_` (e.g., `_token()` in auth_service, `_load_current_user()` in rbac)

**Variables/Constants:**

- **Python:** UPPER_CASE for module-level constants (e.g., `CURRENT_TERM`, `ORGANISER_PORS`, `LOGIN_ROLES`)
- **TypeScript:** camelCase for variables, UPPER_CASE for constants (e.g., `const queryClient = ...`, `const BASE = ...`)

**Classes:**

- **Python:** PascalCase (e.g., `UserRepository`, `ApiError`, `Base`)
- **TypeScript:** PascalCase (e.g., `ApiError`, interface `Account`, type `Role`)

## Where to Add New Code

**New Feature (e.g., "messaging"):**

1. Backend:
   - Create `backend/app/services/messaging_service.py` - implement business logic
   - Create message model in `backend/app/models/__init__.py` (add to Base)
   - Add queries to `backend/app/repositories/repos.py` (new MessageRepository class)
   - Add schema in `backend/app/schemas/__init__.py` (MessageSchema)
   - Create `backend/app/controllers/messaging_controller.py` - define `/api/v1/messaging/*` routes
   - Register blueprint in `backend/app/controllers/__init__.py` (add to ALL_BLUEPRINTS)
   - Add domain constants to `backend/app/constants.py` if needed

2. Frontend:
   - Create `frontend/src/pages/Messaging.tsx` (or role-specific pages: StudentMessaging.tsx, OrganiserMessaging.tsx)
   - Add routes to `frontend/src/App.tsx` (in AppShell Routes for protected, or Root for public)
   - Add React Query hook to `frontend/src/lib/queries.ts` (useMessages, useSendMessage)
   - Add API client methods to `frontend/src/lib/api.ts` (api.messages(), api.sendMessage())
   - Add TypeScript type to `frontend/src/lib/types.ts` (Message interface)
   - Add nav item to `frontend/src/components/Layout.tsx` (if applicable)

**New Component/Module:**

- **Backend service:** `backend/app/services/{name}_service.py` - static methods with domain logic
- **Backend model:** Add class to `backend/app/models/__init__.py`
- **Frontend component:** `frontend/src/components/{Name}.tsx` - reusable, no page logic
- **Frontend hook:** Add to `frontend/src/lib/queries.ts` or create `frontend/src/lib/{name}.ts` if complex

**Utilities:**

- **Backend:** Add to `backend/app/constants.py` (enums) or create `backend/app/utils.py` (helpers)
- **Frontend:** Add to `frontend/src/lib/format.ts` (formatting), `frontend/src/lib/types.ts` (types), or create new `frontend/src/lib/{name}.ts`

**Shared/Cross-module:**

- **Backend errors:** Add to `backend/app/errors.py` (exception classes) or raise ApiError with new code
- **Frontend types:** Add to `frontend/src/lib/types.ts`
- **Frontend validation:** Add schema to `backend/app/schemas/__init__.py`

## Special Directories

**backend/app/extensions.py:**
- Purpose: Flask extension initialization
- Generated: No
- Committed: Yes
- Contains: db (SQLAlchemy), jwt (Flask-JWT-Extended), cors (Flask-CORS)
- Access: `from app.extensions import db, jwt` in services, models, controllers

**backend/.pytest_cache/:**
- Purpose: Pytest cache (test discovery, execution history)
- Generated: Yes (by pytest run)
- Committed: No (.gitignore)

**frontend/node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)

**.planning/codebase/:**
- Purpose: GSD analysis documents (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, STACK.md, CONCERNS.md, INTEGRATIONS.md)
- Generated: No (hand-written by GSD tools)
- Committed: Yes

**.vercel/:**
- Purpose: Vercel deployment configuration
- Generated: No (hand-written)
- Committed: Yes

**SE Project Milestones Submission/:**
- Purpose: Course submission artifacts (not part of active codebase)
- Generated: No
- Committed: Yes (archived)

---

*Structure analysis: 2026-08-02*
