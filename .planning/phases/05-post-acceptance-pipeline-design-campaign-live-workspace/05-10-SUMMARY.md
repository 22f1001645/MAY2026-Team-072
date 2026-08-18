---
phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
plan: 10
subsystem: fullstack
tags: [flask, uploads, magic-bytes, react, typescript, vitest, multipart, security]
status: complete

requires:
  - phase: 04-organisation-profile-brand-kit
    provides: "04-03 upload_dir(), sniff_image_ext(), IMAGE_MAGIC_BYTES and GET /api/v1/uploads/<filename> — the whole upload primitive, consumed rather than restated"
  - phase: 04-organisation-profile-brand-kit
    provides: "04-06 the request() wrapper's FormData branch, which drops the JSON content type so the browser sets its own multipart boundary"
  - phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
    provides: "05-01 assert_editable and 05-02 _get_or_create_campaign — the live-campaign freeze and the singleton accessor last-write-wins falls out of"
  - phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
    provides: "05-08 CampaignBuilder's section layout and the completeness-driven PipelineStepper the Poster step reads from"
provides:
  - "POST /api/v1/activities/<activity_id>/campaign/poster — multipart poster upload, guarded by can_manage_activity_required"
  - "campaign_service.save_poster — magic-byte type decision, UUID stored name, Phase 4's upload_dir as the only destination"
  - "Config.POSTER_MAX_BYTES / Config.LOGO_MAX_BYTES — the OD-2 split of the formerly single app-wide cap"
  - "PosterUpload — the E8 drop zone with its empty, dragging, uploading and populated states and three distinct rejection messages"
  - "api.uploadPoster, api.uploadUrl and the useUploadPoster hook"
affects: [05-11, phase 6 post-event report]

actuals:
  tokens: 34000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A file's type is decided by its own leading bytes and nothing else; the filename and the declared content type are treated as attacker input at both ends"
    - "A shared framework key that two endpoints disagree about is set to the looser value, and the stricter one moves into its own view as an explicit check"
    - "Every distinguishable server rejection gets its own message in the UI, because a rejected upload that says nothing is indistinguishable from one that never happened"

key-files:
  created:
    - frontend/src/components/PosterUpload.tsx
    - frontend/src/components/__tests__/PosterUpload.test.tsx
  modified:
    - backend/app/config.py
    - backend/app/services/campaign_service.py
    - backend/app/services/org_profile_service.py
    - backend/app/controllers/campaign_controller.py
    - backend/tests/test_campaign_package.py
    - backend/tests/test_org_profile_brand_kit.py
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts
    - frontend/src/pages/CampaignBuilder.tsx
    - frontend/src/components/__tests__/PipelineStepper.test.tsx

key-decisions:
  - "MAX_CONTENT_LENGTH is now POSTER_MAX_BYTES (5 MiB) and the logo's 2 MiB moved into store_logo as an explicit LOGO_MAX_BYTES check. The key is app-wide, so the poster copy the UI-SPEC promises and Phase 4's logo bound could not both live there; raising the shared value without moving the logo's would have silently widened the logo endpoint (T-05-52)"
  - "The logo's per-endpoint check measures the FILE by seeking to the end of the already-spooled stream, not by reading it. A len(file.read()) would have buffered the very body the cap exists to keep out of memory, and the boundary test moved with it — it now builds a body whose file part is exactly the limit, since the edge is no longer the request body's"
  - "save_poster imports sniff_image_ext, IMAGE_MAGIC_BYTES and upload_dir from Phase 4's upload_controller rather than restating any of them. That is the same deliberate service-to-controller reach org_profile_service already makes: the format allowlist and the nosniff header that depends on it have to stay in one file or they drift"
  - "Phase 5 adds no serve route. AC-14 is asserted by uploading a poster and reading it back through Phase 4's GET /uploads/<filename>, so the test proves the reuse rather than a second copy of send_from_directory and its nosniff header"
  - "The absolute URL for a stored poster is built by api.uploadUrl beside the absoluteUploadUrl that already resolves organisation logos, not inside PosterUpload — a component that assembled it would be a second base URL to keep in step with VITE_API_URL"
  - "PosterUpload takes a File and lets api.uploadPoster build the FormData, so the component has no opinion about the wire format. The FormData claim is asserted against fetch instead, where the FormData actually exists"
  - "The file input's value is cleared in a finally block: without it, re-picking the same file after a failure fires no change event and the retry silently does nothing — the one outcome E8 rules out, reappearing on the recovery path"

