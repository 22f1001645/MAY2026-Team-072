---
phase: 04-organisation-profile-brand-kit
plan: 06
subsystem: frontend
tags: [react, typescript, tanstack-query, vitest, security, xss, url-validation]

# Dependency graph
requires:
  - phase: 04-organisation-profile-brand-kit
    plan: 01
    provides: "GET/PATCH /orgs/<id>/profile, org_profile_service.public_profile, Organisation.to_dict carrying bio/logo_url/website"
  - phase: 02-session-and-capabilities
    provides: "the api.ts request helper, adaptMe, capabilities.manageableOrgIds, view-not-sent.test.ts as the precedent for a render-only capability"
provides:
  - "safeExternalHref(url) in frontend/src/lib/format.ts — ORG-02 layer 3"
  - "SocialLink, BrandKit, OrgProfile and the extended Organisation in lib/types.ts"
  - "adaptOrganisation / adaptOrgProfile / adaptBrandKit in lib/api.ts, with absoluteUploadUrl as the one place a served logo path is resolved"
  - "api.orgProfile / updateOrgProfile / replaceSocialLinks / uploadOrgLogo / brandKit / saveBrandKit / draftBrandKit"
  - "useOrgProfile / useBrandKit / useUpdateOrgProfile / useReplaceSocialLinks / useUploadOrgLogo / useSaveBrandKit / useDraftBrandKit"
  - "a guarded JSON parse in the shared request helper — a non-JSON error body is an ApiError, never a SyntaxError"
  - "FormData bodies are sent without a JSON Content-Type"
  - "keepPreviousData on useCapabilities"
affects: [04-07-org-profile-page, 04-08-orglogo-and-admin-orgs, 04-09-phase-integration]

actuals:
  tokens: 17400
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A refusal helper returns undefined rather than a sanitised value, so the consuming framework omits the attribute instead of rendering a neutered one"
    - "The wire→domain adapter is also the one place a relative served path becomes absolute, for the same reason it is the one place snake_case is converted"
    - "A query whose endpoint is authority-guarded is gated by `enabled`, so the forbidden request is never issued rather than issued and swallowed"

key-files:
  created:
    - frontend/src/lib/__tests__/url-safety.test.ts
    - frontend/src/lib/__tests__/request-error-body.test.ts
  modified:
    - frontend/src/lib/format.ts
    - frontend/src/lib/types.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts
    - frontend/src/lib/mock.ts

key-decisions:
  - "`website` IS included on Organisation — 04-02's checkpoint resolved as option-a and shipped organisations.website as a distinct nullable column (revision f997686e136b)"
  - "`api.orgs()` was made to adapt rather than merely be re-typed: typing an unadapted snake_case payload as the camelCase Organisation would have been a type that lies at runtime, and /admin/orgs renders logos from those same rows"
  - "OrgProfile carries no `canEdit` — the edit gate is capabilities.manageableOrgIds and a second source for it would be a second, weaker authorization system"
  - "absoluteUploadUrl returns null rather than the raw path when resolution fails, because OrgLogo's ladder turns null into a real mark and a garbage src into the broken image the ladder promises never happens"
  - "The 413 assertion lives in a sibling test file rather than in url-safety.test.ts, so the URL vector table stays fixture-free and sub-second"

patterns-established:
  - "A negative security claim gets a named row per refused input, never a comment — the view-not-sent.test.ts discipline applied to schemes"
  - "Fixtures in mock.ts carry exactly what the adapter produces for an absent field, so a fixture and a server row are the same shape rather than nearly the same shape"

requirements-completed: []

