---
phase: 04-organisation-profile-brand-kit
reviewed: 2026-08-14T00:00:00Z
depth: standard
files_reviewed: 37
files_reviewed_list:
  - backend/.env.example
  - backend/app/config.py
  - backend/app/constants.py
  - backend/app/controllers/__init__.py
  - backend/app/controllers/org_profile_controller.py
  - backend/app/controllers/upload_controller.py
  - backend/app/models/__init__.py
  - backend/app/schemas/__init__.py
  - backend/app/services/org_profile_service.py
  - backend/app/url_safety.py
  - backend/migrations/versions/f997686e136b_add_organisations_website.py
  - backend/requirements.txt
  - backend/tests/conftest.py
  - backend/tests/test_blueprint_registration.py
  - backend/tests/test_org_profile_brand_kit.py
  - backend/tests/test_schema_batch.py
  - backend/tests/test_url_safety.py
  - frontend/src/App.tsx
  - frontend/src/components/__tests__/brand-kit-rejection.test.ts
  - frontend/src/components/__tests__/org-logo-ladder.test.ts
  - frontend/src/components/__tests__/social-links-errors.test.ts
  - frontend/src/components/__tests__/social-links-row.test.tsx
  - frontend/src/components/BrandKitEditor.tsx
  - frontend/src/components/Layout.tsx
  - frontend/src/components/OrgLogo.tsx
  - frontend/src/components/SocialLinksEditor.tsx
  - frontend/src/components/SocialLinksRow.tsx
  - frontend/src/components/ui.tsx
  - frontend/src/lib/__tests__/request-error-body.test.ts
  - frontend/src/lib/__tests__/url-safety.test.ts
  - frontend/src/lib/api.ts
  - frontend/src/lib/format.ts
  - frontend/src/lib/mock.ts
  - frontend/src/lib/queries.ts
  - frontend/src/lib/types.ts
  - frontend/src/pages/OrgProfile.tsx
  - frontend/src/pages/Orgs.tsx
findings:
  critical: 1
  warning: 14
  info: 5
  total: 20
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-08-14
**Depth:** standard
**Files Reviewed:** 37
**Status:** issues_found

## Summary

Phase 4 adds the organisation profile (bio / logo / social links), a URL-safety
predicate shared by the write and read paths, a magic-byte-sniffing logo upload,
the brand kit read/write contract, and an AI-drafted kit behind a lazy-imported
SDK. The authorization spine (`can_manage_org_required`), the URL parser reuse,
the SVG exclusion, the vendor-exception containment and the "the draft persists
nothing" guarantee are all genuinely well built and well tested.

One defect defeats a control the code explicitly claims to hold. The
`logo_url` write path is guarded by a *shape* check (`UPLOAD_URL_PATTERN`) and
not by an *ownership* check, and the schema docstring asserts that the exact
pattern is what stops "a caller aim[ing] the unlink-on-replace path at a file of
their choosing" (T-04-25). It does not: every valid upload path is publicly
readable from any organisation's profile, so naming another organisation's path
is trivially within the pattern. That is cross-organisation file deletion by any
POR holder and is the single blocker below.

The remaining findings are one exactness bug in the same regex, a duplicated /
dead magic-byte constant, several error-path and message-mapping issues, one
read-filter inconsistency between `/orgs` and `/orgs/<id>/profile`, a
configuration footgun in `.env.example`, an unmetered outbound-cost endpoint,
and a handful of frontend state-lifecycle staleness bugs.

## Critical Issues

### CR-01: `PATCH /profile` accepts any other organisation's `logo_url`, allowing cross-org file deletion

**File:** `backend/app/schemas/__init__.py:146-153`, `backend/app/services/org_profile_service.py:186-207`, `backend/app/services/org_profile_service.py:492-509`

**Issue:**
`OrgProfileSchema.logo_url` validates only that the value *matches the shape*
`^/api/v1/uploads/[0-9a-f]{32}\.(?:png|jpg|webp)$`. Nothing anywhere checks that
the path belongs to the organisation being patched. `update_profile` assigns it
blind (`EDITABLE_FIELDS` loop, line 193-195) and `_discard_stored_file` then
unlinks whatever the *previous* value named.

Every stored `logo_url` is readable by any signed-in user:
`GET /orgs/<any-org-id>/profile` is `auth_required` only
(`org_profile_controller.py:21-31`) and `GET /orgs` is likewise `auth_required`
(`community_controller.py:17-20`). So the "unguessable uuid4" is not a secret —
it is published.

