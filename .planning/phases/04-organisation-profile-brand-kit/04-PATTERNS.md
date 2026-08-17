# Phase 4: Organisation Profile & Brand Kit — Pattern Map

**Mapped:** 2026-08-13
**Files analysed:** 24 new/modified (13 backend, 11 frontend)
**Analogs found:** 20 / 24 (4 have no analog — see § No Analog Found)

> Every excerpt below was read from source this session. Line numbers are from the
> files as they stand before Phase 4 edits.

---

## File Classification

### Backend

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/app/controllers/org_profile_controller.py` (NEW) | controller | request-response (CRUD) | `backend/app/controllers/proposal_controller.py:118-130` | role-match (scope is `activity_scoped`, not `org_scoped` — **no `org_scoped` route exists yet**) |
| `backend/app/controllers/upload_controller.py` (NEW) | controller | file-I/O | — | **none** |
| `backend/app/services/org_profile_service.py` (NEW) | service | CRUD + upsert | `backend/app/services/settings_service.py` (upsert), `backend/app/services/proposal_service.py:226-252` (delete-then-insert under a unique constraint) | exact (two analogs, one per operation) |
| `backend/app/url_safety.py` (NEW — RESEARCH D-3 puts it at `app/`, the prompt says `app/utils/`; **`app/utils/` does not exist**, so `app/url_safety.py` matches the flat layout) | utility | transform/predicate | — (no `app/utils` package, no pure-function module in `app/`) | **none** |
| `backend/app/constants.py` (mod) | config | — | `constants.py:248-254` (`BRAND_KIT_*` block) | exact |
| `backend/app/models/__init__.py` (mod — `Organisation.to_dict(detail=True)`) | model | transform | `Activity.to_dict(self, detail=False)` at `models/__init__.py:329-352` | exact |
| `backend/app/schemas/__init__.py` (mod) | model/validation | transform | `AcademicStatusSchema` at `schemas/__init__.py:93-99` | exact |
| `backend/app/controllers/__init__.py` (mod — `ALL_BLUEPRINTS`) | config | — | the file itself, verbatim | exact |
| `backend/app/config.py` (mod) | config | — | `Config` class body, `config.py:17-36` | exact |
| `backend/.env.example` (NEW) | config | — | `frontend/.env.example` (2 lines, comment + var) | partial |
| `backend/requirements.txt` (mod) | config | — | the file itself | exact |
| `backend/tests/conftest.py` (mod — council org + 2 POR fixtures) | test | — | `_seed_minimal()` at `conftest.py:40-89` | exact |
| `backend/tests/test_org_profile_brand_kit.py` (NEW) | test | — | `backend/tests/test_proposal_collaboration.py:1-40` | exact |
| `backend/tests/test_url_safety.py` (NEW) | test | — | `backend/tests/test_org_service_unit.py` (unit, no HTTP) | role-match |

### Frontend

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/pages/OrgProfile.tsx` (NEW) | page | request-response | `frontend/src/pages/ProposalNew.tsx` (mutation + code-keyed inline error) | role-match |
| `frontend/src/components/OrgLogo.tsx` (NEW) | component | — | `pages/Orgs.tsx:240-250` (the logo tile it replaces) | partial |
| `frontend/src/components/SocialLinksEditor.tsx` / `SocialLinksRow.tsx` / `BrandKitEditor.tsx` (NEW) | component | — | `pages/ProposalNew.tsx:228-250` (repeating row editor) | partial |
| `Textarea` primitive in `frontend/src/components/ui.tsx` | component (primitive) | — | `Input` at `ui.tsx:279-289`; class string lifted from `ProposalNew.tsx:212-218` | exact |
| `frontend/src/lib/api.ts` (mod) | service | request-response | `adaptMe` + `api.*` at `api.ts:202-322` | exact |
| `frontend/src/lib/queries.ts` (mod) | hook | — | `useEvent` / `useUpdateEvent` at `queries.ts:14-15, 153-162` | exact |
| `frontend/src/lib/types.ts` (mod) | model | — | `Organisation` at `types.ts:56-61` | exact |
| `frontend/src/lib/format.ts` (mod — `safeExternalHref`) | utility | transform | `cx` at `format.ts:58-60` (shape only) | partial |
| `frontend/src/App.tsx` (mod — route) | config/route | — | `App.tsx:110-114` | exact |
| `frontend/src/components/Layout.tsx` (mod — nav) | config/route | — | `NAV` at `Layout.tsx:22-45` | partial (**NAV is a static per-role map; there is no conditional nav entry anywhere**) |
| `frontend/src/pages/Orgs.tsx` (mod — 3 HOUSE_META call sites) | page | — | itself, `Orgs.tsx:19-32, 234-250, 927-960` | exact |
| `frontend/src/lib/__tests__/url-safety.test.ts` (NEW) | test | — | `lib/__tests__/view-not-sent.test.ts` | exact |

---

## Pattern Assignments

### 1. `org_profile_controller.py` — the scoped-guard route shape

**Analog:** `backend/app/controllers/proposal_controller.py`