coverage:
  - id: D1
    description: "safeExternalHref returns the URL unchanged for http and https and undefined for every other scheme, including data:, vbscript:, scheme-relative //host/x and the empty string"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "frontend/src/lib/__tests__/url-safety.test.ts — 30 cases across the accepted, refused and never-throws tables"
        status: pass
    human_judgment: false
  - id: D2
    description: "A malformed string that makes new URL() throw returns undefined rather than propagating the error into a render pass"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "url-safety.test.ts#safeExternalHref never throws — expect(() => safeExternalHref('ht!tp://[')).not.toThrow()"
        status: pass
    human_judgment: false
  - id: D3
    description: "A 413 whose body is HTML produces a readable ApiError carrying status 413, not a SyntaxError that escapes the request helper"
    requirement: "ORG-01"
    verification:
      - kind: unit
        ref: "frontend/src/lib/__tests__/request-error-body.test.ts#turns a 413 with an HTML body into an ApiError carrying the status"
        status: pass
    human_judgment: false
  - id: D4
    description: "A FormData body omits Content-Type so the browser sets the multipart boundary; an ordinary mutation keeps application/json"
    requirement: "ORG-01"
    verification:
      - kind: unit
        ref: "request-error-body.test.ts#a FormData body is sent without a JSON content type — both cases"
        status: pass
    human_judgment: false
  - id: D5
    description: "logo_url is resolved to an absolute URL exactly once, inside the adapter; no component concatenates a base URL"
    requirement: "ORG-01"
    verification:
      - kind: unit
        ref: "grep -rn logoUrl frontend/src/pages frontend/src/components | grep -c 'BASE\\|VITE_API_URL' → 0; absoluteUploadUrl is the single call site, used by adaptOrganisation"
        status: pass
    human_judgment: false
  - id: D6
    description: "The brand-kit query is never issued for a viewer who does not manage the organisation"
    requirement: "ORG-03"
    verification:
      - kind: unit
        ref: "frontend/src/lib/queries.ts:104 — enabled: !!orgId && !!canEdit"
        status: pass
    human_judgment: false
  - id: D7
    description: "A background /auth/me refetch holds the previous capability snapshot"
    requirement: "ORG-01"
    verification:
      - kind: unit
        ref: "frontend/src/lib/queries.ts — placeholderData: keepPreviousData on useCapabilities"
        status: pass
    human_judgment: false
  - id: D8
    description: "No capability value is added to any request path (P-10)"
    requirement: "ORG-01"
    verification:
      - kind: unit
        ref: "manageable_org_ids occurs twice in api.ts, both inside adaptMe's response shape — identical to the pre-task file; existing view-not-sent.test.ts still green"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-08-14
status: complete
---

# Phase 4 Plan 06: Frontend Data Layer Summary

**Six lines close a stored-XSS sink that React 18.3.1 would only have warned about, the shared request helper stops turning this phase's most predictable rejection into a parser error, and a served logo path becomes an absolute URL in exactly one place.**

## Performance

- **Duration:** 25 min
- **Completed:** 2026-08-14
- **Tasks:** 3
- **Files:** 7 (2 created, 5 modified)
- **Suite:** 33 → 63 passing, 0 failing. `npx tsc --noEmit` clean, `npm run build` green.

## `website` — the 04-02 checkpoint outcome

**Included.** 04-02's Task 1 checkpoint resolved as **option-a**: `organisations.website` shipped as a distinct nullable column (Alembic revision `f997686e136b`) and `Organisation.to_dict()` already serves it. So `Organisation` in `types.ts` carries `website: string | null`, `adaptOrganisation` reads `o.website`, and the field is documented in place as a distinct field that is never a seventh social platform.

## Accomplishments

- **`safeExternalHref` — ORG-02 layer 3.** Parses with the platform's own `URL` inside a `try/catch` and accepts only `http:` and `https:`. Returns the **original** string on acceptance rather than `parsed.href`, because the server already normalised what it stored and re-serialising client-side would show the reader something other than what was saved (`new URL('http://example.org').href` adds a trailing slash). Every refused scheme is a named test row: `javascript:`, `JavaScript:`, `data:`, `vbscript:`, `ftp:`, `mailto:`, scheme-relative `//evil.com/x`, site-relative `/relative/path`, the empty string, `null`, `undefined`, and a malformed authority. 30 cases, no fixture, no DOM, ~10 ms.
- **The guarded JSON parse.** `JSON.parse(text)` was unguarded. Flask raises 413 from `MAX_CONTENT_LENGTH` before the body is buffered and answers with an **HTML** page; a proxy or dev-server error page does the same. The raw `SyntaxError` that produced is not an `ApiError`, so the helper's own 401-refresh branch never saw it and `err.status === 413` was unreachable at every call site. Now `body` falls back to `null` — every `body?.` read below already tolerated it, so the fix is one change — and the status line alone makes a readable message. Asserted against a trimmed copy of Werkzeug's actual 413 page.
- **FormData bodies no longer carry `application/json`.** The header literal hardcodes it and an explicit `undefined` in an object literal does not remove a key, so the delete is the fix. Both directions are asserted: the upload omits the key, an ordinary mutation keeps it.
- **`absoluteUploadUrl` is the one place a served path becomes absolute.** `logo_url` arrives as `/api/v1/uploads/<uuid>.<ext>`; a bare path in an `<img src>` points at :5173 and 404s. Resolved once, inside `adaptOrganisation`, via `new URL(path, new URL(BASE, window.location.href))` — which also handles a relative `VITE_API_URL` and an already-absolute value for free.
- **Seven endpoint wrappers and seven hooks**, camelCase in and snake_case on the wire, each carrying the short docblock the file's existing entries carry. `draftBrandKit` takes an `AbortSignal` so 04-09 can impose its 30-second client abort.
- **The brand-kit gate.** `enabled: !!orgId && !!canEdit` — 04-UI-SPEC S6's visibility rule as one expression. The 403 never happens because the request never happens.
- **`useDraftBrandKit` invalidates nothing**, deliberately and with the reason written down: the draft persists no server state, and refetching the saved kit would overwrite the draft sitting in the form — the exact opposite of ORG-04's "nothing applies until they explicitly save it".

