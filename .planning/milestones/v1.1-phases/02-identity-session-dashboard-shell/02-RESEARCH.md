# Phase 2: Identity, Session & Dashboard Shell — Research

**Researched:** 2026-08-10
**Domain:** Cookie-based JWT sessions, refresh-token rotation, server-computed capabilities, Alembic migration on a populated DB
**Confidence:** HIGH (backend/session findings read from installed 4.6.0 source and repo source), MEDIUM (frontend tooling), LOW (token-family conventions from web only)

## Summary

Three CONTEXT.md assumptions are factually wrong against the code and must be corrected before planning. (1) D-23 says this phase adds `academic_level`, `academic_status` and a last-confirmed timestamp to `User` — **they already exist**, landed by Phase 1's migration `213804635519`. (2) `<code_context>` says the `refresh_token_blocklist` table needs no migration — **it does**, because it has no family column and D-02's reuse detection is family-scoped. (3) D-03 sets refresh expiry to 30 days — that is **already the Flask-JWT-Extended default**, so the notable config change is elsewhere: `JWT_SESSION_COOKIE` defaults to `True`, which makes the refresh cookie die when the browser closes and would silently break success criterion 1.

The highest-value verified finding is that Flask-JWT-Extended runs its blocklist callback inside token decoding for **every** request, and raises before the view body executes. Reuse detection has to *act* (revoke a family), not merely deny, so `/auth/refresh` must opt out of the automatic check with `skip_revocation_check=True` and perform the check explicitly in the service.

**Primary recommendation:** Use Flask-JWT-Extended's built-in double-submit CSRF (it ships it, and the token half lives inside the JWT), put the refresh cookie in cookie mode while keeping the access token in headers/memory, add `family_id` + `reason` columns to `refresh_token_blocklist` in the same Alembic revision that creates `terms`, and pin Vitest **3.2.7** (not 4.x) because Vitest 4 requires Vite 6+.

---

## refresh_token_blocklist — current shape and verdict

### Actual columns as they exist today

`backend/app/models/__init__.py:1063-1078` — quoted verbatim:

```python
class RefreshTokenBlocklist(Base):
    __tablename__ = "refresh_token_blocklist"

    jti = db.Column(db.String(64), unique=True, nullable=False, index=True)
    user_id = db.Column(db.String(32), db.ForeignKey("users.id"), nullable=True, index=True)
    revoked_at = db.Column(db.DateTime, nullable=False, default=_utcnow)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
```

Plus the three inherited from `Base` (`backend/app/models/__init__.py:45-49`), verbatim:

```python
    id = db.Column(db.String(32), primary_key=True, default=_uuid)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=_utcnow, onupdate=_utcnow, nullable=False
    )
```

Confirmed in the migration chain at `backend/migrations/versions/213804635519_milestone_v1_1_batch_16_tables_11_.py:62-76` — `op.create_table('refresh_token_blocklist', ...)` with columns `jti` (String 64), `user_id` (String 32), `revoked_at`, `expires_at`, `id`, `created_at`, `updated_at`; a unique index `ix_refresh_token_blocklist_jti`, plus non-unique indexes on `user_id` and `expires_at`.

[VERIFIED: backend/app/models/__init__.py:1063-1078, :45-49; backend/migrations/versions/213804635519_...py:62-76]

### Verdict: **a migration IS required.** CONTEXT.md is wrong on this point.

`<code_context>` in 02-CONTEXT.md states: *"`refresh_token_blocklist` table — already created by Phase 1's migration... D-02 gives it its purpose; **no migration needed for it**."* That holds only for plain per-`jti` revocation. It does **not** hold for D-02 as written, which requires: *"Presenting an already-blocklisted token is treated as a replay: revoke the whole family."*

There is no `family_id` column, and no other column can stand in for one:

| Candidate | Why it cannot carry the family |
|-----------|-------------------------------|
| `jti` | Unique per token by construction (`str(uuid.uuid4())`, regenerated on every rotation) — it identifies one token, never a lineage. |
| `user_id` | Revoking by user is **device-wide**, which contradicts D-04 ("Logout revokes this device only… no cross-device revocation"). A replay on a phone would sign the user out of their laptop. |
| `expires_at` / `revoked_at` | Timestamps, no identity. |

Additionally, the table only ever holds *revoked* tokens. On reuse detection you must invalidate the family's **currently-live** successor, whose `jti` is by definition not yet in the table. So the family identity has to be recorded somewhere durable.

### Recommended change (one revision, shared with `terms`)

Add two nullable columns to `refresh_token_blocklist`:

| Column | Type | Nullable | Index | Purpose |
|--------|------|----------|-------|---------|
| `family_id` | `db.String(32)` | yes | yes | The login-session lineage. Minted at login, carried forward unchanged through every rotation. |
| `reason` | `db.String(32)` | yes | no | `rotated` \| `logout` \| `reuse_detected`. Makes the audit readable and gives family revocation a marker to query. |

Both nullable, so the Phase 1 migration-safety rule (D-23: *"every column landing on an already-populated table must be nullable or carry a `server_default`"*) is satisfied without a backfill. The table is empty in practice today (it is referenced nowhere in code), but the rule is enforced by a permanent test and should be honoured regardless.

**Where the family id lives at runtime:** in the refresh token itself, as a custom claim. `create_refresh_token(identity, additional_claims={"fam": family_id})` is supported in 4.6.0 — `additional_claims` is merged into the token payload by `_encode_jwt` via `token_data.update(claim_overrides)` (`tokens.py:66-67`). This means the family travels with the cookie and needs no lookup table for the happy path. [VERIFIED: flask_jwt_extended/tokens.py:20-67, utils.py:185-207]

### Resulting rotation / reuse-detection logic

