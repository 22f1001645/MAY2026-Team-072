---
phase: 04-organisation-profile-brand-kit
plan: 03
subsystem: api
tags: [flask, uploads, security, magic-bytes, send_from_directory, marshmallow, pytest]

# Dependency graph
requires:
  - phase: 01-migration-and-rbac-foundation
    provides: "can_manage_org_required and its org_id parameter contract, the central HTTPException error envelope, test_blueprint_registration.py's structural walk"
  - phase: 04-organisation-profile-brand-kit
    plan: 01
    provides: "org_profile_bp, org_profile_service.update_profile/public_profile, OrgProfileSchema, the Phase 4 conftest fixtures"
  - phase: 04-organisation-profile-brand-kit
    plan: 02
    provides: "the org_profile_service and OrgProfileSchema as they stood after the social-links work"
provides:
  - "upload_bp — Blueprint at /api/v1, registered in both halves of controllers/__init__.py"
  - "GET /api/v1/uploads/<filename> — public, nosniff, send_from_directory from instance/"
  - "IMAGE_MAGIC / sniff_image_ext(head) -> str | None — the PNG/JPEG/WebP allowlist, SVG excluded"
  - "upload_dir() — <instance_path>/uploads, resolved and created at call time"
  - "served_path(filename) — the one place a logo_url value is built"
  - "POST /api/v1/orgs/<org_id>/logo — behind can_manage_org_required"
  - "org_profile_service.store_logo(org, file_storage, actor)"
  - "UPLOAD_URL_PREFIX / UPLOAD_URL_PATTERN in app/constants.py"
  - "Config.MAX_CONTENT_LENGTH (2 MiB), Config.GEMINI_API_KEY, Config.GEMINI_MODEL"
affects: [04-04-brand-kit, 04-05-frontend-profile, 04-09-phase-integration, 05-campaign-generator]

actuals:
  tokens: 8800
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "The format decision is made from the bytes and nothing else — the declared content type and the client filename are read nowhere in the write path"
    - "The stored filename is server-generated rather than client-sanitised: the only filename that cannot be attacked is one the client never supplied"
    - "Destructive filesystem work happens AFTER the commit that stopped referencing the file, so a rollback can never orphan a row's image"
    - "A URL shape read by three layers is declared once in constants.py, so the route, the schema and the service cannot drift about it"

key-files:
  created:
    - backend/app/controllers/upload_controller.py
  modified:
    - backend/app/config.py
    - backend/app/constants.py
    - backend/app/controllers/__init__.py
    - backend/app/controllers/org_profile_controller.py
    - backend/app/schemas/__init__.py
    - backend/app/services/org_profile_service.py
    - backend/tests/test_org_profile_brand_kit.py

key-decisions:
  - "UPLOAD_URL_PREFIX and UPLOAD_URL_PATTERN live in app/constants.py rather than in upload_controller.py, because the schema is one of the three readers and a schema importing a controller inverts the layering the whole backend is built on"
  - "The stored-file unlink is guarded by UPLOAD_URL_PATTERN, so only a value matching the exact served shape is ever turned into a filesystem path — the pattern is an exact match rather than a prefix check for precisely this reason"
  - "The size-cap boundary is asserted by constructing a multipart body whose TOTAL length is exactly MAX_CONTENT_LENGTH, because the cap applies to the request body and a 2 MiB file always arrives inside a slightly larger envelope"
  - "The test module sweeps instance/uploads/ by snapshot-and-diff rather than emptying it, because that directory is real developer disk, not a fixture"

patterns-established:
  - "An upload response returns the same public_profile() payload every other write on this profile returns, so the client re-renders from the server's value rather than from its own optimistic state"
  - "A serve route that must be public states the browser constraint that makes it public in its own docstring, so the next reader does not 'fix' it"

requirements-completed: [ORG-01]