patterns-established:
  - "When a security control moves from a framework-wide setting into a view, its boundary test moves with it and changes what it measures — a test still asserting the old edge would pass while proving nothing"
  - "An upload test cleans up only the files it created (snapshot the directory, remove the difference), because instance/uploads is real disk shared with the dev server and with another phase's suite"

requirements-completed: [CAMPAIGN-03]
---

# Phase 05 Plan 10: Poster Upload Summary

An organiser can attach a campaign poster whose format is decided by the file's own magic bytes and whose stored filename is the server's, served back through Phase 4's hardened uploads route.

## What Was Built

**Task 1 — the poster endpoint.** `POST /api/v1/activities/<activity_id>/campaign/poster` behind `can_manage_activity_required`. `campaign_service.save_poster` calls `assert_editable` first, sniffs the leading 16 bytes against Phase 4's PNG/JPEG/WebP table, refuses anything else with 415 `unsupported_media_type` before writing, and stores the file as `uuid4().hex` plus the sniffed extension inside `upload_dir()`. The client's filename and declared content type are read nowhere. `_get_or_create_campaign` then sets `poster_name` and commits, which is where AC-13's last-write-wins comes from for free.

The size caps split per OD-2: `POSTER_MAX_BYTES` (5 MiB) is what `MAX_CONTENT_LENGTH` is now set to, and `LOGO_MAX_BYTES` (2 MiB) became an explicit check inside `org_profile_service.store_logo`.

**Task 2 — `PosterUpload`.** The E8 drop zone: a dashed card reading "Drop poster image here, or click to browse" with the "PNG, JPG, or WebP — max 5 MB" caption, a teal drag-hover treatment, a `bg-black/40 backdrop-blur-sm` overlay with "Uploading…" that also disables the input while a request is in flight, and a 128x128 `object-cover` thumbnail beside a truncated filename and a "Change poster" ghost button once a poster exists. Wired into `CampaignBuilder`'s new Poster section, disabled once the campaign is live.

## Key Implementation Details

- `save_poster` runs no per-view length check. `MAX_CONTENT_LENGTH` refuses an oversize body before Flask buffers it; a check in the view could only run after the body had already been read, which is the exhaustion it would be pretending to prevent (T-05-51).
- The logo's new per-endpoint check seeks to the end of the already-spooled stream and back to measure it, so it never reads the body either.
- `test_poster_upload_rejects_svg` sends SVG markup under a `.png` filename with an `image/png` content type and asserts both the 415 and that the upload directory is unchanged — a status-only assertion would pass even if the file had been written first.
- `test_uploads_serve_returns_the_poster_bytes` reads a Phase 5 poster back through Phase 4's route and asserts `X-Content-Type-Options: nosniff` is still on it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `PipelineStepper.test.tsx` mocks the whole queries module**

- **Found during:** Task 2
- **Issue:** That spec replaces `../../lib/queries` with an explicit object, so `CampaignBuilder` importing the new `useUploadPoster` threw "No `useUploadPoster` export is defined on the mock" and the test failed to render the page at all.
- **Fix:** Added `useUploadPoster: mutation()` to the mock alongside the other campaign hooks.
- **Files modified:** `frontend/src/components/__tests__/PipelineStepper.test.tsx`
- **Commit:** 610060c

**2. [Rule 3 - Blocking] Phase 4's two size-cap tests encoded the old single cap**