```
POST /auth/refresh   @jwt_required(refresh=True, skip_revocation_check=True)
  jti, fam = get_jwt()["jti"], get_jwt()["fam"]

  if family_revoked(fam):            -> 401, clear cookies
  if jti in blocklist:               -> REPLAY
       insert row(family_id=fam, reason='reuse_detected')   # tombstone
       clear cookies, 401
  else:
       insert row(jti=jti, family_id=fam, reason='rotated', user_id, expires_at)
       issue new refresh token with the SAME fam, set_refresh_cookies(...)
       issue new access token (15 min)
```

`family_revoked(fam)` is one indexed query: *does any row exist with `family_id = fam` and `reason = 'reuse_detected'`*. Logout (D-04) writes the same shape with `reason='logout'` and is therefore naturally device-scoped — it revokes one family, not the user.

### Two traps this design has to survive

**1. The blocklist callback fires on every request, not just refresh.** `verify_token_not_blocklisted` is invoked from `_decode_jwt_from_request` for access tokens too (`view_decorators.py:367-368` → `internal_utils.py:56-59`). A naive `@jwt.token_in_blocklist_loader` that queries the DB unconditionally adds a database round-trip to **every authenticated API call in the app**. The loader must short-circuit first:

```python
@jwt.token_in_blocklist_loader
def _is_revoked(jwt_header, jwt_data):
    if jwt_data.get("type") != "refresh":
        return False        # access tokens are short-lived; never hit the DB
    ...
```

**2. The loader is a predicate, not a place for side effects.** Because it raises `RevokedTokenError` during decoding, a blocklisted token never reaches the view — so family revocation can never happen there. That is precisely why `/auth/refresh` should pass `skip_revocation_check=True` and do the check explicitly in `auth_service`, keeping the loader pure. The parameter exists in 4.6.0 on both `jwt_required` and `verify_jwt_in_request` (`view_decorators.py:51, 80-82, 127, 159-161, 167-168`). [VERIFIED: flask_jwt_extended/view_decorators.py:45-52, 121-174, 298-372; internal_utils.py:56-59]

**3. Multi-tab concurrent refresh will cause spurious family revocation.** D-06's single-flight promise is *module-level*, so it is per-tab. Two tabs waking at once both send the same cookie; the second arrives after rotation and looks exactly like a replay. That is a false positive that logs the user out — directly violating success criterion 2 ("zero logouts"). Mitigate with a **grace window**: if the presented `jti` was rotated less than N seconds ago (30s is a reasonable start) and the family is not already tombstoned, re-issue instead of revoking. Store nothing extra — `revoked_at` already gives you the age. [ASSUMED — the grace-window convention comes from web sources, not from a spec; the N value should be confirmed with the user.]

---

## Flask-JWT-Extended 4.6.0 cookie mode

Version confirmed: `__version__ = "4.6.0"` at `flask_jwt_extended/__init__.py:22`, matching the pin in `backend/requirements.txt`. All values below were read from the installed package source, not from docs. [VERIFIED: flask_jwt_extended/jwt_manager.py:188-231]

### Defaults that matter (from `_set_default_configuration_options`)