coverage:
  - id: L1
    description: "A Secretary uploads a PNG for their own organisation; logo_url holds the served path and the bytes are on disk under instance/uploads/"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_upload_png"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_upload_accepts_jpeg_and_webp"
        status: pass
    human_judgment: false
  - id: L2
    description: "An SVG is rejected with 400 invalid_image and nothing is written"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_rejects_svg"
        status: pass
      - kind: unit
        ref: "backend/tests/test_org_profile_brand_kit.py#test_sniff_accepts_three_formats_and_refuses_everything_else"
        status: pass
    human_judgment: false
  - id: L3
    description: "A file named .png whose bytes are not an image is rejected — the sniff decides, the filename and the declared content type are discarded"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_sniffs_content"
        status: pass
    human_judgment: false
  - id: L4
    description: "A body of exactly MAX_CONTENT_LENGTH is accepted and one byte over is refused with 413 before the view runs"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_too_large"
        status: pass
      - kind: unit
        ref: "backend/tests/test_org_profile_brand_kit.py#test_upload_size_cap_is_two_mib_and_not_overridden_in_tests"
        status: pass
    human_judgment: false
  - id: L5
    description: "The stored filename is uuid4().hex plus the sniffed extension; the client's filename never reaches the path"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_upload_png (filename 'Ekatva Logo (final) v2.PNG' appears nowhere in logo_url)"
        status: pass
    human_judgment: false
  - id: L6
    description: "GET /api/v1/uploads/<filename> is unauthenticated, serves through send_from_directory, refuses traversal and responds with X-Content-Type-Options: nosniff"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_uploads_public_no_traversal"
        status: pass
    human_judgment: false
  - id: L7
    description: "Replacing a logo deletes the previous file only after the commit succeeds"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_replace_removes_the_previous_file"
        status: pass
    human_judgment: false
  - id: L8
    description: "PATCH /orgs/<org_id>/profile with logo_url null clears the logo and removes the file; there is no delete endpoint"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_removed_through_profile_patch"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_patch_leaves_the_logo_alone_when_the_key_is_absent"
        status: pass
    human_judgment: false
  - id: L9
    description: "A cross-org logo upload returns 403; the route parameter is org_id"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_upload_is_org_scoped"
        status: pass
      - kind: integration
        ref: "backend/tests/test_rbac_enforcement.py — 5 passed, LEGACY_COARSE_ROUTES unchanged"
        status: pass
    human_judgment: false
  - id: L10
    description: "A client-supplied non-null logo_url that is not a path this server issued is refused"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_logo_url_cannot_be_set_to_an_arbitrary_value"
        status: pass
    human_judgment: false
  - id: L11
    description: "upload_bp is imported AND appended to ALL_BLUEPRINTS"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_blueprint_registration.py — 2 passed"
        status: pass
    human_judgment: false

# Metrics
duration: 55min
completed: 2026-08-14
status: complete
---

# Phase 4 Plan 03: ORG-01 Logo Upload and Serve Primitive Summary

**The repository's first upload code: a 2 MiB pre-buffer cap, a magic-byte allowlist that admits exactly PNG, JPEG and WebP and refuses SVG on purpose, server-generated UUID filenames, and a deliberately public `nosniff`-headed serve route that refuses traversal by delegating to `send_from_directory`.**

## Performance

- **Duration:** 55 min
- **Completed:** 2026-08-14
- **Tasks:** 2
- **Files modified:** 8 (1 created, 7 modified)
- **Suite:** 281 → 296 passing, 0 failing

## Accomplishments

- **`backend/app/controllers/upload_controller.py`** — built from nothing. Before this file the repository contained no `request.files`, no `UPLOAD_FOLDER`, no `send_from_directory` and no upload test of any kind, so there was no in-repo analog to copy and every control is written rather than inherited. Phase 5's CAMPAIGN-03 reuses the same primitive unchanged.

- **The format decision is made from the bytes and nowhere else.** `sniff_image_ext` reads the first 16 bytes against a three-row table and returns `.png`, `.jpg`, `.webp` or `None`. The multipart part's declared `Content-Type` and its filename are read at no point in the write path — asserted mechanically, since `grep -c '\.mimetype'` over the service returns `0`. `test_logo_sniffs_content` sends a Windows executable named `logo.png` declaring `Content-Type: image/png` and gets `400 invalid_image`, which is the assertion that separates a format allowlist from a naming convention.

- **WebP is the row that justifies the table's shape.** `RIFF` at offset 0 is shared with WAV and AVI; only `WEBP` at offset 8 makes it an image. A prefix-only table would either refuse every real WebP or accept an audio file, so each row carries a list of `(offset, bytes)` checks. `test_sniff_accepts_three_formats_and_refuses_everything_else` asserts `RIFF....WAVE` is refused.

- **SVG is excluded deliberately and is stated as such in the code.** An SVG is an XML document that can carry a `<script>` element, and serving one from the API origin is stored XSS (T-04-17). It is refused at the door rather than sanitised, so nothing about SVG parsing exists anywhere in this codebase.

