# 05-02-SUMMARY — Campaign Package Spine

**Generated:** 2026-08-15
**Phase:** 5 — Post-Acceptance Pipeline
**Plan:** 05-02

## What Was Built

1. **CampaignPackage Singleton:**
   - Established `_get_or_create_campaign` in `campaign_service.py` as the single point of entry for the `CampaignPackage` row.
   - Enforced last-write-wins by returning the existing row if present.
   - Created `campaign_state` to safely read draft states without side-effecting a row creation.

2. **Server-Minted Slugs (AC-15, AC-16, AC-17):**
   - Added `generate_slug` to mint slugs containing cryptographically secure suffixes (`secrets.token_urlsafe(4)`).
   - Wrapped the minting in a bounded 3-attempt retry loop catching `IntegrityError`, falling back to `slug_collision` HTTP 503 instead of exposing pre-SELECT race conditions.
   - The URL is built server-side (D-12) to ensure a single source of truth for the link shape.

3. **Custom Form Fields (AC-18 through AC-22):**
   - Added `FormFieldSchema` and CRUD endpoints for `RegistrationFormField` under `campaign_controller.py`.
   - Guaranteed label uniqueness natively using `uq_form_field_label` + `IntegrityError` catch (no TOCTOU vulnerability).
   - Exposed `GET /api/v1/activities/<id>/register` that yields a fixed server-owned `core_fields` block alongside the custom fields.

4. **Real Slug Resolution & Public Previews (OD-3):**
   - Added `ActivityRepository.by_slug_or_id` prioritizing `id` lookups first to keep old routes fast.
   - Added the `@public_or_auth` decorator to `rbac.py` — authenticates optionally and authorizes nothing, correctly marked via `_mark` for the RBAC walk test.
   - Re-routed `GET /api/v1/events/<activity_id>` to branch its payload: anonymous users receive `to_dict()` (public) while authenticated organisers receive `detail=True` (collaborators, budget).

## Verification

- **Automated Tests:** Added 11 new tests to `test_campaign_package.py` passing 100%. The test suite (`pytest -q`) ran successfully across all modules, proving no existing routes or scopes were broken.
- **RBAC Audit:** The RBAC route walk test proved the new detail route still carries a valid guard (`public_or_auth`), preserving the structural safety net.
- **Slug Collisions:** The monkeypatched `test_slug_collision_retry` guarantees that when `generate_slug` fails all 3 tries, it exits safely with a 503 rather than corrupting the database or raising a raw 500.

## Next Steps
The backend Campaign state is now fully structurally ready for the poster uploads and Mail generation (Plan 05-03) and the UI Implementation (Plan 05-06).
