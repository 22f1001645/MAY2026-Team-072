# Phase 2: Identity, Session & Dashboard Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 2-identity-session-dashboard-shell
**Areas discussed:** Refresh token transport & rotation, Single-flight refresh & 401 recovery, Shape of /auth/me capabilities, View switcher persistence, Academic-status nudge (AUTH-04)

---

## Refresh token transport & rotation

### Where should the refresh token live?

| Option | Description | Selected |
|--------|-------------|----------|
| httpOnly cookie | Secure, httpOnly, SameSite cookie; JS can never read it. Needs CORS credentials mode + CSRF guard. | ✓ |
| Both in localStorage | Extends the existing `ekatva_token` pattern; an XSS bug leaks a long-lived refresh token. | |
| Refresh in memory only | Strong against XSS persistence, but session dies on tab close — contradicts success criterion 1. | |

**User's choice:** httpOnly cookie

### Should the refresh token rotate on every use?

| Option | Description | Selected |
|--------|-------------|----------|
| Rotate + reuse detection | New token per refresh, old `jti` blocklisted; replay revokes the family. Gives `refresh_token_blocklist` a real purpose. | ✓ |
| Rotate, no reuse detection | Rotate and blocklist, but treat replay as a plain 401. Loses the theft signal. | |
| Static refresh token | One long-lived token; blocklist used only for logout. Stolen token stays valid undetected. | |

**User's choice:** Rotate + reuse detection

### What token lifetimes?

| Option | Description | Selected |
|--------|-------------|----------|
| 15 min / 30 days | Exercises the refresh path constantly so bugs surface in dev. | ✓ |
| 1 hour / 30 days | Gentler, but a demoted user keeps stale capabilities up to an hour. | |
| 15 min / 7 days | Tightest window, but logs out students over semester breaks. | |

**User's choice:** 15 min / 30 days
**Notes:** Replaces the hardcoded 12h `JWT_ACCESS_TOKEN_EXPIRES` in `backend/app/config.py`.

### What should logout do across devices?

| Option | Description | Selected |
|--------|-------------|----------|
| This device only | Blocklist the presented family, clear the cookie. Least surprising. | ✓ |
| All devices | Revoke every family; safer on shared machines, kills other sessions silently. | |
| This device + explicit sign-out-everywhere | Correct long-term, but the extra UI is arguably its own phase. | |

**User's choice:** This device only

---

## Single-flight refresh & 401 recovery

### Where does the single-flight refresh live?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared promise in api.ts | Module-level `refreshPromise`; all callers await it and replay. Covers mutations too. | ✓ |
| React Query retry + shared promise | Reuses retry config, but mutations don't retry by default. | |
| Proactive refresh on a timer | Avoids the stampede rather than solving it; sleep/wake still produces one. | |

**User's choice:** Shared promise in api.ts
**Notes:** This is the mechanism that satisfies success criterion 2 — exactly one refresh call from many simultaneous expiries.

### When the refresh itself fails, what happens to queued requests?

| Option | Description | Selected |
|--------|-------------|----------|
| Reject all + redirect to login | Clear auth context, redirect preserving attempted route. | ✓ |
| Reject all, stay on page with a toast | Less jarring, but leaves a dead shell rendering stale data. | |
| Retry refresh once, then redirect | Absorbs a network blip, but muddies the reuse-detection breach signal. | |

**User's choice:** Reject all + redirect to login

### How does the app behave on cold load?

| Option | Description | Selected |
|--------|-------------|----------|
| Silent refresh on boot, then /auth/me | Cookie becomes the single source of session truth. | ✓ |
| Reuse stored access token, refresh on first 401 | Most cold loads start with a doomed request; token back in localStorage. | |
| Block all rendering until session resolves | Simplest, adds delay to every page load including public ones. | |

**User's choice:** Silent refresh on boot, then /auth/me
**Notes:** Consequence identified during discussion — the access token then never needs persisting at all, so it lives in memory only.

### What happens to existing sessions holding the legacy `ekatva_token`?

| Option | Description | Selected |
|--------|-------------|----------|
| Purge the key, force one re-login | Clean cut, no dual-path code. | ✓ |
| Honour the old token until it expires | No disruption, but ships a second auth path to delete later. | |
| Exchange the old token for a cookie session | Seamless, but a bespoke endpoint that exists only to be deleted. | |

**User's choice:** Purge the key, force one re-login

---

## Shape of /auth/me capabilities

### What does /auth/me return for organiser status?

| Option | Description | Selected |
|--------|-------------|----------|
| Boolean + scoped ID sets | `is_organiser` plus manageable org/activity IDs from the Phase 1 predicates. | ✓ |
| Coarse boolean only | Enough for nav, but per-resource UI must attempt-and-catch-403. | |
| Named capability strings | Reads nicely but can't answer "may I edit THIS org". | |

**User's choice:** Boolean + scoped ID sets
**Notes:** Raised during discussion — the existing frontend list has already drifted, missing `Deputy House Secretary`.

### What stops a future phase from re-introducing a POR list?

| Option | Description | Selected |
|--------|-------------|----------|
| Lint/test rule banning POR types in frontend | Build fails on any POR-type literal in `frontend/src`. Mirrors Phase 1's `url_map` gate. | ✓ |
| Delete the list and rely on review | Zero build cost, but the list already drifted under exactly this regime. | |
| Type-level prevention | Elegant, but PORs may legitimately need displaying. | |

