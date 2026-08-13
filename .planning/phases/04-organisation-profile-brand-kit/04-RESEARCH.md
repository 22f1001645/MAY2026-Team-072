# Phase 4: Organisation Profile & Brand Kit — Research

**Researched:** 2026-08-13
**Domain:** Org-scoped CRUD on an existing polymorphic entity + URL safety (stored-XSS/open-redirect) + first file-upload path + first LLM integration
**Confidence:** HIGH on codebase ground truth (every claim below opened with `Read` this session); MEDIUM on the AI provider recommendation (no CONTEXT.md, no prior AI code in repo)

---

## Summary

**Phase 4 needs no migration.** Every table and column ORG-01/02/03 requires already landed in Phase 1's single batch revision `213804635519`: `organisations.bio`, `organisations.logo_url`, the `organisation_social_links` table and the `brand_kits` table. Phase 4 is service, validator, controller and frontend wiring — exactly the shape Phase 3 had. `OrganisationSocialLink`'s own docstring names Phase 4 as the owner of the ORG-02 gate, and says the column is "stored unvalidated by this layer on purpose".

**Authorization is already solved and needs no new predicate.** `can_manage_org_required` exists (`rbac.py:369`), reads the URL kwarg named exactly `org_id`, raises 404 when the org does not exist and 403 when the predicate says no — never 500, because `can_manage_org` is a total function. `ORG_MANAGER_PORS` already contains House Secretary, Deputy House Secretary, Society Secretary, Society Deputy Secretary, Regional Coordinator, Coordinator, Technical Secretary and Web Admin — which is precisely ORG-01's "Secretary/Deputy Secretary … across all four org types". The four org types are one polymorphic `organisations` table discriminated by a `type` column, so there is exactly one code path, not four.

**The two genuinely new capabilities are the risky ones.** The repo has *zero* file-upload code (no `request.files`, no `secure_filename`, no `UPLOAD_FOLDER`, no `send_from_directory`) and *zero* LLM code (no AI SDK, no HTTP client, no `GEMINI_API_KEY`, no `backend/.env.example`). Both must be built from nothing in this phase, and both are where the security budget goes. Phase 4 also introduces the **first user-supplied URL ever rendered by this frontend** — today no `href={...}` or `<img src={...}>` in `frontend/src` carries user data.

**Primary recommendation:** Build ORG-01 as a tracer on a *new* blueprint + *new* service module (never extend `community_controller.py` / `org_service.py`, which are POR-admin surfaces), and remember to register the blueprint in `ALL_BLUEPRINTS` — Phase 2 lost an entire endpoint to exactly that omission. Then ORG-02's URL safety as one shared `is_renderable_social_url()` predicate called on *both* the write path and the read path (the read-side call is what makes success criterion 2's "never rendered anywhere" literally true). Then ORG-03 as validation-only work over the existing JSON columns. Then ORG-04 as a strictly non-persisting `google-genai` draft endpoint that degrades to a `503 ai_unavailable`, never a 500 and never a silent canned answer.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| "May this person edit org X?" (ORG-01) | API / Backend (`rbac.can_manage_org`) | — | POR authority lives server-side. `capabilities.manageableOrgIds` on `/auth/me` is a *rendering* hint only, never an auth input (DASH-01 precedent, `frontend/src/lib/__tests__/view-not-sent.test.ts`). |
| Social-link scheme + host allowlist (ORG-02) | API / Backend (write path) | API / Backend (read path filter) | Both are backend. The frontend helper is a third belt, not a tier that owns the rule. |
| Rendering a stored social link | Browser / Client | API / Backend | The browser is the sink; the backend read filter is what guarantees the sink is never fed. |
| Logo bytes storage | Database / Storage (`backend/instance/uploads`, local FS) | API / Backend (serve route) | PROJECT.md locks local filesystem; no CDN, no object store, no deploy target. |
| Logo *path* persistence | Database / Storage (`organisations.logo_url`) | — | Column already exists, `String(300)` — holds a served path, not bytes. |
| Brand kit persistence (ORG-03) | Database / Storage (`brand_kits` JSON columns) | API / Backend (validation) | JSON columns exist; SQLite/Postgres enforce nothing, so all shape rules are service-tier. |
| Brand kit *read contract* for CAMPAIGN-02 | API / Backend (`org_profile_service`) | — | Phase 5 consumes a Python function, not a table. Defining that seam here is the whole point of ORG-03. |
| AI draft generation (ORG-04) | API / Backend | External (Gemini) | Must never touch the DB. Key never reaches the browser. |
| "Is AI available?" | API / Backend | Browser / Client | Server owns the answer; client render-locks the button from it. |

**Tier that does NOT exist in this project:** there is no frontend server. `frontend/` is a Vite SPA (`vite.config.ts`, no SSR). Anything described as "server-side" is Flask.

---

## Phase Requirements

| ID | Description (verbatim, REQUIREMENTS.md:62-65) | Research Support |
|----|-------------|------------------|
| ORG-01 | Secretary/Deputy Secretary can edit their organisation's profile (bio, logo) and social links, across all four org types (house/society/region/council) | §Ground Truth 1 (one polymorphic table), §Ground Truth 3 (`can_manage_org_required` gives 403 for free), §Decision D-1 (endpoint map), §Decision D-5 (logo upload) |
| ORG-02 | Social links are validated server-side against an http/https scheme + host allowlist (stored-XSS / open-redirect prevention) | §Decision D-3 (validator, verified bypass vectors), §Decision D-4 (read-side filter = criterion 2), §Security Domain |
| ORG-03 | Secretary/Deputy Secretary can define a brand kit (voice/tone descriptors, color palette, sample phrases) for their organisation, feeding CAMPAIGN-02 | §Ground Truth 4 (table exists), §Decision D-6 (validation rules), §Decision D-7 (read contract for Phase 5) |
| ORG-04 | An optional AI-assist button drafts a starting brand kit for organisations that don't have one yet, fully editable before saving — never auto-applied without review | §Decision D-8 (provider), §Decision D-9 (non-persisting interface), §Decision D-10 (graceful degradation), §AI-SPEC assessment |

---

## User Constraints