Exploit, using any account holding one `ORG_MANAGER_PORS` POR over one
organisation A (a House Secretary suffices; an admin trivially):

1. `GET /orgs/<B>/profile` → read B's `logo_url`, e.g. `/api/v1/uploads/<uuidB>.png`.
2. `PATCH /orgs/<A>/profile {"logo_url": "/api/v1/uploads/<uuidB>.png"}` → 200.
   A's own previous file is unlinked; A now renders B's artwork.
3. `PATCH /orgs/<A>/profile {"logo_url": null}` → 200. `_discard_stored_file`
   unlinks `<uuidB>.png`.

B's row still points at the deleted file. B's logo is permanently gone from
disk, with no audit trail on B and no way for B's manager to notice beyond a
broken image. Repeating step 1-3 over `GET /orgs` deletes every organisation's
logo in the system. Step 2 alone is also organisation-identity impersonation.

`test_logo_url_cannot_be_set_to_an_arbitrary_value` only exercises values that
*fail* the pattern, so this passes the suite cleanly.

**Fix:** the docstring already states the only legitimate use — "`logo_url` is
here only so a null can clear it". Enforce exactly that; the upload endpoint
stays the sole writer of a non-null value.

```python
# backend/app/schemas/__init__.py
class OrgProfileSchema(Schema):
    bio = fields.Str(required=False, allow_none=True, validate=validate.Length(max=1000))
    # There is no legitimate client-supplied non-null value: POST /logo is the
    # only writer of one. A shape check is not an ownership check — every valid
    # path is readable from GET /orgs/<id>/profile, so a pattern match lets a
    # caller name another organisation's file and aim the unlink-on-replace path
    # at it (T-04-25).
    logo_url = fields.Constant(None, allow_none=True)  # or: see service guard below
```

If the field must stay a `Str` for wire compatibility, add the ownership guard
in the service instead — it is two lines and covers every future caller:

```python
# backend/app/services/org_profile_service.py, top of update_profile()
if data.get("logo_url") is not None and data["logo_url"] != org.logo_url:
    raise ApiError(
        "A logo is set by uploading one, not by naming a path.",
        "invalid_image", 400,
    )
```

Add a regression test asserting that org A's manager cannot PATCH A's
`logo_url` to org B's stored path, and that B's file survives.

## Warnings

### WR-01: `UPLOAD_URL_PATTERN` anchors with `$`, so a trailing newline passes the "exact" match

**File:** `backend/app/constants.py:305`

**Issue:** `$` in Python regex matches at end-of-string *or immediately before a
trailing newline*. Both consumers use `re.match` semantics —
`validate.Regexp(UPLOAD_URL_PATTERN)` in `schemas/__init__.py:151` and
`re.match(UPLOAD_URL_PATTERN, logo_url)` in `org_profile_service.py:502`. So
`"/api/v1/uploads/<32 hex>.png\n"` is accepted as a stored `logo_url` and is
also treated as a file path by `_discard_stored_file`. The comment beside the
constant calls this pattern "exact"; it is not.

**Fix:**
```python
UPLOAD_URL_PATTERN = r"^/api/v1/uploads/[0-9a-f]{32}\.(?:png|jpg|webp)\Z"
```

### WR-02: `IMAGE_MAGIC_BYTES` is dead, and its value is duplicated in another module

**File:** `backend/app/controllers/upload_controller.py:39`, `backend/app/services/org_profile_service.py:44`

**Issue:** `IMAGE_MAGIC_BYTES = 16` has zero references anywhere in the
codebase. The service defines its own `_SNIFF_BYTES = 16` and uses that
(`org_profile_service.py:221`). Two constants that must agree, in two modules,
with only one of them live — if a future signature needs a deeper offset,
editing `IMAGE_MAGIC_BYTES` beside `IMAGE_MAGIC` (the obvious place) changes
nothing and the sniff silently starts refusing valid images.

**Fix:** delete `_SNIFF_BYTES` and import the one that lives beside the table.

```python
# org_profile_service.py
from ..controllers.upload_controller import (
    IMAGE_MAGIC_BYTES, served_path, sniff_image_ext, upload_dir,
)
...
head = file_storage.read(IMAGE_MAGIC_BYTES)
```

### WR-03: `_REJECTION_MESSAGES[error]` is an unguarded dict index — a new rejection code becomes a 500

**File:** `backend/app/services/org_profile_service.py:150`, `:162`

