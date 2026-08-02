# Architecture

**Analysis Date:** 2026-08-02

## Pattern Overview

**Overall:** Layered architecture with a three-tier backend (controllers → services → repositories) and a role-based React frontend.

**Key Characteristics:**
- Presentation layer decouples HTTP concerns from business logic
- POR-based RBAC where permissions flow from Position of Responsibility, not login role
- Uniform error envelope across all API responses
- React Query for server state management, React Context for auth state
- One Flask Blueprint per business module; one service per domain
- Single repository module for all concrete query implementations

## Layers

**Controllers (Presentation):**
- Purpose: Parse HTTP requests, validate with Marshmallow schemas, invoke services, shape responses
- Location: `backend/app/controllers/`
- Contains: Flask Blueprints, one per module (auth, community, events, proposals, expenses, recognition, analytics)
- Depends on: Services, Schemas (Marshmallow), RBAC decorators, error envelope
- Used by: Flask router - responds to HTTP requests
- Entry points: Each controller defines a blueprint with a URL prefix (e.g., `/api/v1/auth`)
- Example: `backend/app/controllers/auth_controller.py` - register/login/me endpoints

**Services (Application Logic):**
- Purpose: Encapsulate business logic, coordinate repositories, enforce domain rules
- Location: `backend/app/services/`
- Contains: Service classes with static methods; each service domain-focused (auth, org, expense, recognition, etc.)
- Depends on: Repositories, Models, Constants (domain rules), Extensions (db, jwt)
- Used by: Controllers call service functions to execute business operations
- Example: `backend/app/services/auth_service.py` - handles registration, token generation, password hashing
- Pattern: Services raise `ApiError` on validation failures; controllers catch and return uniform envelope

**Repositories (Data Access):**
- Purpose: Centralize database queries, provide a query abstraction for aggregates
- Location: `backend/app/repositories/repos.py` (single module with multiple repository classes)
- Contains: Static query methods grouped by entity (UserRepository, OrgRepository, ActivityRepository, etc.)
- Depends on: Models, Extensions (db)
- Used by: Services call repository methods to fetch/store entities
- Pattern: One repository class per aggregate; methods use SQLAlchemy query API
- Example: `UserRepository.by_email()`, `ActivityRepository.published_feed(city)`

**Models (Data):**
- Purpose: Define the relational schema as SQLAlchemy ORM entities
- Location: `backend/app/models/__init__.py` (single module, ~18 tables)
- Contains: Model classes inheriting from `Base` (provides id, created_at, updated_at); relationships; to_dict() serializers
- Depends on: Extensions (db)
- Used by: Repositories query models; services instantiate and persist
- Design: UUID string PKs, UTC timestamps, indexed FKs, append-only audit_log, relationships with cascade delete
- Example: `User`, `Organisation`, `Activity`, `Proposal`, `Expense`, `PORAssignment`

**Frontend: Components (Presentation):**
- Purpose: Render UI, emit events, dispatch queries/mutations
- Location: `frontend/src/components/`
- Contains: Layout.tsx (role-based nav), ui.tsx (primitives), states.tsx (Loading/ErrorState), IndiaMap.tsx
- Depends on: React Router, React Query, Auth context, API client
- Used by: Pages consume components; Layout wraps authenticated content

**Frontend: Pages (Containers):**
- Purpose: Bind data queries to UI, handle page-level logic
- Location: `frontend/src/pages/`
- Contains: One component per route, grouped by role (Discover, EventDetail, MyRegistrations for students; OrganiserDashboard, ProposalNew, ManageEvent for organisers; ApprovalQueue, Analytics, Orgs for admins)
- Depends on: useQuery/useMutation (React Query), useAuth/useSession (context), API types
- Used by: App.tsx router
- Pattern: Pages fetch data via React Query hooks, render from data.isLoading/isError/data states

**Frontend: Libraries (Cross-cutting):**
- Location: `frontend/src/lib/`
- Contains:
  - `auth.tsx` - AuthProvider context, useAuth hook, Account type, role derivation from PORs
  - `api.ts` - Thin fetch wrapper, JWT injection, error parsing, response adaptation (snake_case to camelCase)
  - `queries.ts` - TanStack Query hooks wrapping api client (useEvents, useProposals, useMutations, etc.)
  - `types.ts` - Domain types (Role, ActivityScale, ProposalStatus, EventStatus, EkatvaEvent, etc.)
  - `session.tsx` - useSession hook deriving role/name/city from currentUser
  - `mock.ts` - Mock data for development
  - `format.ts` - UI helpers (date formatting, CSS class merging)

## Data Flow

**Login Flow:**

1. User submits email/password on Login page
2. Page calls `useAuth().login(email, password)`
3. Auth context calls `api.login()` - POST /api/v1/auth/login with credentials
4. Backend controller validates schema, calls `auth_service.login(email, password)`
5. Service queries `UserRepository.by_email()`, verifies password hash, creates JWT via `create_access_token()`
6. Controller returns `{access_token, user: {...}}`
7. Auth context stores token in localStorage via `setToken()`, updates state with `withPor(user)`
8. Page redirects to role-specific home via `homeFor(role)`

**Event Discovery Flow:**

1. Student lands on Discover page
2. Page calls `useEvents(city)` - React Query hook
3. Hook calls `api.events(city)` - GET /api/v1/events?city=Hyderabad with JWT
4. Backend controller calls `ActivityRepository.published_feed(city)` - SQL join Activity/Proposal, filter status
5. Repository returns Activity entities with related data
6. API client calls `adaptEvent()` - maps snake_case to camelCase, assigns cover image by scale
7. Query cache stores result; page renders from `data.isLoading`, `data.isError`, `data`