> ⚠️ **`can_manage_org_required` has ZERO existing route call sites.** Verified by grep across
> `backend/app`: the only hits are its definition (`rbac.py:369`), a docstring mention
> (`rbac.py:14`), and an explicit note in `proposal_controller.py:95-98` explaining why that
> route does *not* use it. Phase 4 is the first consumer. The closest real analog is its
> sibling `can_manage_activity_required` (also built by a `*_scoped` factory).

**Blueprint + imports** (`proposal_controller.py:1-22`):
```python
from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..models import ActivityCollaborator
from ..rbac import (
    admin_required,
    auth_required,
    can_manage_activity_required,
    can_manage_org,
    organiser_required,
)
from ..repositories.repos import ActivityRepository, OrgRepository
from ..schemas import (
    CollabRespondSchema,
    DecisionSchema,
    ProposalSchema,
    ReassignMeetupHeadSchema,
    ReportSchema,
)
from ..services import proposal_service

proposal_bp = Blueprint("proposals", __name__, url_prefix="/api/v1")
```
Copy exactly: `url_prefix="/api/v1"` on the Blueprint, so routes are declared as
`"/orgs/<org_id>/profile"` **not** `"/api/v1/orgs/..."`.

**Core scoped-guard route** (`proposal_controller.py:118-130`) — copy this shape verbatim:
```python
@proposal_bp.post("/activities/<activity_id>/reassign-meetup-head")
@can_manage_activity_required
def reassign_meetup_head(activity_id):
    """PROPOSAL-05: reassign Meetup Head to any user, by proposer or admin.

    Guard: can_manage_activity covers the proposer (organiser_id), all team members,
    org POR holders, and admin — the full set of people who legitimately manage the
    event. The campaign-live gate in the service is a Phase 5 stub."""
    data = ReassignMeetupHeadSchema().load(request.get_json() or {})
    result = proposal_service.reassign_meetup_head(
        g.activity, data["new_meetup_head_user_id"], g.current_user
    )
    return jsonify(result), 200
```

Four load-bearing properties to carry across:
1. **Decorator order:** route decorator on top, guard immediately beneath the route.
2. **URL param name is the guard's contract.** `activity_scoped` reads `activity_id`;
   `org_scoped(predicate, param="org_id")` (`rbac.py:341`) reads `org_id`. **Any other
   name → `kwargs.get("org_id")` is `None` → org is `None` → 404 for everyone**, while
   `tests/test_rbac_enforcement.py` stays green (RESEARCH Pitfall 2 / CONTEXT constraint).
3. **The guard leaves the row on `g`.** `g.activity` here; `g.org` for `org_scoped`
   (`rbac.py:342`). The service takes the **object**, never re-queries by id.
4. **Schema load, then service, then `jsonify(...), status`.** The controller never
   touches `db.session`.

**Ad-hoc detail-route shape for the read endpoint** (`proposal_controller.py:42-48`) —
note `auth_required` satisfies `test_every_scoped_route_carries_at_least_one_guard`:
```python
@proposal_bp.get("/proposals/<activity_id>")
@admin_required
def detail(activity_id):
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Proposal not found", "not_found", 404)
    return jsonify(activity.to_dict(detail=True)), 200
```

---

### 2. `ALL_BLUEPRINTS` registration

**Analog / edit site:** `backend/app/controllers/__init__.py` — the **entire file**, verbatim:
```python
"""Controller layer — Blueprints. HTTP only: parse, validate, call a service,
shape the response. One blueprint per PRD module (Milestone 2 §3)."""
from .auth_controller import admin_auth_bp, auth_bp
from .community_controller import community_bp
from .proposal_controller import proposal_bp
from .event_controller import event_bp
from .registration_controller import registration_bp
from .expense_controller import expense_bp
from .recognition_controller import recognition_bp
from .analytics_controller import analytics_bp
from .misc_controller import misc_bp
from .settings_controller import settings_bp

ALL_BLUEPRINTS = [
    auth_bp,
    # auth_controller contributes TWO blueprints — every other controller below
    # contributes exactly one, and that asymmetry is precisely why this entry was
    # missed and the admin override endpoint 404'd.
    admin_auth_bp,
    community_bp,
    proposal_bp,
    event_bp,
    registration_bp,
    expense_bp,
    recognition_bp,
    analytics_bp,
    misc_bp,
    settings_bp,
]
```
**Two edits required, both halves:** an `from .org_profile_controller import org_profile_bp`
/ `from .upload_controller import upload_bp` import line **and** the corresponding
`ALL_BLUEPRINTS` entries. The comment above is the record of the last endpoint this cost.
RESEARCH recommends a new test asserting every `*_bp` under `app/controllers/` appears in
the list — there is no such test today.

---

### 3. `Organisation.to_dict(detail=True)` — the verbosity-flag pattern