**Issue:** Both rejection sites index `_REJECTION_MESSAGES` directly. The dict
carries exactly the two codes `url_safety` emits today. Adding a third code to
`url_safety.py` (a natural change — see WR-04) turns every rejection carrying it
into a `KeyError`, which the catch-all handler renders as a 500 `internal_error`
on what is a user input mistake. That is precisely the failure the duplicate-
platform branch just above was written to avoid.

**Fix:**
```python
raise ApiError(
    _REJECTION_MESSAGES.get(error, "That link could not be saved."),
    error, 400, {"platform": platform},
)
```

### WR-04: over-length and empty URLs are reported as a *scheme* problem

**File:** `backend/app/url_safety.py:59-60`, `:109-110`

**Issue:** `_check` returns `REJECT_SCHEME` for `not raw` and for
`len(raw) > MAX_SOCIAL_URL_LENGTH`, and again at line 110 for a normalised value
that is too long. `REJECT_SCHEME` maps to the user-facing sentence "A link must
start with http:// or https://." (`org_profile_service.py:47`) and to the editor
heading "That link needs to start with http:// or https://"
(`SocialLinksEditor.tsx:53`). A user whose URL is simply too long is told to fix
its scheme. The module's own comment states the two codes are distinguishable
because they are "different user corrections" — a length problem is a third one
being mislabelled as the first.

**Fix:** either add a `REJECT_LENGTH` code (and a message for it — see WR-03) or,
if the third code is not wanted, at minimum route the length case to
`REJECT_HOST`'s neighbour with an accurate sentence rather than to the scheme
message.

### WR-05: `GET /orgs` serves `website` without the read-side safety filter that `/orgs/<id>/profile` applies

**File:** `backend/app/models/__init__.py:140-149` vs `backend/app/services/org_profile_service.py:120`

**Issue:** `public_profile` re-runs `check_website_url(org.website)` on every
read, explicitly so that "a value that could not be saved today is not served
today either, whatever put it there" (D-03). `Organisation.to_dict()` — which is
what `GET /orgs` returns (`community_controller.py:17-20`), and what
`adaptOrganisation` feeds into `pages/Orgs.tsx` — returns the raw column with no
filter at all. The stated criterion ("never rendered anywhere") is therefore a
property of one endpoint, not of the system, exactly as the module docstring
warns against. `safeExternalHref` catches the `javascript:` case at
`Orgs.tsx:927`, but that is layer 3 doing layer 2's job, and any future
render site that forgets it is unprotected.

**Fix:** apply the same filter at the serialiser so every consumer inherits it.

```python
# models/__init__.py, Organisation.to_dict
from ..url_safety import check_website_url  # local import to avoid a cycle
...
"website": check_website_url(self.website)[0],
```

### WR-06: `.env.example` ships `GEMINI_MODEL=` empty, which overrides the documented default and breaks every draft

**File:** `backend/.env.example`, `backend/app/config.py:52`

**Issue:** `run.py` calls `load_dotenv()` before importing the app, so a `.env`
copied verbatim from `.env.example` puts `GEMINI_MODEL=""` into the environment.
`os.getenv("GEMINI_MODEL", "gemini-2.5-flash")` returns `""` — the default only
applies when the variable is *absent*, not when it is empty. The comment
directly above the line claims "Default when unset: gemini-2.5-flash". A user
who sets only `GEMINI_API_KEY` in a copied file gets `ai_available: true`, a live
Draft button, and a 503 `ai_failed` on every press, with the real cause visible
only in the server log.

**Fix:** treat empty as unset in config, which also makes the example file safe:

```python
GEMINI_MODEL = os.getenv("GEMINI_MODEL") or "gemini-2.5-flash"
```

### WR-07: the AI draft endpoint has no rate limit or cooldown on a paid outbound call

**File:** `backend/app/controllers/org_profile_controller.py:120-141`, `backend/app/services/org_profile_service.py:398-489`

**Issue:** `POST /orgs/<id>/brand-kit/draft` is deliberately unconditional
("regenerating is harmless when it stores nothing"), performs an outbound LLM
call, and retries once on any failure — so each request costs up to two
generations. There is no per-user, per-org or per-server throttle. Any single
POR holder can drive the server's provider quota to zero in a loop, which takes
the feature down for every other organisation. "Writes nothing" is not the same
as "costs nothing".

**Fix:** a per-org cooldown is the smallest thing that works and needs no new
dependency — record the last draft timestamp in memory or in `SystemSetting`, and
refuse with a 429 inside the window. Note the retry doubles the spend, so bound
it explicitly in whatever budget is chosen.

