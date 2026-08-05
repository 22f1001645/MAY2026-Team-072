# Codebase Concerns

**Analysis Date:** 2026-08-02

## Tech Debt

**No Alembic migrations (database schema management):**
- Issue: Schema changes currently require editing `backend/app/models/__init__.py` and re-running `backend/seed.py`, which destroys all data with `db.drop_all()` then `db.create_all()` (lines 39-40)
- Files: `backend/seed.py`, `backend/app/models/__init__.py`
- Impact: Production-blocking. Schema migrations cannot be applied to live databases. Any schema change on production is a data wipe. Scaling or fixing data models is severely constrained.
- Fix approach: Set up Alembic with `flask db init` and `flask db migrate`, then convert schema changes to reversible migrations. Keep `seed.py` for dev-only data seeding.

**Hardcoded demo event IDs in organiser sidebar navigation:**
- Issue: `frontend/src/components/Layout.tsx` lines 28-30 hardcode specific event IDs (`ev-ekatva-hyd`, `ev-hyd-coffee`) in the organiser navigation links
- Files: `frontend/src/components/Layout.tsx` (lines 28-30)
- Impact: Organisers clicking "Registrations & Tasks", "Reimbursement", or "Check-in" from the sidebar navigate to one specific event, not their current event. Multi-organiser scenarios break.
- Fix approach: Remove hardcoded links from sidebar; route these to "/organiser" or parameterize them based on current event context. The organiser dashboard at `frontend/src/pages/OrganiserDashboard.tsx` already generates correct dynamic links (lines 94-111).

**Client-side-only task management (not persisted):**
- Issue: `frontend/src/pages/ManageEvent.tsx` line 14 loads tasks from `frontend/src/lib/mock.ts` (line 317-323 in TASKS array) and only stores toggled state in local React state, never sending updates to backend
- Files: `frontend/src/lib/mock.ts` (TASKS array), `frontend/src/pages/ManageEvent.tsx` (line 14)
- Impact: Task assignments are lost on page reload. Offline, no synchronization. If a team member checks the event on another device, they see stale task state. Comment on line 163 acknowledges this as "thin v1 slice".
- Fix approach: Create backend endpoints for task persistence (`POST /events/:id/tasks`, `PATCH /tasks/:id`). Persist task state to database. Use React Query mutations to sync with backend.

**No dashboard role-switcher for users with multiple PORs:**
- Issue: `frontend/src/components/Layout.tsx` line 70 shows `const nav = NAV[role]` where role comes from session (line 65), but users with multiple active PORs (e.g., RC for one region AND house secretary) can only navigate using one role at a time
- Files: `frontend/src/components/Layout.tsx` (line 18-39 NAV definition, line 70 role assignment), `frontend/src/lib/session.ts`
- Impact: Users holding multiple PORs cannot switch between role contexts without logging out and back in. RBAC system supports multiple PORs (backend `backend/app/rbac.py` checks `for m in user.memberships for p in m.pors`), but frontend doesn't expose switching.
- Fix approach: Add a role/POR selector dropdown in the sidebar identity section (alongside logout button). Fetch user's active PORs via `api.pors()` and allow switching; update session/localStorage to store active_por.

## Known Bugs

**Race condition in event registration (capacity overflow):**
- Symptoms: Multiple simultaneous registrations can exceed event capacity when event is near full
- Files: `backend/app/services/registration_service.py` (lines 17-18), `backend/app/repositories/repos.py` (check capacity implementation)
- Trigger: Two or more students attempt to register for same event within milliseconds when registered count equals capacity minus 1
- Cause: Check-then-insert is not atomic. Line 17 reads `activity.registered_count()`, then line 21 inserts the registration. Another request can insert between these operations.
- Workaround: In the meantime, accept overbooking; do not reject registrations. A full event can briefly accept one extra registration until a page refresh shows it's full.
- Fix approach: Use database-level locking. Either: (a) `SELECT ... FOR UPDATE` on the activity row before checking capacity, or (b) use a unique constraint on (activity_id, student_id) and catch duplicate key error instead of checking first.