- **Found during:** Task 1
- **Issue:** `test_upload_size_cap_is_two_mib_and_not_overridden_in_tests` asserted `MAX_CONTENT_LENGTH == 2 MiB` directly, and `test_logo_too_large` built its boundary bodies from `app.config["MAX_CONTENT_LENGTH"]`. Both are load-bearing assertions about a control OD-2 deliberately restructured, so neither could just be deleted.
- **Fix:** The first became `test_upload_size_caps_are_split_and_not_overridden_in_tests`, asserting both new keys, their relationship, and that the logo bound is strictly below the app-wide one (a logo cap at or above it would never be reached). The second now measures the file rather than the request body via a new `_multipart_whose_file_is_exactly` helper, asserts the `payload_too_large` code, and keeps a third case proving the app-wide cap is still the outer wall.
- **Files modified:** `backend/tests/test_org_profile_brand_kit.py`
- **Commit:** a924762

### Called Out as Planned

The plan flagged that this slice edits a Phase 4 setting. It does: `backend/app/config.py` and `backend/app/services/org_profile_service.py` both changed to move the logo's limit off the shared key. Phase 4's logo suite passes unchanged in behaviour — a 2 MiB logo is still accepted and a larger one is still refused.

## Deferred Issues

- **A replaced poster's old file is left on disk.** `org_profile_service.store_logo` unlinks the previous file after the commit; `save_poster` does not, because the plan's action list does not call for it and `CampaignPackage` has no equivalent of the `UPLOAD_URL_PATTERN` guard that makes the logo's unlink safe. The effect is an unreferenced file per replacement, which is a cleanup problem rather than a correctness one. Worth a follow-up if posters are replaced often.

## Requirements Satisfied

- **CAMPAIGN-03** — poster upload, storage and serving. AC-12 (`test_poster_upload_saves_and_returns_name`), AC-13 (`test_poster_upload_overwrites`), AC-14 (`test_uploads_serve_returns_the_poster_bytes`).

## Verification

| Gate | Result |
|------|--------|
| `cd backend && pytest tests/test_campaign_package.py -k "poster" -x -q` | pass |
| `cd backend && pytest tests/test_campaign_package.py -k "uploads_serve" -x -q` | pass |
| `cd backend && pytest -q` | 369 passed |
| `cd frontend && npx vitest run src/components/__tests__/PosterUpload.test.tsx` | 8 passed |
| `cd frontend && npm run build` | pass |
| `cd frontend && npm test` | 163 passed (23 files) |

Acceptance greps: `campaign_service.py` contains `save_poster`, two `uuid4().hex` uses and four `upload_dir` references, and zero occurrences of `os.path.join`.

**Manual, still outstanding** (listed as manual-only in `05-VALIDATION.md`):

1. Drag an image over the drop zone and confirm the teal hover treatment appears and clears on drag-leave. jsdom fires drag events without a real `DataTransfer`, so an automated assertion here would be about the stub.
2. Confirm Phase 4's logo endpoint still rejects a 3 MB logo now that the app-wide cap is 5 MB. Covered at the API layer by `test_logo_too_large`, but worth one pass through the real profile page.

## Threat Flags

None. Every surface this plan adds is in the plan's own threat register, and the one shared control it changed (`MAX_CONTENT_LENGTH`) is T-05-52, whose mitigation shipped with it.

## Self-Check: PASSED

- `frontend/src/components/PosterUpload.tsx` — FOUND
- `frontend/src/components/__tests__/PosterUpload.test.tsx` — FOUND
- Commit 2070918 (backend RED) — FOUND
- Commit a924762 (backend GREEN) — FOUND
- Commit 1105665 (frontend RED) — FOUND
- Commit 610060c (frontend GREEN) — FOUND

## TDD Gate Compliance

Both tasks ran RED then GREEN as separate commits: 2070918 → a924762 for the endpoint, 1105665 → 610060c for the component. No refactor commit was needed in either case.