**Analog:** `Activity.to_dict` at `backend/app/models/__init__.py:329-352`
```python
    def to_dict(self, detail=False):
        d = {
            "id": self.id,
            "title": self.title,
            "org": self.org.name if self.org else None,
            ...
            "is_mega_meetup": self.is_mega_meetup,  # PROPOSAL-03
        }
        if detail:
            d["description"] = self.description
            d["budget"] = [b.to_dict() for b in self.budget_lines]
            d["collaborators"] = [c.to_dict() for c in self.collaborators]   # PROPOSAL-04
            d["team_members"] = [t.to_dict() for t in self.team_members]     # PROPOSAL-04
        return d
```

**The file to edit** (`models/__init__.py:133-141`) — the base dict already carries
`bio` and `logo_url`, so `GET /api/v1/orgs` needs no change:
```python
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "city": self.city,
            "bio": self.bio,
            "logo_url": self.logo_url,
        }
```

**Constraint from D-4:** the read-side social-link filter goes in
`org_profile_service.public_profile()`, **not** in `to_dict(detail=True)` — a `to_dict()`
cannot omit itself from a list. The existing `OrganisationSocialLink.to_dict()`
(`models/__init__.py:173-179`) and `BrandKit.to_dict()` (`:203-211`) stay dumb and unchanged.
`org.brand_kit` is `uselist=False` (`:198-201`) — an object or `None`, never a list.

---

### 4. Marshmallow schema + the error envelope

**Analog for imported-enum validation** (`schemas/__init__.py:93-99`):
```python
class AcademicStatusSchema(Schema):
    """AUTH-04 self-confirmation. The allowlists are imported, never restated —
    a third copy of these enums is how the UI, the schema and the service drift
    apart."""

    academic_level = fields.Str(required=True, validate=validate.OneOf(ACADEMIC_LEVELS))
    academic_status = fields.Str(required=True, validate=validate.OneOf(ACADEMIC_STATUSES))
```
Imports live in one block at the top of the file (`schemas/__init__.py:4-13`):
```python
from marshmallow import Schema, fields, validate

from ..constants import (
    ACADEMIC_LEVELS,
    ACADEMIC_STATUSES,
    ACTIVITY_SCALES,
    COLLAB_ACCEPTED,
    COLLAB_DECLINED,
    TEAM_ROLES,
)
```
Add `SOCIAL_PLATFORM_KEYS`, `BRAND_KIT_SOURCES` to that block, alphabetically.

**Counter-example present in the file** (`schemas/__init__.py:117-120`) — `OrgSchema`
restates the four org types instead of importing `ORG_TYPES`. Opportunistic fix only.

**There is no `validate.URL` or `validate.Regexp` use anywhere in `schemas/__init__.py`
today** — Phase 4 introduces both. Nearest style precedent is `validate.Length(min=..., max=...)`
at `:17` and `validate.Range(min=0)` at `:31`.

**The error envelope** — `backend/app/errors.py`, full file, no new machinery needed:
```python
class ApiError(Exception):
    """Raised by services to signal an HTTP error with a stable code."""

    def __init__(self, message, code="error", status=400, details=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.details = details


def envelope(message, code, status, details=None):
    body = {"error": message, "code": code}
    if details:
        body["details"] = details
    return jsonify(body), status


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def _api_error(e: ApiError):
        return envelope(e.message, e.code, e.status, e.details)

    @app.errorhandler(ValidationError)
    def _validation(e: ValidationError):
        app.logger.error(f"Validation Error: {e.messages}")
        return envelope("Validation failed", "validation_error", 422, e.messages)

    @app.errorhandler(HTTPException)
    def _http(e: HTTPException):
        return envelope(e.description, e.name.lower().replace(" ", "_"), e.code or 500)
```

**How a `code` reaches the client:** `ApiError(msg, code, status, details)` raised in a
service → `_api_error` handler → `envelope` → `{"error", "code", "details"?}` →
`api.ts:109-112` → `new ApiError(msg, body.code, res.status, body.details)` →
`(mut.error as any)?.code` in the page.

**Consequence for the UI-SPEC S4 addition:** `details` is dropped when falsy
(`if details:` at `errors.py:22`). `social_url_scheme` / `social_url_host` must be raised
as `ApiError(msg, "social_url_scheme", 400, {"platform": "instagram"})` — a non-empty dict —
or `.details` arrives `undefined` and the UI cannot place the error on a row.

**Consequence for the `HTTPException` handler:** Flask's `MAX_CONTENT_LENGTH` 413 is raised
*before* the view runs. `_http` (`errors.py:36-38`) **does** convert it to the JSON envelope
with code `request_entity_too_large`. The UI-SPEC's warning still holds for other non-JSON
bodies (proxy/dev-server errors) — see § Frontend, `request` helper.

**Existing service raise site to copy** (`org_service.py:29-33`):
```python
        raise ApiError(
            f"'{por_type}' can only be assigned to a Forest House, not a {org.type}.",
            "invalid_org_type_for_por",
            400,
        )
```

---

### 5. Service-tier upsert against a unique constraint

Two distinct analogs — use each for the operation it matches.