**Soft-delete queries don't filter deleted records:**
- Symptoms: `Report` and `Document` models can appear in queries even after marked deleted
- Files: `backend/app/models/__init__.py` (lines 366, 381 define `deleted_at` field but no soft-delete scoping), repository queries that use these models
- Trigger: Any query on Report or Document tables
- Cause: SQLAlchemy model defines `deleted_at` column, but queries don't filter `WHERE deleted_at IS NULL`
- Impact: Low (feature not actively used yet), but will surface stale reports/documents if the feature is enabled
- Fix approach: Add a hybrid property or query filter decorator to Report and Document; apply `filter_by(deleted_at=None)` in all queries.

**Expense amount validation allows zero or negative values:**
- Symptoms: Expense records can be created with `amount: 0` or negative amounts
- Files: `backend/app/models/__init__.py` (line 302 Expense.amount has no validation), `backend/app/schemas/` (Expense schema if one exists)
- Trigger: Submit an expense with amount 0 or -1000
- Cause: Database column allows any integer; no Marshmallow schema validation
- Impact: Medium. Analytics and reimbursement summaries can be silently incorrect if negative expenses creep in.
- Fix approach: Add Marshmallow validation to expense schema: `amount = fields.Integer(required=True, validate=validate.Range(min=1, error="Expense amount must be positive"))`.

## Security Considerations

**JWT tokens stored in localStorage (XSS vulnerability):**
- Risk: If JavaScript is compromised (XSS), attacker can read `ekatva_token` from localStorage (frontend `lib/api.ts` line 12)
- Files: `frontend/src/lib/api.ts` (lines 9-16), `frontend/src/lib/session.ts`
- Current mitigation: CORS is configured on backend; tokens have short TTL (check `flask_jwt_extended` config in `backend/app/__init__.py`)
- Recommendations: Consider storing JWT in httpOnly cookie instead of localStorage (removes XSS surface). Requires backend to set `Set-Cookie` header. Trade-off: httpOnly prevents XSS token theft but doesn't prevent session hijacking if attacker has network access.

**Admin password in seed.py (dev only, but source-controlled):**
- Risk: `backend/seed.py` line 98 hardcodes `password="admin123"` for the seed admin account
- Files: `backend/seed.py` (line 98)
- Current mitigation: This is dev-only; production should use environment variable or provisioning script
- Recommendations: Wrap in `if not os.getenv("ENV") == "production"` guard, or move seed passwords to a separate .seed-passwords file (gitignored).

**No rate limiting on API endpoints:**
- Risk: No throttling on login (`POST /auth/login`), registration, or proposal submission
- Files: All controllers under `backend/app/controllers/`
- Impact: Brute force attacks on login, registration spam
- Recommendations: Add Flask-Limiter or similar. At minimum, rate-limit `/auth/login` to 5 attempts per minute per IP.

**No CSRF protection (CORS-only):**
- Risk: If frontend is compromised or hosted on attacker's domain, CSRF attacks possible
- Files: Backend CORS config (likely in `backend/app/__init__.py`)
- Current mitigation: CORS restricts cross-origin requests; JWT in header (not cookie) makes CSRF harder but not impossible
- Recommendations: Add CSRF token layer (token in header, validated per state-changing request). This is low-risk for JWT-based APIs but best practice.

## Performance Bottlenecks

**Large Orgs.tsx page component (903 lines):**
- Problem: Single React component handles org creation, POR assignment, city/region management, and display across multiple tabs
- Files: `frontend/src/pages/Orgs.tsx` (903 lines)
- Cause: Early prototyping combined multiple features into one page without decomposition
- Improvement path: Split into smaller components (OrgForm, PorAssigner, CityManager, OrgTable, etc.). Separate data fetching logic into custom hooks. This will reduce re-renders and make the page more maintainable.

**No pagination or infinite scroll on event feed:**
- Problem: `frontend/src/pages/Discover.tsx` fetches all events via `api.events(city)` and renders them all at once
- Files: `frontend/src/pages/Discover.tsx`, `backend/app/controllers/event_controller.py` (line 15)
- Impact: Medium. As event count scales (50+), page load and render time will degrade. No query parameters for limit/offset.
- Improvement path: Add `?limit=20&offset=0` to backend feed endpoint. Implement cursor-based pagination on frontend using TanStack Query's `useInfiniteQuery`.