| Key | Shipped default | Action for this phase |
|-----|-----------------|----------------------|
| `JWT_TOKEN_LOCATION` | `("headers",)` | **Change** → `("headers", "cookies")` |
| `JWT_SESSION_COOKIE` | `True` | **Change → `False`.** See the trap below. |
| `JWT_REFRESH_TOKEN_EXPIRES` | `datetime.timedelta(days=30)` | Already D-03's value; set explicitly for legibility |
| `JWT_COOKIE_CSRF_PROTECT` | `True` | Keep |
| `JWT_CSRF_IN_COOKIES` | `True` | Keep |
| `JWT_CSRF_METHODS` | `["POST", "PUT", "PATCH", "DELETE"]` | Keep — implies `/auth/refresh` **must be POST** |
| `JWT_COOKIE_SECURE` | `False` | Env-driven: `False` in dev (http://localhost), `True` in prod |
| `JWT_COOKIE_SAMESITE` | `None` | **Set `"Lax"`** — see below |
| `JWT_REFRESH_COOKIE_NAME` | `"refresh_token_cookie"` | Keep |
| `JWT_REFRESH_COOKIE_PATH` | `"/"` | **Narrow** → `/api/v1/auth` so the cookie is not attached to every request |
| `JWT_REFRESH_CSRF_COOKIE_NAME` | `"csrf_refresh_token"` | Keep |
| `JWT_REFRESH_CSRF_HEADER_NAME` | `"X-CSRF-TOKEN"` | Keep |
| `JWT_ACCESS_TOKEN_EXPIRES` | (not defaulted here; repo sets it) | **Change** `timedelta(hours=12)` → `timedelta(minutes=15)` per D-03 |

The repo currently has, verbatim at `backend/app/config.py:19`:

```python
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
```

### ⚠ The `JWT_SESSION_COOKIE` trap — this one breaks success criterion 1

`config.py:267-272`, verbatim:

```python
    @property
    def cookie_max_age(self) -> Optional[int]:
        # Returns the appropiate value for max_age for flask set_cookies. If
        # session cookie is true, return None, otherwise return a number of
        # seconds 1 year in the future
        return None if self.session_cookie else 31540000  # 1 year
```

With the shipped default `JWT_SESSION_COOKIE = True`, `max_age=None` → the refresh cookie is a **session cookie**, discarded when the browser closes. A 30-day refresh token would then be silently useless the moment the user quits their browser, and ROADMAP criterion 1 ("closes the tab and returns two hours later is still logged in") would fail intermittently — passing for tab-close, failing for browser-quit. **Set `JWT_SESSION_COOKIE = False`.**

Note the knock-on: `max_age` then becomes a **fixed 1 year**, not 30 days. The cookie outlives the JWT it carries. That is harmless (the server rejects the expired JWT) but means "logged out" presents as a 401 on refresh rather than an absent cookie — S2's contract already handles that path correctly ("401 from refresh → render public routes immediately").

### Recommended CSRF mechanism: the built-in double-submit. Use it; do not hand-roll.

D-24's discretion grant asks for a pick. **Use `JWT_COOKIE_CSRF_PROTECT=True` with the CSRF value in a cookie and echoed in the `X-CSRF-TOKEN` header** — i.e. the library default, unchanged.

Justification, from what 4.6.0 actually ships:

1. **The CSRF secret is inside the signed JWT**, not in server state. `tokens.py:53-54`, verbatim: `if csrf:` / `token_data["csrf"] = str(uuid.uuid4())`. So it needs no session store and no extra table — which matters for a project with no Redis and no hosted deploy.
2. **The comparison is constant-time and fails closed.** `tokens.py:118-121`, verbatim:
   ```python
       if csrf_value:
           if "csrf" not in decoded_token:
               raise JWTDecodeError("Missing claim: csrf")
           if not compare_digest(decoded_token["csrf"], csrf_value):
   ```
3. **The two halves are correctly split by `httponly`.** `set_refresh_cookies` writes the JWT cookie with `httponly=True` (`utils.py:355`) and the CSRF cookie with `httponly=False` (`utils.py:367`) — so JS can read the CSRF value to echo it, but can never read the token. That is exactly the double-submit shape, already assembled.
4. **The presence check happens before decode.** `view_decorators.py:247-252`, verbatim:
   ```python
       if config.cookie_csrf_protect and request.method in config.csrf_request_methods:
           csrf_value = request.headers.get(csrf_header_key, None)
           if not csrf_value and config.csrf_check_form:
               csrf_value = request.form.get(csrf_field_key, None)
           if not csrf_value:
               raise CSRFError("Missing CSRF token")
   ```

A hand-rolled header token would duplicate all four properties with more code and no gain. **Rejected alternative:** relying on `SameSite` alone — it is a defence-in-depth layer, not a CSRF control, and it does not protect against same-site subdomain attackers.

**Consequence for the client:** `api.ts` must read `document.cookie` for `csrf_refresh_token` and send it as `X-CSRF-TOKEN` on the `POST /auth/refresh` and `POST /auth/logout` calls. This is the *only* cookie the frontend reads — the refresh token itself stays unreadable.

### `SameSite`: choose `Lax`

D-24 leaves this open, conditional on whether the frontend is served cross-site from the API. In this repo it is **cross-origin but same-site-ambiguous in dev**: Vite on `http://localhost:5173` (`frontend/vite.config.ts`) and Flask on `http://127.0.0.1:5000` (`api.ts:8` `BASE`). Note `localhost` and `127.0.0.1` are *different origins and different sites* to a browser — so in dev, `SameSite=Strict` and even `Lax` will drop the cookie on the cross-site XHR.

Recommendation: **`Lax`** in config, and **align the dev origins** so the frontend calls `http://localhost:5000` rather than `http://127.0.0.1:5000` (a one-line `VITE_API_URL` / `BASE` change). This keeps a real `SameSite` protection in production instead of the `None` that a mismatched dev setup would force. `SameSite=None` would require `Secure=True`, which cannot work over plain-http localhost — so choosing `None` to paper over the mismatch is a dead end. [VERIFIED: frontend/vite.config.ts, frontend/src/lib/api.ts:8]

### Keep the access token in headers, not cookies

D-01 requires the access token to be memory-only. Cookie mode is therefore for the **refresh token only**: set `JWT_TOKEN_LOCATION = ("headers", "cookies")`, call `set_refresh_cookies()` at login/refresh, and never call `set_access_cookies()`. The access token continues to travel as `Authorization: Bearer` from a module-level JS variable. `_decode_jwt_from_request` tries locations in order and needs a token in only one (`view_decorators.py:333-358`), so ordinary endpoints keep working unchanged with the existing `auth_required` guard.

`unset_jwt_cookies(response)` on logout clears both the refresh cookie and its CSRF cookie (`utils.py:374-383` → `424-459`).

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json`. [VERIFIED: .planning/config.json]

### Test Framework — backend (exists)

| Property | Value |
|----------|-------|
| Framework | pytest 8.3.2 + pytest-cov 5.0.0 |
| Config file | `backend/pytest.ini` — `testpaths = tests`, `addopts = -q --cov=app --cov-report=term-missing` |
| Quick run | `cd backend && pytest tests/test_auth.py -x -q` |
| Full suite | `cd backend && pytest` |
| Fixtures | `backend/tests/conftest.py` — `app`, `client`, and `admin_headers` / `rc_headers` / `student_headers` / `crew_headers` / `meetup_head_headers` |

### Test Framework — frontend (**does not exist — this is the biggest Wave 0 gap**)

`frontend/package.json` has **no test script and no test dependency of any kind** — no vitest, no jest, no @testing-library. Scripts are exactly `dev`, `build`, `preview`. [VERIFIED: frontend/package.json]

This blocks two locked decisions outright: **D-12** (a test scanning `frontend/src` for POR-type literals that fails the build) and **D-18** (identical-response view test + assertion the view value never leaves the client). Neither can ship without first standing up a runner.

**Version-pinning is not optional here — the obvious choices are both broken:**

| Package | Naive pick | Why it fails | **Use** |
|---------|-----------|--------------|---------|
| vitest | 4.1.10 (latest) | peer `vite: ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`; repo resolves **vite 5.4.21** | **3.2.7** (dep `vite: ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0-0`) |
| jsdom | 30.0.1 (latest) | engines `node: ^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`; local node is **v20.16.0** | **26.1.0** (engines `node: >=18`) |
| @testing-library/react | 16.3.2 | fine, but needs `@testing-library/dom ^10` as an **explicit** peer install | 16.3.2 + `@testing-library/dom` 10.4.1 |

[VERIFIED: npm registry — `npm view vitest@4.1.10 peerDependencies`, `npm view vitest@3.2.7 dependencies.vite engines`, `npm view jsdom@30.0.1 engines`, `npm view jsdom@26.1.0 engines`, `npm view @testing-library/react@16.3.2 peerDependencies`; vite version from `frontend/package-lock.json`; `node --version` → v20.16.0]

Choosing jsdom 26 over 27 (`node: >=20`) is deliberate: this is a five-developer course project and `>=18` is the widest floor. All are **devDependencies**, so the UI-SPEC's "New runtime dependencies introduced by this phase's UI: **zero**" still holds.

Note D-12's scan does not strictly need a DOM — it is a filesystem grep over `frontend/src` and could run under plain `node`. But D-18 and any component test do, so stand the runner up once.

### ⚠ Migration correctness — GSD's schema gate does NOT cover this stack

GSD's schema-push detection recognises Payload/Prisma/Drizzle/Supabase/TypeORM patterns only. This project uses **Flask-Migrate/Alembic**, so that automated protection does not fire. Migration safety here is carried entirely by the tests below — they are load-bearing, not nice-to-have.

Phase 1 left a permanent gate that this phase must not break: `backend/tests/test_migrations.py` contains `PENDING_BATCH_TABLES = frozenset()` and `PENDING_BATCH_COLUMNS = frozenset()` — both deliberately **empty**, with a comment reading *"THE WINDOW IS CLOSED… the drift gate is once again live for the ENTIRE schema with no exceptions: any model changed from here on without a migration fails `test_models_match_migrations_no_drift`."* Declaring the `terms` model or the two blocklist columns without generating the revision **will fail the suite**. Do not reopen the allowlist. [VERIFIED: backend/tests/test_migrations.py:43-57, 232-253]

Required migration checks for this phase:

| Check | Command / assertion |
|-------|--------------------|
| Existing gate still green | `pytest tests/test_migrations.py -q` — all four tests |
| Upgrade applies on a **populated** DB | New test: seed users + a POR, `flask db upgrade`, assert row count unchanged and `academic_*` values preserved |
| Downgrade works | New test: `upgrade` → `downgrade` → assert `terms` gone and the two blocklist columns gone, no orphan rows |
| Nullable/server_default rule (D-23) | Assert `terms` is a new table (rule N/A) and both new `refresh_token_blocklist` columns report `nullable=True` via `sa.inspect().get_columns()` |
| Single head | `flask db heads` returns exactly one revision (down_revision must be `213804635519`) |

### Phase Requirements → Test Map

| Req | Behavior | Type | Command | Exists? |
|-----|----------|------|---------|---------|
| AUTH-01 | Login sets an httpOnly refresh cookie; `/auth/refresh` returns a new access token | integration | `pytest tests/test_auth_session.py -k refresh -x` | ❌ Wave 0 |
| AUTH-01 | Refresh cookie is **not** a session cookie (`Max-Age` present) — guards criterion 1 | integration | `pytest tests/test_auth_session.py -k max_age -x` | ❌ Wave 0 |
| AUTH-01 | Rotation: old `jti` blocklisted, new token differs | integration | `pytest tests/test_auth_session.py -k rotation -x` | ❌ Wave 0 |
| AUTH-01 | **Reuse detection**: replaying a rotated token revokes the family; a later valid successor is also rejected | integration | `pytest tests/test_auth_session.py -k reuse -x` | ❌ Wave 0 |
| AUTH-01 | Grace window: a replay inside N seconds re-issues rather than revoking | integration | `pytest tests/test_auth_session.py -k grace -x` | ❌ Wave 0 |
| AUTH-01 | CSRF: `POST /auth/refresh` without `X-CSRF-TOKEN` → 401 | integration | `pytest tests/test_auth_session.py -k csrf -x` | ❌ Wave 0 |
| AUTH-01 | Blocklist loader does **not** query the DB for access tokens | unit | `pytest tests/test_auth_session.py -k loader_short_circuit -x` | ❌ Wave 0 |
| AUTH-02 | `/auth/me` returns `is_organiser` + `manageable_org_ids` + `manageable_activity_ids` | integration | `pytest tests/test_capabilities.py -x` | ❌ Wave 0 |
| AUTH-02 | Capabilities recomputed live — deactivating a POR flips `is_organiser` with no new token | integration | `pytest tests/test_capabilities.py -k live -x` | ❌ Wave 0 |
| AUTH-02 | **No capability data in the JWT** (D-11) — decode the access token, assert absence | unit | `pytest tests/test_capabilities.py -k no_claims -x` | ❌ Wave 0 |
| AUTH-03 | Both new POR types are in `ORGANISER_PORS` **and** `ORG_MANAGER_PORS` | unit | `pytest tests/test_rbac_predicates.py -k new_por -x` | ❌ Wave 0 |
| AUTH-03 | All four of Deputy House Secretary / Web Admin / Society Deputy Secretary / Coordinator get the organiser surface (criterion 3) | integration | `pytest tests/test_capabilities.py -k por_matrix -x` | ❌ Wave 0 |
| AUTH-04 | Staleness computed from the `terms` table, not a rolling window | unit | `pytest tests/test_academic_status.py -k stale -x` | ❌ Wave 0 |
| AUTH-04 | **Decoupling**: neither login nor refresh branches on academic fields — withdrawn/stale user still logs in and refreshes | integration | `pytest tests/test_academic_status.py -k decoupled -x` | ❌ Wave 0 |
| AUTH-04 | Admin override writes an `audit_log` row carrying actor, target, old and new | integration | `pytest tests/test_academic_status.py -k override_audit -x` | ❌ Wave 0 |
| DASH-01 | **Identical responses** under student vs organiser view (D-18) | integration | `pytest tests/test_view_switcher.py -x` | ❌ Wave 0 |
| DASH-01 | View value never appears in any header/query/body | frontend | `npx vitest run src/lib/__tests__/view-not-sent.test.ts` | ❌ Wave 0 |
| D-12 | No POR-type string literal anywhere in `frontend/src` | frontend | `npx vitest run src/__tests__/no-por-literals.test.ts` | ❌ Wave 0 |
| D-14 | Audit reports `PORAssignment` rows matching neither POR set | integration | `pytest tests/test_por_audit.py -x` | ❌ Wave 0 |
| D-23 | Migration applies on a populated DB, downgrades cleanly, drift gate green | integration | `pytest tests/test_migrations.py -q` | ✅ extend |

### Sampling Rate

- **Per task commit:** `pytest tests/test_auth_session.py -x -q` (or the module the task touched)
- **Per wave merge:** `cd backend && pytest` + `cd frontend && npx vitest run && npm run build`
- **Phase gate:** full backend suite green, full frontend suite green, `npm run build` (i.e. `tsc -b && vite build`) clean, before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] Frontend runner: `npm i -D vitest@3.2.7 jsdom@26.1.0 @testing-library/react@16.3.2 @testing-library/dom@10.4.1 @testing-library/jest-dom @testing-library/user-event`
- [ ] `frontend/vitest.config.ts` (or `test` block in `vite.config.ts`) with `environment: 'jsdom'`
- [ ] `"test": "vitest run"` script in `frontend/package.json`
- [ ] `frontend/src/test/setup.ts` — jest-dom matchers
- [ ] `backend/tests/test_auth_session.py`, `test_capabilities.py`, `test_academic_status.py`, `test_view_switcher.py`, `test_por_audit.py`
- [ ] Extend `conftest.py`: a cookie-aware client fixture, and a `terms` seed fixture (the existing `_seed_minimal` creates no terms rows)

---

## Security threats (ASVS L1)

ASVS Level 1 enforcement is active, blocking at `high`. This is the session/auth phase, so V2/V3 are the live categories.

### Applicable ASVS categories

| Category | Applies | Control in this phase |
|----------|---------|----------------------|
| V2 Authentication | yes | `werkzeug.security` hashing (already in `auth_service`); no new credential path |
| V3 Session Management | **yes — primary** | Rotation + reuse detection, httpOnly/Secure/SameSite cookie, server-side revocation |
| V4 Access Control | yes | Phase 1 scoped predicates; D-10 exposes capabilities but must not *become* the authority |
| V5 Input Validation | yes | Marshmallow schemas for the academic-status and override payloads; enum allowlists |
| V6 Cryptography | yes | HS256 via `JWT_SECRET_KEY` — never hand-roll; `compare_digest` already used for CSRF |

### Concrete threats for the planner's `<threat_model>`

| ID | Threat | STRIDE | Mitigation | Test |
|----|--------|--------|------------|------|
| T-02-01 | **XSS steals the refresh token** | Info disclosure | Refresh token in `httponly=True` cookie (`utils.py:355`); access token memory-only, never `localStorage` (D-01) | Assert `Set-Cookie` for the refresh cookie carries `HttpOnly` |
| T-02-02 | **CSRF on `/auth/refresh`** — a cross-site POST silently mints a session | Spoofing | `JWT_COOKIE_CSRF_PROTECT=True`; `X-CSRF-TOKEN` compared constant-time against the in-JWT `csrf` claim; `SameSite=Lax` as depth | POST with cookie but no header → 401 |
| T-02-03 | **Refresh-token replay after theft** | Spoofing / elevation | Rotation on every use + family revocation on reuse (D-02) | Replay test asserts the live successor is also killed |
| T-02-04 | **Stolen token stays valid for 30 days** | Elevation | Blocklist is checked server-side on every refresh; revocation is not gated on expiry (D-11) | Blocklisted `jti` → 401 |
| T-02-05 | **Session fixation** — pre-login cookie survives and is adopted | Spoofing | Mint a **new** `family_id` at every login; never reuse a family across authentications | Login twice → two distinct families; first still independently revocable |
| T-02-06 | **Logout does not actually end the session** | Repudiation | `/auth/logout` blocklists the family **and** calls `unset_jwt_cookies`; clearing the cookie alone leaves a valid token in an attacker's hands | Logout, then replay the captured cookie → 401 |
| T-02-07 | **Capabilities from `/auth/me` used as the authorization decision** | Elevation | D-10's ID sets are for *rendering only*. Every mutating endpoint must still run the Phase 1 scoped guards; the `url_map` gate in `test_rbac_enforcement.py` keeps this honest | Existing RBAC-02 gate stays green |
| T-02-08 | **View switcher smuggled into an auth decision** | Elevation | D-18: view value never enters a header, query param, body or cookie | Identical-response test + client-side assertion |
| T-02-09 | **Credentialed CORS reflects an attacker origin** | Spoofing | Exact-origin allowlist, no wildcard — see the Flask-CORS section | Request with a foreign `Origin` → no `Access-Control-Allow-Origin` |
| T-02-10 | **Stale POR still grants organiser access** | Elevation | No capability claims in the JWT (D-11); recomputed per `/auth/me`, worst-case staleness 15 min | Deactivate POR → `is_organiser` flips without re-login |
| T-02-11 | **Academic status gates login** (forbidden by AUTH-04) | DoS / lockout | No branch on `academic_*` anywhere in the auth path; enforced by test, and the model docstring already warns of it | `decoupled` test: withdrawn user logs in and refreshes |
| T-02-12 | **Admin override unattributable** | Repudiation | D-22 writes actor/target/old/new to the append-only `audit_log` | `override_audit` test |
| T-02-13 | **Weak default secrets reach production** | Spoofing | `config.py:17-18` ships literal dev fallbacks for `SECRET_KEY` and `JWT_SECRET_KEY`. Now that they sign a 30-day cookie, forging one is a full account takeover. Fail fast if unset when not `TESTING` | Test: non-test config + unset env → startup raises |

T-02-13 is a **pre-existing** weakness this phase materially worsens (12-hour header token → 30-day cookie), so it belongs in scope. [VERIFIED: backend/app/config.py:17-18]

### Not hand-rolled, deliberately

Token signing/verification, CSRF comparison, cookie flag assembly, and password hashing are all delegated to Flask-JWT-Extended and Werkzeug. The only bespoke security logic in this phase is the **family rotation state machine** — which is why it carries the densest test coverage above.

---

## Single-flight refresh + TanStack Query v5

### Why the interceptor must sit below React Query

**`useMutation` does not retry on error by default** — the v5 docs state: *"By default, TanStack Query will not retry a mutation on error, but it is possible with the `retry` option."* Queries in this repo are configured `retry: 1` in `frontend/src/main.tsx`, verbatim:

```ts
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
```

So if a 401 ever reaches React Query, a mutation fails permanently and a query gets one blind retry that will also 401. Refresh-and-replay therefore has to happen **inside the fetch wrapper**, invisible to React Query — which is exactly what D-06 specifies. [CITED: tanstack.com/query/v5/docs/framework/react/guides/mutations] [VERIFIED: frontend/src/main.tsx]

### The shared-promise pattern

```ts
let refreshPromise: Promise<void> | null = null

async function refreshOnce(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  return refreshPromise          // every concurrent caller awaits the SAME promise
}
```

Three properties the planner should hold the implementation to:

1. **Assign the promise before awaiting anything.** Any `await` before the assignment reopens the race the pattern exists to close.
2. **Clear it in `finally`, not `then`.** A failed refresh must not leave a permanently-rejected promise cached, or every later request fails without retrying.
3. **Replay once, never loop.** After a successful refresh, re-issue the original request exactly once; a second 401 propagates. Guard with a per-request `retried` flag — a wrapper that recurses on 401 will spin.

### Replay mechanics

`request()` in `api.ts` currently consumes the body with `const text = await res.text()` (line 50). Replay must rebuild the `RequestInit` from the original arguments rather than reusing the consumed `Response`. Because `options.body` is always a pre-serialised string in this codebase (every call site does `JSON.stringify(...)`), the options object is safely reusable — no stream cloning needed.

### Required changes to `frontend/src/lib/api.ts`

The current wrapper reads a bearer token from `localStorage` and sends no credentials — verbatim, lines 8-17 and 36-41:

```ts
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api/v1'
const TOKEN_KEY = 'ekatva_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}
```
```ts
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  ...
    res = await fetch(`${BASE}${path}`, { ...options, headers })
```

Needed: `credentials: 'include'` on every fetch (D-05); the access token moved from `localStorage` to a module variable (D-01); `getToken`/`setToken` retired along with the `ekatva_token` key, which must be purged on boot (D-09); the `X-CSRF-TOKEN` header added on refresh/logout; and the 401 interception added. Note `BASE` also wants the `127.0.0.1` → `localhost` change discussed under `SameSite`.

### One toast, not ten (S3)

The session-expiry toast must fire from the **shared failure handler** inside `refreshOnce`, not from each rejected caller — ten simultaneous rejections produce one toast. Since `api.ts` is not a React module, expose this as a callback the `AuthProvider` registers at mount (e.g. `setOnSessionExpired(fn)`), rather than importing the toast hook into the wrapper.

### Cold boot (D-08)

`App.tsx` currently gates on `loading` from `useAuth()` and renders public routes purely by pathname. The new sequence is `POST /auth/refresh` → on success `GET /auth/me` → render; on 401 render public routes with no error (S2). Both S2's >600ms label and >8s error tier need timers held in the provider.

⚠ **`ErrorState` cannot express S2's >8s contract as written.** Its signature is `ErrorState({ error }: { error: unknown })` — it derives its own heading and message from the error and renders **no action buttons**. S2 requires the "Could not restore your session" copy plus **Try again** and **Go to sign-in**. The planner must either extend `ErrorState` with optional `title` / `message` / `children` props or build a bespoke boot-failure surface. This is a real gap between the approved UI-SPEC and the code. [VERIFIED: frontend/src/components/states.tsx]

---

## Flask-CORS credentials and exact-origin

Installed version confirmed **4.0.1**, matching `Flask-Cors==4.0.1` in `backend/requirements.txt`.

Current wiring, `backend/app/__init__.py:29`, verbatim:

```python
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
```

and `backend/app/config.py:26-29`, verbatim:

```python
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://localhost:5175",
    ).split(",")