## Task Commits

1. **Task 1 (TDD): `safeExternalHref`** — `e6ed6f5` (test, RED — 30 failing) then `f17666e` (feat, GREEN — 30 passing)
2. **Task 2: types, adapters, endpoints and the two request-helper fixes** — `92ca216`
3. **Task 3: query hooks and the capability snapshot** — `647df65`

No REFACTOR commit — the GREEN implementation is six lines and needed no cleanup.

## Files Created/Modified

- `frontend/src/lib/format.ts` — `safeExternalHref` beside `cx`, with a docblock stating why React is not the boundary here.
- `frontend/src/lib/types.ts` — `Organisation` extended with `bio` / `logoUrl` / `website`; `SocialLink`, `OrgProfile` (extends `Organisation`), `BrandKit`.
- `frontend/src/lib/api.ts` — the two helper fixes; `ApiOrganisation` / `ApiOrgProfile` / `ApiBrandKit` wire shapes; `absoluteUploadUrl`, `adaptOrganisation`, `adaptOrgProfile`, `adaptBrandKit`; the seven Phase 4 endpoints; `orgs()` adapted and typed.
- `frontend/src/lib/queries.ts` — `useOrgProfile`, `useBrandKit`, the four write mutations, `useDraftBrandKit`, and `keepPreviousData` on `useCapabilities`.
- `frontend/src/lib/mock.ts` — the six `ORGS` fixtures carry the three new fields (see deviation 1).
- `frontend/src/lib/__tests__/url-safety.test.ts` (new) — the scheme vector table.
- `frontend/src/lib/__tests__/request-error-body.test.ts` (new) — the 413 and multipart-header assertions.

## Decisions Made

- **`api.orgs()` adapts; it was not merely re-typed.** The plan says to "opportunistically type `orgs()` as `Promise<Organisation[]>`", but `/orgs` returns raw `to_dict()` — snake_case `logo_url`. Typing an unadapted payload as the camelCase `Organisation` would have been a type that is wrong at runtime: `org.logoUrl` would read `undefined` while typed `string | null`, and 04-08 replaces all three `/admin/orgs` logo renders with `<OrgLogo />` fed from exactly these rows. Task 3's own instruction to invalidate `['orgs']` "because `/admin/orgs` renders logos from the same rows" presupposes those rows carry a usable logo. The change is a two-line `.then(rows => rows.map(adaptOrganisation))`; every existing consumer reads only `id`, `name`, `type` and `city`, all unchanged.
- **`OrgProfile` carries no `canEdit`.** The endpoint map lists `can_edit` on `GET /profile`, but 04-01 shipped the payload without it on purpose (P-06, and the controller docstring says so). S2 fixes the gate as `capabilities.manageableOrgIds.includes(orgId)`. Adding a second source would be a second, weaker authorization signal, and the first time the two disagreed the weaker one is what an attacker would use.
- **`absoluteUploadUrl` returns `null`, not the raw path, when resolution fails.** A garbage `src` renders the broken-image glyph that S3 says is never a state of `OrgLogo`; `null` falls through to the fallback ladder and produces a real mark.
- **The 413 assertion lives in a sibling file.** The plan allows either. Keeping `url-safety.test.ts` free of a `fetch` mock preserves what makes it valuable — a pure vector table with no fixture, the same discipline `test_url_safety.py` was praised for in 04-02.
- **No `Organisation` field was made optional.** `bio: string | null` rather than `bio?: string | null`, following `adaptMe`'s rule that every optional lands on a non-`undefined` value, so no page needs a `?.` chain for a field the server always sends.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `mock.ts`'s six `ORGS` fixtures no longer satisfied `Organisation`**

- **Found during:** Task 2 (`npx tsc --noEmit` after extending the interface)
- **Issue:** Six `TS2739` errors — the fixtures predate the three new required fields. `mock.ts` is not in the plan's `files_modified`.
- **Fix:** A shared `const NO_PROFILE = { bio: null, logoUrl: null, website: null }` spread into each row — exactly what the adapter produces for a real row with none of the three set, so a fixture and a server row are the same shape rather than nearly the same shape. The alternative, making the fields optional, would have weakened the type for every consumer to keep six fixtures untouched.
- **Files modified:** `frontend/src/lib/mock.ts`
- **Verification:** `npx tsc --noEmit` clean.
- **Committed in:** `92ca216` (Task 2)