- **The size cap is a config value, not a view check** (T-04-21). `MAX_CONTENT_LENGTH = 2 * 1024 * 1024` on `Config`, with no env-var override — it is a security control, not a deployment knob — and no `TestConfig` override, so the boundary test exercises the real number. Werkzeug refuses a larger `Content-Length` before the body is read, which is the entire point: a per-view length check has already buffered the thing it is about to reject.

- **The boundary is asserted at the exact edge and one byte past it.** The cap applies to the request *body*, not to the file inside it, so a 2 MiB file always arrives inside a slightly larger envelope and would prove nothing about the edge. `_multipart_of_exactly()` builds a genuine multipart body whose total length is exactly `n`, so `test_logo_too_large` can assert 200 at `MAX_CONTENT_LENGTH` and 413 at `MAX_CONTENT_LENGTH + 1`, plus that no file appeared and `logo_url` still points at the accepted upload.

- **The stored filename is server-generated, never client-sanitised.** `uuid4().hex` plus the **sniffed** extension. `grep -c 'secure_filename'` over the service returns `0` on purpose: Werkzeug's sanitiser can return an empty string and does nothing whatsoever about content-type confusion. `test_logo_upload_png` uploads `Ekatva Logo (final) v2.PNG` and asserts neither `Ekatva` nor `final` survives into the path.

- **The serve route is public, and the docstring says why so nobody "fixes" it.** The SPA is on `:5173` and the API on `:5000`, so a logo `<img>` is a cross-origin subresource load carrying neither the in-memory bearer token nor a cookie. A guarded logo URL is a broken image in every browser. The path holds no `<org_id>`, so `test_rbac_enforcement.py`'s scoped walk does not require a guard and **`LEGACY_COARSE_ROUTES` was not touched** — `git diff` on that file is empty.

- **P-01 is honoured in code, not just in the plan.** The route's docstring states that the unguessable `uuid4().hex` name is *not* a control and may never be counted as one — it exists because credentials cannot travel on that request. The controls are the cap, the sniff, the allowlist and `nosniff`.

- **Traversal is delegated, not hand-rolled** (T-04-20). `send_from_directory` resolves the name against the directory and raises `NotFound` for anything escaping it. `grep -c 'os.path.join'` over the controller returns `0`. `test_uploads_public_no_traversal` asserts four forms — plain `../`, two percent-encoded variants, and `..%5c..%5c`, the Windows separator this project develops on, where Phase 1 already hit a platform path bug.

- **`X-Content-Type-Options: nosniff` on every served response** (T-04-19), asserted both on the direct serve test and on the round trip inside `test_logo_upload_png`.

- **Destructive filesystem work happens after the commit** (T-04-22). `store_logo` captures the previous `logo_url`, writes the new file, commits, and only then unlinks the old one. Delete-first would leave the row pointing at a file that no longer exists if the write rolled back; this order at worst leaves one unreferenced file, which is a cleanup problem rather than a broken profile. `test_logo_replace_removes_the_previous_file` asserts the old file existed *before* and is gone *after*, so a test passing because the first file was never written would fail. Unlink failures are logged and swallowed — a logo that saved correctly is not a failed request because a stale file was locked.

- **`PATCH /profile` with `{"logo_url": null}` is the removal path** (UI-SPEC S3), running the same after-commit unlink. `EDITABLE_FIELDS` gained `logo_url`, and the partial-PATCH rule still holds: `test_logo_patch_leaves_the_logo_alone_when_the_key_is_absent` proves a bio-only edit cannot silently erase a logo.

- **A client cannot write an arbitrary `logo_url`** (T-04-25). `OrgProfileSchema.logo_url` matches `UPLOAD_URL_PATTERN` exactly. Five hostile values are asserted at 422, including `https://evil.com/tracker.png` (the external-hotlink shape D-01 rejected), `/api/v1/uploads/../../ekatva.db` and a `.svg` extension under the right prefix.

- **`upload_bp` is registered in both halves of `controllers/__init__.py`** — the asymmetry that cost Phase 2 an endpoint. `test_blueprint_registration.py`'s structural walk is the net and is green.

- **The test module sweeps `instance/uploads/` by snapshot-and-diff**, removing exactly the files a test added rather than emptying the directory, because that directory is real developer disk rather than a fixture. `git status --porcelain backend/instance` is empty; `backend/.gitignore` already ignores `instance/`.

## Task Commits

1. **Task 1: config, upload directory, sniffing, the public serve route** — `80b4b65`
2. **Task 2 (TDD): the org-scoped upload endpoint, replace and remove** — `4cb9a10` (test, RED) then `77f0d52` (feat, GREEN)