```

**Change needed:** add `supports_credentials=True`. The existing exact-origin list is already correct in shape and should be kept — the default is `supports_credentials=False`, so credentialed requests are currently dropped by the browser. [VERIFIED: flask_cors/core.py:48-60 `DEFAULT_OPTIONS`]

### The trap: wildcard + credentials does **not** raise

The documented guard only fires when `send_wildcard` is also on (`core.py:369-372`), and `send_wildcard` defaults to `False`. With `origins='*'` + `supports_credentials=True` + a request carrying an `Origin` header, `get_cors_origins` falls through the wildcard branch to the match branch and returns `[request_origin]` — **reflecting any attacker origin with `Access-Control-Allow-Credentials: true`**, silently. Verbatim, `core.py:119-129`:

```python
        if wildcard and options.get('send_wildcard'):
            LOG.debug("Allowed origins are set to '*'. Sending wildcard CORS header.")
            return ['*']
        # If the value of the Origin header is a case-sensitive match
        # for any of the values in list of origins
        elif try_match_any(request_origin, origins):
            LOG.debug("The request's Origin header matches. Sending CORS headers.", )
            # Add a single Access-Control-Allow-Origin header, with either
            # the value of the Origin header or the string "*" as value.
            # -- W3Spec
            return [request_origin]
