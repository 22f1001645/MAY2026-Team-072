---
phase: 04-organisation-profile-brand-kit
plan: 04
subsystem: api
tags: [flask, marshmallow, json-columns, validation, stored-xss, seam, pytest]

# Dependency graph
requires:
  - phase: 01-migration-and-rbac-foundation
    provides: "can_manage_org_required and its org_id parameter contract, the brand_kits table and its uselist=False backref, BRAND_KIT_SOURCES"
  - phase: 04-organisation-profile-brand-kit
    plan: 01
    provides: "org_profile_bp, org_profile_service, the Phase 4 conftest fixtures"
  - phase: 04-organisation-profile-brand-kit
    plan: 03
    provides: "Config.GEMINI_API_KEY (the input ai_available is computed from), UPLOAD_URL_PREFIX"
provides:
  - "BrandKitSchema — the ONE validator for every path that writes a BrandKit row"
  - "GET /api/v1/orgs/<org_id>/brand-kit — guarded on the read, reports ai_available, never writes"
  - "PUT /api/v1/orgs/<org_id>/brand-kit — the only writer of a BrandKit row"
  - "org_profile_service.get_brand_kit(org) -> dict — the editor's read payload"
  - "org_profile_service.upsert_brand_kit(org, data, actor) -> BrandKit"
  - "org_profile_service.brand_kit_for(org) -> dict — total, eight keys, carries logo_url"
  - "BRAND_KIT_DEFAULT_VOICE in app/constants.py"
affects: [04-05-ai-draft, 04-07-frontend-brand-kit, 04-09-phase-integration, 05-campaign-generator]

actuals:
  tokens: 7000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Every bound on a JSON column is service-tier, because neither database engine enforces anything inside one — nothing in BrandKitSchema duplicates a database constraint"
    - "A colour is validated as a security control rather than a formatting preference, because its destination is a CSS context in generated mail"
    - "Two read functions over the same row with deliberately different absence behaviour: the form payload shows None, the machine seam falls back to a default"
    - "A cross-phase seam is a Python function with a pinned key set, not a REST endpoint, when the consumer is the same process"

key-files:
  created: []
  modified:
    - backend/app/constants.py
    - backend/app/schemas/__init__.py
    - backend/app/services/org_profile_service.py
    - backend/app/controllers/org_profile_controller.py
    - backend/tests/test_org_profile_brand_kit.py

key-decisions:
  - "get_brand_kit() and brand_kit_for() are separate functions rather than one with a flag, because they must disagree about absence: the editor payload returns voice_tone None so the form does not show a user words they never wrote, while the Phase 5 seam falls back to BRAND_KIT_DEFAULT_VOICE so the generator has no absence branch"
  - "The brand-kit GET is guarded by can_manage_org_required, unlike GET /profile which any signed-in reader may see — a brand kit is an internal working document, not part of an organisation's public identity (P-09)"
  - "The palette regex admits six hex digits and nothing else: no rgb() form, no named colour, no three-digit shorthand, each of which would need its own parser in the Phase 5 template and the one that gets it wrong is the one that ships"
  - "Bounds are asserted AT the limit as well as one past it, so the test pins the actual number rather than merely proving some cap exists"
  - "ai_available is asserted in both directions by mutating app.config, so the test pins the computation rather than whatever happens to sit in the developer's environment"

patterns-established:
  - "A function that must never be duplicated says so in its own docstring, at the site the next author would be tempted to copy it (upsert_brand_kit names 04-05's draft endpoint explicitly)"
  - "A cross-phase dict contract pins its key set in a test constant, so a later phase cannot silently drop a field and leave a template rendering an empty string"

requirements-completed: [ORG-03]