No REFACTOR commit — the GREEN implementation needed no cleanup.

## Files Created/Modified

- `backend/app/controllers/upload_controller.py` (new) — `upload_bp`, `IMAGE_MAGIC`, `sniff_image_ext`, `upload_dir`, `served_path`, and the public serve route.
- `backend/app/config.py` — `MAX_CONTENT_LENGTH`, plus `GEMINI_API_KEY` / `GEMINI_MODEL` added now so 04-05 does not have to re-touch this file.
- `backend/app/constants.py` — `UPLOAD_URL_PREFIX` and `UPLOAD_URL_PATTERN`.
- `backend/app/controllers/__init__.py` — the import line **and** the `ALL_BLUEPRINTS` entry.
- `backend/app/controllers/org_profile_controller.py` — `POST /orgs/<org_id>/logo` behind `can_manage_org_required`.
- `backend/app/schemas/__init__.py` — `OrgProfileSchema.logo_url`, nullable, pattern-matched when non-null.
- `backend/app/services/org_profile_service.py` — `store_logo`, `_discard_stored_file`, the after-commit unlink inside `update_profile`, and `logo_url` in `EDITABLE_FIELDS`.
- `backend/tests/test_org_profile_brand_kit.py` — 15 new cases plus the upload-directory sweeper fixture and the exact-size multipart builder.

## Decisions Made

- **`UPLOAD_URL_PREFIX` / `UPLOAD_URL_PATTERN` live in `app/constants.py`, not in `upload_controller.py`.** Three layers read the served-path shape: the serve route answers on it, `OrgProfileSchema` validates against it, and `org_profile_service` maps a stored value back to a file on disk. Two of those three are below the controller layer, and a *schema* importing a controller inverts the dependency direction the whole backend is built on (`controllers → services → repositories → models`). `constants.py` is already the project's declared single source of truth for shared values and everything imports from it, so the shape is declared there once. `test_uploads_public_no_traversal` fetches `UPLOAD_URL_PREFIX + name` and expects 200, which pins the constant and the route's URL rule together.
- **The service does import `sniff_image_ext` and `upload_dir` from `upload_controller`**, which is the one place a service reaches upward, and it is what the plan's artifact table and acceptance criteria specify. Kept deliberately: splitting the format allowlist away from the route whose `nosniff` header depends on it would put two halves of one security decision in files that can drift. The import is annotated in place so the exception reads as a choice.
- **The unlink guard is the exact pattern, not a prefix check.** `_discard_stored_file` refuses to build a filesystem path from anything that does not match `UPLOAD_URL_PATTERN` in full. A prefix check would accept `/api/v1/uploads/../../ekatva.db`, and combined with a client-writable `logo_url` that would turn logo replacement into arbitrary file deletion. The schema and the unlink guard therefore share one pattern rather than each carrying a looser variant.
- **The missing-part error reuses `invalid_image` rather than inventing a code.** From the client's side there is exactly one thing to fix — attach a valid image — and a second code would give the frontend a branch with no distinct copy behind it (UI-SPEC S3 defines one server-rejection message).
- **No `to_dict(detail=True)` change was needed.** `logo_url` was already in `Organisation.to_dict()`'s base dict from Phase 1, so the upload response and `GET /profile` carry it with no serialiser edit. That branch stays free for 04-04's brand kit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The served-path constants had no home the plan's file list allowed**