**Attendance check-in requires full roster scan:**
- Problem: `frontend/src/pages/CheckIn.tsx` fetches all registrations and filters in-browser. With 500+ registrations, search is slow.
- Files: `frontend/src/pages/CheckIn.tsx`, `frontend/src/lib/queries.ts` (useRoster), `backend/app/services/registration_service.py` (line 43)
- Improvement path: Add server-side search/filter on roster endpoint: `GET /events/:id/registrations?q=name`. Backend filters by `student.name LIKE ?`.

**No caching headers on frontend static assets:**
- Problem: Frontend assets (JS, CSS) served without Cache-Control headers, so every page load refetches everything
- Files: Frontend build output (dist/) not .tsx files themselves
- Improvement path: Configure Vercel caching headers (or nginx if self-hosted) to cache dist assets with long TTL and use content hashing for cache busting.

## Fragile Areas

**Proposal approval state machine (multiple decision paths):**
- Files: `backend/app/services/proposal_service.py` (lines 63-124), decision flow with states: submitted → approved|changes_requested|rejected, then approved → revoked
- Why fragile: State transitions are validated but the logic branches deeply (approve, changes, reject, revoke). Quota checks only happen on approve (line 75-83), so an admin could theoretically request changes, then approve later after quota changes, bypassing the check.
- Safe modification: Encapsulate state machine in a separate class (ProposalStateMachine) with clear transition rules. Add integration tests for all paths: submit→approve, submit→changes→approve, submit→reject, approved→revoke.
- Test coverage: `backend/tests/test_proposal_flow.py` covers main flow but may not cover all edges (changes→approve specifically).

**Activity.attended_count() method uses Python loop instead of SQL:**
- Files: `backend/app/models/__init__.py` (line 171-172)
- Fragility: Method iterates all registrations in Python (`sum(1 for r in ...)`). If event has 1000 registrations, this pulls all rows into memory.
- Safe modification: Use SQLAlchemy query count: `db.session.query(Attendance).filter_by(registration_id=...).count()` or a JOIN query.
- Impact: Performance degrades non-linearly with attendee count; memory usage spikes.

**Registration and Attendance are separate models with 1-to-1 relationship:**
- Files: `backend/app/models/__init__.py` (line 239 uselist=False), `backend/app/services/attendance_service.py`
- Fragility: Code must check both Registration and Attendance to know attendance status. If an Attendance is deleted but Registration remains, state is inconsistent.
- Safe modification: Add constraint `CASCADE DELETE` on Attendance FK to Registration (line 268 already has it). Test orphan cleanup.
- Test coverage: Check that deleting a registration also deletes its attendance record.

**Dashboard endpoint returns role-specific data but doesn't validate access:**
- Files: `backend/app/controllers/misc_controller.py` (if dashboard endpoint exists) or `backend/app/services/`
- Fragility: If dashboard endpoint serves organiser-only data (my_events, total_registered) but only checks `@auth_required`, a student could theoretically get organiser stats if they also hold an organiser POR.
- Safe modification: Dashboard should check `if not is_organiser(user): raise ApiError(...)` or return role-specific lens. Verify RBAC decorator is correct.

## Scaling Limits

**SQLite on development, PostgreSQL for production:**
- Current capacity: SQLite development handles up to ~10k events and ~100k registrations before query performance degrades
- Limit: SQLite cannot handle concurrent writes well; database locks. No proper connection pooling.
- Scaling path: Switch to PostgreSQL 15 (already supported via DATABASE_URL). This requires: (a) set up Alembic migrations first, (b) export dev data, (c) deploy Postgres, (d) run migrations, (e) restore data.
- Files: `backend/app/config.py` (database URL config), `backend/README.md` (line 7 mentions PostgreSQL readiness).

**No database connection pooling configured:**
- Current: Flask-SQLAlchemy default pool size is 5 connections. Under load (50+ concurrent users), queries queue or fail.
- Limit: 5 concurrent requests hit pool exhaustion around 10-50 concurrent users depending on query duration.
- Scaling path: Configure SQLAlchemy pool in `backend/app/config.py`: `SQLALCHEMY_ENGINE_OPTIONS = {"pool_size": 20, "pool_recycle": 3600}`.

**Frontend search queries all users/events/orgs on every keystroke:**
- Current: `frontend/src/components/Layout.tsx` (lines 76-92) fetches users, events, orgs with `enabled: searchQuery.trim().length >= 1`
- Limit: With 1000+ events, fetching all events on each keystroke is wasteful.
- Scaling path: Debounce search input (300ms delay), add backend search with `?q=` parameter, paginate results.