**No `04-CONTEXT.md` exists** — the user chose to plan without a discuss-phase, confirmed 2026-08-13 (`ls .planning/phases/04-organisation-profile-brand-kit/` returned only this file's directory). The constraints below are therefore drawn from **already-locked project-level decisions**, which the planner must honour with the same authority as a CONTEXT.md lock.

### Locked Decisions (from PROJECT.md → Key Decisions, and STATE.md → Blockers RESOLVED)

| Decision | Source | Status |
|----------|--------|--------|
| "Entity profile/social-links apply to all org types (house/society/region/council), not Houses-only" — "A single consistent model beats the special-case the existing `HOUSE_META` hints at" | `PROJECT.md:100` | Locked |
| "Brand kit: manual entry with an optional AI-assist button, never auto-applied without review" — "Matches the campaign creator's own 'never auto-send' principle — AI drafts, humans confirm" | `PROJECT.md:112` | Locked |
| "Poster/file uploads (Expense receipts, campaign posters) land on local filesystem (`backend/instance/uploads`), served via Flask, not a cloud blob provider" — marked **✓ Good** (not Pending) | `PROJECT.md:116` | Locked |
| "No live deployment target … Course deliverable graded via code + local run" — marked **✓ Good** | `PROJECT.md:115`, `STATE.md:137` | Locked |
| "AI campaign creator ships mail-template generation + poster upload only; poster *generation* stays behind an `AI_IMAGE_ENABLED` flag, off by default" — Gemini image gen has no free tier | `PROJECT.md:104` | Locked (bears on ORG-04: text-only) |
| PROJECT.md "no new frameworks" constraint | cited by `03-UI-SPEC.md:39`, `02-UI-SPEC.md` | Locked |
| shadcn deliberately NOT introduced; binding for Phases 3–8 | `02-UI-SPEC.md → shadcn Gate Outcome`, re-affirmed `03-UI-SPEC.md:39` | Locked |

### Claude's Discretion (no prior decision exists — research recommends below)

- Which social platforms are on the host allowlist, and whether a generic "website" entry is permitted (→ **D-3**, recommend: no generic entry in v1)
- Whether the logo is an upload or a URL field (→ **D-5**, recommend: upload, building the primitive Phase 5 will reuse)
- Brand-kit storage shape (→ **D-6**, recommend: keep the existing JSON columns, add service-tier validation)
- LLM provider, model and interface (→ **D-8/D-9/D-10**, recommend: `google-genai` + `gemini-2.5-flash`, lazy-imported, non-persisting, 503-degrading)
- Endpoint map and blueprint placement (→ **D-1**, recommend: new `org_profile_bp` + new `upload_bp`)
- Whether the AI endpoint is rate-limited (→ **Open Question 3**, recommend: no limiter in Phase 4)

### Deferred Ideas (OUT OF SCOPE for Phase 4)

- **CAMPAIGN-07** — AI poster *generation*. Explicitly v2 (`REQUIREMENTS.md:113`). ORG-04 is text-only.
- **SPONSOR-01** — sponsorship CRM. v2.
- **Sending mail.** `research/STACK.md:47` notes Flask-Mail is only needed "if 'mail-template generation' means send, not draft" — it does not. Nothing in Phase 4 or 5 sends email.
- **Cloudinary / any cloud blob provider.** Superseded by the locked local-filesystem decision (`STATE.md:138`).
- **Retrofitting the six `LEGACY_COARSE_ROUTES`.** Frozen by Phase 1 decision; Phase 4 adds no entries and fixes none (`tests/test_rbac_enforcement.py:25-32`).

---

## Ground Truth (answers to the six open questions)

Everything in this section was read from source this session. Quotes are verbatim.

### 1. Org-type modelling — ONE polymorphic table, not four

`[VERIFIED: backend/app/models/__init__.py:118-141]`

```python
class Organisation(Base):
    __tablename__ = "organisations"
    name = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(20), nullable=False)  # house|society|region|council
    city = db.Column(db.String(80))
    # Entity profile (ORG-01). Both nullable: every organisation that already
    # exists was seeded without a profile, and an empty profile is a truthful
    # state rather than something to invent a default for. Applies to all four
    # org types, replacing the Houses-only HOUSE_META precedent.
    bio = db.Column(db.Text, nullable=True)
    logo_url = db.Column(db.String(300), nullable=True)
```

`[VERIFIED: backend/app/constants.py:64-65]`

```python
# --- Organisation types ---
ORG_TYPES = ("house", "society", "region", "council")
```

**Consequence for the planner:** there is nothing to unify. One table, one `to_dict()`, one controller, one page. The phrase "for all four org types" in ROADMAP criterion 1 is a *test matrix* requirement, not a design requirement — it means the pytest file must exercise all four, not that four code paths exist.

`Organisation.to_dict()` **already serialises `bio` and `logo_url`** `[VERIFIED: models/__init__.py:133-141]` — so `GET /api/v1/orgs` already carries them (both `None` today). It does **not** carry social links or the brand kit.

**Migration required: NONE.** `[VERIFIED: backend/migrations/versions/213804635519_milestone_v1_1_batch_16_tables_11_.py:21, 48, 305-306]` — `op.create_table('brand_kits'`, `op.create_table('organisation_social_links'`, and on `organisations`: `batch_op.add_column(sa.Column('bio', sa.Text(), nullable=True))` / `batch_op.add_column(sa.Column('logo_url', sa.String(length=300), nullable=True))`. Phase 4 matches Phase 3's shape: zero migrations.

> ⚠️ **A migration in Phase 4 would violate ROADMAP Phase 1 success criterion 3** ("no later phase requires a second destructive reset") and would trip `tests/test_migrations.py`'s model-vs-migration drift gate. If a plan finds itself wanting a column, that is a signal the design drifted, not that a migration is due.

### 2. Authorization — `can_manage_org_required`, and 403 comes for free

`[VERIFIED: backend/app/rbac.py:341-369]`

```python
def org_scoped(predicate, param="org_id"):
    """Build a guard that loads the Organisation named in the URL and asks `predicate`.

    Same shape as `activity_scoped`; the loaded Organisation is left on `g.org`."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = _load_current_user()
            org_id = kwargs.get(param)
            org = Organisation.query.get(org_id) if org_id else None
            if org is None:
                raise ApiError("Organisation not found", "not_found", 404)
            if not predicate(user, org):
                raise ApiError(_denial(predicate), "forbidden", 403)
            g.org = org
            return fn(*args, **kwargs)

        return _mark(wrapper, fn, predicate.__name__)

    return decorator
```

```python
can_manage_org_required = org_scoped(can_manage_org)
```

`[VERIFIED: backend/app/rbac.py:300-305]` — the exact 403 message:

```python
_DENIAL_MESSAGES = {
    "can_manage_activity": "Organiser or event-team authority over this event is required",
    "can_participate_in_activity": "You must be registered for this event to do this",
    "is_meetup_head": "Only the assigned Meetup Head of this event may do this",
    "can_manage_org": "Authority over this organisation is required",
}
```

`[VERIFIED: backend/app/rbac.py:162-176]`

```python
def can_manage_org(user, org) -> bool:
    """May this user act on behalf of THIS organisation? (ORG-01, PROPOSAL-06)

    Cross-org authority is the threat this closes: a Secretary of org A naming
    org B's id in a URL. The boundary is org id identity — never name, never
    city. Team membership on an activity is never consulted here, because an
    Activity-scoped crew row grants zero org-wide permission (TEAM-03)."""
    if not user or not org:
        return False
    if user.role == ROLE_ADMIN:
        return True
    for por in _active_pors(user):
        if por.por_type in ORG_MANAGER_PORS and org.id in _por_org_ids(por):
            return True
    return False
```

`[VERIFIED: backend/app/constants.py:53-62]`

```python
ORG_MANAGER_PORS = {
    "Regional Coordinator",
    "House Secretary",
    "Deputy House Secretary",
    "Society Secretary",
    "Technical Secretary",
    "Web Admin",
    "Society Deputy Secretary",
    "Coordinator",
}
```

**Exactly how ROADMAP criterion 1's "403, not 404, not 500" is discharged:**

| Case | Outcome | Mechanism |
|------|---------|-----------|
| Secretary of org A → `PATCH /orgs/<B>/profile` | **403** `forbidden`, `"Authority over this organisation is required"` | Org B **exists**, so the 404 branch is skipped; `can_manage_org` returns `False` because B's id is not in any of the user's `_por_org_ids(por)` sets |
| Any user → `PATCH /orgs/<nonexistent>/profile` | **404** `not_found` | `Organisation.query.get()` returns `None` |
| Unauthenticated | **401** `unauthorized` | `_load_current_user()` → `verify_jwt_in_request()` |
| `user` or `org` somehow `None` | **403**, never 500 | `can_manage_org` is a total function — `rbac.py:18-21` docstring: *"they return a plain bool for every input, including a None user or a None resource, so an authorization question can never turn into a 500 that a caller might handle permissively"* |

**Three hard constraints on the planner from this:**

1. **The URL parameter must be named exactly `org_id`.** `org_scoped(predicate, param="org_id")` reads `kwargs.get(param)`. A route declaring `<organisation_id>` silently gets `org_id=None` → org is `None` → **404 for everyone**, and the RBAC-02 test would still pass because the guard is present. This is a silent, test-invisible failure mode.
2. **Every Phase 4 route with `<org_id>` in the path is policed on every suite run.** `[VERIFIED: backend/tests/test_rbac_enforcement.py:35]` — `SCOPED_PARAMS = ("<activity_id>", "<org_id>")`. Three tests walk `app.url_map`: no scoped route may use `organiser_required`, none may be unguarded, and `LEGACY_COARSE_ROUTES` (6 frozen entries) **never grows**. The read endpoint `GET /orgs/<org_id>/profile` therefore also needs a guard — `auth_required` satisfies `test_every_scoped_route_carries_at_least_one_guard` because `auth_required` calls `_mark`.
3. **`_por_org_ids` reads two org ids per POR** `[VERIFIED: rbac.py:73-87]` — the membership's `org_id` **and** `por.region_id`. This is why a Regional Coordinator, whose Membership sits in a *House*, still gets `can_manage_org` on the *Region* organisation. Without it, region-type orgs would have no manager at all.

**A wrinkle worth a test:** `org_service.assign_por` `[VERIFIED: backend/app/services/org_service.py:26-33]` refuses to assign House Secretary / Deputy House Secretary / Regional Coordinator / Web Admin to a non-`house` org:

```python
    HOUSE_ONLY_POR_TYPES = {"House Secretary", "Deputy House Secretary", "Regional Coordinator", "Web Admin"}
    if por_type in HOUSE_ONLY_POR_TYPES and org.type != "house":
        raise ApiError(
            f"'{por_type}' can only be assigned to a Forest House, not a {org.type}.",
            "invalid_org_type_for_por",
            400,
        )
```

So a **council** organisation can only be given `Society Secretary`, `Society Deputy Secretary`, `Technical Secretary` or `Coordinator`. That works (all four are in `ORG_MANAGER_PORS`) but is semantically odd — see **Open Question 1**.

### 3. Social links — table exists, validation is Phase 4's, column is deliberately inert

`[VERIFIED: backend/app/models/__init__.py:147-179]`

```python
class OrganisationSocialLink(Base):
    """One social handle belonging to an Organisation (ORG-01/ORG-02).

    `url` is free text supplied by a Secretary or Deputy Secretary and is stored
    unvalidated by this layer on purpose. ORG-02 owns the server-side gate in
    Phase 4: an http/https scheme check plus a host allowlist, applied at the
    service boundary before the row is written. Until that lands, the column is
    inert - nothing in Phases 1-3 reads or renders it anywhere, so a hostile
    value has no path to a browser (threat T-01-12).

    One row per (org, platform), so an entity cannot list two conflicting
    Instagram handles and leave a reader guessing which is current."""

    __tablename__ = "organisation_social_links"
    __table_args__ = (
        db.UniqueConstraint("org_id", "platform", name="uq_org_social_platform"),
    )

    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), nullable=False, index=True)
    platform = db.Column(db.String(40), nullable=False)   # instagram|linkedin|x|...
    url = db.Column(db.String(300), nullable=False)
```

**There is no `SOCIAL_PLATFORMS` constant.** `[VERIFIED: backend/app/constants.py, full file read 2026-08-13 — no social/platform/allowlist constant exists]`. The `# instagram|linkedin|x|...` comment is a hint, not a contract. Phase 4 must author it.

**`url` is `String(300)`** — the validator's length cap must be ≤ 300 or SQLite will silently accept an over-length value that Postgres would reject.

### 4. Brand kit — table exists, JSON columns, provenance constants exist

`[VERIFIED: backend/app/models/__init__.py:182-211]`

```python
class BrandKit(Base):
    """The one brand kit per Organisation, driving campaign generation (ORG-03).

    `source` records provenance, not approval state: an AI-assisted draft is
    never applied without an explicit save by a human (ORG-04), so a row marked
    BRAND_KIT_AI_DRAFT is content someone reviewed and kept, not something
    pending review. The AI-assist call itself is a Phase 4 service concern."""

    __tablename__ = "brand_kits"

    org_id = db.Column(db.String(32), db.ForeignKey("organisations.id"), unique=True, nullable=False)
    voice_tone = db.Column(db.Text)
    palette = db.Column(db.JSON, default=list)          # hex strings
    sample_phrases = db.Column(db.JSON, default=list)
    source = db.Column(db.String(20), nullable=False, default=BRAND_KIT_MANUAL)
```

`[VERIFIED: backend/app/constants.py:248-254]`

```python
# --- Brand kit provenance (ORG-03/ORG-04) ---
# An AI-drafted kit is never applied without an explicit save (ORG-04), so
# `ai_draft` describes where the saved content came from, not an unapproved
# pending state waiting on review.
BRAND_KIT_MANUAL = "manual"
BRAND_KIT_AI_DRAFT = "ai_draft"
BRAND_KIT_SOURCES = (BRAND_KIT_MANUAL, BRAND_KIT_AI_DRAFT)
```

The backref is `uselist=False` `[VERIFIED: models/__init__.py:198-201]` — `org.brand_kit` is a single object or `None`, not a list.

**Does a later phase assume a particular shape?** Searched — `.planning/research/ARCHITECTURE.md` has **no brand-kit section at all** (grep for `brand.?kit`, case-insensitive, returned nothing). The only downstream contract is prose: CAMPAIGN-02 `[VERIFIED: REQUIREMENTS.md:54]` — *"Mail-template tone/voice is driven by the primary (or, for a Mega Meetup, all collaborating) organisation's brand kit; a multi-entity campaign includes every collaborating entity's logo"*. So Phase 5 needs (a) the kit of the primary org, and (b) `logo_url` for **every accepted collaborator**. **Phase 4 must define that read contract — nothing upstream did** (→ **D-7**).

### 5. Logo upload — there is no upload path anywhere in this repo

`[VERIFIED: grep -rniE "upload|werkzeug.utils|secure_filename|request\.files|send_from_directory|UPLOAD_FOLDER|multipart" backend/app frontend/src → ZERO matches, 2026-08-13]`

The two existing "file" columns are filename **strings** with no bytes behind them:
- `Expense.bill_name = db.Column(db.String(200))` `[VERIFIED: models/__init__.py:825]`, defaulted in the schema to the literal `"bill.pdf"` `[VERIFIED: schemas/__init__.py:65]`
- `CampaignPackage.poster_name` — docstring `[VERIFIED: models/__init__.py:686-689]`: *"`poster_name` stores a filename, following the existing Expense.bill_name precedent — no blob storage exists in this architecture yet and choosing one is a Phase 5 decision, so the column deliberately holds a name, not bytes."*

`backend/.gitignore` already contains `instance/` `[VERIFIED: backend/.gitignore:7]`, so `backend/instance/uploads/` is gitignored for free.

### 6. AI / LLM — nothing exists; the stack was researched but never installed

`[VERIFIED: backend/requirements.txt, full file, 2026-08-13]` — ten entries, and **no HTTP client, no AI SDK**:

```
Flask==3.0.3
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.7
Flask-JWT-Extended==4.6.0
Flask-Cors==4.0.1
marshmallow==3.22.0
python-dotenv==1.0.1
Werkzeug==3.0.3
# psycopg2-binary==2.9.9
# Testing (course deliverable)
pytest==8.3.2
pytest-cov==5.0.0
```

`[VERIFIED: grep -rniE "openai|gemini|anthropic|claude|google.generativeai|llm|genai|requests\.|httpx" backend/app backend/requirements.txt → ZERO matches]`

`[VERIFIED: find . -name ".env*" → only frontend/.env.example]`, whose entire content is:
```
# Base URL for the Ekatva OS backend API. Defaults to the local Flask dev server.
VITE_API_URL=http://localhost:5000/api/v1
```
**There is no `backend/.env.example`.** `backend/.flaskenv` contains only `FLASK_APP=run.py` `[VERIFIED]`.

`app/config.py` `[VERIFIED: full file]` reads `SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS` and nothing else. No AI key, no upload folder, no `MAX_CONTENT_LENGTH`.

**The project's own prior research already picked a provider** `[CITED: .planning/research/STACK.md:35]`:
> `google-genai` **2.16.0** … Google's current first-party Python SDK for the Gemini Developer API. Chosen over OpenAI/Anthropic because **Gemini's text models have a genuine no-credit-card free tier** … a five-person student team on a course budget needs the free path to be the default path.

and `[CITED: .planning/research/STACK.md:54]`:
> Free tier requires no credit card for text. **Image generation requires a billing-enabled project.** Store as `GEMINI_API_KEY` in `.env`; the SDK reads it automatically via `genai.Client()`.

### 7. Frontend — Phase 4 introduces the first user-supplied URL sink

`[VERIFIED: grep -rn "dangerouslySetInnerHTML" frontend/src → ZERO matches]`

`[VERIFIED: grep -rnE "href=\{" frontend/src, 2026-08-13 — three hits, none user-supplied]`
- `pages/EventDetail.tsx:351` — a Google Calendar link built by a local helper
- `pages/Landing.tsx:68` — `` href={`#${s}`} `` (in-page anchor)
- `pages/Orgs.tsx:956` — `href={meta.website}`, where `meta` comes from the **hardcoded** `HOUSE_META` object at `pages/Orgs.tsx:19`

`[VERIFIED: grep -rnE "<img[^>]*src=\{" frontend/src → two hits, both `meta.imageLogo` from the same hardcoded `HOUSE_META`]`

**So every URL the app renders today is authored by a developer.** ORG-01/02 changes that. `HOUSE_META` is also precisely the "Houses-only special case" that `PROJECT.md:100` and the `Organisation` model docstring say this phase replaces.

Frontend types are not ready: `[VERIFIED: frontend/src/lib/types.ts:56-61]`

```typescript
export interface Organisation {
  id: string
  name: string
  type: 'house' | 'society' | 'region' | 'council'
  city: string
}
```

No `bio`, no `logoUrl`, no `socialLinks`, no `brandKit`. And `api.orgs()` is typed `Promise<any[]>` `[VERIFIED: frontend/src/lib/api.ts:313]`.

The gating hint already exists: `capabilities.manageableOrgIds` `[VERIFIED: frontend/src/lib/api.ts:236-238]`, populated by `rbac.manageable_orgs(user)` `[VERIFIED: rbac.py:372-383]`, which reads the same `ORG_MANAGER_PORS` set — so it is exactly the set of orgs whose Edit button should render.

---

## Technical Decisions

### D-1 — Endpoint map, on NEW modules

**Recommendation:** two new controllers, one new service, one new validator module. Do **not** extend `community_controller.py` or `org_service.py`.

**Why:** `community_controller.py` is the admin POR-assignment surface — nine of its eleven routes are `@admin_required` `[VERIFIED: full file read]`. Every Phase 4 route is `can_manage_org_required`. Mixing them puts a POR-holder-writable surface in a file a reader scans as admin-only. `org_service.py` is 121 lines of POR-assignment guardrails `[VERIFIED: full file read]` with nothing profile-shaped in it. Separate files also let waves parallelise without merge conflicts — the constraint that shaped Phase 1's and Phase 2's wave structure.

| Method | Path | Guard | Purpose | Req |
|--------|------|-------|---------|-----|
| `GET` | `/api/v1/orgs/<org_id>/profile` | `auth_required` | bio, logo_url, **filtered** social links, `can_edit` | ORG-01 |
| `PATCH` | `/api/v1/orgs/<org_id>/profile` | `can_manage_org_required` | bio, logo_url | ORG-01 |
| `PUT` | `/api/v1/orgs/<org_id>/social-links` | `can_manage_org_required` | replace-all the link set | ORG-01, ORG-02 |
| `POST` | `/api/v1/orgs/<org_id>/logo` | `can_manage_org_required` | multipart upload → returns served path | ORG-01 |
| `GET` | `/api/v1/orgs/<org_id>/brand-kit` | `can_manage_org_required` | the kit, or `has_kit: false` | ORG-03 |
| `PUT` | `/api/v1/orgs/<org_id>/brand-kit` | `can_manage_org_required` | upsert — **the only writer** | ORG-03 |
| `POST` | `/api/v1/orgs/<org_id>/brand-kit/draft` | `can_manage_org_required` | AI draft — **zero DB writes** | ORG-04 |
| `GET` | `/api/v1/uploads/<filename>` | **none (public)** | serve the stored image | ORG-01 |

New files:
- `backend/app/controllers/org_profile_controller.py` → `org_profile_bp`
- `backend/app/controllers/upload_controller.py` → `upload_bp` (generic; Phase 5 CAMPAIGN-03 reuses it)
- `backend/app/services/org_profile_service.py`
- `backend/app/url_safety.py` (the ORG-02 predicate + normaliser, importable by both service and tests)

> 🚨 **Both new blueprints MUST be added to `ALL_BLUEPRINTS` in `backend/app/controllers/__init__.py`.** `[VERIFIED: backend/app/controllers/__init__.py:14-27]` — the list carries this comment, written after Phase 2 shipped an unroutable endpoint:
> ```python
>     # auth_controller contributes TWO blueprints — every other controller below
>     # contributes exactly one, and that asymmetry is precisely why this entry was
>     # missed and the admin override endpoint 404'd.
> ```
> Phase 4 makes the asymmetry worse by adding two files at once. **Recommend a test that asserts every `*_bp` defined under `app/controllers/` appears in `ALL_BLUEPRINTS`** — this is the second time the project would have paid for this bug.

**`GET /uploads/<filename>` must be unauthenticated.** Not laziness — a hard browser constraint. The frontend is `http://localhost:5173`, the API is `http://localhost:5000` `[VERIFIED: frontend/.env.example, app/config.py CORS_ORIGINS]`. A plain `<img src="http://localhost:5000/api/v1/uploads/x.png">` is a **cross-origin** subresource load: it sends no `Authorization` header (the access token lives in memory `[VERIFIED: frontend/src/lib/api.ts:15]`, not in a cookie the browser could attach) and no cookies (cross-origin `<img>` omits credentials unless `crossOrigin="use-credentials"` is set *and* the server sends matching CORS headers). An auth-guarded logo URL therefore renders as a broken image in every browser. Mitigate with unguessable filenames (`uuid4().hex`) rather than a guard. This path has **no `<org_id>`**, so `test_rbac_enforcement.py` does not require a guard on it `[VERIFIED: SCOPED_PARAMS at tests/test_rbac_enforcement.py:35]`.

**`PUT` (replace-all) for social links, not per-link CRUD.** The UI is one form with a handful of rows; `uq_org_social_platform` makes the set semantically a map keyed by platform. Replace-all matches that. **Delete-then-insert inside a single transaction** — an insert-before-delete on a changed URL for an existing platform raises `IntegrityError` on the unique constraint.

### D-2 — Serialisation: add `detail=True`, mirroring `Activity.to_dict`

**Recommendation:** do **not** put social links or the brand kit into the base `Organisation.to_dict()`. Add a `detail` parameter, exactly as `Activity.to_dict(self, detail=False)` does `[VERIFIED: models/__init__.py:329-352]`.

**Why:** `GET /api/v1/orgs` returns every organisation `[VERIFIED: community_controller.py:17-20]`. Eagerly serialising social links there is an N+1 across the whole org list on a page (`Orgs.tsx`) that never displays them. Phase 3's research made the same call for `Activity` and its `to_dict(detail=True)` shipped.

### D-3 — The ORG-02 validator (the security core of this phase)

**Recommendation:** one module-level function in `backend/app/url_safety.py`, built on `urllib.parse.urlsplit`, and **`marshmallow.validate.URL` is not sufficient on its own**.

#### Why marshmallow's validator is necessary-but-not-sufficient

`[VERIFIED: marshmallow 3.22.0 source, src/marshmallow/validate.py, fetched from the 3.22.0 git tag 2026-08-13]` — the pinned version is `marshmallow==3.22.0` `[VERIFIED: backend/requirements.txt:6]`. Its `URL.__init__` signature:

```python
    def __init__(
        self,
        *,
        relative: bool = False,
        absolute: bool = True,
        schemes: types.StrSequenceOrSet | None = None,
        require_tld: bool = True,
        error: str | None = None,
    ):
```

and `default_schemes = {"http", "https", "ftp", "ftps"}` — **`ftp`/`ftps` are allowed by default**, so `schemes={"http", "https"}` must be passed explicitly.

Its `__call__` body:

```python
    def __call__(self, value: str) -> str:
        message = self._format_error(value)
        if not value:
            raise ValidationError(message)

        # Check first if the scheme is valid
        if "://" in value:
            scheme = value.split("://")[0].lower()
            if scheme not in self.schemes:
                raise ValidationError(message)

        regex = self._regex(self.relative, self.absolute, self.require_tld)

        if not regex.search(value):
            raise ValidationError(message)

        return value
```

Two things a reviewer should know:
- **The scheme check is conditional on `"://" in value`.** `javascript:alert(1)` skips it entirely. It is still rejected, but by the *regex*, whose absolute branch requires `(?:[a-z0-9\.\-\+]*)://`. So the rejection is real but indirect — do not describe the scheme allowlist as the thing that stops `javascript:`.
- **There is no host allowlist, and no way to add one through this API.** ORG-02 requires one.

#### The bypass vectors, empirically tested

`[VERIFIED: Python 3.11.2 (the interpreter on this machine), `urllib.parse.urlsplit`, executed 2026-08-13]`

| Input | `.scheme` | `.hostname` | Verdict |
|-------|-----------|-------------|---------|
| `https://instagram.com/ekatva` | `'https'` | `'instagram.com'` | accept |
| `https://instagram.com@evil.com/x` | `'https'` | **`'evil.com'`** | `urlsplit` resolves userinfo correctly — allowlist on `.hostname`, **never on `.netloc`** |
| `https://evil.com#@instagram.com` | `'https'` | `'evil.com'` | reject |
| `https://instagram.com.evil.com/x` | `'https'` | `'instagram.com.evil.com'` | **suffix attack** — `endswith("instagram.com")` would pass it; the rule must be `host == a or host.endswith("." + a)` |
| `javascript:alert(1)` | `'javascript'` | `None` | reject on scheme |
| `javascript://instagram.com/%0aalert(1)` | `'javascript'` | `'instagram.com'` | **host is allowlisted** — proof the scheme check must run independently and first |
| `data:text/html;base64,…` | `'data'` | `None` | reject on scheme |
| `//instagram.com/x` | **`''`** | `'instagram.com'` | scheme-relative — reject on empty scheme |
| `https://ínstagram.com/x` | `'https'` | `'ínstagram.com'` (non-ASCII) | **homograph** — reject any hostname failing `.encode('ascii')` |
| `https://instagram。com/x` | `'https'` | `'instagram。com'` (U+3002) | same |
| `http://127.0.0.1:5000/admin` | `'http'` | `'127.0.0.1'` | not allowlisted → reject (also closes the SSRF shape if anything ever fetches these) |
| `https://insta\tgram.com/x` | `'https'` | **`'instagram.com'`** | see the normalisation trap below |
| `https://instagram.com/x\n` | `'https'` | `'instagram.com'` | same |

**The normalisation trap — the subtle one.** `[VERIFIED: Python 3.11.2, `urllib.parse._UNSAFE_URL_BYTES_TO_REMOVE == ['\t', '\r', '\n']`]`. `urlsplit` **silently strips tab, CR and LF before parsing**. So `"https://insta\tgram.com/x"` validates as host `instagram.com`, and if the raw string is what gets stored, the database holds a string that is *not* the string that was validated.

> **Therefore: store `p.geturl()`-style re-serialised output, never the raw input.** Verified round-trips:
> ```
> 'https://insta\tgram.com/x'                  -> 'https://instagram.com/x'
> 'HTTPS://Instagram.COM/Ekatva?ref=1#frag'    -> 'https://instagram.com/Ekatva?ref=1'
> 'https://instagram.com@evil.com/x'           -> 'https://evil.com/x'   (then rejected by the allowlist)
> 'https://instagram.com/x\n'                  -> 'https://instagram.com/x'
> ```
> Normalising also lowercases the scheme and host and drops the fragment — the fragment is never useful on a social profile link and is a cheap thing to delete.

#### The recommended shape

```python
# backend/app/url_safety.py
"""ORG-02: the single predicate that decides whether a social URL may be
stored AND whether it may be rendered. One function, two call sites, so a
link that could never be saved can also never be served (ROADMAP Phase 4
success criterion 2: "rejected at save time and never rendered anywhere")."""
from urllib.parse import urlsplit, urlunsplit

from .constants import SOCIAL_PLATFORMS

ALLOWED_SCHEMES = ("http", "https")
MAX_SOCIAL_URL_LENGTH = 300     # must not exceed OrganisationSocialLink.url's String(300)


def _host_allowed(host: str, allowed: tuple) -> bool:
    # Exact match, or a subdomain of an allowed host. `endswith(a)` alone
    # would accept instagram.com.evil.com — the dot is the whole defence.
    return any(host == a or host.endswith("." + a) for a in allowed)


def normalise_social_url(raw: str, platform: str) -> str | None:
    """Return the canonical URL to STORE, or None if it must be rejected.

    Returns the re-serialised URL rather than `raw`, because urlsplit strips
    \\t \\r \\n before parsing (urllib.parse._UNSAFE_URL_BYTES_TO_REMOVE) — so
    storing `raw` would persist a string that differs from the one validated.
    """
    if not raw or len(raw) > MAX_SOCIAL_URL_LENGTH:
        return None
    allowed = SOCIAL_PLATFORMS.get(platform)
    if allowed is None:
        return None

    p = urlsplit(raw.strip())

    if p.scheme.lower() not in ALLOWED_SCHEMES:   # unconditional, and FIRST
        return None
    if p.username or p.password:                  # https://instagram.com@evil.com
        return None
    if p.port is not None:                        # a social profile has no port
        return None

    host = p.hostname                             # already lowercased; userinfo resolved
    if not host:
        return None
    try:
        host.encode("ascii")                      # reject IDN homographs outright
    except UnicodeEncodeError:
        return None
    if not _host_allowed(host, allowed):
        return None

    # Drop the fragment; keep path and query. Re-serialise so what is stored
    # is exactly what was validated.
    normalised = urlunsplit((p.scheme.lower(), host, p.path, p.query, ""))
    return normalised if len(normalised) <= MAX_SOCIAL_URL_LENGTH else None


def is_renderable_social_url(url: str, platform: str) -> bool:
    """The read-side gate. See D-4."""
    return normalise_social_url(url, platform) is not None
```

And in `constants.py` (the phase's only constants addition):

```python
# --- Social platform host allowlist (ORG-02) ---
# The allowlist is per platform, not global: a LinkedIn URL stored under the
# `instagram` key is a data-integrity bug even though both hosts are safe.
# There is deliberately NO generic "website" entry — see 04-RESEARCH Open Q2.
SOCIAL_PLATFORMS = {
    "instagram": ("instagram.com",),
    "linkedin":  ("linkedin.com",),
    "x":         ("x.com", "twitter.com"),
    "youtube":   ("youtube.com", "youtu.be"),
    "facebook":  ("facebook.com",),
    "github":    ("github.com",),
}
SOCIAL_PLATFORM_KEYS = tuple(SOCIAL_PLATFORMS)
```

**Marshmallow's role:** keep `validate.URL(schemes={"http", "https"})` on the field as a cheap first pass so obviously-malformed input produces a 422 through the existing envelope, and let `normalise_social_url` produce the *domain* rejection as a 400 `ApiError` with a specific code. Both surface through machinery that already exists (§Error Envelope below).

**Follow the AUTH-04 precedent for the platform enum.** `[VERIFIED: backend/app/schemas/__init__.py:93-99]`:
```python
class AcademicStatusSchema(Schema):
    """AUTH-04 self-confirmation. The allowlists are imported, never restated —
    a third copy of these enums is how the UI, the schema and the service drift
    apart."""

    academic_level = fields.Str(required=True, validate=validate.OneOf(ACADEMIC_LEVELS))
```
So: `platform = fields.Str(required=True, validate=validate.OneOf(SOCIAL_PLATFORM_KEYS))` — imported, never restated. (Note `OrgSchema` at `schemas/__init__.py:119` currently *does* restate the four org types inline instead of importing `ORG_TYPES` — a small pre-existing drift the planner may fix opportunistically, but it is not an ORG requirement.)

### D-4 — The render-side guarantee (ROADMAP criterion 2)

Criterion 2 has two clauses. Clause one ("rejected at save time") is D-3. **Clause two — "and never rendered anywhere" — is a separate, three-layer obligation**, and layer 2 is the one that actually makes the sentence true:

| Layer | Where | What it does | Why it is not redundant |
|-------|-------|--------------|-------------------------|
| 1. Write gate | `org_profile_service` on `PUT /social-links` | rejects → nothing bad is stored | Does nothing about rows already in the table |
| 2. **Read filter** | `org_profile_service.public_profile(org)` — `[l for l in org.social_links if is_renderable_social_url(l.url, l.platform)]` | a row that fails the predicate is **omitted from the payload** | The model docstring states the column is "stored unvalidated by this layer on purpose". Rows could pre-date Phase 4, be written by a direct DB edit or by seed data, or arrive from a future bug. **Without this, criterion 2 is a claim about the write path, not about rendering.** |
| 3. Client helper | `safeExternalHref()` in `frontend/src/lib/format.ts` | returns `undefined` for anything not `http(s):`, so React omits the attribute entirely | React is **not** a security boundary here — see below |

**React does not block `javascript:` hrefs at React 18.3.1** `[CITED: legacy.reactjs.org/blog/2019/08/08/react-v16.9.0.html]` — *"In React 16.9, this pattern continues to work, but it will log a warning"*, and *"In a future major release, React will throw an error if it encounters a `javascript:` URL."* The project is on `react ^18.3.1` `[VERIFIED: frontend/package.json]`, i.e. still inside the warn-only window. A dev-mode console warning is not a mitigation.

Every rendered social link also needs `target="_blank" rel="noopener noreferrer"`. The one existing external link in the codebase uses `rel="noreferrer"` only `[VERIFIED: frontend/src/pages/Orgs.tsx:956]` — modern browsers imply `noopener` for `target="_blank"`, but stating both is the reviewable form and costs nothing.

> **Put the read filter in the service, not in `to_dict()`.** A `to_dict()` cannot omit itself from a list, and `OrganisationSocialLink.to_dict()` already exists and is dumb `[VERIFIED: models/__init__.py:173-179]`. Filtering in `public_profile()` keeps the model layer unchanged and gives the test a single function to call.

### D-5 — Logo: build the minimal upload primitive (RECOMMENDED), with the alternative stated

**Recommendation: Option B — a real multipart upload to `backend/instance/uploads`, served by Flask.**

| Option | Verdict | Reasoning |
|--------|---------|-----------|
| **A. URL-only** — user pastes an image URL into `logo_url`, validated like a social link | Rejected | Requires an *image-host* allowlist, which is either useless (allow anything → hotlinking an arbitrary third-party host, an availability and tracking dependency) or unusable (allowlist a handful of image hosts nobody uses). Also fails CAMPAIGN-02's "every collaborating entity's logo" if a host 404s. |
| **B. Local filesystem upload** | **Recommended** | `PROJECT.md:116` already **locks** this and marks it ✓ Good, not Pending. `backend/.gitignore` already ignores `instance/`. `logo_url` stores the *served path* (`/api/v1/uploads/<uuid>.png`, ~40 chars) which fits `String(300)` with no migration. Phase 5 CAMPAIGN-03 needs the identical primitive — building it once here and reusing it is strictly cheaper than building it in Phase 5 and retrofitting Phase 4. |
| **C. base64 data URI in the column** | Rejected | `logo_url` is `String(300)`. A base64 PNG is kilobytes. Would force a migration, which Phase 1 criterion 3 forbids. |

**Scope honesty:** Option B is the single largest new-code item in this phase — roughly one plan. If the team wants Phase 4 minimal, Option A is the fallback, and the planner should surface that as a `checkpoint:human-verify` rather than silently choosing. See **Open Question 4**.

**Upload hardening (all of these, none optional — ASVS V12):**

| Control | Concrete rule | Why |
|---------|---------------|-----|
| Size cap | `app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024` in `Config` | Flask rejects the body **before buffering it**. A per-view `len(file.read())` check has already read it into memory. |
| Type check | **Sniff magic bytes**, do not trust `file.mimetype` | `Content-Type` in a multipart part is fully client-controlled. PNG `\x89PNG\r\n\x1a\n`, JPEG `\xff\xd8\xff`, WEBP `RIFF....WEBP`. |
| Format allowlist | **png, jpeg, webp only. Reject SVG.** | An SVG is an XML document that can carry `<script>`; serving one from the API origin is stored XSS. Also reject GIF unless there is a reason to want it. |
| Filename | `f"{uuid4().hex}{ext}"`, ext derived from the **sniffed** type | Never echo the client filename. `secure_filename()` is worth calling but can return `""` and does not stop content-type confusion. |
| Path | `send_from_directory(app.instance_path / "uploads", name)` with the generated name only | `send_from_directory` refuses traversal, and `instance/` is outside `static/`, so nothing is served by accident. |
| Response headers | `X-Content-Type-Options: nosniff` on the serve route | Stops a browser re-sniffing a mislabelled file into HTML. |
| Old file | On replace, delete the previous file after the DB commit succeeds | Otherwise `instance/uploads` grows forever. Delete-after-commit so a rollback never orphans the row's image. |

### D-6 — Brand-kit storage: keep the JSON columns, validate at the service tier

**Recommendation: keep `BrandKit`'s existing JSON columns. Do not normalise into tables.**

- The table exists and is migrated; normalising means a migration, which Phase 1 criterion 3 forbids.
- Palette and phrases are *ordered, small, whole-object-replaced* lists with no independent identity and nothing ever joins to them. That is the textbook case for JSON, not rows.
- `Activity.tags`, `User.interests`, `EventPoll.options` and `RegistrationFormField.options` all use `db.JSON` already `[VERIFIED: models/__init__.py:303, 66, 1012, 615]` — this is the house pattern.

**But SQLite and Postgres enforce nothing inside a JSON column, so every rule is service-tier and every rule is load-bearing:**

| Field | Rule | Why it matters, concretely |
|-------|------|---------------------------|
| `voice_tone` | `Length(max=500)`, stripped | Phase 5 interpolates it into a prompt and a mail template |
| `palette` | list, len 1–6, each item `Regexp(r"^#[0-9a-f]{6}$")` after `.lower()` | **This is a stored-XSS gate, not cosmetics.** CAMPAIGN-02 puts these into generated mail HTML — almost certainly a `style="color: {c}"`. A free-text colour string is a CSS-context injection. Hex-only, six digits, no `rgb()`, no named colours, no 3-digit shorthand. |
| `sample_phrases` | list, len ≤ 10, each `Length(1, 200)`, stripped, empties dropped | Bounds the Phase 5 prompt and the template |
| `source` | `OneOf(BRAND_KIT_SOURCES)` | Imported from constants, never restated (AUTH-04 precedent) |

`source` is client-supplied provenance metadata, not an authorization input — a client that lies about it changes nothing that matters. Default it to `BRAND_KIT_MANUAL`.

### D-7 — The read contract Phase 5 consumes (this is ORG-03's real deliverable)

**Nothing upstream defines this.** ROADMAP criterion 3 says the kit must be "readable by the campaign creator", and CAMPAIGN-02 needs both the primary org's kit **and every accepted collaborator's logo**. Phase 4 must publish the seam.

**Recommendation:** one function in `org_profile_service.py`, total, never returning `None`:

```python
def brand_kit_for(org) -> dict:
    """The contract CAMPAIGN-02 reads. Always a dict — never None, so Phase 5
    never branches on absence. `has_kit` is how a caller tells "they chose these
    words" from "nobody has written one yet"; the neutral defaults exist so a
    campaign can still be generated for an org with no kit (ROADMAP Phase 5
    criterion 2: it must still produce a draft)."""
    kit = org.brand_kit                      # uselist=False -> object or None
    return {
        "org_id":         org.id,
        "org_name":       org.name,
        "logo_url":       org.logo_url,      # CAMPAIGN-02 multi-entity logos
        "has_kit":        kit is not None,
        "voice_tone":     (kit.voice_tone if kit else None) or BRAND_KIT_DEFAULT_VOICE,
        "palette":        (kit.palette if kit else None) or [],
        "sample_phrases": (kit.sample_phrases if kit else None) or [],
        "source":         kit.source if kit else BRAND_KIT_MANUAL,
    }
```

Two guarantees worth writing into the docstring and a test:
1. **Total.** `brand_kit_for(org_with_no_kit)` returns a dict with `has_kit: False`, never `None` and never raises. Phase 5 gets one code path.
2. **`logo_url` rides along.** Phase 5 will call this once per accepted collaborator; making it fetch logos separately guarantees a second, divergent accessor.

`BRAND_KIT_DEFAULT_VOICE` is a new constant — a short neutral descriptor so an org with no kit still yields a usable draft.

**Naming:** the frontend adapts snake_case→camelCase exactly once, in `api.ts` `[VERIFIED: frontend/src/lib/api.ts:203-204]` — *"This module is the only place the snake_case is allowed."* Keep the wire format snake_case and add an `adaptBrandKit` beside `adaptMe`/`adaptEvent`.

### D-8 — AI provider: `google-genai`, `gemini-2.5-flash`

**Recommendation:** `google-genai` (Google's first-party SDK), model `gemini-2.5-flash`, model id read from a `GEMINI_MODEL` env var with that value as the default.

`[VERIFIED: PyPI JSON API, pypi.org/pypi/google-genai/json, fetched 2026-08-13]`
- current version **2.18.0** (project research said 2.16.0 on 2026-08-02 — bump it)
- `Homepage: https://github.com/googleapis/python-genai` — the official Google org
- **117 releases, earliest 2024-12-10** — not a new package
- `requires_python: >=3.10`; the machine runs **Python 3.11.2** `[VERIFIED: local `python -c "import sys; print(sys.version)"`]` ✓

`[VERIFIED: googleapis.github.io/python-genai — official SDK documentation]` — the three calls needed:
```python
from google import genai
client = genai.Client(api_key='GEMINI_API_KEY')
```
```python
response = client.models.generate_content(
    model='gemini-2.5-flash', contents='Why is the sky blue?'
)
print(response.text)
```
```python
from pydantic import BaseModel
from google.genai import types

response = client.models.generate_content(
    model='gemini-2.5-flash',
    contents='Give me information for the United States.',
    config=types.GenerateContentConfig(
        response_mime_type='application/json',
        response_schema=CountryInfo,
    ),
)
```

**Why `gemini-2.5-flash` and not a newer model:** it is the model in the SDK's own official examples **and** it appears on the free-tier list `[CITED: ai.google.dev/gemini-api/docs/pricing]`, which also lists `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`, `gemini-2.0-flash` as free for text. Same page: **image generation has no free tier** — consistent with the locked `PROJECT.md:104` decision. `gemini-2.5-flash` is the lowest-risk pick because it satisfies both sources; the env var makes changing it a config edit.

> ⚠️ `response_schema` in the official example is a **pydantic** `BaseModel`. **pydantic is not a dependency of this project** `[VERIFIED: backend/requirements.txt]` and adding it collides with the "no new frameworks" constraint and with marshmallow, which already owns validation here. **Recommend passing a plain JSON-Schema dict** to `response_schema` (the SDK accepts one) or using `response_mime_type='application/json'` plus a schema described in the prompt, then parsing with `json.loads` and validating with the *same marshmallow schema the manual save path uses*. That reuse is the point: the AI path and the human path converge on one validator, so a model that emits `"palette": ["<script>"]` fails the same hex regex a typo would.

### D-9 — The non-persisting interface (ROADMAP criterion 4)

Criterion 4: *"can request an AI-drafted starting kit, edit every field, and nothing applies until they explicitly save it."*

**Recommendation:** two endpoints with a hard separation, and a test that proves it.

- `POST /orgs/<org_id>/brand-kit/draft` → **200** with a draft payload. Writes **zero rows**. Does not create a `BrandKit`, does not touch `Organisation`, does not write an `AuditLog`.
- `PUT /orgs/<org_id>/brand-kit` → the **only** writer, shared by the manual and the post-AI-edit path. No separate "accept draft" endpoint — a second writer is a second place for the review rule to be forgotten.

**The test that makes this real:**
```python
def test_draft_persists_nothing(client, rc_headers, app):
    before = BrandKit.query.count()
    res = client.post(f"/api/v1/orgs/{org.id}/brand-kit/draft", headers=rc_headers)
    assert res.status_code in (200, 503)
    assert BrandKit.query.count() == before
    assert AuditLog.query.count() == audit_before
    assert Organisation.query.get(org.id).brand_kit is None
```
Assert on counts, not on the response body. A body assertion passes even if the service quietly upserted.

**Also worth enforcing:** ORG-04 says the button is for *"organisations that don't have one yet"*. Recommend the endpoint still works when a kit exists (regenerating is harmless since it persists nothing) and the **UI** is what scopes the button to `has_kit === false`. Gating server-side would block a legitimate "start over" without adding safety.

### D-10 — Graceful degradation when the provider is unconfigured

`GEMINI_API_KEY` will be **absent on every machine in this project today** — no `backend/.env.example` exists, and CI/pytest must pass without a network. This is the default state, not the edge case.

| Situation | Behaviour | Never |
|-----------|-----------|-------|
| `GEMINI_API_KEY` unset | `503` + `{"error": "AI drafting is not configured on this server.", "code": "ai_unavailable"}` | Never 500. Never a canned kit presented as AI output. |
| SDK not installed | Same `503 ai_unavailable` | Never an `ImportError` at app boot |
| Provider errors / times out | `503` + `{"code": "ai_failed"}`, message names the retry | Never leak the vendor exception text to the client |
| Model returns unparseable or invalid JSON | `503 ai_failed` after one retry | Never store it, never show a half-parsed kit |

**Two structural rules:**

1. **Lazy import.** `from google import genai` goes *inside* the service function, never at module top level. A top-level import in a module reachable from `create_app()` means an uninstalled or broken SDK takes down the entire app and the whole 34-test suite — the exact failure mode Phase 2's unroutable-blueprint bug taught. `[VERIFIED: backend/app/__init__.py:50` already uses this pattern — `from .repositories.repos import BlocklistRepository` is imported inside `check_if_token_revoked`]`
2. **Tell the client before it clicks.** Include `"ai_available": bool` in the `GET /orgs/<org_id>/brand-kit` response, computed from `bool(current_app.config.get("GEMINI_API_KEY"))`. The UI render-locks the AI button per UI-SPEC Interaction State A (visible explanation, not a bare disabled control) instead of surfacing a 503 as a scary error. **Both** are needed — the flag is UX, the 503 is the contract.

Config additions to `app/config.py`:
```python
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")          # None = feature off
    GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    MAX_CONTENT_LENGTH = 2 * 1024 * 1024                   # D-5
    UPLOAD_FOLDER = None                                   # resolved from app.instance_path
```
And **create `backend/.env.example`** — it does not exist, and a key with no documented name is a key nobody sets.

### D-11 — AI-SPEC: not warranted for Phase 4

**Recommendation: do not generate an AI-SPEC.md for this phase.** Reasoning:
- The output is **entirely subjective** (voice descriptors, colours, phrases). There is no ground truth to evaluate against, so an evaluation contract would be theatre.
- The output is **never persisted without a human editing it** (criterion 4), so no bad output reaches a datastore unreviewed.
- The output **never reaches a third party**. It reaches exactly one authenticated POR holder, in a form.
- It is **one optional call, one prompt, one schema** — not an AI system.

**Phase 5 is where an AI-SPEC is warranted**, and the planner should note it forward: CAMPAIGN-01 generates content that goes out **to students** and carries an explicit factual-accuracy contract (*"all factual details (dates, venue, fees) are template-interpolated by the backend, never generated by the model"*). That is a real evaluation contract with a checkable property. This phase is its warm-up.

### D-12 — Error envelope (no new machinery)

`[VERIFIED: backend/app/errors.py, full file]` — everything needed exists:
- `ApiError(message, code, status, details)` → `{"error": ..., "code": ..., "details"?: ...}`
- `marshmallow.ValidationError` → **422** `validation_error` with `e.messages` in `details`
- Unhandled `Exception` → 500 `internal_error`, logged

The frontend already parses this into `ApiError` with `.code`, `.status`, `.details` `[VERIFIED: frontend/src/lib/api.ts:17-27, 109-113]`, and `03-UI-SPEC.md:336` locks the rule that the UI chooses its heading **from `code`, never by string-matching the message**. So every Phase 4 rejection needs a stable, distinct `code`:

| Failure | code | status |
|---------|------|--------|
| Schema shape (missing field, bad enum, `validate.URL` fail) | `validation_error` | 422 |
| Scheme not http/https | `social_url_scheme` | 400 |
| Host not on the platform's allowlist | `social_url_host` | 400 |
| Duplicate platform in one payload | `duplicate_platform` | 400 |
| Logo too large / wrong type | `invalid_image` | 400 (413 for `MAX_CONTENT_LENGTH`, raised by Flask) |
| Palette entry not `#rrggbb` | `validation_error` | 422 (marshmallow `Regexp`) |
| AI not configured | `ai_unavailable` | 503 |
| AI call failed | `ai_failed` | 503 |
| Cross-org edit | `forbidden` | 403 |
| Org not found | `not_found` | 404 |

---

## Standard Stack

### Core (already installed — no change)

| Library | Version | Purpose | Why standard here |
|---------|---------|---------|-------------------|
| Flask | 3.0.3 | HTTP | `[VERIFIED: backend/requirements.txt:1]` |
| Flask-SQLAlchemy | 3.1.1 | ORM | `[VERIFIED: requirements.txt:2]` |
| marshmallow | 3.22.0 | Request validation | `[VERIFIED: requirements.txt:6]`. `validate.URL`, `validate.OneOf`, `validate.Regexp`, `validate.Length` cover everything except the host allowlist. |
| Werkzeug | 3.0.3 | WSGI + `secure_filename` + `FileStorage` | `[VERIFIED: requirements.txt:8]` — ships with Flask; the upload path needs **zero new packages** |
| `urllib.parse` | stdlib | URL parsing for ORG-02 | Python 3.11.2 verified locally. Correctly resolves userinfo (`urlsplit(...).hostname`), which naive splitting does not. |
| `uuid`, `pathlib` | stdlib | Filenames, paths | Already used — `models/__init__.py:6` imports `uuid` |

### New (exactly one backend package)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `google-genai` | **2.18.0** | ORG-04 AI draft | `[VERIFIED: PyPI JSON API 2026-08-13]`. Official Google SDK (`googleapis/python-genai`), 117 releases since 2024-12-10, `requires_python>=3.10` vs local 3.11.2 ✓. **Lazy-imported** per D-10 so its absence cannot break the app or the test suite. |

**Frontend new runtime dependencies: zero.** Consistent with `03-UI-SPEC.md:580` ("New runtime dependencies introduced by this phase's UI: **zero**").

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google-genai` | `openai` / `anthropic` SDK | Both are excellent, but neither has a no-credit-card free tier for a five-person graded course project. `PROJECT.md:104` already made the cost argument. |
| `google-genai` | Raw `requests`/`httpx` against the REST endpoint | Saves the SDK but adds an HTTP client the project also doesn't have, plus hand-rolled retry and schema handling. Net worse. |
| Custom URL validator | `validators` / `furl` / `w3lib` PyPI package | A new dependency to replace ~40 lines of stdlib. None of them do per-platform host allowlisting, which is the actual requirement. |
| Local FS upload | `cloudinary` | `STATE.md:138` resolved this: local filesystem, "no cloud provider, no new dependency". |
| JSON columns | Normalised `brand_palette_colors` / `brand_phrases` tables | Requires a migration, which Phase 1 criterion 3 forbids; no query ever joins on them. |
| pydantic `response_schema` | plain JSON-Schema dict + marshmallow | Avoids adding pydantic alongside marshmallow (two validation frameworks) and reuses the manual path's validator, per D-8. |

**Installation:**
```bash
# backend/requirements.txt — add exactly one line
google-genai==2.18.0
```
```bash
cd backend && pip install -r requirements.txt
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `google-genai` 2.18.0 | PyPI | first release **2024-12-10**, 117 releases | not reported by the seam | `https://github.com/googleapis/python-genai` (official Google org) | seam said **SUS**; **assessed OK** | **Approved** |
| `marshmallow` 3.22.0 | PyPI | first release **2013-11-11**, 201 releases | not reported by the seam | `github.com/marshmallow-code/marshmallow` | seam said **SUS**; **assessed OK** | Already installed, unchanged |

**Both SUS verdicts are seam false positives, and the disagreement is documented rather than waved away.** `gsd-tools query package-legitimacy check --ecosystem pypi google-genai marshmallow` returned:
- `google-genai`: reasons `["too-new", "unknown-downloads"]` with `publishedAt: 2026-08-13T00:12:51Z`. That timestamp is the **latest release upload**, not the package's creation date. Direct query of the PyPI JSON API shows the **earliest** release is `2024-12-10T19:42:33` across **117 releases**, and the repo is `googleapis/python-genai` — the Google Cloud organisation. "too-new" is measuring the wrong field. PyPI reports no download counts through this API, hence "unknown-downloads".
- `marshmallow`: every signal came back `null` (`exists: null`) — a registry lookup failure, not a finding. Direct PyPI query: 201 releases since 2013, source `github.com/marshmallow-code/marshmallow`. It is also **already a pinned dependency of this project** and is not being added.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS] requiring a checkpoint:** none — both were manually cleared against the PyPI JSON API and, for `google-genai`, against the official SDK documentation site (`googleapis.github.io/python-genai`) and the official pricing page (`ai.google.dev`).

No `postinstall`-equivalent risk applies (PyPI, not npm); `google-genai` ships wheels.

---

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────────────────────────────┐
   Secretary /           │  BROWSER (Vite SPA :5173, React 18)  │
   Deputy Secretary ────>│                                      │
                         │  OrgProfile page                     │
                         │   ├─ gated by capabilities           │
                         │   │   .manageableOrgIds (render only)│
                         │   ├─ bio / logo form                 │
                         │   ├─ social-link rows                │
                         │   └─ brand-kit form + [AI draft]     │
                         │        ↑ render-locked when          │
                         │          ai_available === false      │
                         │  safeExternalHref()  ← layer 3       │
                         └───────────┬──────────────────────────┘
                                     │ TanStack Query
                                     │ fetch(credentials:'include')
                                     │ + X-CSRF-TOKEN on mutations
                                     ▼
                    ┌────────────────────────────────────────┐
                    │  FLASK API  :5000  /api/v1             │
                    │                                        │
                    │  org_profile_bp   upload_bp            │
                    └────────────┬───────────────────────────┘
                                 ▼
                 ┌──────────────────────────────────┐
                 │ GUARD: can_manage_org_required   │
                 │  = org_scoped(can_manage_org)    │
                 │                                  │
                 │  org missing? ───────────> 404   │
                 │  predicate False? ───────> 403   │   ← criterion 1
                 │  else g.org = org                │
                 └────────────┬─────────────────────┘
                              ▼
                 ┌──────────────────────────────────┐
                 │ Marshmallow schema  → 422 + code │
                 └────────────┬─────────────────────┘
                              ▼
        ┌──────────────── org_profile_service ─────────────────┐
        │                                                       │
        │  WRITE social links          READ profile             │
        │  ┌──────────────────┐        ┌────────────────────┐   │
        │  │normalise_social_ │        │ filter with        │   │
        │  │url()             │        │ is_renderable_     │   │
        │  │ scheme→userinfo→ │        │ social_url()       │   │
        │  │ port→ascii→host  │        │  ← layer 2, the    │   │
        │  │ allowlist→       │        │    "never rendered"│   │
        │  │ re-serialise     │        │    guarantee       │   │
        │  └────┬─────────┬───┘        └─────────┬──────────┘   │
        │    reject     accept                   │              │
        │       │          │                     │              │
        │  400 social_  store NORMALISED         │              │
        │  url_{scheme, string (never raw)       │              │
        │       host}      │                     │              │
        │                                                       │
        │  brand_kit_for(org) ──────> consumed by PHASE 5       │
        │    total; has_kit flag; carries logo_url              │
        │                                                       │
        │  draft_brand_kit(org)                                 │
        │    key unset? ──────────────────────────> 503         │
        │    else ─┐                              ai_unavailable│
        └──────────┼────────────────────────────────────────────┘
                   │  lazy import, JSON mode
                   ▼
        ┌────────────────────────┐        parsed JSON re-validated
        │ Gemini API (external)  │───────> by the SAME marshmallow
        │ gemini-2.5-flash       │         schema the manual save
        └────────────────────────┘         path uses  ── ZERO DB WRITES
                              │
                              ▼
    ┌───────────────────────────────────────────────────────┐
    │ SQLite / Postgres    organisations(bio, logo_url)     │
    │                      organisation_social_links        │
    │                      brand_kits(JSON palette/phrases) │
    │                                                       │
    │ Local FS  backend/instance/uploads/<uuid>.png         │
    │           ← served PUBLIC + nosniff (cross-origin     │
    │             <img> cannot send credentials)            │
    └───────────────────────────────────────────────────────┘
```

### Component Responsibilities

| File | New? | Responsibility |
|------|------|----------------|
| `backend/app/url_safety.py` | NEW | `normalise_social_url`, `is_renderable_social_url`. **The only place ORG-02's rule is expressed.** |
| `backend/app/constants.py` | edit | `SOCIAL_PLATFORMS`, `SOCIAL_PLATFORM_KEYS`, `BRAND_KIT_DEFAULT_VOICE` |
| `backend/app/schemas/__init__.py` | edit | `OrgProfileSchema`, `SocialLinkSchema`, `SocialLinksReplaceSchema`, `BrandKitSchema` — enums **imported**, never restated |
| `backend/app/services/org_profile_service.py` | NEW | `public_profile`, `update_profile`, `replace_social_links`, `get_brand_kit`, `upsert_brand_kit`, `draft_brand_kit`, `brand_kit_for` |
| `backend/app/controllers/org_profile_controller.py` | NEW | `org_profile_bp` — 7 routes, HTTP only |
| `backend/app/controllers/upload_controller.py` | NEW | `upload_bp` — store + serve. Generic; Phase 5 reuses. |
| `backend/app/controllers/__init__.py` | edit | **register both new blueprints in `ALL_BLUEPRINTS`** |
| `backend/app/config.py` | edit | `GEMINI_API_KEY`, `GEMINI_MODEL`, `MAX_CONTENT_LENGTH` |
| `backend/app/models/__init__.py` | edit | `Organisation.to_dict(detail=False)` only. **No columns.** |
| `backend/.env.example` | NEW | Document `GEMINI_API_KEY`, `GEMINI_MODEL` — the file does not exist |
| `frontend/src/lib/format.ts` | edit | `safeExternalHref()` |
| `frontend/src/lib/types.ts` | edit | extend `Organisation`; add `SocialLink`, `BrandKit` |
| `frontend/src/lib/api.ts` | edit | endpoints + `adaptOrgProfile`/`adaptBrandKit` — **the only snake_case→camelCase site** |
| `frontend/src/lib/queries.ts` | edit | `useOrgProfile`, `useBrandKit`, mutations with `invalidateQueries` |
| `frontend/src/pages/OrgProfile.tsx` | NEW | the editor (route + nav entry needed) |

### Pattern 1 — The scoped-guard route (copy this shape verbatim)

```python
# Source: backend/app/controllers/proposal_controller.py:118-130 (the Phase 3 precedent)
@proposal_bp.post("/activities/<activity_id>/reassign-meetup-head")
@can_manage_activity_required
def reassign_meetup_head(activity_id):
    """PROPOSAL-05: reassign Meetup Head to any user, by proposer or admin."""
    data = ReassignMeetupHeadSchema().load(request.get_json() or {})
    result = proposal_service.reassign_meetup_head(
        g.activity, data["new_meetup_head_user_id"], g.current_user
    )
    return jsonify(result), 200
```

Phase 4's equivalent — note `g.org` is already loaded by the guard, so the service takes the object, not the id:

```python
@org_profile_bp.patch("/orgs/<org_id>/profile")
@can_manage_org_required
def update_profile(org_id):
    """ORG-01. The guard already 404'd a missing org and 403'd a cross-org
    edit, and left the row on g.org — do not re-query it."""
    data = OrgProfileSchema().load(request.get_json() or {})
    org = org_profile_service.update_profile(g.org, data, g.current_user)
    return jsonify(org.to_dict(detail=True)), 200
```

### Pattern 2 — Lazy import of an optional dependency

```python
# Source: backend/app/__init__.py:44-51 (the in-repo precedent)
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
        # Short-circuit on access tokens (never hits DB)
        if jwt_payload.get("type") == "access":
            return False

        from .repositories.repos import BlocklistRepository
        return BlocklistRepository.is_jti_blocked(jwt_payload["jti"])
```

Phase 4's ORG-04 service follows it:
```python
def draft_brand_kit(org) -> dict:
    key = current_app.config.get("GEMINI_API_KEY")
    if not key:
        raise ApiError("AI drafting is not configured on this server.", "ai_unavailable", 503)
    try:
        from google import genai            # lazy: import failure must not boot-fail the app
        from google.genai import types
    except ImportError:
        raise ApiError("AI drafting is not available on this server.", "ai_unavailable", 503)
    ...
```

### Pattern 3 — Audit logging

`[VERIFIED: backend/app/services/org_service.py:10]` — `AuditRepository.record("organisation", org.id, "Seeded organisation", admin, org.name)`.

Recommend an audit row on **profile update, social-link replacement and brand-kit save** — all three are org-identity changes by a POR holder. **Recommend no audit row on the AI draft**, because per D-9 the draft writes nothing at all, and an `AuditLog` row *is* a write.

### Anti-Patterns to Avoid

- **Validating the raw string and storing the raw string.** `urlsplit` strips `\t\r\n` before parsing (verified). Store the re-serialised URL.
- **Allowlisting against `.netloc`.** `netloc` for `https://instagram.com@evil.com/x` is `'instagram.com@evil.com'` — it *starts with* the allowlisted host. Use `.hostname`, which returns `'evil.com'`.
- **`host.endswith("instagram.com")` without the leading dot.** Accepts `instagram.com.evil.com`.
- **Trusting `file.mimetype` on an upload.** Fully client-controlled. Sniff magic bytes.
- **Allowing SVG logos.** An SVG can carry `<script>`; serving one from the API origin is stored XSS.
- **A top-level `from google import genai`.** Takes down `create_app()` and the whole suite when the SDK is absent.
- **A second brand-kit writer ("apply draft").** One writer, or criterion 4's review rule gets forgotten in one of them.
- **Adding a route to `LEGACY_COARSE_ROUTES`.** `tests/test_rbac_enforcement.py:22-24`: *"THIS LIST NEVER GROWS."*
- **Naming the URL param anything but `org_id`.** Silent 404-for-everyone; the RBAC test still passes.
- **Pre-disabling the save button on client-side validation.** `03-UI-SPEC.md:446` locks Interaction State C: submit stays enabled, the server rejects, the reason is shown. *"This is the one rule in this phase most likely to be 'helpfully' broken during implementation. It is deliberate."*

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parsing a URL into scheme/host/port | Regex or `str.split("://")` | `urllib.parse.urlsplit(...).hostname` | Verified this session: correctly resolves the `user@host` bypass, lowercases the host, strips `\t\r\n`. A hand-rolled split gets `instagram.com` from `https://instagram.com@evil.com` and hands the attacker the allowlist. |
| Rejecting malformed URLs | A URL regex | `marshmallow.validate.URL(schemes={"http","https"})` | Already a dependency, already wired to the 422 envelope. (Layer it *under* the host allowlist, not instead of it.) |
| "Is this org's editor me?" | A new predicate or an inline POR loop | `rbac.can_manage_org_required` | Exists, is total, is precedent-tested, and is *policed* by `test_rbac_enforcement.py` — a hand-rolled check on an `<org_id>` route fails the suite. |
| Preventing path traversal on serve | `os.path.join` + a manual `..` check | `flask.send_from_directory` | Refuses traversal by design. A manual check misses encoded and Windows-separator variants — and this project develops on Windows (`.planning/WINDOWS.md` exists), where Phase 1 already hit a `Path.is_absolute()` platform bug `[CITED: STATE.md:102]`. |
| Rejecting oversized uploads | `len(file.read())` in the view | `app.config["MAX_CONTENT_LENGTH"]` | The manual check has already buffered the whole body into memory before it can reject it. |
| Sanitising a filename | Hand-rolled character stripping | Discard the client name entirely; `uuid4().hex + sniffed_ext` | The only filename that cannot be attacked is one the client never supplied. |
| Structured JSON out of an LLM | Regex-scraping a markdown code fence out of prose | `GenerateContentConfig(response_mime_type='application/json', response_schema=...)` | Official SDK feature (verified in the docs). Fence-scraping fails the first time the model adds a sentence before the JSON. |
| Validating the AI's output | A second, AI-specific validator | The **same** marshmallow schema the manual save path uses | Two validators drift, and the AI path is exactly where the weaker one would be. |
| camelCase↔snake_case | Ad-hoc mapping at each call site | The adapters in `frontend/src/lib/api.ts` | `api.ts:203-204`: *"This module is the only place the snake_case is allowed."* |

**Key insight:** every hand-rolled item above is a *parser*, and every one of the verified bypasses in D-3 is a **parser-differential** — the validator and the browser disagreeing about what a string means. Reusing the same parser the runtime uses is the entire defence; a bespoke one reintroduces the gap by construction.

---

## Common Pitfalls

### Pitfall 1 — The blueprint that is never registered
**What goes wrong:** every Phase 4 endpoint returns 404 while the code looks complete and unit tests of the service pass.
**Why:** `ALL_BLUEPRINTS` is a hand-maintained list `[VERIFIED: backend/app/controllers/__init__.py:14-27]`. It happened in Phase 2 and the comment in that file is the scar. Phase 4 adds **two** files at once.
**How to avoid:** register both, and add a test that walks `app/controllers/*.py` for `Blueprint(` assignments and asserts each appears in `ALL_BLUEPRINTS`.
**Warning sign:** a route that 404s from `curl` but whose view function you can import.

### Pitfall 2 — Naming the URL param `<organisation_id>`
**What goes wrong:** 404 for everyone including admins, and the RBAC enforcement suite stays green.
**Why:** `org_scoped(predicate, param="org_id")` does `kwargs.get("org_id")` → `None` → `org = None` → 404. The guard *is* present, so `test_every_scoped_route_carries_at_least_one_guard` passes.
**How to avoid:** `<org_id>`, always. Assert a 200 for the happy path in the tracer plan, not only the 403.
**Warning sign:** admin gets 404 on a route they should always pass.

### Pitfall 3 — Replace-all social links hitting the unique constraint
**What goes wrong:** `IntegrityError` → 500 when a user edits an existing platform's URL.
**Why:** `uq_org_social_platform` on `(org_id, platform)` `[VERIFIED: models/__init__.py:161-163]`. Insert-then-delete, or a `flush()` between inserts and deletes, trips it.
**How to avoid:** delete all rows for the org, `db.session.flush()`, then insert, all inside one transaction. Also de-duplicate platforms **in the payload** before touching the DB and return `400 duplicate_platform` — an IntegrityError is not a user-facing message.
**Warning sign:** the test that changes an existing link's URL 500s while the add-new test passes.

### Pitfall 4 — The logo `<img>` renders broken because the serve route is guarded
**What goes wrong:** the upload succeeds, the DB has the path, and the browser shows a broken image.
**Why:** cross-origin (`:5173` → `:5000`) `<img>` sends neither the in-memory bearer token nor cookies. See D-1.
**How to avoid:** leave `GET /uploads/<filename>` unauthenticated with UUID filenames.
**Warning sign:** a 401 for the image URL in the network tab while every JSON call is fine.

### Pitfall 5 — The AI draft quietly persists
**What goes wrong:** criterion 4 fails in a way no reviewer notices, because the UI looks correct.
**Why:** the natural implementation reaches for the existing `upsert_brand_kit` helper to shape the response, and it commits.
**How to avoid:** the count-based test in D-9. Assert `BrandKit.query.count()` and `AuditLog.query.count()` are unchanged — not the response body.
**Warning sign:** the draft endpoint imports `db` at all.

### Pitfall 6 — Adding a column "while we're in there"
**What goes wrong:** a Phase 4 migration, breaking ROADMAP Phase 1 criterion 3, and `tests/test_migrations.py`'s drift gate fires.
**Why:** the schema is complete but not obviously so, and `PENDING_BATCH_TABLES` has already been emptied `[CITED: STATE.md:94 — "Plan 01-04 must empty it with the batch revision"]`.
**How to avoid:** treat "I need a column" as a design smell. Every ORG field has a home; check the model first.

### Pitfall 7 — Restating an enum in the schema
**What goes wrong:** `SOCIAL_PLATFORMS` and the schema's `OneOf` drift; a platform is addable via the API but unrenderable.
**Why:** `OrgSchema` already does this `[VERIFIED: schemas/__init__.py:119]` — inline `["house","society","region","council"]` instead of importing `ORG_TYPES`.
**How to avoid:** import. `AcademicStatusSchema`'s docstring `[VERIFIED: schemas/__init__.py:94-96]` is the standing instruction: *"The allowlists are imported, never restated — a third copy of these enums is how the UI, the schema and the service drift apart."*

### Pitfall 8 — The frontend derives "can I edit" from a POR string
**What goes wrong:** the D-12 build gate fails the suite.
**Why:** `frontend/src/__tests__/no-por-literals.test.ts` scans sources for POR literals with a frozen one-file allowlist (`pages/Orgs.tsx`) `[CITED: STATE.md:114]`.
**How to avoid:** gate on `capabilities.manageableOrgIds.includes(org.id)`. Rendering only — never sent to the API as an auth input (`view-not-sent.test.ts` precedent).

---

## Runtime State Inventory

Phase 4 is additive, not a rename or migration — but ORG-01 replaces the `HOUSE_META` special case, which is a data-shaped change, so the categories are answered explicitly rather than skipped.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | **`organisation_social_links` and `brand_kits` are both empty in every environment** — nothing in Phases 1–3 writes them (`OrganisationSocialLink` docstring: *"nothing in Phases 1-3 reads or renders it anywhere"*). `organisations.bio` and `.logo_url` are `NULL` for every seeded row (`seed.py:195` constructs `Organisation(name=…, type=…, city=…)` only). | None — no data migration. The **read-side filter (D-4) is still required**, because it must hold for rows that arrive later by any route, not only for rows that exist today. |
| Live service config | **None.** No deploy target, no hosted service (`STATE.md:137`, resolved 2026-08-06). No n8n, no Datadog, no tunnel. | None |
| OS-registered state | **None.** No scheduler task, no pm2, no systemd unit. Local `flask run` + `vite` only (`backend/.flaskenv` is `FLASK_APP=run.py`). | None |
| Secrets / env vars | **`GEMINI_API_KEY` is entirely new** — absent from `app/config.py`, from `.flaskenv`, and there is **no `backend/.env.example`** to add it to. `frontend/.env.example` exists and holds only `VITE_API_URL`. | **Create `backend/.env.example`** documenting `GEMINI_API_KEY` and `GEMINI_MODEL`. `backend/.gitignore:8` already ignores `.env`. |
| Build artifacts / installed packages | Adding `google-genai` means every teammate must re-run `pip install -r requirements.txt`. No venv is checked in and `marshmallow` is **not installed in the machine's global Python** (verified: `pip show marshmallow` → "Package(s) not found"), so contributors are on per-machine virtualenvs. `backend/instance/uploads/` must be **created at runtime** (`Path.mkdir(parents=True, exist_ok=True)` at app start or on first write) — `instance/` is gitignored, so it will not exist on a fresh clone. | Note the reinstall in the plan; make the upload dir self-creating rather than assuming it exists. |

**One live-data consequence worth naming:** `frontend/src/pages/Orgs.tsx:19` hardcodes `HOUSE_META` with `logo`, `imageLogo` and `website` for the 12 Houses. Once ORG-01 ships, those Houses have a real `logo_url` and real social links — and the page will show both unless someone decides which wins. **Recommend: real data wins, `HOUSE_META` becomes a fallback for orgs with no uploaded logo.** Deleting it outright loses the seeded visual identity for every House nobody has edited yet. This is a UI-SPEC decision; flagging it so it is decided rather than discovered.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python | backend | ✓ | 3.11.2 (`google-genai` needs ≥3.10 ✓) | — |
| Node / npm | frontend | ✓ | vite 5.4.8, vitest 3.2.7 in `package.json` | — |
| `marshmallow` 3.22.0 | ORG-01/02/03 validation | ✓ pinned; **not in the global Python** | 3.22.0 | per-machine venv (existing practice) |
| Werkzeug (`secure_filename`, `FileStorage`) | ORG-01 logo upload | ✓ ships with Flask | 3.0.3 | — |
| `urllib.parse` | ORG-02 | ✓ stdlib | 3.11.2 | — |
| Local filesystem `backend/instance/uploads` | ORG-01 logo | ✗ **does not exist** | — | create at runtime, `exist_ok=True`; already gitignored |
| `google-genai` | ORG-04 | ✗ **not installed** | needs 2.18.0 | none — must be added to `requirements.txt` |
| `GEMINI_API_KEY` | ORG-04 | ✗ **not set anywhere** | — | **D-10's `503 ai_unavailable` + `ai_available: false`** — ORG-01/02/03 fully functional without it |
| Network access to `generativelanguage.googleapis.com` | ORG-04 at runtime | unknown (not probed) | — | same 503 path; **no test may require it** |
| `backend/.env.example` | documenting the key | ✗ **does not exist** | — | create it |

**Missing with no fallback:** `google-genai` (a one-line `requirements.txt` addition — not a blocker, just work).

**Missing with fallback:** `GEMINI_API_KEY` and network access. **This is the expected steady state for this project** — every ORG-04 test must pass with the key unset, exercising the 503 path, and the "happy path" AI test must be a mocked-client unit test. A test that requires a live key is a test that fails for every teammate and in every grading run.

---

## Validation Architecture

`workflow.nyquist_validation: true` `[VERIFIED: .planning/config.json]` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | pytest 8.3.2 + pytest-cov 5.0.0 `[VERIFIED: requirements.txt:11-12]` |
| Backend config | `backend/pytest.ini` — `testpaths = tests`, `addopts = -q --cov=app --cov-report=term-missing` `[VERIFIED]` |
| Backend quick run | `cd backend && pytest tests/test_org_profile_brand_kit.py -x -q` |
| Backend full suite | `cd backend && pytest` |
| Frontend framework | vitest 3.2.7 + jsdom 26.1.0 `[VERIFIED: frontend/package.json, vitest.config.ts]` |
| Frontend config | `frontend/vitest.config.ts` — `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`, `include: ['src/**/*.test.ts', 'src/**/*.test.tsx']` `[VERIFIED]` |
| Frontend full suite | `cd frontend && npx vitest run && npx tsc --noEmit` |
| Phase 4 backend test file | `backend/tests/test_org_profile_brand_kit.py` (NEW) |

### Existing fixtures — what Phase 4 can reuse as-is

`[VERIFIED: backend/tests/conftest.py, full file]`

| Fixture / helper | Value for Phase 4 |
|------------------|-------------------|
| `app`, `client` | in-memory SQLite, `db.create_all()`, `_seed_minimal()`, torn down per test |
| `admin_headers` | admin short-circuit path through `can_manage_org` |
| `rc_headers` | **`rc` holds `PORAssignment(por_type="Regional Coordinator", active=True)` on a Membership in the region org** (`conftest.py:84-88`). `Regional Coordinator ∈ ORG_MANAGER_PORS` → `can_manage_org(rc, region_org) is True`. |
| `student_headers` | `arav` holds **no POR** → the plain-403 case |
| `region_org()` / `other_org()` | **the cross-org 403 pair is already seeded.** `other_org()` returns the society, added deliberately with *"a different type, name and city from both, so a cross-org denial can only be about id identity"* (`conftest.py:48-50`). `can_manage_org(rc, society) is False` → **ROADMAP criterion 1's 403 test needs no new fixture.** |
| `crew_headers`, `meetup_head_headers` | POR-less users — useful for proving team membership grants no org authority (TEAM-03) |

### Wave 0 Gaps

- [ ] **`backend/tests/conftest.py` — add a `council` organisation.** `_seed_minimal` seeds region, house and society only. ROADMAP criterion 1 says *all four* org types. ⚠️ **Append it after the existing three** — `conftest.py:46-48` explains that ordering is load-bearing: *"Appended after the two originals so `Organisation.query.first()` still returns the region org, which several existing tests rely on."*
- [ ] **`backend/tests/conftest.py` — add a `house_secretary_headers` fixture** (POR `House Secretary` on the house org). ORG-01 names "Secretary/Deputy Secretary" and no Secretary POR is currently seeded — only an RC.
- [ ] **`backend/tests/conftest.py` — add a `society_deputy_headers` fixture** (POR `Society Deputy Secretary` on the society org). Proves the Deputy half of ORG-01 and the society type. Note `org_service.assign_por`'s `HOUSE_ONLY_POR_TYPES` guardrail — construct these rows directly like `_seed_minimal` already does, not through the service.
- [ ] **`backend/tests/test_org_profile_brand_kit.py`** — the phase's test file
- [ ] **`backend/tests/test_url_safety.py`** — a pure unit table over the D-3 vectors, no app fixture needed. Fastest feedback in the phase; run it on every task commit.
- [ ] **`frontend/src/lib/__tests__/url-safety.test.ts`** — `safeExternalHref()` unit test
- [ ] **`backend/.env.example`** — does not exist
- [ ] **A blueprint-registration test** — see Pitfall 1

No framework installation is needed: pytest and vitest both already run green (34/34 as of Phase 3).

### Per-Requirement Verification Map

| Req | Behaviour | Type | Automated Command | Exists? |
|-----|-----------|------|-------------------|---------|
| ORG-01 | House Secretary edits own house's bio+logo → 200, persisted | integration | `pytest tests/test_org_profile_brand_kit.py -k "edit_own_house" -x -q` | ❌ Wave 0 |
| ORG-01 | Society Deputy Secretary edits own society → 200 | integration | `... -k "society_deputy_edits" -x -q` | ❌ Wave 0 |
| ORG-01 | RC edits the region org (authority via `por.region_id`) → 200 | integration | `... -k "rc_edits_region" -x -q` | ❌ Wave 0 |
| ORG-01 | A council org's manager edits it → 200 (**4th type**) | integration | `... -k "council" -x -q` | ❌ Wave 0 |
| ORG-01 | **Secretary of A → org B → 403 `forbidden`** (criterion 1) | integration | `... -k "cross_org_403" -x -q` | ❌ Wave 0 |
| ORG-01 | Nonexistent org id → **404 `not_found`**, not 403, not 500 | integration | `... -k "unknown_org_404" -x -q` | ❌ Wave 0 |
| ORG-01 | POR-less student → 403 | integration | `... -k "student_forbidden" -x -q` | ❌ Wave 0 |
| ORG-01 | Admin can edit any org | integration | `... -k "admin_any_org" -x -q` | ❌ Wave 0 |
| ORG-01 | Logo upload: valid PNG → 200, `logo_url` set, file on disk | integration | `... -k "logo_upload_png" -x -q` | ❌ Wave 0 |
| ORG-01 | Logo: **SVG rejected** 400 `invalid_image` | integration | `... -k "logo_rejects_svg" -x -q` | ❌ Wave 0 |
| ORG-01 | Logo: **`.png` name with non-image bytes rejected** (magic-byte sniff, not extension) | integration | `... -k "logo_sniffs_content" -x -q` | ❌ Wave 0 |
| ORG-01 | Logo: over-size rejected before buffering (413) | integration | `... -k "logo_too_large" -x -q` | ❌ Wave 0 |
| ORG-01 | `GET /uploads/<name>` needs **no auth** and refuses traversal | integration | `... -k "uploads_public_no_traversal" -x -q` | ❌ Wave 0 |
| ORG-01 | Every scoped route is guarded, none coarse | integration | `pytest tests/test_rbac_enforcement.py -x -q` | ✅ exists |
| ORG-01 | No new migration is due | integration | `pytest tests/test_migrations.py -x -q` | ✅ exists |
| ORG-02 | **Vector table**: all 17 D-3 inputs → expected accept/reject | **unit** | `pytest tests/test_url_safety.py -x -q` | ❌ Wave 0 |
| ORG-02 | `javascript:` and `data:` rejected 400 `social_url_scheme` | integration | `pytest tests/test_org_profile_brand_kit.py -k "scheme_rejected" -x -q` | ❌ Wave 0 |
| ORG-02 | `https://evil.com` rejected 400 `social_url_host` | integration | `... -k "host_rejected" -x -q` | ❌ Wave 0 |
| ORG-02 | `https://instagram.com.evil.com` rejected (suffix attack) | unit | `pytest tests/test_url_safety.py -k "suffix" -x -q` | ❌ Wave 0 |
| ORG-02 | `https://instagram.com@evil.com` rejected (userinfo) | unit | `pytest tests/test_url_safety.py -k "userinfo" -x -q` | ❌ Wave 0 |
| ORG-02 | **Stored value is normalised, not raw** — save `"https://insta\tgram.com/x"`, read back `"https://instagram.com/x"` | integration | `... -k "stores_normalised" -x -q` | ❌ Wave 0 |
| ORG-02 | **Criterion 2 read filter**: insert a hostile row *directly via the ORM*, then `GET /profile` → the link is **absent** | integration | `... -k "hostile_row_never_rendered" -x -q` | ❌ Wave 0 |
| ORG-02 | Editing an existing platform's URL does **not** 500 on `uq_org_social_platform` | integration | `... -k "replace_existing_platform" -x -q` | ❌ Wave 0 |
| ORG-02 | Duplicate platform in one payload → 400 `duplicate_platform` | integration | `... -k "duplicate_platform" -x -q` | ❌ Wave 0 |
| ORG-02 | `safeExternalHref('javascript:alert(1)')` → `undefined` | unit | `cd frontend && npx vitest run src/lib/__tests__/url-safety.test.ts` | ❌ Wave 0 |
| ORG-03 | Save + read back a full kit → 200, values persisted | integration | `... -k "brand_kit_roundtrip" -x -q` | ❌ Wave 0 |
| ORG-03 | Second `PUT` **updates**, does not create a 2nd row (`org_id` unique) | integration | `... -k "brand_kit_upsert" -x -q` | ❌ Wave 0 |
| ORG-03 | Palette `"red"` / `"#ff"` / `"rgb(1,2,3)"` → 422 | integration | `... -k "palette_hex_only" -x -q` | ❌ Wave 0 |
| ORG-03 | Palette > 6 entries / phrase > 200 chars → 422 | integration | `... -k "brand_kit_bounds" -x -q` | ❌ Wave 0 |
| ORG-03 | `source` outside `BRAND_KIT_SOURCES` → 422 | integration | `... -k "brand_kit_source_enum" -x -q` | ❌ Wave 0 |
| ORG-03 | **`brand_kit_for(org_without_kit)` returns a dict with `has_kit: False`, never `None`** (the Phase 5 contract) | **unit** | `... -k "brand_kit_for_contract" -x -q` | ❌ Wave 0 |
| ORG-03 | `brand_kit_for` carries `logo_url` (CAMPAIGN-02 needs it) | unit | `... -k "brand_kit_for_carries_logo" -x -q` | ❌ Wave 0 |
| ORG-03 | Cross-org brand-kit read/write → 403 | integration | `... -k "brand_kit_cross_org" -x -q` | ❌ Wave 0 |
| ORG-04 | **Draft persists NOTHING** — `BrandKit.query.count()` and `AuditLog.query.count()` unchanged (criterion 4) | integration | `... -k "draft_persists_nothing" -x -q` | ❌ Wave 0 |
| ORG-04 | Key unset → **503 `ai_unavailable`**, never 500 | integration | `... -k "ai_unconfigured_503" -x -q` | ❌ Wave 0 |
| ORG-04 | `GET /brand-kit` reports `ai_available: false` when unset | integration | `... -k "ai_available_flag" -x -q` | ❌ Wave 0 |
| ORG-04 | **Mocked** client returning valid JSON → 200 with a complete draft | unit (mocked) | `... -k "draft_happy_path_mocked" -x -q` | ❌ Wave 0 |
| ORG-04 | **Mocked** client returning a bad palette → 503 `ai_failed`, nothing stored | unit (mocked) | `... -k "draft_invalid_output" -x -q` | ❌ Wave 0 |
| ORG-04 | Cross-org draft → 403 | integration | `... -k "draft_cross_org" -x -q` | ❌ Wave 0 |
| ORG-04 | App boots and the full suite passes with `google-genai` **absent** | integration | `cd backend && pytest` | partly ✅ (proven by the suite running today) |
| all | No POR literals leak into new frontend files | unit | `cd frontend && npx vitest run src/__tests__/no-por-literals.test.ts` | ✅ exists |
| all | Type check clean | build | `cd frontend && npx tsc --noEmit` | ✅ exists |

### Sampling Rate

- **Per task commit:** `cd backend && pytest tests/test_url_safety.py tests/test_org_profile_brand_kit.py -x -q` (< 30s; `test_url_safety.py` needs no app fixture and returns in ~1s)
- **Per wave merge:** `cd backend && pytest` **and** `cd frontend && npx vitest run && npx tsc --noEmit`
- **Phase gate:** both suites green, including `test_rbac_enforcement.py` and `test_migrations.py`, before `/gsd-verify-work`

**No watch-mode flags** — `-x -q` only, matching `03-VALIDATION.md`'s sign-off.

### Manual UAT (frontend — cannot be automated)

| Behaviour | Instructions |
|-----------|-------------|
| All four org types editable | As admin, open the profile editor for a house, a society, a region and a council. Confirm each saves. |
| Cross-org denial is invisible, not broken | As a House Secretary, confirm no Edit control renders for any other org. Then `curl` the PATCH for another org and confirm 403 with a readable message. |
| Bad link rejected with the server's reason | Enter `javascript:alert(1)`, then `https://evil.com`. Confirm the reason is shown inline per `03-UI-SPEC.md:259` (server's sentence, under our heading) and **the form keeps every other field**. |
| Logo round-trip | Upload a PNG, hard-reload, confirm it renders. Upload an SVG, confirm rejection. |
| AI button when unconfigured | With `GEMINI_API_KEY` unset, confirm the button is **render-locked with a visible explanation** (Interaction State A), not a bare disabled control and not a 500. |
| AI draft is never auto-applied | With a key set, click Draft, edit a field, navigate away **without saving**, return — confirm the kit is still absent. |

---

## Security Domain

`security_enforcement` is absent from `.planning/config.json` → treated as **enabled**.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (inherited) | Phase 2's JWT + refresh + CSRF, unchanged by Phase 4 |
| V3 Session Management | no (inherited) | Phase 2 |
| **V4 Access Control** | **yes** | `can_manage_org_required` on every write; **object-level** authorization by org id identity, never by name or city. Guard order: 401 → 404 → 403. Policed by `tests/test_rbac_enforcement.py`. |
| **V5 Input Validation / Sanitisation / Encoding** | **yes** | marshmallow on every write; `SOCIAL_PLATFORMS` allowlist; `#rrggbb` regex on palette; length caps on every free-text field |
| V6 Cryptography | no | Nothing new is signed, hashed or encrypted |
| V7 Error Handling & Logging | yes | The existing `errors.py` envelope. Vendor exception text must never reach the client (D-10). Audit rows on profile / social / brand-kit writes. |
| **V12 File & Resources** | **yes** | `MAX_CONTENT_LENGTH`; magic-byte sniff; png/jpeg/webp only, **no SVG**; UUID filename; `send_from_directory` from `instance/`; `X-Content-Type-Options: nosniff` |
| V13 API & Web Service | yes | CORS is already origin-restricted (`config.py:33-36`); the public serve route is deliberately scoped to opaque filenames |
| **V14 Configuration** | **yes** | `GEMINI_API_KEY` is server-side only — **never** in a `VITE_*` variable, which Vite inlines into the client bundle. `backend/.gitignore:8` already ignores `.env`. |
| V50 (LLM-specific, ASVS 5.0) | yes | Structured output + revalidation by the manual path's schema; output is display-only, never executed and never an authorization input |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-org edit (Secretary of A edits B) | Elevation of Privilege | `can_manage_org_required`; org **id** identity; negative test in the tracer plan |
| Stored XSS via `javascript:` / `data:` in a social link | Tampering | Unconditional scheme allowlist **first**, checked with `urlsplit().scheme`; read-side filter; `safeExternalHref()`. React 18.3.1 warns but does not block. |
| Open redirect / phishing via a look-alike host | Spoofing | Per-platform host allowlist with the `host == a or host.endswith("." + a)` rule; non-ASCII hostnames rejected (homograph) |
| Allowlist bypass via userinfo (`https://instagram.com@evil.com`) | Spoofing | Allowlist on `.hostname`, **never** `.netloc` — empirically verified this session |
| Parser differential (`\t` in the host) | Tampering | Store the **re-serialised** URL, never the raw input — `_UNSAFE_URL_BYTES_TO_REMOVE` verified |
| Stored XSS via a CSS colour in a generated mail template (Phase 5) | Tampering | `^#[0-9a-f]{6}$` on every palette entry — the reason the palette is not free text |
| Stored XSS via an SVG logo | Tampering | SVG not on the format allowlist; `nosniff` on the serve route |
| Content-type confusion on upload | Tampering | Magic-byte sniff; the client's `Content-Type` and filename are both discarded |
| Path traversal on serve | Information Disclosure | `send_from_directory` + generated names; `instance/` is outside `static/` |
| DoS via a huge upload | Denial of Service | `MAX_CONTENT_LENGTH` (rejects pre-buffer) |
| Prompt injection via org name / bio into the draft prompt | Tampering | Structured JSON output; every field revalidated by the manual path's schema; output is shown to one authenticated POR holder for editing and is never executed or used for authorization; **the model is never asked for a fact** |
| Free-tier quota exhaustion / cost | Denial of Service | Behind `can_manage_org_required` (small authenticated caller set); text-only model on the free tier; **Open Question 3** |
| API key disclosure | Information Disclosure | Server-side config only; never a `VITE_*` var; `503` never echoes the key or the vendor error |

**Where this phase's residual risk actually sits:** the frontend has never rendered a user-supplied URL, so there is no existing safe-rendering habit to inherit. The read-side filter (D-4 layer 2) is the control that turns criterion 2 from a claim about the write path into a property of the system, and it is the one most likely to be dropped as "redundant" during implementation. It is not.

---

## Recommended Wave Structure

Derived from the file-conflict analysis, following Phase 1's and Phase 3's precedent that plans sharing a file must be sequential.

**Wave 1 — Tracer (must land first)**
- `04-01`: ORG-01 spine. New `org_profile_bp` + `org_profile_service` + `Organisation.to_dict(detail=True)` + `GET`/`PATCH /orgs/<org_id>/profile`, **both blueprints registered in `ALL_BLUEPRINTS`**, plus the Wave 0 conftest fixtures (council org, `house_secretary_headers`, `society_deputy_headers`). Proves the whole authorization spine end-to-end: 200 for all four types, **403 cross-org**, 404 unknown, `test_rbac_enforcement.py` green.

**Wave 2 — two independent plans, no shared file**
- `04-02`: ORG-02. `url_safety.py` (NEW) + `SOCIAL_PLATFORMS` in constants + social-link schemas + `PUT /social-links` + **the read-side filter** + `test_url_safety.py`.
- `04-03`: ORG-01 logo. `upload_controller.py` (NEW) + `MAX_CONTENT_LENGTH` + magic-byte sniff + serve route.
  *Both add routes, but to different controller files, and share only `org_profile_service.py` — if that seems too tight, sequence them. 04-02 first, since ORG-02 is the security-critical one.*

**Wave 3** *(blocked on Wave 2)*
- `04-04`: ORG-03. Brand-kit schema validation + `GET`/`PUT /brand-kit` + **`brand_kit_for()`, the Phase 5 read contract** with its totality test.

**Wave 4** *(blocked on Wave 3 — reuses 04-04's schema as the revalidator)*
- `04-05`: ORG-04. `google-genai` in requirements + config + `backend/.env.example` + lazy-imported `draft_brand_kit` + `POST /brand-kit/draft` + the persists-nothing test + the 503 degradation path + mocked happy/sad paths.

**Wave 5** *(blocked on Wave 4)*
- `04-06`: Frontend. `OrgProfile.tsx` + route + nav entry + types + api + queries + `safeExternalHref()` + the `HOUSE_META` fallback decision. **UI hint: yes** — ROADMAP marks this phase `UI hint: yes`, and `workflow.ui_phase: true`, so a `04-UI-SPEC.md` is due before this plan is written.

**Why this order:** Wave 1 proves authorization before any new surface exists, which is the one thing every later plan depends on and the phase's headline criterion. Wave 2 does the two "build from nothing" primitives while the spine is still simple. Wave 3 is validation-only over an existing table. Wave 4 depends on Wave 3 existing so the AI output can be validated by the *same* schema. Wave 5 is frontend-only and cleanly decoupled — matching Phase 3's `03-04` exactly.

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|--------------|------------------|--------------|-------------|
| Houses-only `HOUSE_META` hardcoded in the frontend | One `Organisation` row per entity with `bio`/`logo_url`/social links, all four types | Phase 1 batch `213804635519` | ORG-01 *is* this migration in behaviour terms; `HOUSE_META` becomes a fallback, not a source |
| Coarse `organiser_required` | Resource-scoped `can_manage_org_required` | Phase 1 plan 01-05 | Mandatory for every `<org_id>` route; enforced by a test that runs every suite |
| Destructive `seed.py` reset per schema change | Flask-Migrate + naming convention | Phase 1 plan 01-01 | Phase 4 needs no migration — and adding one would trip the drift gate |
| Frontend deriving organiser status from a duplicated POR list | Server-computed `capabilities` on `/auth/me` | Phase 2 (AUTH-02) | Gate the Edit button on `manageableOrgIds`, never on a POR string |
| `google.generativeai` (legacy Google SDK) | `google-genai` (`googleapis/python-genai`) | Google's first-party successor, 117 releases since 2024-12 | Use `google-genai`. The old package name is a common training-data artefact. |
| `pydantic` models for `response_schema` | plain JSON-Schema dict also accepted | — | Avoids adding pydantic beside marshmallow (D-8) |

**Deprecated / do not use:**
- `google.generativeai` — superseded by `google-genai`
- `html5-qrcode` — present in `frontend/package.json` but `STATE.md:139` records the replacement decision (`@yudiel/react-qr-scanner`). **Phase 6's problem, not Phase 4's** — do not touch it here.
- `str.split("://")` for URL host extraction — verified unsafe against the userinfo vector

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | The **six** platforms in the proposed `SOCIAL_PLATFORMS` (instagram, linkedin, x, youtube, facebook, github) are the ones IITM BS orgs actually use | D-3 | Low, easily corrected. But a missing platform means a Secretary cannot record a real handle — worth one user question. **Open Question 2.** |
| A2 | No generic "website" allowlist entry in v1 | D-3 | Medium. Orgs may legitimately have their own site, and omitting it may read as a bug rather than a decision. **Open Question 2.** |
| A3 | `gemini-2.5-flash` remains on the free tier for the life of this course project | D-8 | Low. It is on today's official pricing page and configurable via `GEMINI_MODEL`. |
| A4 | `google-genai`'s `response_schema` accepts a plain JSON-Schema dict, not only a pydantic model | D-8 | Medium — the official example shows only pydantic. **Verify at implementation time**; the fallback (`response_mime_type='application/json'` + schema in the prompt + `json.loads` + marshmallow) needs no SDK feature at all and is the safe default. |
| A5 | React 18.3.1 still only warns on `javascript:` hrefs (16.9 behaviour, unchanged) | D-4 | None operationally — the recommendation is a defensive helper either way. The React 19 blog does not mention the change, so 18.x is assumed warn-only. |
| A6 | Cross-origin `<img>` will not carry the JWT cookie, so the serve route must be public | D-1 | Medium. If wrong, the route could be guarded — but a public route with UUID names is a fine outcome regardless. Fails loudly (broken image) if the assumption is inverted. |
| A7 | Naming a council org's manager "Society Secretary" is acceptable | Ground Truth 2 | Low, cosmetic. **Open Question 1.** |
| A8 | A ~500-char `voice_tone`, ≤6 palette entries and ≤10 phrases are the right bounds | D-6 | Low. Bounds exist to keep the Phase 5 prompt and template sane; tune freely. |
| A9 | Phase 5 wants `brand_kit_for()` (a Python function), not a REST endpoint | D-7 | Low — Phase 5 is same-process Flask. An endpoint can be added later without changing the function. |
| A10 | No AI-SPEC is warranted for ORG-04 | D-11 | Low. If the team wants one, it costs a skill invocation and nothing is lost. |
| A11 | 2 MB is the right logo cap | D-5 | Low, one config line. |

---

## Open Questions

1. **What POR represents a council organisation's Secretary?**
   - *Known:* `ORG_MANAGER_PORS` has eight members. `org_service.assign_por`'s `HOUSE_ONLY_POR_TYPES` blocks House Secretary / Deputy House Secretary / Regional Coordinator / Web Admin from any non-`house` org (verified, `org_service.py:26-33`). So a council org can only receive `Society Secretary`, `Society Deputy Secretary`, `Technical Secretary` or `Coordinator`.
   - *Unclear:* whether calling a council's head a "Society Secretary" is acceptable, or whether AUTH-03's taxonomy needs a council-scoped entry.
   - *Recommendation:* **accept it for Phase 4.** Authorization works; only the label is odd, and adding a POR type is an AUTH-03 change with a taxonomy argument behind it, not an ORG requirement. Seed the council fixture with `Coordinator` (whose AUTH-03 definition is explicitly "House/Society/Region/**Council** scope", `REQUIREMENTS.md:26`) — that is the intended fit and needs no new constant. Log as a deferred item.

2. **Which platforms, and is a generic "website" entry allowed?** *(the one question genuinely worth asking the user)*
   - *Known:* the model comment says `instagram|linkedin|x|...` and nothing more. ORG-02 mandates a host allowlist; a generic "any host" entry defeats it by definition.
   - *Recommendation:* ship the six proposed platforms with **no generic entry** in Phase 4. If an org needs its own site, that is a distinct `website` field with its own decision (a site URL is a different trust question from a social handle — you cannot allowlist "the org's own domain" in advance). Surface as a `checkpoint:human-verify` in the ORG-02 plan so the list is confirmed rather than assumed.

3. **Rate-limit the AI endpoint?**
   - *Known:* `research/STACK.md:44` recommends Flask-Limiter 4.1.1 "when item 6 ships", warning that a loosely-guarded generation endpoint burns the free-tier quota.
   - *Unclear:* whether that applies to a Phase 4 endpoint behind `can_manage_org_required`.
   - *Recommendation:* **no limiter in Phase 4.** The caller set is authenticated POR holders acting on their own org — orders of magnitude smaller than Phase 5's campaign generator, which is where STACK.md's warning is aimed. Adding a framework also brushes the "no new frameworks" constraint. If cheap insurance is wanted, a 60-second per-org cooldown using `BrandKit.updated_at`… does not work (the draft writes nothing, by design) — so it would need in-process state, which is over-engineering. **Revisit in Phase 5**, where CAMPAIGN-01 is the real exposure.

4. **Logo: upload or URL?** *(the largest scope decision in the phase)*
   - *Known:* `PROJECT.md:116` already locks local-filesystem uploads and marks it ✓ Good; no upload code exists; Phase 5 CAMPAIGN-03 needs the identical primitive.
   - *Recommendation:* **build the upload (D-5 Option B).** But it is roughly one plan of new, security-sensitive code, so the planner should make it a visible decision rather than an assumption — a `checkpoint:human-verify` at the top of the logo plan, with Option A (URL-only, defer upload to Phase 5) named as the descope.

5. **What happens to `HOUSE_META` once Houses have real logos?**
   - *Known:* `frontend/src/pages/Orgs.tsx:19` hardcodes logo/website/colour for 12 Houses, and is used at three call sites (`:235`, `:927`, `:946`).
   - *Recommendation:* **real data wins; `HOUSE_META` becomes the fallback** for orgs with no uploaded logo. Deleting it strands the seeded visual identity of every unedited House. This belongs in `04-UI-SPEC.md`.

6. **Should `/auth/me` capabilities carry `ai_available`?**
   - *Recommendation:* **no** — put it on `GET /orgs/<org_id>/brand-kit` (D-10). `/auth/me` is the authorization capability contract established by AUTH-02; server feature-flags are a different concern and mixing them invites the next config flag onto the auth payload too.

---

## Sources

### Primary (HIGH confidence) — read from source this session

- `backend/app/models/__init__.py` (full, 1217 lines) — `Organisation`, `OrganisationSocialLink`, `BrandKit`, `to_dict` conventions
- `backend/app/rbac.py` (full, 421 lines) — `can_manage_org`, `org_scoped`, `_por_org_ids`, `_DENIAL_MESSAGES`, `manageable_orgs`
- `backend/app/constants.py` (full, 269 lines) — `ORG_TYPES`, `ORG_MANAGER_PORS`, `ORGANISER_PORS`, `BRAND_KIT_*`; confirmed **no** social-platform constant exists
- `backend/app/errors.py`, `backend/app/config.py`, `backend/app/__init__.py`, `backend/app/controllers/__init__.py` (all full)
- `backend/app/schemas/__init__.py` (full) — the "imported, never restated" enum convention
- `backend/app/services/org_service.py` (full) — `HOUSE_ONLY_POR_TYPES`, `AuditRepository.record` shape
- `backend/app/controllers/community_controller.py`, `proposal_controller.py` (full) — route and guard precedent
- `backend/tests/conftest.py` (full, 246 lines) — every reusable fixture, and the Wave 0 gaps
- `backend/tests/test_rbac_enforcement.py` (full) — `SCOPED_PARAMS`, `LEGACY_COARSE_ROUTES`
- `backend/requirements.txt`, `backend/pytest.ini`, `backend/.flaskenv`, `backend/.gitignore`, `frontend/.env.example`
- `backend/migrations/versions/213804635519_…py` (targeted) — `brand_kits`, `organisation_social_links`, `bio`, `logo_url`
- `frontend/src/lib/api.ts` (full), `lib/queries.ts`, `lib/types.ts`, `components/ui.tsx` exports, `App.tsx` routes, `package.json`, `vitest.config.ts`
- `.planning/REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `PROJECT.md`, `config.json`
- `.planning/phases/03-…/03-RESEARCH.md`, `03-UI-SPEC.md`, `03-VALIDATION.md`
- `.planning/codebase/CONVENTIONS.md`, `CONCERNS.md`
- **Empirical:** Python 3.11.2 `urllib.parse` behaviour on 17 URL vectors + `_UNSAFE_URL_BYTES_TO_REMOVE`, executed 2026-08-13
- **Empirical:** marshmallow 3.22.0 `validate.URL` source, fetched from the 3.22.0 git tag
- **Empirical:** PyPI JSON API for `google-genai` and `marshmallow`

### Secondary (MEDIUM confidence)

- `googleapis.github.io/python-genai` — official SDK docs: client init, `generate_content`, `response_mime_type` / `response_schema`
- `ai.google.dev/gemini-api/docs/pricing` — free-tier text models; image generation has no free tier
- `legacy.reactjs.org/blog/2019/08/08/react-v16.9.0.html` — `javascript:` href warn-not-block
- `.planning/research/STACK.md` (project's own, 2026-08-02) — the `google-genai` choice and its rationale

### Tertiary (LOW confidence)

- `gsd-tools query package-legitimacy check` — returned SUS for both packages; **both overridden** after direct PyPI verification (see §Package Legitimacy Audit). Treated as unreliable for PyPI age signals.
- React 19's handling of `javascript:` URLs — the React 19 blog does not mention it; not relevant, the project is on 18.3.1.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Org modelling, schema, "no migration" | **HIGH** | Read the models, the constants and the migration file directly |
| Authorization design | **HIGH** | Read `rbac.py` in full; the predicate, the decorator, the messages and the enforcement test are all verbatim above |
| Social-link validator | **HIGH** | Every bypass vector executed against the project's own Python 3.11.2; marshmallow's `__call__` read from the pinned tag |
| Render-side guarantee | **HIGH** | Grepped every URL sink in `frontend/src`; React behaviour cited from the release notes |
| Brand-kit storage | **HIGH** | Table read; JSON-column precedent verified at four other call sites |
| Brand-kit read contract | **MEDIUM** | The table is verified; the *contract* is newly designed here because nothing upstream defines it |
| Logo upload | **MEDIUM** | The absence of any upload code is verified; the design is a recommendation, and the upload-vs-URL choice is a genuine open decision |
| AI provider | **MEDIUM** | Package and models verified against PyPI and official Google docs; the *interface* is designed here, and `response_schema`-accepts-a-dict is A4, unverified |
| Validation architecture | **HIGH** | Both runners verified green in Phase 3; every reusable fixture read from `conftest.py` |
| Security domain | **HIGH** | Threats derived from executed tests, not from memory |

**Research date:** 2026-08-13
**Valid until:** 2026-09-12 (30 days). Codebase facts are stable — the phase adds no migration and the auth layer is frozen. The one fast-moving item is the Gemini free-tier model list; re-check `ai.google.dev/gemini-api/docs/pricing` if `04-05` is not executed within ~2 weeks.