```

So "no wildcard" (D-05) is a rule the code will **not** enforce for you. Add a startup assertion that `'*'` is not in `CORS_ORIGINS` whenever `supports_credentials` is on.

### Two `CORS_ORIGINS` pitfalls specific to this repo

1. **`.split(",")` does not strip whitespace.** `CORS_ORIGINS="http://a, http://b"` yields `" http://b"`, and matching is an exact `.lower()` string compare for non-regex origins (`core.py:282-285`). Use `[o.strip() for o in ... if o.strip()]`.
2. **Origins containing regex metacharacters are treated as regexes.** `probably_regex` returns True for any of `* \ ] ? $ ^ [ ] ( )` (`core.py:254-261`). The current localhost origins contain none, so they compare as literals — but a future origin with a `?` or `$` would silently become a pattern.

### Good news: `allow_headers='*'` is safe here

The CORS spec says `*` is not a wildcard in credentialed mode, which normally breaks custom headers like `X-CSRF-TOKEN`. Flask-CORS sidesteps this by **echoing the matched request headers** rather than emitting a literal `*` — `get_allow_headers` filters `Access-Control-Request-Headers` through the allowlist and joins the survivors (`core.py:157-169`). So `Access-Control-Allow-Headers` comes back as a concrete list and `X-CSRF-TOKEN` preflights correctly with the default config. No change needed. [VERIFIED: flask_cors/core.py:157-169, 172-208]

---

## Other findings the planner must absorb

### CONTEXT.md corrections

| Claim | Reality |
|-------|---------|
| D-23: this phase "adds `academic_level`, `academic_status`, and a last-confirmed timestamp to `User`" | **Already exist.** `backend/app/models/__init__.py:73-75` declares `academic_level`, `academic_status`, `academic_confirmed_at`; migration `213804635519` adds all three at lines 316-319. `ACADEMIC_LEVELS = ("foundation", "diploma", "degree")` and `ACADEMIC_STATUSES = ("active", "on_break", "withdrawn")` already exist at `constants.py:188-189` — matching the UI-SPEC enum table exactly. **The only new table is `terms`** (plus the two blocklist columns above). |
| `<code_context>`: blocklist needs "no migration" | Wrong for family-scoped reuse detection — see the first section. |
| D-12: the frontend POR list "is missing `Deputy House Secretary`" | It is missing **two**: backend `ORGANISER_PORS` has 7 entries, `frontend/src/lib/auth.tsx:20-26` has 5 — **`Deputy House Secretary` and `Web Admin`** are both absent. Strengthens the case for D-12's build-failing scan. |
| Deferred: the 65-char FK name | **Already resolved** in Phase 1 — `models/__init__.py:625` passes an explicit `name="fk_registration_field_responses_field_id"`. No action. |

### The `NAV[role]` integration gap (DASH-01)

`Layout.tsx:71` reads `const nav = NAV[role]`, where `role` comes from `useSession()` → `currentUser.role` → the **derived** role from `withPor()`. Today an organiser *always* gets the organiser nav; there is no student nav for them. So the switcher does not merely change routes — `useSession().role` (or Layout's nav selection) must become **view-aware**, derived from `location.pathname` per S1, while authorization stays capability-based. Also note `NAV.organiser` contains hardcoded event ids (`ev-ekatva-hyd`, `ev-hyd-coffee`) — pre-existing debt sitting on the exact routes S1 uses to detect Organiser view. [VERIFIED: frontend/src/components/Layout.tsx:19-41, 68-71]

### `manageable_activity_ids` is an N+1 risk

`can_manage_activity` has four independent grants including an `ActivityTeamMember` lookup (`rbac.py:145-170`), so it cannot be inverted into a single query naively. Enumerating all activities and calling the predicate per row is O(n) queries. Compute the set with three targeted queries instead — team-member rows for the user, activities where `organiser_id == user.id`, and activities whose org ids intersect the user's POR org ids — then union. Admin short-circuits to "all". Keep the predicate as the authority; the ID set is a rendering projection only (T-02-07).

### `audit_log` has no old/new columns

`models/__init__.py:908-913` declares only `entity`, `entity_id`, `action`, `actor_id`, `actor_name`, `note` (`db.Text`). D-22 requires actor/target/old/new. Encode old and new into `note` as a small JSON string rather than adding columns — `to_dict()` already surfaces `note`, and a schema change to the shared audit table is broader than this phase warrants.

### `terms` table shape (D-21 discretion)

Recommend `code` (String, unique — e.g. `"May 2026"`), `starts_on` (Date), `ends_on` (Date). Match the existing string format: `auth_service.py` hardcodes `CURRENT_TERM = "May 2026"` and `PORAssignment.term` / `ActivityFeeRecord.term` are `db.String(40)` carrying the same literal. Staleness = the term containing `academic_confirmed_at` differs from the term containing `now()`.

Seed via `seed_reference_data()` — it is idempotent and, per its own docstring, *"Deliberately does NOT consult the destructive-database guard"*, so it satisfies D-24's requirement to seed without a destructive reset. Run as `python seed.py --reference-only`. [VERIFIED: backend/seed.py:14, 198-202, 456-467]

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | 30-second rotation grace window | blocklist | Too short → spurious multi-tab logouts; too long → widens the replay window. Confirm with user. |
| A2 | `SameSite=Lax` + aligning dev origins to `localhost` | JWT cookie mode | If the frontend is ever served truly cross-site in prod, `Lax` drops the cookie and `None`+`Secure` becomes mandatory. |
| A3 | `terms.code` should mirror the `"May 2026"` string format | terms shape | A different format means the existing `term` columns and the new table disagree. |
| A4 | Old/new values encoded into `audit_log.note` as JSON | audit | If a future phase wants to query by old/new, columns would be needed after all. |
| A5 | jsdom 26 chosen over 27 for the `node >=18` floor | validation | Only matters if a teammate is on Node 18; harmless otherwise. |

## Package Legitimacy Audit

| Package | Registry | Downloads | Source repo | Verdict | Disposition |
|---------|----------|-----------|-------------|---------|-------------|
| vitest **3.2.7** | npm | 89.7M/wk | github.com/vitest-dev/vitest | OK | Approved (4.x rejected — Vite 5 incompatible) |
| @vitest/coverage-v8 3.2.7 | npm | 34.0M/wk | github.com/vitest-dev/vitest | OK | Approved |
| @testing-library/react 16.3.2 | npm | 52.6M/wk | github.com/testing-library/react-testing-library | OK | Approved |
| @testing-library/dom 10.4.1 | npm | — | github.com/testing-library/dom-testing-library | OK | Approved (explicit peer of RTL 16) |
| jsdom **26.1.0** | npm | 91.5M/wk | github.com/jsdom/jsdom | SUS (`too-new`) | Approved — flag is a false positive on recent *release date*; 91M weekly downloads, first-party repo |
| @testing-library/jest-dom 7.0.1 | npm | 59.4M/wk | github.com/testing-library/jest-dom | SUS (`too-new`) | Approved — same false positive |
| @testing-library/user-event 14.6.3 | npm | 46.4M/wk | github.com/testing-library/user-event | SUS (`too-new`) | Approved — same false positive |

No package returned `SLOP`. No `postinstall` scripts on any of the above. All three `SUS` verdicts are driven solely by a recent latest-publish date, not by package age or obscurity — each has tens of millions of weekly downloads and a first-party GitHub repo. **Backend dependencies are unchanged: this phase adds zero Python packages.** Runtime frontend dependencies added: **zero** (all of the above are devDependencies).

## Sources

**Primary (HIGH):** installed package source read this session — `flask_jwt_extended` 4.6.0 (`jwt_manager.py`, `config.py`, `view_decorators.py`, `utils.py`, `tokens.py`, `internal_utils.py`), `flask_cors` 4.0.1 (`core.py`); repo source under `backend/app/`, `backend/tests/`, `backend/migrations/`, `frontend/src/`; npm registry via `npm view`.

**Secondary (MEDIUM):** TanStack Query v5 mutations guide (retry default).

**Tertiary (LOW):** web search on refresh-token family/reuse-detection conventions — informs A1 only.

## Metadata

| Area | Confidence | Reason |
|------|-----------|--------|
| Blocklist shape & migration verdict | HIGH | Model and migration both read directly |
| JWT cookie config & CSRF | HIGH | Read from installed 4.6.0 source, not docs |
| CORS behaviour | HIGH | Read from installed 4.0.1 source |
| Frontend test tooling | HIGH | Peer deps and engines verified against the registry |
| Grace window / family conventions | LOW | Web sources only — see A1 |

**Research date:** 2026-08-10 · **Valid until:** ~2026-09-10 (pinned deps; frontend tooling moves faster)

---

## RESEARCH COMPLETE

**Phase:** 2 — Identity, Session & Dashboard Shell
**Confidence:** HIGH

### Key findings

1. **`refresh_token_blocklist` needs a migration after all** — it has `jti`, `user_id`, `revoked_at`, `expires_at` and no family column. D-02's family-scoped reuse detection requires adding nullable `family_id` + `reason`. CONTEXT.md says otherwise and is wrong.
2. **The academic columns already exist** (Phase 1 migration `213804635519`), so D-23 overstates the schema work — `terms` is the only genuinely new table.
3. **`JWT_SESSION_COOKIE` defaults to `True`**, which would kill the refresh cookie on browser close and silently fail ROADMAP criterion 1. Must be set `False`.
4. **Reuse detection cannot live in the blocklist loader** — it raises during decode, before the view. Use `@jwt_required(refresh=True, skip_revocation_check=True)` and check explicitly in the service; also short-circuit the loader on non-refresh tokens or every API call gains a DB round-trip.
5. **Frontend has zero test infrastructure**, and the obvious versions are both broken: Vitest 4 needs Vite 6+ (repo is on Vite 5.4.21) and jsdom 30 needs Node ≥22 (local is 20.16.0). Pin Vitest 3.2.7 / jsdom 26.1.0.

### File created

`D:/study/IIT M/SE Project/ekatva-os/MAY2026-Team-072/.planning/phases/02-identity-session-dashboard-shell/02-RESEARCH.md`

### Open questions

- Rotation grace-window length (A1) — needs a user decision; drives whether multi-tab use causes spurious logouts.
- Whether the frontend is ever served cross-site from the API in the graded environment (A2) — decides `SameSite=Lax` vs `None`.

### Ready for planning

Research complete. The planner should treat the three CONTEXT.md corrections above as blocking inputs before writing plans.