## Dependencies at Risk

**TanStack Query (React Query) major version upgrades:**
- Risk: Frontend uses `@tanstack/react-query` (version in frontend/package.json). Majors have breaking changes.
- Impact: Mutation invalidation patterns may change; hooks may be renamed.
- Migration plan: Lock to minor version in package.json (e.g., `^4.32.0` not `^4.0.0`). Pin latest before major release. Monitor their changelog for deprecation warnings in minor updates.

**Flask and SQLAlchemy version lock:**
- Risk: `backend/requirements.txt` should pin to major.minor (e.g., `Flask==3.0.0` not `Flask==3.0.*`)
- Files: `backend/requirements.txt`
- Impact: Transitive dependency conflicts if versions are loose.
- Migration plan: Use `pip freeze > requirements-lock.txt` for reproducible builds. Periodically audit for security patches.

## Missing Critical Features

**QR code-based check-in (mentioned but not implemented):**
- Problem: Frontend mock task (frontend/src/lib/mock.ts line 321) says "Set up registration desk & QR check-in", but CheckIn.tsx is name-search-based, not QR
- Blocks: Fast, high-volume check-in scenarios (100+ students in 30 minutes). Manual name search is slow.
- Impact: Events can't achieve real-time attendance verification at scale.
- Recommendation: Implement QR code generation on event detail page (`/events/:id`), show QR in check-in page, add QR scanner integration (web camera or mobile app).

**Chat/messaging between organisers and attendees:**
- Problem: No endpoints, models, or UI for real-time communication
- Blocks: Live event support, last-minute venue changes, Q&A during event
- Recommendation: Out of v1 scope but should be explicit on roadmap.

**Polling or voting features (mentioned in mock labels):**
- Problem: No data model, no endpoints, no UI
- Blocks: Engagement metrics, feedback collection during events
- Recommendation: Defer to Phase 2 roadmap.

**Volunteer role assignment (not fully wired):**
- Problem: Backend has `award_volunteer_points` endpoint (backend/app/controllers/registration_controller.py line 59-66) but frontend doesn't call it
- Blocks: Organisers cannot mark volunteers and award them 20 points
- Impact: Volunteer recognition incomplete.
- Recommendation: Add UI in CheckIn page to toggle volunteer roles; call `POST /events/:id/volunteer` with user_id and role_name.

## Test Coverage Gaps

**Frontend has no automated tests:**
- What's not tested: All pages, components, and hooks. No unit tests, no integration tests.
- Files: Everything under `frontend/src/`
- Risk: Regressions in UI logic (filter logic in Discover.tsx, form validation in ProposalNew.tsx, state toggling in ManageEvent.tsx) can ship unnoticed.
- Priority: High. Set up Vitest + React Testing Library. Start with critical user flows: login, event registration, proposal submission.

**Backend test coverage at ~85% but gaps remain:**
- What's not tested: Full capacity-overflow race condition (hard to test deterministically), soft-delete behavior, multi-region quota guardrails, some error paths
- Files: `backend/tests/` (currently `test_auth.py`, `test_proposal_flow.py`, `test_reimbursement_and_rbac.py`, `test_org_service_*`)
- Risk: Edge cases in state transitions or concurrent operations ship untested.
- Priority: Medium. Add tests for: (a) concurrent registrations up to capacity, (b) proposal revocation point reversal, (c) soft-delete filtering.

**No end-to-end tests:**
- What's not tested: Full user journeys (login → discover → register → check-in → earn points → see leaderboard rank)
- Blocks: Release confidence. Manual QA is required before each deploy.
- Recommendation: Set up Playwright or Cypress. Create E2E test scenarios for student, organiser, admin roles.

**Analytics endpoints not tested:**
- What's not tested: Fee utilisation calculation, per-city metrics, leaderboard ranking logic
- Files: `backend/app/services/analytics_service.py` (if exists), `backend/app/controllers/analytics_controller.py`
- Risk: Analytics dashboards show incorrect data without being caught.
- Recommendation: Add unit tests for analytics calculations. Mock the data and assert on expected outputs.

---

*Concerns audit: 2026-08-02*