### WR-08: `Organisation.to_dict(detail=True)` has an empty branch and the only caller passes `detail=True`

**File:** `backend/app/models/__init__.py:150-156`, `backend/app/services/org_profile_service.py:98`

**Issue:** The `if detail:` block is `pass` with a comment saying 04-02 and
04-04 will widen it. They did not — `public_profile` assembles `social_links`,
`withheld_platforms` and `website` itself. So `detail=True` is a parameter that
does nothing, and the comment now documents a plan that was abandoned. A reader
tracing where `social_links` comes from is sent to the wrong file.

**Fix:** drop the `detail` parameter and its dead branch, and update the call
site to `org.to_dict()`; or move the three assemblies into it. Either way, one
of the two claims must stop being false.

### WR-09: `kitDirty` is never cleared when the brand kit editor unmounts

**File:** `frontend/src/pages/OrgProfile.tsx:91`, `:112`, `:561-571`; `frontend/src/components/BrandKitEditor.tsx:186`

**Issue:** `onDirtyChange` is only ever invoked from a `useEffect` body inside
`BrandKitEditor`; the effect has no cleanup. The card renders under
`{canEdit && ...}`, so when `canEdit` flips false (a POR revoked while the page
is open — a state this page explicitly models via `lostAccess`) the component
unmounts while `dirty` is `true` and the page's `kitDirty` stays `true` forever.
The `beforeunload` handler then blocks every subsequent close/reload of that page
with an unsaved-work prompt for work that no longer exists.

**Fix:**
```tsx
useEffect(() => {
  onDirtyChange(dirty)
  return () => onDirtyChange(false)
}, [dirty, onDirtyChange])
```

### WR-10: `logoLoadFailed` is never reset, so a stale "couldn't be loaded" line survives removal and re-upload

**File:** `frontend/src/pages/OrgProfile.tsx:86`, `:293-304`, `:414-418`

**Issue:** `setLogoLoadFailed(true)` fires from `OrgLogo`'s `onError`. It is
cleared only in `chooseFile` (line 251). `confirmRemove` does not clear it and
neither does a successful upload's `onSuccess`. After removing a broken logo the
tile correctly falls back to the House mark or monogram, while the amber "That
logo file couldn't be loaded. Upload it again." line is still rendered beneath
it — the message is not gated on the rung. The user is told to fix something
they just deleted.

**Fix:** clear it in `confirmRemove`'s `onSuccess` and in `uploadLogo`'s
`onSuccess`, alongside the existing `qc.setQueryData` calls.

### WR-11: the unsaved-work guard ignores the social-links editor

**File:** `frontend/src/pages/OrgProfile.tsx:112`

**Issue:** `dirty` is `(editing === 'profile' && bio !== org.bio) || kitDirty`.
`editing === 'links'` is not represented at all, and `SocialLinksEditor` holds
its seven field values in its own state with no dirty reporting. A user who
retypes six social handles and closes the tab loses them with no prompt, while
one who edits a single bio character gets one. The section-locking machinery
(`blockedFor`) already treats the three sections as peers; the loss guard does
not.

**Fix:** give `SocialLinksEditor` the same `onDirtyChange` prop
`BrandKitEditor` already has (comparing `values` against the seeded snapshot),
and OR it into `dirty`.

### WR-12: the "Organisation profile" nav entry points at an arbitrary organisation for admins

**File:** `frontend/src/components/Layout.tsx:78-93`

**Issue:** The entry links to `/orgs/${manageableOrgIds[0]}`. For an admin,
`manageable_orgs` returns `Organisation.query.all()` (`rbac.py:374-376`), so
`manageableOrgIds[0]` is whatever row the database returns first — for the seeded
data, "Hyderabad Regional Chapter". A single generic nav label that lands on one
unrelated organisation reads as a bug to the admin, and the label gives no hint
which organisation it opens.

**Fix:** either point admins at the organisations list (`/orgs`) rather than at a
row, or label the entry with the organisation name when there is exactly one and
send multi-org holders to the list.

### WR-13: `test_exactly_two_revisions` asserts seven and its name/docstring say two

**File:** `backend/tests/test_schema_batch.py:98-114`