- **Found during:** Task 2 (writing `OrgProfileSchema.logo_url`)
- **Issue:** The plan requires the schema to "validate it against the served-path prefix and the uuid-plus-extension pattern" and separately requires the service to unlink "a path this server issued", while placing the URL shape's only declaration in `upload_controller.py`. Satisfying both literally would mean `app/schemas/__init__.py` importing a controller module — the reverse of the layering CLAUDE.md and every existing file follow.
- **Fix:** Declared `UPLOAD_URL_PREFIX` and `UPLOAD_URL_PATTERN` in `app/constants.py`, which the schema, the service and the controller all already import from. `served_path()` in the controller is the single builder.
- **Files modified:** `backend/app/constants.py` (not in the plan's `files_modified` list)
- **Verification:** `pytest tests/test_org_profile_brand_kit.py` green, including `test_logo_url_cannot_be_set_to_an_arbitrary_value` and `test_uploads_public_no_traversal`, which read the constant and the route respectively.
- **Committed in:** `80b4b65` (Task 1)

---

**Total deviations:** 1 auto-fixed (blocking). No architectural change, no checkpoint.
**Impact on plan:** No scope creep. Every artifact and symbol name in the plan's table is delivered at the name and file the plan specifies, plus `served_path()` and the two constants above.

### Acceptance criteria: two literal-vs-intent notes

- **Two of the `grep -c` criteria initially read `1` because of prose, not code.** `grep -v '^ *#'` strips `#` comments but not docstrings, and the docstrings explaining *why* a hand-rolled path join and *why* Werkzeug's filename sanitiser are the wrong defences contained those exact tokens. Both docstrings were reworded to make the same point without the literal strings, so `grep -c 'os.path.join'` over the controller and `grep -c 'secure_filename'` over the service now both return `0` — and the reasoning is still in the file, which is what the criteria actually protect.
- **`logo_too_large` asserts the view "never ran" by its observable effects**, not by instrumentation. Werkzeug 3.0 raises `RequestEntityTooLarge` from `get_input_stream` on the `Content-Length` header, before the body is read, but the raise surfaces at the first `request.files` access — which is inside the view. The plan's requirement (no file written, `logo_url` unchanged, nothing buffered) holds exactly, and both are asserted; the phrase "before the view function runs" is true of the *body read*, which is what the cap exists to prevent.

## Issues Encountered

- **A Windows file-handle collision in the serve test.** `send_from_directory` streams from an open handle, and the first run's sweeper hit `PermissionError [WinError 32]` trying to delete a file the response still held. Fixed by using the test response as a context manager so it closes before teardown. Worth recording because it is the same class of platform issue Phase 1 hit and will recur for anyone writing a second serve test.
- Nothing else. `can_manage_org_required` mounted with no change, `test_rbac_enforcement.py` needed no entry, and `test_blueprint_registration.py` caught nothing because both registration halves were written together.

## Known Stubs

None. No placeholder values, no empty branches, no TODO left behind.

Carried forward and still open by design: `Organisation.to_dict(detail=True)`'s branch remains free for 04-04's brand kit, unchanged by this plan.

## Threat Flags

None. Every surface this plan adds sits inside the plan's own register (T-04-17 through T-04-25) and each carries its mitigation and its test. `T-04-23` (enumeration of the public serve route) remains **accepted**, exactly as the register states, and per P-01 the unguessable filename is not counted as a control.

## User Setup Required

None. No migration, no reseed, no new dependency. `backend/instance/uploads/` is created at runtime on first use and is already covered by `backend/.gitignore`'s `instance/` rule, so a fresh clone needs no setup step.

## Next Phase Readiness

Ready. What the rest of the phase inherits:

- **04-04 (brand kit)** — untouched by this plan; `to_dict(detail=True)`'s branch is still free, and `public_profile()` continues to add keys after calling it.
- **04-05 (frontend profile)** — the contract is: upload with `POST /api/v1/orgs/<id>/logo`, one multipart part named **`file`**; the response is the same `public_profile()` payload every other write returns, so `OrgLogo` re-renders from the server's value. `logo_url` arrives as `/api/v1/uploads/<32 hex>.<png|jpg|webp>` and must be resolved to an absolute URL once in `adaptOrgProfile`. Two error shapes: `400 invalid_image` carries the JSON envelope with the server's sentence; **`413` is raised by Werkzeug before the app sees it**, so `api.ts`'s request helper must not throw on a non-JSON error body — UI-SPEC S3 already forecloses this and it is now real. Removal is `PATCH /profile` with `{"logo_url": null}`; there is no delete route. `Config.GEMINI_API_KEY` and `Config.GEMINI_MODEL` are already in place for the AI draft.
- **04-09 (integration)** — `pytest tests/test_org_profile_brand_kit.py -k "logo or uploads"` is the whole upload battery; the full backend suite runs in about five minutes.
- **Phase 5 (CAMPAIGN-03)** — reuse `upload_dir`, `sniff_image_ext` and `served_path` as they stand. The cap, the allowlist and `nosniff` are already global.

No blockers.

## Self-Check: PASSED

- Created file present on disk: `backend/app/controllers/upload_controller.py`.
- Commits present in `git log`: `80b4b65`, `4cb9a10`, `77f0d52`.
- `cd backend && pytest --no-cov` — 296 passed, 0 failed (exit 0).
- `git status --porcelain backend/instance` empty; `git diff` on `tests/test_rbac_enforcement.py` empty.

---
*Phase: 04-organisation-profile-brand-kit*
*Completed: 2026-08-14*