**(a) Singleton upsert** — for `PUT /brand-kit` (`brand_kits.org_id` is `unique=True`).
Source: `backend/app/services/settings_service.py`, full file:
```python
from ..constants import POINTS
from ..extensions import db
from ..models import SystemSetting


def get_recognition_points() -> dict:
    setting = SystemSetting.query.filter_by(key="recognition_points").first()
    if setting and setting.value_json:
        return setting.value_json
    return POINTS


def update_recognition_points(data: dict) -> dict:
    setting = SystemSetting.query.filter_by(key="recognition_points").first()
    if not setting:
        setting = SystemSetting(key="recognition_points", value_json=data)
        db.session.add(setting)
    else:
        setting.value_json = data
    db.session.commit()
    return setting.value_json
```
For the brand kit, prefer `org.brand_kit` (the `uselist=False` backref) over a
`filter_by(org_id=...)` query — the guard already loaded the org onto `g.org`.

**(b) Delete-then-insert inside one transaction under a unique constraint** — for
`PUT /social-links` (`uq_org_social_platform`). Source: `proposal_service.py:226-246`:
```python
    existing_new_head_row = ActivityTeamMember.query.filter_by(
        activity_id=activity.id, user_id=new_user_id
    ).first()

    old = ActivityTeamMember.query.filter_by(
        activity_id=activity.id, role=TEAM_ROLE_MEETUP_HEAD
    ).first()
    if old and old.user_id != new_user_id:
        db.session.delete(old)
        db.session.flush()

    if existing_new_head_row:
        existing_new_head_row.role = TEAM_ROLE_MEETUP_HEAD
        existing_new_head_row.added_by = actor.id
    else:
        db.session.add(ActivityTeamMember(
            activity_id=activity.id,
            user_id=new_user_id,
            role=TEAM_ROLE_MEETUP_HEAD,
            added_by=actor.id,
        ))
```
**The load-bearing line is `db.session.flush()` after the delete** — without it the
subsequent insert hits the unique index before the delete is issued and raises
`IntegrityError` (RESEARCH D-1, "an insert-before-delete on a changed URL for an existing
platform raises `IntegrityError`"). One `db.session.commit()` at the end of the service
function, never in the controller.

**Module import block to copy** (`org_service.py:1-4`):
```python
from ..errors import ApiError
from ..extensions import db
from ..models import Membership, Organisation, PORAssignment
from ..repositories.repos import AuditRepository, OrgRepository, UserRepository
```

---

### 6. Audit logging

**Analogs** — three call sites, all `AuditRepository.record(entity, entity_id, message, actor[, extra])`:
```python
# org_service.py:10  (create)
    AuditRepository.record("organisation", org.id, "Seeded organisation", admin, org.name)

# org_service.py:103 (assign, with an interpolated label)
    council_label = f" [{council_tier}]" if council_tier else ""
    AuditRepository.record("por", por.id, f"Assigned {por_type}{council_label} to {user.name}", admin)
    db.session.commit()

# org_service.py:118 (deactivate)
    AuditRepository.record("por", por.id, f"Deactivated POR {por.por_type}", admin)
    db.session.commit()
```
**Placement rule visible in all three:** `record(...)` is called **before**
`db.session.commit()`, in the same transaction as the change it describes.

**Phase 4 application (RESEARCH Pattern 3):** one audit row each on profile update,
social-link replacement and brand-kit save; entity `"organisation"`, entity_id `org.id`,
actor `g.current_user`. **No audit row on the AI draft** — an `AuditLog` row *is* a write,
and D-9's criterion-4 test asserts `AuditLog.query.count()` is unchanged.

---

### 7. `conftest.py` — the seeding pattern

**Analog:** `backend/tests/conftest.py:40-89`, `_seed_minimal()`.

**The load-bearing ordering comment** (`conftest.py:46-49`) — read this before appending
the council org:
```python
    # "Org B" for the cross-org authorization tests (01-05). Appended after the
    # two originals so Organisation.query.first() still returns the region org,
    # which several existing tests rely on. Deliberately a different type, name
    # and city from both, so a cross-org denial can only be about id identity.
    society = Organisation(name="Shutterbugs Society", type="society", city="Bengaluru")
    db.session.add(society)
    db.session.flush()
```
**The council organisation must be appended at the end of the org block**, after `society`,
for the same reason: `org_id()` (`conftest.py:128-129`) is `Organisation.query.first().id`.

**POR rows are constructed DIRECTLY, never through `org_service.assign_por`**
(`conftest.py:83-89`):
```python
    # Give rc an organiser POR
    m = Membership(user_id=rc.id, org_id=org.id)
    db.session.add(m)
    db.session.flush()
    db.session.add(PORAssignment(membership_id=m.id, por_type="Regional Coordinator",
                                 term="May 2026", active=True))
    db.session.commit()
```
This is why direct construction is mandatory for the council fixture: `assign_por`'s
`HOUSE_ONLY_POR_TYPES` guardrail (`org_service.py:26-33`) rejects
`House Secretary` / `Deputy House Secretary` / `Regional Coordinator` / `Web Admin` on any
non-`house` org, and would 400 the fixture. D-05 seeds the council manager as
`Coordinator` (in `ORG_MANAGER_PORS`, not in `HOUSE_ONLY_POR_TYPES`).

**Membership → flush → PORAssignment is the required three-step** — a `PORAssignment`
needs `membership_id`, so the `Membership` must be flushed to get an id first.

**Lookup helpers, and the rule they encode** (`conftest.py:132-162`):
```python
# --- Lookup helpers for the seeded rows (01-05) -----------------------------
# Fetch by email or type rather than by insertion position, so a later addition
# to _seed_minimal cannot silently repoint one of these at a different row.

def rc_user():
    return User.query.filter_by(email="rc@ekatva.os").first()

def region_org():
    return Organisation.query.filter_by(type="region").first()

def other_org():
    return Organisation.query.filter_by(type="society").first()
```
Add `council_org()` → `Organisation.query.filter_by(type="council").first()` here.

**Header fixture shape** (`conftest.py:97-104`):
```python
def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


@pytest.fixture
def rc_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'rc@ekatva.os', 'rc12345')}"}
```

**Test-file header** (`tests/test_proposal_collaboration.py:1-9`) — the shape
`test_org_profile_brand_kit.py` should copy:
```python
"""Phase 3 tests: Proposal Collaboration, Team Roster & Budget Guardrails.

Covers: PROPOSAL-00, PROPOSAL-01, PROPOSAL-02, PROPOSAL-03, PROPOSAL-04,
        PROPOSAL-05, PROPOSAL-06, BUDGET-01.

Test fixture design follows conftest.py conventions: user lookup by email,
org lookup by type, helper functions to obtain auth headers.
"""
```

---

### 8. `config.py` additions

**Analog:** the `Config` class body (`backend/app/config.py:17-36`) — every setting is
`os.getenv(NAME, default)` at class scope, with a comment where the default is a decision:
```python
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-ekatva-os-super-secure-key-32bytes")
    JWT_COOKIE_SECURE = False  # Set True in prod

    SQLALCHEMY_DATABASE_URI = _normalise_db_url(
        os.getenv("DATABASE_URL", "sqlite:///ekatva.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,...",
    ).split(",")
```
`TestConfig(Config)` (`:39-42`) overrides only what tests need — `MAX_CONTENT_LENGTH`
and `GEMINI_API_KEY = None` inherit from `Config` unless a test needs otherwise.

---

## Frontend Pattern Assignments

### 9. `api.ts` — the `request` helper and the non-JSON error body

**Analog / edit site:** `frontend/src/lib/api.ts:106-131`
```typescript
  const text = await res.text()
  const body = text ? JSON.parse(text) : null

  if (!res.ok) {
    const msg = body?.error || `Request failed (${res.status})`
    throw new ApiError(msg, body?.code || 'error', res.status, body?.details)
  }
  return body as T
```
> 🚨 **`JSON.parse(text)` is unguarded.** Any non-JSON body (an HTML error page from a
> proxy, a dev-server 413, a 502) throws a raw `SyntaxError` that escapes `_rawRequest`
> entirely — it is not an `ApiError`, so `err.status === 401` at `:121` is never reached
> and the page's `errorHeading((mut.error as any)?.code)` renders the generic fallback with
> a `SyntaxError` message beneath it. UI-SPEC S3 forecloses this. Wrap the parse in
> `try { ... } catch { body = null }` — one change, and the `body?.` chains below already
> tolerate `null`.

**Multipart is a second change to the same function.** `headers` at `:73-77` hardcodes
`'Content-Type': 'application/json'`. For the logo upload the header must be **omitted**
so the browser sets the multipart boundary. Follow the existing spread order — the
caller's `options.headers` already overrides, but an explicit `undefined` does not delete
a key in an object literal, so the upload path needs a `delete headers['Content-Type']`
guard when `options.body instanceof FormData`.

**The adapter rule** (`api.ts:202-204`) — quoted verbatim because Phase 4 adds two adapters:
```typescript
/** Wire shape of GET /auth/me — User.to_dict() plus the two computed keys the
 *  controller adds. This module is the only place the snake_case is allowed. */
```
**`adaptMe`** (`api.ts:222-240`) is the shape `adaptOrgProfile` / `adaptBrandKit` copy —
note it defaults every optional to a non-`undefined` value:
```typescript
export function adaptMe(u: ApiMe): Account {
  return {
    id: u.id,
    ...
    capabilities: {
      isOrganiser: u.capabilities?.is_organiser ?? false,
      manageableOrgIds: u.capabilities?.manageable_org_ids ?? [],
      manageableActivityIds: u.capabilities?.manageable_activity_ids ?? [],
    },
  }
}
```
`adaptOrgProfile` is also where UI-SPEC S3's absolute-URL resolution happens — `BASE`
(`api.ts:12`) is in scope; no component concatenates it.

**Endpoint entry shape** (`api.ts:279-283`) — camelCase in, snake_case on the wire,
documented:
```typescript
  /** User self-confirms their academic level + status (AUTH-04).
   *  Callers pass camelCase; this wrapper is the only module that knows the
   *  wire format, in the request direction as well as the response one. */
  confirmAcademicStatus: (academicLevel: string, academicStatus: string) =>
    request<any>('/auth/academic-status', {
      method: 'PATCH',
      body: JSON.stringify({ academic_level: academicLevel, academic_status: academicStatus }),
    }),
```
Existing org endpoints to sit beside (`api.ts:312-322`), including `orgs: () => request<any[]>('/orgs')`
which is the `Promise<any[]>` RESEARCH flags.

---

### 10. `queries.ts` — gated query + mutation + invalidation

**Analogs** (`queries.ts:14-15`, `:153-162`):
```typescript
export const useEvent = (id?: string) =>
  useQuery({ queryKey: ['event', id], queryFn: () => api.event(id!), enabled: !!id })
```
```typescript
export const useUpdateEvent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; payload: any }) => api.updateEvent(v.id, v.payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
```
`enabled: !!id` is the exact mechanism S6's brand-kit gate needs — extend it to
`enabled: !!orgId && canEdit` so the request is never issued for a non-manager.

**`placeholderData: keepPreviousData`** (`queries.ts:12`, imported at `:1`) is the
S2 capability-snapshot rule. Note `useCapabilities` (`:8-9`) currently has
`staleTime: 5 * 60 * 1000` and **no** `placeholderData` — S2 requires adding it.

File header comment to respect (`queries.ts:4-5`):
```typescript
/* TanStack Query hooks — server cache, retries, and invalidation on mutation
 * (Milestone 2 §7: server state lives here, never duplicated in UI state). */
```

---

### 11. Page with a mutation + code-keyed inline server error

**Analog:** `frontend/src/pages/ProposalNew.tsx`

**Inline error strip** (`:434-439`) — this is the only code-keyed error renderer in the
codebase, and it is exactly the shape S4/S6/S7 need:
```tsx
        {submitMut.isError && (
          <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-300">
            <div className="font-semibold">{errorHeading((submitMut.error as any)?.code)}</div>
            <div className="mt-0.5">{(submitMut.error as Error).message}</div>
          </div>
        )}
```
**The code→heading map, at the bottom of the file** (`:457-466`):
```tsx
const ERROR_HEADINGS: Record<string, string> = {
  budget_cap_exceeded: 'Budget is over the ceiling',
  invalid_team: 'Assign exactly one Meetup Head',
  invalid_role: 'Invalid team role',
  user_not_found: "Team member couldn't be found",
  quota_exceeded: 'Quota already used this month',
}
function errorHeading(code?: string) {
  return (code && ERROR_HEADINGS[code]) || "Couldn't submit the proposal"
}
```
Copy the structure exactly (module-level `Record<string, string>`, a fallback-returning
helper, our heading + `error.message` verbatim as the body). **Diverge on one point:**
this page uses `role="alert"`; UI-SPEC S7-A4's gold draft strip must use `role="status"`.

> ⚠️ **No page in `frontend/src/pages` imports `ApiError` or does `instanceof ApiError`**
> (verified by grep). The cast `(mut.error as any)?.code` above is the house idiom.
> Per-field placement via `error.details` has **no analog** — see § No Analog Found.

**In-flight button** (`:445-450`):
```tsx
          <Button type="submit" size="lg" disabled={submitMut.isPending || ...}>
            {submitMut.isPending ? 'Submitting…' : 'Submit for approval'}
          </Button>
```
Copy the `isPending` label swap; **do not** copy the client-side validation terms in the
`disabled` expression — UI-SPEC Interaction State C forbids pre-disabling Save in this phase.

---

### 12. `ui.tsx` — the primitive export shape and the `Textarea` lift

**Analog:** `Input` at `frontend/src/components/ui.tsx:279-289`
```tsx
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40',
        className,
      )}
      {...props}
    />
  )
}
```
`Textarea` copies this exactly — named `export function`, destructured `className`,
`...props` spread, `cx(baseString, className)` — swapping the element for `<textarea>`,
the props type for `React.TextareaHTMLAttributes<HTMLTextAreaElement>`, and the base
string for the one lifted from `ProposalNew.tsx:217`.

**The string to lift, verbatim** (`ProposalNew.tsx:212-218`):
```tsx
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What is it, who's it for, and why should someone give up their evening for it?"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
            />
```
UI-SPEC adds `focus-visible:ring-2 focus-visible:ring-teal/50`. Migrating the four
existing `<textarea>` call sites is **out of scope**.

**`Select`** (`ui.tsx:356-387`) is the org-switcher primitive — signature
`{ value, onChange, options: { label; value }[], className }`, `onChange` typed as the
raw `React.ChangeEvent<HTMLSelectElement>`.

**Ordering:** primitives are exported one per `export function` in one flat file;
add `Textarea` immediately after `Input` (`:289`), before `Mandala`.

---

### 13. `App.tsx` route registration

**Analog** (`App.tsx:109-114`):
```tsx
        {/* Organiser */}
        <Route path="/organiser" element={<OrganiserDashboard />} />
        <Route path="/proposals/new" element={<ProposalNew />} />
        <Route path="/events/:id/manage" element={<ManageEvent />} />
```
Two edits: an import beside `import Orgs from './pages/Orgs'` (`:29`) and the `<Route>`
inside `AppShell`'s `<Routes>`. `/orgs/:orgId` is protected for free — `AppShell` returns
`<Navigate to="/login" .../>` when `!currentUser` (`:96-97`), and `Root` (`:132`) lists
only `/`, `/login`, `/register` as public. The catch-all `<Route path="*" element={<Navigate to="/discover" replace />} />`
at `:124` must stay last.

---

### 14. `Layout.tsx` nav entry

**Analog** (`Layout.tsx:15-45`, `:77`, `:168-187`):
```tsx
interface NavItem {
  to: string
  ...
}

const NAV: Record<Role, NavItem[]> = {
  student: [ { to: '/discover', label: 'Discover', icon: <Icon d="M12 2 4 7v10l8 5 8-5V7z" /> }, ... ],
  organiser: [ { to: '/organiser', label: 'Dashboard', ... }, ... ],
  admin: [ { to: '/admin/orgs', label: 'Orgs, PORs & Cities', icon: <Icon d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /> }, ... ],
}
...
  const nav = NAV[role]
...
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {nav.map((item) => (
```
> ⚠️ **`NAV` is a static module-level constant keyed only by `Role`.** There is no
> conditional or data-derived nav entry anywhere in the file, and `nav` is read once at
> `:77`. UI-SPEC S1's "rendered iff `manageableOrgIds.length >= 1`, linking to
> `manageableOrgIds[0]`" therefore has **no analog** — it needs a derived list
> (`useMemo` over `NAV[role]` plus a conditional entry from `useCapabilities()`), which is
> a new shape in this file. Keep the `NavItem` interface and the `<Icon d={...} />`
> 24×24 stroke-SVG convention.

---

### 15. `Orgs.tsx` — the three HOUSE_META call sites

**Site 1 — the definition** (`Orgs.tsx:19-32`). Stays; D-08 makes it the fallback:
```tsx
const HOUSE_META: Record<string, { park: string; state: string; color: string; logo: string; imageLogo?: string; website?: string }> = {
  'Bandipur House':    { park: 'Bandipur National Park',    state: 'Karnataka',    color: '#4ade80', logo: '🐘', imageLogo: '/houses/bandipur.png', website: 'https://bandipur.iitmbs.org/' },
  ...
}
```

**Site 2 — the 40px card tile** (`Orgs.tsx:234-247`):
```tsx
              const meta = HOUSE_META[h.name] ?? { park: h.name, state: '', color: '#5CE6C9' }
              ...
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[18px] overflow-hidden"
                      style={{ background: `${meta.color}18`, color: meta.color }}
                    >
                      {meta.imageLogo ? (
                        <img src={meta.imageLogo} alt={`${h.name} logo`} className="h-full w-full object-cover" />
```

**Site 3 — the 80px modal tile + the one existing external `href`** (`Orgs.tsx:927-960`):
```tsx
              const meta = HOUSE_META[h.name] ?? { park: h.name, state: '', color: '#5CE6C9', logo: '🌿' }
              ...
                    <div
                      className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-[36px] shadow-lg overflow-hidden"
                      style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}40` }}
                    >
                      {meta.imageLogo ? (
                        <img src={meta.imageLogo} alt={`${h.name} logo`} className="h-full w-full object-cover" />
                      ) : (
                        meta.logo
                      )}
                    </div>
                    ...
                        {meta.website && (
                          <a href={meta.website} target="_blank" rel="noreferrer" className="...">
```
`OrgLogo.tsx` absorbs sites 2 and 3: rung 2/3 tint is `${meta.color}18` (40px) /
`${meta.color}20` + `1px solid ${meta.color}40` (80px), `alt={`${org.name} logo`}`,
`object-cover`, `overflow-hidden` on the tile. The 40px/80px tile boxes and the
`text-[18px]` / `text-[36px]` glyph sizes are pre-existing and unchanged.

`rel="noreferrer"` at `:956` is the one existing external link; every Phase 4 link uses
`rel="noopener noreferrer"`.

**`Orgs.tsx` is the frozen one-file allowlist in `src/__tests__/no-por-literals.test.ts`**
(the `POR_TYPES` array at `:34-39` is why). `OrgProfile.tsx` must never be added to it.

---

### 16. `frontend/src/lib/__tests__/url-safety.test.ts`

**Analog:** `frontend/src/lib/__tests__/view-not-sent.test.ts:1-24` — vitest, a docblock
that states the claim and why it needs a test, then `import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'`.
Existing siblings: `lib/__tests__/session-contract.test.ts`,
`src/__tests__/no-por-literals.test.ts`, `src/__tests__/proposal-budget-cap.test.ts`.
The structural half of `view-not-sent.test.ts` reads source with
`import.meta.glob('?raw')` rather than `node:fs` (no `@types/node` in this repo) — reuse
that if the test needs to read a file off disk.

---

## Shared Patterns

### Authorization (backend)
**Source:** `backend/app/rbac.py:341-369` (`org_scoped`, `can_manage_org_required`)
**Apply to:** every route in `org_profile_controller.py`
- URL param **must** be `org_id`.
- The guard leaves the loaded row on `g.org`; the service takes the object.
- `g.current_user` is populated by the same guard machinery (used at
  `proposal_controller.py:30, 56, 106, 128`).
- The read route uses `auth_required`, which also calls `_mark` and so satisfies
  `test_rbac_enforcement.py`'s every-scoped-route-carries-a-guard walk.
- **Never** add an entry to `LEGACY_COARSE_ROUTES` (`tests/test_rbac_enforcement.py:22-32`).

### Authorization (frontend)
**Source:** `frontend/src/lib/api.ts:234-238` (`capabilities.manageableOrgIds`) +
`frontend/src/lib/__tests__/view-not-sent.test.ts`
**Apply to:** `OrgProfile.tsx`, `Layout.tsx`
- `const canEdit = capabilities.manageableOrgIds.includes(orgId)`, computed once.
- Never sent to the server; never derived from a POR string.

### Error handling
**Source:** `backend/app/errors.py` (envelope) + `ProposalNew.tsx:434-466` (render)
**Apply to:** every controller/service and every mutating surface
- Services raise `ApiError(message, code, status, details)`; controllers never catch.
- Pages map `code → heading` through a module-level `Record<string, string>` with a
  fallback helper; the body is `error.message` verbatim.

### Lazy import of an optional dependency
**Source:** `backend/app/__init__.py:44-51`
```python
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
        if jwt_payload.get("type") == "access":
            return False

        from .repositories.repos import BlocklistRepository
        return BlocklistRepository.is_jti_blocked(jwt_payload["jti"])
```
**Apply to:** `org_profile_service.draft_brand_kit` — `from google import genai` goes
*inside* the function, wrapped in `try/except ImportError` → `503 ai_unavailable`.

### Enum constants
**Source:** `backend/app/constants.py:248-254`
```python
# --- Brand kit provenance (ORG-03/ORG-04) ---
# An AI-drafted kit is never applied without an explicit save (ORG-04), so
# `ai_draft` describes where the saved content came from, not an unapproved
# pending state waiting on review.
BRAND_KIT_MANUAL = "manual"
BRAND_KIT_AI_DRAFT = "ai_draft"
BRAND_KIT_SOURCES = (BRAND_KIT_MANUAL, BRAND_KIT_AI_DRAFT)
```
**Apply to:** `SOCIAL_PLATFORMS` / `SOCIAL_PLATFORM_KEYS` / `BRAND_KIT_DEFAULT_VOICE` —
a `# --- Section (REQ-ID) ---` banner, a comment stating the *why*, the values, then a
derived tuple. Imported by schemas and services, never restated.

---

## No Analog Found

The planner must fall back to `04-RESEARCH.md`'s own code for these — nothing in the
codebase resembles them.

| File / concern | Role | Data Flow | Reason |
|---|---|---|---|
| `backend/app/controllers/upload_controller.py` | controller | file-I/O | **Zero upload code in the repo.** Verified: no `request.files`, no `secure_filename`, no `send_from_directory`, no `UPLOAD_FOLDER`, no `multipart`. `Expense.bill_name` and `CampaignPackage.poster_name` are filename strings with no bytes behind them. Use RESEARCH D-5's control table. |
| `backend/app/url_safety.py` | utility | transform | No pure-function utility module exists under `app/` (there is no `app/utils/` package at all). Also **no `validate.URL` / `validate.Regexp` use** anywhere. Use RESEARCH D-3's module listing verbatim, including the `_host_allowed` dot rule and the `urlunsplit` re-serialisation. |
| `org_profile_service.draft_brand_kit` (AI) | service | request-response (external) | **Zero LLM/HTTP-client code in the repo.** The only transferable pattern is the lazy import (`app/__init__.py:44-51`, quoted above). Everything else comes from RESEARCH D-8/D-9/D-10. |
| Per-field server-error placement via `error.details` | component | — | No page reads `.details`; no page does `instanceof ApiError`. `ProposalNew.tsx` renders one section-level strip only. UI-SPEC S4's per-row placement and S6's indexed-palette walk of marshmallow's nested `e.messages` are both new shapes. UI-SPEC names the fallback: render at section level when the row cannot be resolved. |
| Conditional nav entry in `Layout.tsx` | config/route | — | `NAV` is a static `Record<Role, NavItem[]>`; no entry is data-derived. Partial analog only (the `NavItem` interface and `<Icon d={...} />` convention). |

---

## Metadata

**Analog search scope:** `backend/app/{controllers,services,models,schemas,repositories}`,
`backend/app/{errors,config,constants,rbac}.py`, `backend/app/controllers/__init__.py`,
`backend/tests/`, `frontend/src/{lib,components,pages}`, `frontend/src/**/__tests__/`
**Files opened this session:** 24
**Greps run:** `can_manage_org_required|org_id>` (backend/app), `ApiError|.code ===` (frontend/src/pages),
`export function|export const|export interface` (ui.tsx), `session.delete|filter_by(...).delete()` (services),
`manageableOrgIds|NavItem|nav` (Layout.tsx)
**Pattern extraction date:** 2026-08-13