**Issue:** The test is named `test_exactly_two_revisions`, its docstring says
"The baseline plus one batch. With a single batch revision, two migrations
cannot conflict over a shared table, because there is only one" — and it asserts
`EXPECTED_REVISION_COUNT == 7`. The module docstring makes the same claim
("landed as a SINGLE Alembic revision"). The invariant the file exists to defend
stopped being true several revisions ago and nobody renamed anything, so a
future reader has no way to tell which statement is the intent.

**Fix:** rename to `test_revision_count_is_reviewed` and rewrite the docstring
and the module header to describe what is actually being defended now (a
deliberate, reviewed revision count), not the abandoned single-batch invariant.

### WR-14: `store_logo` writes the new file before the commit, orphaning it if the commit fails

**File:** `backend/app/services/org_profile_service.py:233-240`

**Issue:** The comment at line 242 carefully justifies deleting the *previous*
file after the commit, but the *new* file is written at line 234 before
`db.session.commit()` at line 240. A commit failure leaves an unreferenced file
on disk with no cleanup path — the same class of leak the comment says it is
avoiding, in the other direction. Repeated failures accumulate silently in
`instance/uploads/`.

**Fix:** wrap the commit and unlink the newly written file on failure:

```python
try:
    db.session.commit()
except Exception:
    db.session.rollback()
    (upload_dir() / name).unlink(missing_ok=True)
    raise
```

## Info

### IN-01: an audit row is written for a no-op PATCH

**File:** `backend/app/services/org_profile_service.py:193-201`

**Issue:** `update_profile` records "Updated organisation profile" unconditionally,
including for `PATCH {}` (valid — every field is optional) and for a PATCH that
sets a field to the value it already had. The append-only audit log then contains
changes that never happened, which weakens it as evidence.

**Fix:** record only when at least one `EDITABLE_FIELDS` key is present and its
value differs from the current one.

### IN-02: `normalise_website_url` is exported but used only by tests

**File:** `backend/app/url_safety.py:143-145`

**Issue:** Application code calls `check_website_url` directly
(`org_profile_service.py:120`, `:159`); `normalise_website_url` has no
non-test caller. A thin wrapper that only the test suite exercises is a
second name for the same predicate that can drift out of use unnoticed.

**Fix:** delete it and have `test_url_safety.py` call `check_website_url(...)[0]`,
matching how the production path reads it.

### IN-03: `BrandKitEditor` schedules a timer inside `onSettled`, after the unmount cleanup has run

**File:** `frontend/src/components/BrandKitEditor.tsx:267-292`, `:192-198`

**Issue:** The unmount effect clears `timers.current` and aborts the request.
Aborting settles the mutation, and `onSettled` then pushes a *new*
`window.setTimeout` into a ref nobody will clear again. The callback runs
`DRAFT_MIN_VISIBLE_MS` later and calls `setDrafting`/`setDraftError` on a
component that is gone. Harmless under React 18, but it is a timer that outlives
its owner by design accident.

**Fix:** guard the deferred block on a `mounted` ref set to `false` by the same
cleanup that aborts.

### IN-04: `voice_tone` is stored untrimmed while palette and phrases are trimmed

**File:** `frontend/src/components/BrandKitEditor.tsx:362`, `backend/app/services/org_profile_service.py:306`

**Issue:** The client sends `voice.trim() ? voice : null` — the *untrimmed*
string when non-blank — and `upsert_brand_kit` assigns `data.get("voice_tone")`
with no strip, unlike the two list fields immediately below it which are both
stripped. Leading/trailing whitespace persists, counts against the 500-character
cap, and will be interpolated into Phase 5 templates.

**Fix:** strip in `upsert_brand_kit` for consistency with the sibling fields:
`kit.voice_tone = (data.get("voice_tone") or "").strip() or None`.

### IN-05: every profile write both invalidates and hand-sets the same cache entry

**File:** `frontend/src/lib/queries.ts:295-330`, `frontend/src/pages/OrgProfile.tsx:217`, `:237`, `:271`, `:298`

**Issue:** The mutation hooks call `invalidateQueries(['orgProfile', id])` and
the per-call `onSuccess` then calls `qc.setQueryData(['orgProfile', id], data)`
with the response the mutation already returned. Mutation-level callbacks run
first, so each save fires a redundant refetch that lands after the hand-set
value and replaces it with an identical one. Two round trips where the comments
say the point is to render from the mutation's own response.

**Fix:** drop the `['orgProfile', id]` invalidation from the three profile
mutation hooks and keep `setQueryData`; leave the `['orgs']` invalidation, which
has no response to seed from.

---

_Reviewed: 2026-08-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