**User's choice:** Lint/test rule banning POR types in frontend

### How fresh must capabilities be?

| Option | Description | Selected |
|--------|-------------|----------|
| Recompute per request, cache in React Query | Worst-case staleness one access-token window; nothing in the JWT. | ✓ |
| Embed capabilities as JWT claims | Zero extra requests, but revocation blocked for 15 min and token grows. | |
| Recompute per request, no caching | Always fresh but chatty; React Query already exists for this. | |

**User's choice:** Recompute per request, cache in React Query

### How should the AUTH-03 taxonomy change land?

| Option | Description | Selected |
|--------|-------------|----------|
| Add to constants + backfill audit | Both POR sets together, plus a read-only audit of unmatched `por_type` values. | ✓ |
| Add to constants only | Matches the letter of AUTH-03; typos stay invisible. | |
| Add + constrain por_type to an enum | Strongest, but it's a schema migration closer to Phase 1's scope. | |

**User's choice:** Add to constants + backfill audit

---

## View switcher persistence

### How is the Student/Organiser view choice represented?

| Option | Description | Selected |
|--------|-------------|----------|
| URL-first, localStorage remembers | Route is the truth; storage only picks a cold-load landing route. | ✓ |
| localStorage only | A shared link renders differently per recipient. | |
| Server-stored preference | Follows the user across devices, but schema change for pure UI state. | |

**User's choice:** URL-first, localStorage remembers

### How do we prove the view changes zero authorization outcomes?

| Option | Description | Selected |
|--------|-------------|----------|
| Test: same request, both views, identical result | Plus a check the view never appears in header, query, or body. | ✓ |
| Keep view out of the api.ts client entirely | Strong, but a refactor can quietly re-wire it with nothing failing. | |
| Code review + a comment | Cheapest and weakest. | |

**User's choice:** Test: same request, both views, identical result

### What happens on crossover / deep links?

| Option | Description | Selected |
|--------|-------------|----------|
| Follow the URL, switch the view to match | Deep links always land where they point. | ✓ |
| Render the page but keep the current view's nav | Produces organiser nav around student pages. | |
| Redirect to the current view's home | Breaks every deep link. | |

**User's choice:** Follow the URL, switch the view to match

### What happens when a user's PORs lapse mid-session?

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back to Student, switcher disappears | Same code path as a single-role student — one rule, not two. | ✓ |
| Fall back with an explanatory notice | Kinder, but a notification surface. | |
| Keep the organiser shell, let pages 403 | Broken-looking; contradicts "the server decides". | |

**User's choice:** Fall back to Student, switcher disappears

---

## Academic-status nudge (AUTH-04)

### What triggers the termly re-confirmation nudge?

| Option | Description | Selected |
|--------|-------------|----------|
| Dismissible dashboard banner | Ordinary dashboard content, so it cannot couple to login. | ✓ |
| Modal on first load of the term | Higher completion, but one refactor from behaving like a login step. | |
| Passive — profile page only | Zero intrusion, near-zero completion. | |

**User's choice:** Dismissible dashboard banner

### What does "termly" mean concretely?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 4-month window | No calendar, no table — just a timestamp comparison. *(Recommended)* | |
| Real term boundaries (Jan/May/Sep) | Semantically correct; introduces a term calendar concept. | ✓ |
| Admin-triggered campaign | Maximum control, but a feature of its own. | |

**User's choice:** Real term boundaries (Jan/May/Sep)
**Notes:** Chosen against the recommendation. Accepted consequence: this phase now owns a term-calendar concept nothing else in the milestone models.

### Where should the term calendar live?

| Option | Description | Selected |
|--------|-------------|----------|
| Pure function in constants.py | No table, no migration, trivially testable. *(Recommended)* | |
| Term table in the database | Admin-adjustable without a deploy; requires a migration plus seed data. | ✓ |
| Config values (env/config.py) | Term boundaries are a domain fact, not a deployment knob. | |

**User's choice:** Term table in the database
**Notes:** Chosen against the recommendation. Accepted consequence: Phase 2 takes on the first Alembic migration since Phase 1's `213804635519`, and must satisfy Phase 1's migration-safety rule and `seed.py` destructive-reset guard.

### What can an admin do to someone's academic status?

| Option | Description | Selected |
|--------|-------------|----------|
| Set value + audit row | Attributed change in the existing append-only `audit_log`; user can still self-confirm. | ✓ |
| Set value and freeze it | Prevents silent reversion, but users can't fix stale data. | |
| Set value, no audit trail | Unattributable change to data Phase 7's gating will read. | |

**User's choice:** Set value + audit row

---

## Claude's Discretion

- Exact CSRF mechanism for `/auth/refresh` (double-submit cookie vs. header token)
- Cookie `SameSite` value (`Lax` vs `Strict`)
- Shape of the `terms` table beyond what the term-boundary decision requires
- Wording and placement of the dashboard banner

## Deferred Ideas

- "Sign out everywhere" surface — cross-device revocation is its own security-settings feature
- One-time notice when organiser access lapses — a notification surface, natural fit for Phase 8
- Constraining `por_type` to a database enum — a schema constraint closer to Phase 1's territory
- Retiring the hardcoded `DEMO_ACCOUNTS` in `frontend/src/lib/auth.tsx` and `backend/seed.py` — surfaced during codebase scout, not part of any Phase 2 requirement