coverage:
  - id: B1
    description: "A Secretary saves a brand kit through PUT and reads the same values back through GET with has_kit true"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_roundtrip"
        status: pass
    human_judgment: false
  - id: B2
    description: "GET for an organisation that never saved a kit returns 200 with has_kit false and creates no row"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_read_without_a_saved_kit_creates_no_row"
        status: pass
    human_judgment: false
  - id: B3
    description: "A second PUT updates the existing row rather than inserting a second one"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_upsert_updates_the_one_row"
        status: pass
    human_judgment: false
  - id: B4
    description: "A palette entry that is not six-digit hex is refused with 422 validation_error; an accepted one is stored lowercase"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_palette_hex_only (7 cases)"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_roundtrip (#5CE6C9 reads back #5ce6c9)"
        status: pass
    human_judgment: false
  - id: B5
    description: "Voice 500, palette 6, phrases 10 x 200 are enforced server-side, at the limit and past it"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_bounds"
        status: pass
    human_judgment: false
  - id: B6
    description: "A source outside BRAND_KIT_SOURCES is 422; the enum is imported, not restated"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_source_enum"
        status: pass
      - kind: manual
        ref: "grep -v '^ *#' backend/app/schemas/__init__.py | grep -c '\"ai_draft\"' returns 0"
        status: pass
    human_judgment: false
  - id: B7
    description: "GET reports ai_available computed from server-side config; /auth/me does not carry it"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_ai_available_flag"
        status: pass
    human_judgment: false
  - id: B8
    description: "brand_kit_for(org) is total — a dict for every organisation, with an explicitly pinned eight-key set"
    requirement: "ORG-03"
    verification:
      - kind: unit
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_for_contract"
        status: pass
    human_judgment: false
  - id: B9
    description: "brand_kit_for(org) carries logo_url alongside the kit"
    requirement: "ORG-03"
    verification:
      - kind: unit
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_for_carries_logo"
        status: pass
    human_judgment: false
  - id: B10
    description: "A cross-organisation brand-kit read or write returns 403 (P-09)"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_cross_org_is_refused"
        status: pass
      - kind: integration
        ref: "backend/tests/test_rbac_enforcement.py — 5 passed, LEGACY_COARSE_ROUTES unchanged"
        status: pass
    human_judgment: false
  - id: B11
    description: "A successful save writes exactly one AuditLog row, in the same transaction"
    requirement: "ORG-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_brand_kit_save_records_one_audit_row"
        status: pass
    human_judgment: false

# Metrics
duration: 40min
completed: 2026-08-14
status: complete
---

# Phase 4 Plan 04: ORG-03 Brand Kit Summary

**The brand kit's validation, its upsert endpoint, and `brand_kit_for()` — the total, eight-key, logo-carrying read contract Phase 5 consumes, which nothing upstream had defined.**

## Performance

- **Duration:** 40 min
- **Completed:** 2026-08-14
- **Tasks:** 2
- **Files modified:** 5 (0 created, 5 modified)
- **Suite:** 296 → 314 passing, 0 failing

## Accomplishments

- **This plan is validation and seam work, not schema work.** `brand_kits` has existed since Phase 1's batch revision, `git diff --stat backend/app/models/__init__.py` for this plan is empty, and `tests/test_migrations.py` is green with nothing added to it. What did not exist was any rule about what may go *inside* the table's JSON columns.

- **Every bound is service-tier because nothing below it enforces anything.** Neither SQLite nor Postgres constrains the contents of a JSON column, so no field in `BrandKitSchema` duplicates a database constraint — each one is the only limit that exists. Voice and tone at 500 characters, the palette at 6 entries, sample phrases at 10 of 200 each (T-04-27).

- **`test_brand_kit_bounds` asserts each cap at the limit as well as past it.** 7 palette entries, 11 phrases, a 201-character phrase and a 501-character voice each return 422; a save carrying exactly 6, exactly 10 of exactly 200 and exactly 500 returns 200. Only the second half distinguishes "capped at the documented number" from "capped somewhere".

- **The palette rule is a stored-XSS gate, and the code says so.** `validate.Regexp(r"^#[0-9a-fA-F]{6}$")` on every entry (T-04-26). CAMPAIGN-02 interpolates these strings into generated mail HTML, almost certainly into a `style` attribute, which is a CSS context. `test_brand_kit_palette_hex_only` covers seven values — `red`, `#ff`, `rgb(1,2,3)`, `#5CE6C9G`, `#12345`, the empty string, and `#5ce6c9;color:red`, the one that shows what the rule is actually for — each 422 `validation_error` with `BrandKit.query.count() == 0` afterwards. No `rgb()` form, no named colour, no three-digit shorthand: each of those would need its own parser downstream, and the one that gets it wrong is the one that ships.

- **Accepted colours are lowercased before storage,** so the stored value matches what the editor re-renders and a user does not watch their colour change case on the next load. `test_brand_kit_roundtrip` puts `#5CE6C9` and reads `#5ce6c9`.

- **The read never writes** (T-04-31). `get_brand_kit` reaches the row through the `uselist=False` backref and returns `has_kit: false` for an organisation nobody has written one for — not a 404, which would force every caller to branch on absence, and not a freshly minted empty row, which would make "has anyone written one?" unanswerable afterwards. `test_brand_kit_read_without_a_saved_kit_creates_no_row` asserts `BrandKit.query.count()` is identical across the GET.