**Authorization (POR-based) Flow:**

1. User with POR tries to access organiser surface
2. App.tsx checks `currentUser.role` (derived from PORs in `withPor()`)
3. If user role !== 'organiser', route denied or navigation redirected
4. When calling organiser endpoint (e.g., propose event), frontend has valid JWT
5. Backend controller decorated with `@organiser_required` calls `_load_current_user()`
6. RBAC checks `is_organiser(user)` - scans memberships for active organiser PORs
7. If true, service executes; if false, raises ApiError(403, "forbidden")
8. Error handler returns `{error: "...", code: "forbidden"}` to frontend
9. Frontend error handler (in useMutation) displays toast or redirects to login

**State Management:**

- **Auth state:** React Context (AuthProvider) - holds currentUser, loading flag, login/logout functions
- **Server state:** React Query - caches queries by key, retries on failure, invalidates on mutations
- **UI state (local):** useState in pages for filters, modals, pagination
- **No global store:** Context + Query cover 95% of needs; localStorage only for JWT

## Key Abstractions

**ApiError:**
- Purpose: Typed domain exception for HTTP-reportable errors
- Files: `backend/app/errors.py` (definition), `frontend/src/lib/api.ts` (frontend class)
- Pattern: Raised by services with message, code, status, optional details
- Backend: Caught by error handler, serialized to `{error, code, details?, status}`
- Frontend: Thrown by api.request(), caught by React Query, exposed via mutation.error

**Marshmallow Schemas:**
- Purpose: Validate and deserialize request JSON
- Files: `backend/app/schemas/__init__.py`
- Pattern: Define schema (LoginSchema, RegisterSchema, etc.), call `.load(request.get_json())`
- On invalid: Raises ValidationError → caught by error handler → returns `{error, code: "validation_error", details: {...}}`

**Repositories Pattern:**
- Purpose: Hide SQL from services, provide named query methods
- Implementation: Static methods in repo classes (UserRepository, OrgRepository, ActivityRepository)
- Benefit: Queries testable, reusable across endpoints, DRY
- Example: `UserRepository.by_email(email)` vs. inline query in auth_service

**React Query Hooks:**
- Purpose: Centralize server state fetching, caching, invalidation
- Pattern: `useQuery(key, queryFn, options)` for reads; `useMutation(mutationFn, { onSuccess: invalidate })` for writes
- Benefit: Automatic retry, stale-while-revalidate, dev tools, SSR-friendly
- Example: `useEvents()` → `['events', city]` key → query cached per city

**Uniform Error Envelope:**
- Shape: `{error: string, code: string, details?: unknown, status: number}`
- Frontend parses: `body?.error`, `body?.code`, `body?.details`
- Backend generates: `envelope(message, code, status, details)`
- Consistency: All errors (ApiError, ValidationError, HTTPException, unhandled) use same shape

## Entry Points

**Backend:**

- Location: `backend/run.py`
- Triggers: `python run.py` (dev) - creates app via `create_app()`, initializes db tables, starts Flask on :5000
- Responsibilities: App factory, DB init, error handler registration, blueprint mounting

**Frontend:**

- Location: `frontend/src/main.tsx`
- Triggers: `npm run dev` - starts Vite dev server, renders `<App />`
- Responsibilities: Query client setup, router setup, provider nesting (QueryClientProvider → BrowserRouter → ToastProvider → App)

**API Root:**

- Backend: GET `/` returns service info (tagline, version, docs link)
- Frontend: `App.tsx` routes to public (Landing, Login, Register) or protected (AppShell with Layout + role-based routes)

## Error Handling

**Strategy:** Layered with a uniform envelope; each layer translates domain errors to HTTP-friendly codes.

**Patterns:**

- **Service raises ApiError:** `raise ApiError("msg", "code", 409, details=None)`
- **Controller catches nothing:** ApiError bubbles to error handler
- **Error handler serializes:** `@app.errorhandler(ApiError)` → `envelope()` → `{error, code, status}`
- **Frontend catches:** `api.request()` parses response; if !ok, throws ApiError; mutation/query exposes error
- **UI renders error:** Query has `isError`, `error.message`, `error.code`; mutation displays toast via useToast

**Example:** Duplicate email signup
1. Service: `UserRepository.by_email(email)` returns user
2. Service raises: `ApiError("An account with that email already exists", "email_taken", 409)`
3. Controller: Doesn't catch, lets ApiError propagate
4. Error handler: Returns `{error: "...", code: "email_taken"}`, 409
5. Frontend: catch in api.request(), throws ApiError("...", "email_taken", 409)
6. Register component: mutation.error has `.message`, `.code`; displays in form

## Cross-Cutting Concerns

**Logging:** Python logging via `app.logger.exception(e)` in unhandled error handler; not structured (TODO: add structured logging)

**Validation:** Marshmallow schemas in controllers; frontend form validation in React (onChange handlers, submission guards)

**Authentication:** Flask-JWT-Extended via `@auth_required` decorator; frontend localStorage token; JWT includes identity + role claim

**Authorization (RBAC):** POR-based via `@organiser_required`, `@admin_required` decorators; frontend role derived from PORs in `withPor()`; no fine-grained resource-level checks (assumes org membership = permission)

**CORS:** Enabled in app factory for `/api/*` routes, origins configured via env var

---

*Architecture analysis: 2026-08-02*