**2. [Rule 1 - Bug in my own test] The empty-body assertion routed through an adapter**

- **Found during:** Task 2 (first full `vitest run`)
- **Issue:** `api.brandKit()` on a 204 resolves `body` to `null` and `adaptBrandKit(null)` throws a `TypeError`. My assertion had claimed the helper "does not throw on an empty body" while actually exercising an adapter.
- **Fix:** The claim is about the shared helper, so it is asserted against `api.markNotificationsRead()` — an endpoint with no adapter — and now reads "still resolves an empty body to `null`", which is the pre-existing behaviour the new `try/catch` must not change.
- **Not hardened:** `adaptBrandKit` still assumes a body. `GET /brand-kit` contractually always returns one (04-04 requires `has_kit: false` on a never-saved kit, never a 404 or an empty 204), so a null guard there would defend against a case the endpoint forecloses.
- **Files modified:** `frontend/src/lib/__tests__/request-error-body.test.ts`
- **Verification:** 63 passing, 0 failing.
- **Committed in:** `92ca216` (Task 2)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 test bug). No scope creep — every symbol, artifact and acceptance criterion in the plan is delivered.

### Acceptance criteria: one literal-vs-intent note

`grep -v '^ *[*/]' frontend/src/lib/api.ts | grep -c "manageable_org_ids"` is stated as "unchanged from before this task". It reads **2** both before and after (the plan's phrasing implied a smaller pre-task number). Both occurrences are inside `adaptMe` — one in the `ApiMe` response interface, one reading it — and neither is on a request path. The criterion's intent holds exactly: **P-10 is satisfied and the count did not move.** `view-not-sent.test.ts` remains green, which is the behavioural half of the same claim.

## Issues Encountered

None beyond the two deviations above. The plan's line references into `api.ts`, `types.ts` and `queries.ts` were all accurate.

## Known Stubs

None. No placeholder values, no empty branches, no TODO left behind.

Open by design and owned downstream: the seven endpoint wrappers for the **brand kit** (`brandKit`, `saveBrandKit`, `draftBrandKit`) build against the contract in `04-RESEARCH.md` §D-1 and `04-04-PLAN.md`, and their backend routes do not exist yet — this plan runs in parallel with that work by design. They are typed, adapted and unit-testable today; the integration proof lands in 04-09. This is the plan's stated parallelism, not an unfinished path.

## Threat Flags

None. Every surface this plan adds is covered by the plan's own register: T-04-41 (`safeExternalHref`), T-04-42 (no `VITE_*` added — `aiAvailable` arrives as a boolean on the GET), T-04-43 (P-10, count unmoved), T-04-44 (the guarded parse), T-04-45 (the brand-kit `enabled` gate).

## User Setup Required

None for this plan. 04-02's `flask db upgrade` still applies to anyone who has not run it.

## Next Phase Readiness

Ready. What 04-07 through 04-09 inherit:

- **04-07 (profile page)** — `useOrgProfile(orgId)` returns camelCase with `logoUrl` already absolute. `canEdit` is computed at the page top from `useCapabilities().manageableOrgIds`, never from the payload. Error placement uses `err.code` plus `err.details.platform` / `err.details.field`; `err.status === 413` now genuinely reaches the caller.
- **04-08 (`OrgLogo`, `/admin/orgs`)** — consumes an **already-absolute** `logoUrl` and must not build one. `api.orgs()` now returns adapted `Organisation[]`, so the three `Orgs.tsx` call sites get `logoUrl` and `website` for free; `HOUSE_META.website` and `org.website` both go through `safeExternalHref`.
- **04-09 (integration)** — `useDraftBrandKit` takes `{ id, signal }`; the 30-second abort is the caller's `AbortController`. A fetch abort surfaces as `ApiError` `network_error` with status `0`, so route the abort from the caller's own timer rather than by inspecting the error, which is what S7-A5's generic heading already assumes.

No blockers.

## Self-Check: PASSED

- Created files present on disk: `frontend/src/lib/__tests__/url-safety.test.ts`, `frontend/src/lib/__tests__/request-error-body.test.ts`.
- Commits present in `git log`: `e6ed6f5`, `f17666e`, `92ca216`, `647df65`.
- `cd frontend && npx tsc --noEmit` — clean (exit 0).
- `cd frontend && npx vitest run` — 8 files, 63 passed, 0 failed, including `view-not-sent.test.ts` and `no-por-literals.test.ts`.
- `cd frontend && npm run build` — built in 15.08s (exit 0).

---
*Phase: 04-organisation-profile-brand-kit*
*Completed: 2026-08-14*