- **The save is an upsert against the unique `org_id`,** following `settings_service`'s singleton shape but reaching through `org.brand_kit` rather than re-querying, since the guard already loaded the row onto `g.org`. `test_brand_kit_upsert_updates_the_one_row` asserts `count() == 1` after two successive PUTs — without this the second ordinary edit would be an IntegrityError surfacing as a 500.

- **`upsert_brand_kit` names its own uniqueness constraint in its docstring.** It is the only writer of a `BrandKit` row, and 04-05's AI draft endpoint must not become a second one — ORG-04 requires that nothing persists until a human explicitly saves, and a second writer is exactly how that guarantee is lost. Stating it at the function someone would be tempted to reuse is the point; stating it only in the plan is not.

- **`brand_kit_for()` is ORG-03's real deliverable.** ROADMAP criterion 3 says the kit is "readable by the campaign creator" and nothing upstream had defined what that read looks like. It is a Python function called in-process — Phase 5's generator is the same Flask app, and a round trip over HTTP to reach one's own database would be cost with no benefit. Both of its guarantees are tests rather than conventions: it returns a dict for every organisation (never `None`, never raising), and `logo_url` rides along because CAMPAIGN-02 calls it once per accepted collaborator and a separate logo accessor would guarantee a second, divergent way to read the same thing.

- **`test_brand_kit_for_contract` pins the key set explicitly** against the eight documented keys, so a later phase cannot silently lose one and leave a template rendering an empty string. It also covers the case a `has_kit` check alone would miss: a row that *exists* with null columns still yields the defaults, because each field falls back individually.

- **`BRAND_KIT_DEFAULT_VOICE` carries its reason in a comment next to it** — ROADMAP Phase 5 criterion 2 requires a draft to be producible for any organisation, including one that wrote nothing here. It is deliberately neutral and organisation-agnostic: a floor to fall back to, never a suggestion of what an organisation sounds like.

- **The brand-kit GET is guarded, unlike `GET /profile`** (P-09, T-04-28). `test_brand_kit_cross_org_is_refused` asserts 403 on both the GET and the PUT for a Secretary of another organisation, 403 for a POR-less student, and 401 anonymous. `test_rbac_enforcement.py` needed no change and `LEGACY_COARSE_ROUTES` was not touched.

- **`ai_available` is asserted in both directions.** The test sets `app.config["GEMINI_API_KEY"]` to `None` and then to a value, so it pins the computation rather than whatever happens to sit in the developer's environment — a one-direction test would pass on a machine with no key even if the flag were hardcoded `False`.

- **The enum is imported, never restated.** `grep -v '^ *#' backend/app/schemas/__init__.py | grep -c '"ai_draft"'` returns `0`, following `AcademicStatusSchema`'s precedent.

## Task Commits

1. **Task 1 (TDD): schema, upsert endpoint, bounds battery** — `cfcd5c6` (test, RED) then `d5ab797` (feat, GREEN)
2. **Task 2 (TDD): `brand_kit_for()`** — `a189fba` (test, RED) then `b0513f1` (feat, GREEN)

No REFACTOR commit — neither GREEN implementation needed cleanup.

## Files Created/Modified

- `backend/app/constants.py` — `BRAND_KIT_DEFAULT_VOICE` added to the existing `BRAND_KIT_*` block, with the ROADMAP criterion that motivates it in a comment.
- `backend/app/schemas/__init__.py` — `BrandKitSchema`; `BRAND_KIT_MANUAL` and `BRAND_KIT_SOURCES` added to the constants import block.
- `backend/app/services/org_profile_service.py` — `get_brand_kit`, `upsert_brand_kit`, `brand_kit_for`; module docstring now names ORG-03 alongside ORG-01.
- `backend/app/controllers/org_profile_controller.py` — `GET` and `PUT /orgs/<org_id>/brand-kit`, both behind `can_manage_org_required`.
- `backend/tests/test_org_profile_brand_kit.py` — 18 new node ids, the `_brand_kit` / `_save_kit` helpers and the `BRAND_KIT_FOR_KEYS` contract constant.

## Decisions Made

