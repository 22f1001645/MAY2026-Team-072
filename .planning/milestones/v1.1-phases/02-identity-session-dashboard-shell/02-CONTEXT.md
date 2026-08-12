# Phase 2: Identity, Session & Dashboard Shell - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase makes the session durable and moves organiser status to the server.

Delivered:
- A refresh-token session so a user who closes the tab returns still logged in (`AUTH-01`)
- `/auth/me` returning server-computed capabilities, deleting the frontend's duplicated POR list (`AUTH-02`)
- Two new POR types in the taxonomy: `Society Deputy Secretary` and `Coordinator` (`AUTH-03`)
- An academic level/status field with a termly re-confirmation nudge and admin override (`AUTH-04`)
- A Student/Organiser view switcher that changes zero authorization outcomes (`DASH-01`)

Not delivered here: notification surfaces, progression gating that reads academic status (Phase 7), the organiser workspace pages themselves (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Session & Refresh Tokens

- **D-01:** The refresh token lives in a `Secure`, `httpOnly`, `SameSite` cookie. The access token is never persisted — it lives in memory only. — **Reversibility:** costly — moving the refresh token to `localStorage` later would mean re-doing the CORS credentials configuration, the CSRF guard, and every `api.ts` call site that sends credentials.
- **D-02:** Refresh tokens rotate on every use with reuse detection. Each `/auth/refresh` issues a new token and blocklists the old `jti` in the existing `refresh_token_blocklist` table. Presenting an already-blocklisted token is treated as a replay: revoke the whole family and force re-login. — **Reversibility:** reversible — dropping to non-rotating is a server-side simplification.

  > **⚠ Corrected 2026-08-10 by `02-RESEARCH.md` (verified against `backend/app/models/__init__.py:1073-1078`).** This decision assumed the existing table was usable as-is. It is not. `refresh_token_blocklist` has exactly `jti`, `user_id`, `revoked_at`, `expires_at` (plus the three `Base` columns) — **there is no family column, and nothing can substitute for one**: `jti` is regenerated on every rotation, and revoking by `user_id` would be device-wide, contradicting D-04's this-device-only logout. A nullable `family_id` (plus `reason`) must be added, folded into the same Alembic revision as `terms`. At runtime the family id rides as a `fam` claim via `create_refresh_token(additional_claims=...)`.

- **D-02a (added 2026-08-10):** Reuse detection carries a **~10 second grace window**. A rotated token remains valid for ~10s after rotation; a replay inside that window returns the already-issued successor rather than revoking the family. — *Why:* without it, two browser tabs refreshing simultaneously present the same token and the second is indistinguishable from a stolen-token replay, revoking the family and logging the user out — the exact failure ROADMAP success criterion 2 forbids. The single-flight interceptor (D-06) dedupes within one tab only, never across tabs. A real attacker replaying a stolen token almost never lands inside 10s of the legitimate rotation, so genuine detection is preserved.
- **D-03:** Access token 15 minutes, refresh token 30 days. Replaces the hardcoded `JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)` in `backend/app/config.py`.
- **D-04:** Logout revokes this device only — blocklist the presented token's family and clear the cookie. No cross-device revocation, no "sign out everywhere" surface in this phase.
- **D-05:** `Flask-CORS` must move to `supports_credentials` with an exact origin allowlist (no wildcard), and `/auth/refresh` needs a CSRF guard. This is a direct consequence of D-01. — **Reversibility:** costly — the origin allowlist becomes a deployment-time contract with every frontend environment.

- **D-05a (added 2026-08-10):** The app is **same-site** in every environment. Cookie is `SameSite=Lax`, not `None`. **Dev origins must be aligned** — the frontend and API must both use `localhost` (currently `localhost:5173` → `127.0.0.1:5000`, which a browser treats as cross-site and would silently drop the refresh cookie). If deployment later turns out to be genuinely cross-site, the switch to `SameSite=None; Secure` is a known follow-up requiring HTTPS everywhere including demos. — *CSRF protection is the built-in double-submit token (D-05); `Lax` is a second layer behind it, not the primary defence.*

- **D-05b (added 2026-08-10, from `02-RESEARCH.md`):** Set `JWT_SESSION_COOKIE = False` explicitly. It defaults to `True` in Flask-JWT-Extended 4.6.0, which makes the refresh cookie a session cookie with `max_age=None` — it dies on browser close. Left unset, ROADMAP success criterion 1 fails *intermittently*: passing on tab-close, failing on browser-quit. That presents as flakiness rather than a bug, which is the expensive kind to diagnose.

### Client Session Handling

- **D-06:** Single-flight refresh lives in `frontend/src/lib/api.ts` as a module-level shared `refreshPromise`. On a 401, every concurrent caller awaits the same promise and then replays its original request. React Query never observes the 401, and mutations are covered as well as queries. This is what satisfies success criterion 2 (many simultaneous expiries → exactly one refresh call).
- **D-07:** When the refresh itself fails, every queued request rejects with the original 401, the auth context clears, and the app redirects to `/login` preserving the attempted route for post-login return. "Zero logouts" in criterion 2 means zero *spurious* logouts; a genuinely dead session should log out.
- **D-08:** On cold load, call `/auth/refresh` from the cookie first, then `/auth/me`. Success renders the app; a 401 renders public routes. The cookie is the single source of session truth.
- **D-09:** Purge the legacy `ekatva_token` `localStorage` key on boot and force one re-login. No dual auth path is shipped. — **Reversibility:** one-way — once deployed, existing sessions are gone; re-adding legacy-token acceptance would mean re-introducing the code path this decision exists to avoid.

### Server-Computed Capabilities

- **D-10:** `/auth/me` returns `is_organiser` **plus scoped ID sets** — the organisation IDs and activity IDs this user may manage, computed server-side by the Phase 1 predicates `can_manage_org` and `can_manage_activity`. The frontend can disable the correct controls without ever learning what a POR is. — **Reversibility:** costly — this is a published response contract that Phase 5's live workspace pages will build against.
- **D-11:** Capabilities are recomputed from live PORs on every `/auth/me` call, cached in React Query, invalidated on refresh and on login. **No capability data is embedded in the JWT** — worst-case staleness is one access-token window (15 min), and revocation is never blocked on token expiry.
- **D-12:** Delete `ORGANISER_POR_TYPES` from `frontend/src/lib/auth.tsx` and add a **test that scans `frontend/src` for POR-type string literals and fails the build on any hit**. This is the frontend mirror of Phase 1's `url_map` gate — structural prevention, not review convention. The existing list has already drifted, which is the evidence that convention alone does not hold.

  > **⚠ Corrected 2026-08-10 by `02-RESEARCH.md`.** The drift is **two** entries, not one: the frontend list is missing both `Deputy House Secretary` **and** `Web Admin`. Note that D-12 requires a frontend test framework — and the frontend currently has **no test dependency at all**, which blocks both D-12 and D-18 until it is added (see the Wave 0 note below).

- **D-12a (added 2026-08-10, from `02-RESEARCH.md`):** The frontend has no test tooling, and both obvious current versions are incompatible with this repo — Vitest 4.1.10 peers on Vite `^6||^7||^8` while the lockfile resolves Vite 5.4.21, and jsdom 30 needs Node ≥22.22 against local v20.16.0. **Pin Vitest 3.2.7 and jsdom 26.1.0.** Standing up this tooling is Wave 0 work: D-12 and D-18 cannot be satisfied without it.

### POR Taxonomy (AUTH-03)

- **D-13:** Add `Society Deputy Secretary` and `Coordinator` to `ORGANISER_PORS` **and** `ORG_MANAGER_PORS` in the same change, per the standing instruction left in `backend/app/constants.py` by Phase 1. Adding to one set only is the failure mode that comment exists to prevent.
- **D-14:** Ship a read-only audit that reports any `PORAssignment` row whose `por_type` matches neither set, so misspelled or unknown POR values surface as data rather than as a user mysteriously losing organiser access.

### View Switcher (DASH-01)

- **D-15:** URL-first: the route is the truth (`/organiser/*` vs `/discover`, consistent with the existing `homeFor()` helper). `localStorage` stores the last-used view solely to choose a landing route on cold load. Reload works because the URL works, and a shared link always opens the view it names.
- **D-16:** On crossover — an organiser in Organiser view opening a student route, or the reverse — the URL wins and the switcher flips to match. Deep links from email or a teammate always land where they point.
- **D-17:** When a user's PORs lapse mid-session, `/auth/me` capabilities are authoritative: `is_organiser: false` means the switcher stops rendering and the stored view is ignored and cleared. This is the same code path a single-role student takes, so there is one rule rather than two.
- **D-18:** Prove "view state only" with a test that issues identical API calls with the view set to student and to organiser and asserts identical responses, plus a check that the view value never appears in any request header, query param, or body. — **Reversibility:** reversible — the test can be strengthened or relaxed freely.

### Academic Status (AUTH-04)

- **D-19:** The nudge is a **dismissible dashboard banner** shown when the user's confirmation is stale. It reappears next session until confirmed and never blocks a route. Being ordinary dashboard content makes it structurally impossible to couple to login behaviour, which AUTH-04 forbids.
- **D-20:** "Termly" means **real Jan/May/Sep term boundaries**, not a rolling window. A confirmation is stale when the current term differs from the term in which it was made.
- **D-21:** Term boundaries live in a **`terms` table in the database**, so an admin can adjust a calendar shift without a deploy. — **Reversibility:** one-way — this adds a table and seed data; collapsing it back to a constant later means a migration plus reworking whatever reads it. *(User chose this over a pure function in `constants.py`; see D-24 for the consequence.)*
- **D-22:** Admin override sets the value directly and writes an attributed row to the existing append-only `audit_log` (actor, target, old value, new value). The user can still self-confirm afterwards — an override is a correction, not a lock. Phase 7's progression gating will read this field, so changes to it must be reconstructable.

### Consequences the planner must absorb

- **D-23:** **This phase owns a schema migration** — the first Alembic revision since Phase 1's `213804635519`. Phase 1's migration-safety rule applies without exception: every column landing on an already-populated table must be nullable or carry a `server_default`, and the permanent safety test from `01-03` must still pass.

  > **⚠ Corrected 2026-08-10 by `02-RESEARCH.md` (verified against `backend/app/models/__init__.py:73-75`).** This decision overstated the work in one direction and understated it in another. `academic_level`, `academic_status` and `academic_confirmed_at` **already exist** on `User` — Phase 1's `213804635519` created them. They do not need adding. The revision's actual contents are:
  > 1. the new `terms` table (D-21), and
  > 2. a nullable `family_id` + `reason` on `refresh_token_blocklist` (see the D-02 correction) — which D-02 did not anticipate at all.
  >
  > Both land in **one** revision.
- **D-24:** The `terms` table needs seed data for at least the current academic year, and `seed.py` is now constrained by Phase 1's guard — it can only destroy a local SQLite development file. Seeding terms must work through the normal migration/seed path, not a destructive reset.

### Claude's Discretion

- Exact CSRF mechanism for `/auth/refresh` (double-submit cookie vs. header token) — not discussed; pick the one that fits Flask-JWT-Extended's built-in CSRF support.
- Cookie `SameSite` value (`Lax` vs `Strict`) — depends on whether the frontend is ever served cross-site from the API.
- Shape of the `terms` table beyond what D-20/D-21 require.
- Wording and placement of the dashboard banner.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` — Phase 2 goal, the five success criteria, `**UI hint**: yes`
- `.planning/REQUIREMENTS.md` — `AUTH-01` (lines 24), `AUTH-02` (25), `AUTH-03` (26), `AUTH-04` (27), `DASH-01` (31)
- `.planning/PROJECT.md` — core value and milestone framing

### Phase 1 output this phase builds on (MUST read before touching auth)
- `backend/app/rbac.py` — the four resource-scoped predicates (`can_manage_org`, `can_manage_activity`, `can_participate_in_activity`, `is_meetup_head`), the `activity_scoped` / `org_scoped` guards, and the `url_map` gate. D-10's scoped ID sets are computed from these.
- `backend/app/constants.py` — `ORGANISER_PORS` and `ORG_MANAGER_PORS`, and the standing comment instructing that `Society Deputy Secretary` and `Coordinator` be added to **both** sets simultaneously (D-13)
- `.planning/phases/01-migration-authorization-foundation/01-05-SUMMARY.md` — why authorization was reframed from "is this person an organiser" to "may this person act on THIS resource"
- `.planning/phases/01-migration-authorization-foundation/01-03-SUMMARY.md` — the migration-safety rule and the permanent test that enforces it (D-23)
- `.planning/phases/01-migration-authorization-foundation/01-04-SUMMARY.md` — revision `213804635519`, and the `seed.py` destructive-reset guard (D-24)
- `.planning/phases/01-migration-authorization-foundation/deferred-items.md` — open items from Phase 1, including the 65-character FK name that exceeds PostgreSQL's 63-byte identifier limit

### Files this phase modifies
- `backend/app/config.py` — `JWT_ACCESS_TOKEN_EXPIRES` (D-03), CORS credentials (D-05)
- `backend/app/controllers/auth_controller.py` — currently only `register` / `login` / `me`; gains `/auth/refresh` and `/auth/logout`
- `backend/app/models/__init__.py` — `refresh_token_blocklist` already exists (created by Phase 1, unused); `terms` table and `User` columns are new (D-23)
- `frontend/src/lib/auth.tsx` — `AuthProvider`, and `ORGANISER_POR_TYPES` at line 20 which D-12 deletes
- `frontend/src/lib/api.ts` — fetch wrapper; home of the single-flight refresh (D-06)
- `frontend/src/lib/session.tsx` — `useSession` derives role/name/city from `currentUser`
- `frontend/src/lib/queries.ts` — React Query hooks; capability caching (D-11)

### Codebase maps (note: dated 2026-08-02, predate Phase 1's rbac work — verify against source)
- `.planning/codebase/ARCHITECTURE.md` — layered backend, login flow, POR-based authorization flow, error envelope
- `.planning/codebase/STACK.md` — Flask 3.0.3, Flask-JWT-Extended 4.6.0, React 18.3.1, TanStack Query 5.101.4

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `refresh_token_blocklist` table — already created by Phase 1's migration, currently unused anywhere in code. D-02 gives it its purpose; no migration needed for it.
- `backend/app/rbac.py` predicates — `can_manage_org` / `can_manage_activity` already answer the per-resource question. D-10's scoped ID sets are these predicates evaluated across the user's memberships, not new logic.
- `audit_log` — append-only table already in the schema; D-22 writes to it rather than inventing an override history.
- `ApiError` + uniform error envelope (`{error, code, details?, status}`) — refresh failures and CSRF rejections should use it, not a bespoke shape.
- `ToastProvider` and `states.tsx` (`Loading` / `ErrorState`) — available for the banner and session-expiry surfaces.
- `homeFor(role)` in `frontend/src/lib/auth.tsx` — already maps role to a landing route; D-15's URL-first switcher extends this rather than replacing it.

### Established Patterns
- Controllers → services → repositories; auth logic belongs in `backend/app/services/auth_service.py`, queries in `backend/app/repositories/repos.py`.
- Marshmallow schemas validate request JSON in controllers.
- React Query owns server state; React Context owns auth state. D-11 fits capabilities into the Query cache, consistent with this split.
- `api.ts` adapts snake_case responses to camelCase — the `/auth/me` capability payload will pass through this adapter.

### Integration Points
- `App.tsx` splits public routes (Landing, Login, Register) from the protected `AppShell`; D-08's boot sequence gates this split.
- `Layout.tsx` renders role-based nav — where the D-15 switcher lands and where D-17 hides it.
- Every request in `api.ts` gains credentials mode (D-05) and passes through the 401 interceptor (D-06).

### Known Concerns Carried In
- `frontend/src/lib/auth.tsx` contains hardcoded `DEMO_ACCOUNTS` with plaintext passwords, mirrored in `backend/seed.py`. Not in this phase's scope, but this phase rewrites the surrounding auth flow — worth a deliberate decision on whether they survive the rewrite.

</code_context>

<specifics>
## Specific Ideas

- The user chose real term boundaries (D-20) and a database `terms` table (D-21) over the lighter-weight rolling-window and constants-based alternatives, accepting that this phase therefore takes on a schema migration (D-23). This was a deliberate trade, not an oversight.
- Two enforcement mechanisms were chosen specifically because they mirror Phase 1's `url_map` gate — the frontend POR-literal scan (D-12) and the identical-response view test (D-18). The pattern the user is reaching for: make the rule fail the build, not the code review.

</specifics>

<deferred>
## Deferred Ideas

- **"Sign out everywhere" surface** — considered under D-04, deferred. Cross-device revocation is a security-settings feature with its own UI.
- **One-time notice when organiser access lapses** — considered under D-17, deferred. It is a notification surface; Phase 8 (`event-announcements-polls-queries`) is the natural home.
- **Constraining `por_type` to a database enum** — considered under D-14, deferred. It is a schema constraint change closer to Phase 1's territory than this phase's.
- **Retiring the hardcoded `DEMO_ACCOUNTS`** — surfaced during codebase scout, not part of any Phase 2 requirement.

</deferred>

---

*Phase: 2-identity-session-dashboard-shell*
*Context gathered: 2026-08-10*