- **`get_brand_kit()` and `brand_kit_for()` are two functions, not one with a flag, because they must disagree about absence.** The editor payload returns `voice_tone: None` when nobody has written a kit: that payload fills a form, and prefilling `BRAND_KIT_DEFAULT_VOICE` would show a user words they never wrote as though they had, then save them on the next submit. The Phase 5 seam falls back to the default for the opposite reason — the generator must have no absence branch. Collapsing them would mean one caller receiving the wrong half of that trade, and the difference is documented in both docstrings.
- **The palette pattern is exact rather than permissive, and the reason is written at the schema.** The alternative reading — that this is cosmetic normalisation — is exactly the reading that would later justify relaxing it for a designer who wants `rgb()`, so the docstring names the CSS-injection destination rather than the formatting preference.
- **Blank handling is split between the schema and the service on purpose.** An empty-string phrase fails `validate.Length(min=1)` and is a 422, because a client sending `""` is sending something it did not mean to. A *whitespace-only* phrase passes the schema, strips to nothing in the service and is dropped, because that is what a row the user cleared in the editor actually looks like on the wire. `test_brand_kit_drops_blank_entries` covers the second and asserts the surviving phrase is stored stripped.
- **`source` is validated but not defended.** It is provenance metadata, never an authorization input (T-04-29, accepted): a client that lies about it changes nothing that matters. The enum is checked anyway so a Phase 5 reader can rely on the value set, and the whole treatment is a `load_default` plus a `OneOf`.
- **Both routes return the same payload the GET returns,** so the client re-renders from the server's normalised values rather than its own form state — the same rule the social-links replace endpoint already follows, and it is load-bearing here because the palette is stored in a different case than it was typed.

## Deviations from Plan

None — plan executed as written. Every symbol in the plan's artifact table is delivered at the name and file the plan specifies, and no file outside `files_modified` was touched.

## Issues Encountered

- **The plan's verification selector `-k "brand_kit or palette or ai_available"` matches every test in the module,** because pytest's `-k` matches against the node id and the module is named `test_org_profile_brand_kit.py`. Harmless — the wider selection is a superset and is green — but noted because 04-VALIDATION.md's selectors will behave the same way, so a "16 selected" expectation there would be wrong.
- Nothing else. `can_manage_org_required` mounted with no change, no blueprint edit was needed, and the model file was not touched.

## Known Stubs

None. No placeholder values, no empty branches, no TODO left behind.

## Threat Flags

None. Every surface this plan adds sits inside the plan's own register (T-04-26 through T-04-31), each with its mitigation and its test. `T-04-29` (client-supplied `source`) remains **accepted** exactly as the register states.

## User Setup Required

None. No migration, no reseed, no new dependency. `GEMINI_API_KEY` stays unset by default and `ai_available` correctly reports `false` in that state.

## Next Phase Readiness

Ready. What the rest of the phase and Phase 5 inherit:

- **04-05 (AI draft)** — the contract is: **draft, do not save**. Reuse `BrandKitSchema` to validate the model's output rather than writing a second validator; the AI path is precisely where the weaker one would be. `upsert_brand_kit` stays the only writer of a `BrandKit` row, and its docstring says so. `ai_available` is already computed and served on `GET /brand-kit`, so the draft endpoint does not need to report it again.
- **04-07 (frontend brand kit)** — `GET /api/v1/orgs/<id>/brand-kit` returns `org_id`, `has_kit`, `voice_tone`, `palette`, `sample_phrases`, `source`, `ai_available`. `has_kit: false` is a normal 200, not an error state. The PUT is replace-all and returns the same payload, so the editor must re-render from the response: a palette entry comes back lowercase whatever case was typed, and a whitespace-only phrase comes back absent. Client-side counters should mirror 500 / 6 / 10 / 200 exactly, since the server refuses past them with `422 validation_error`.
- **Phase 5 (CAMPAIGN-02)** — call `org_profile_service.brand_kit_for(org)`. It is total, so there is no absence branch; `has_kit` distinguishes chosen words from defaults, and `logo_url` is already in the dict — do not add a second accessor for it. The key set is pinned by a test, so adding a field is safe and removing one will fail loudly.

No blockers.

## Self-Check: PASSED

- Modified files present on disk: `backend/app/constants.py`, `backend/app/schemas/__init__.py`, `backend/app/services/org_profile_service.py`, `backend/app/controllers/org_profile_controller.py`, `backend/tests/test_org_profile_brand_kit.py`.
- Commits present in `git log`: `cfcd5c6`, `d5ab797`, `a189fba`, `b0513f1`.
- `cd backend && pytest -q --no-cov` — 314 collected, exit 0, 0 failures.
- `pytest tests/test_migrations.py` — 9 passed.
- `git diff --stat backend/app/models/__init__.py` empty for this plan; `git diff --diff-filter=D` across the plan's commits shows no deletions; no untracked files left behind.

---
*Phase: 04-organisation-profile-brand-kit*
*Completed: 2026-08-14*
