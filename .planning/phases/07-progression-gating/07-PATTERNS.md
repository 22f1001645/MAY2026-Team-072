# Phase 7: Progression Gating - Pattern Map

**Mapped:** 2026-08-23
**Files analyzed:** 12 (6 backend, 6 frontend)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/app/constants.py` (+`FEST_COLLAB_THRESHOLD`) | config | — | `MEGA_MEETUP_THRESHOLD` block (same file, L409-412) | exact |
| `backend/app/repositories/repos.py` (+`completed_meetups_by_scale`) | repository | CRUD (read/count) | `ActivityRepository.approved_meetups_in_region_month` (L211-220) | exact |
| `backend/app/services/progression_service.py` (NEW) | service | request-response (pure read + assert) | `proposal_service.py` guard blocks (L58-100) | role-match |
| `backend/app/services/proposal_service.py` (2 guards + 1 write) | service | request-response | quota guardrail pair in same file (L92-100, L274-283) | exact |
| `backend/app/controllers/org_profile_controller.py` (+GET) | controller | request-response | `get_profile` (L21-31, same file) | exact |
| `backend/tests/test_progression_gating.py` (NEW) | test | request-response | `tests/test_proposal_collaboration.py` (L1-83 helper block) | exact |
| `frontend/src/lib/types.ts` (+`FestEligibility`, `OrgUnlock`) | types | — | `OrgProfile` interface (L91-98) | exact |
| `frontend/src/lib/api.ts` (+`orgProgression` + adapter) | utility | request-response | `api.events` query-param builder (L588-594) + `adaptOrgProfile` (L355-361) | exact |
| `frontend/src/lib/queries.ts` (+`useOrgProgression`) | hook | request-response | `useOrgProfile` (L104-110) | exact |
| `frontend/src/pages/ProposalNew.tsx` (locked fest card) | component | request-response | scale-card map (L200-222) + `ERROR_HEADINGS` (L598-607); lock idiom from `OrgProfile.tsx` `LockedControl` (L528-552) | exact |
| `frontend/src/pages/ApprovalQueue.tsx` (ErrorStrip) | component | request-response | `OrgProfile.tsx` `ErrorStrip` (L555-562) | exact |
| `frontend/src/pages/OrgProfile.tsx` (SponsorshipBanner) | component | request-response | same file's `LockedControl`/`ErrorStrip` local-component convention | exact |

---

## Pattern Assignments

### `backend/app/repositories/repos.py` — `completed_meetups_by_scale` (repository, count query)

**Analog:** `ActivityRepository.approved_meetups_in_region_month`, `repos.py:211-220`

```python
    @staticmethod
    def approved_meetups_in_region_month(org_id: str, ref: datetime):
        """Used strictly during Admin decision to ensure an approved meetup doesn't violate quota."""
        start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        q = Activity.query.filter(
            Activity.org_id == org_id,
            Activity.starts_at >= start,
            Activity.scale.in_(["local_meetup", "regional_meetup"]),
        ).join(Proposal).filter(Proposal.status == "approved")
        return q.count()
```

Copy: `Activity.query.filter(...).join(Proposal).filter(Proposal.status == "approved").count()` shape verbatim.
Change: add `Activity.city == city`, use `Activity.scale == scale` (single), replace the month window with `Activity.starts_at < datetime.now()`.

**Naive-datetime convention** (`repos.py:187`, same module) — copy this, NOT `proposal_service.py`'s aware `datetime.now(UTC)`:
```python
        now = datetime.now()
```

**Anti-pattern to avoid, in this exact file** (`repos.py:184-196`) — `sync_past_events()` sets `status = "completed"` with no `Proposal` join:
```python
        past_events = Activity.query.filter(
            Activity.status.in_(["upcoming", "live"]),
            Activity.starts_at < now
        ).all()
```
This is why eligibility must not read `Activity.status`. Put that reason in the new method's docstring.

---

### `backend/app/services/progression_service.py` (NEW service, pure read + assert)

**Analog:** the guard style in `proposal_service.py` (BUDGET-01 block, L58-69).

**Error-raise pattern to copy verbatim** (positional args, f-string naming the shortfall numerically):
```python
        if requested > allowed:
            raise ApiError(
                f"Budget ₹{requested:,} exceeds the cap of ₹{allowed:,} "
                f"for a {data['capacity']}-person {data['scale'].replace('_', ' ')} "
                f"(₹{BUDGET_CAPACITY_RATE}/person, max ₹{BUDGET_ABSOLUTE_CEILING:,})",
                "budget_cap_exceeded",
                400,
            )
```
New codes: `fest_locked` / `fest_collaborators_required`, status `403`.

**Import block pattern** (`proposal_service.py:26-41`) — relative imports, constants first, then `..errors`, `..extensions`, `..models`, `..repositories.repos`:
```python
from .settings_service import get_recognition_points
from ..errors import ApiError
from ..extensions import db
from ..models import (Activity, ActivityCollaborator, ...)
from ..repositories.repos import ActivityRepository, AuditRepository, OrgRepository
```

**Accepted-count expression** — mirror `Activity.is_mega_meetup` (`models/__init__.py:364-366`), in the service, not as a new `@property`. RESEARCH.md §Pattern 4 has the exact block.

---

### `backend/app/services/proposal_service.py` — two guard insertions + one write

**Analog:** the quota guardrail — the same rule already implemented at both checkpoints in this file.

**Submit-side checkpoint** (`proposal_service.py:92-100`) — placement precedent: all guards before the `# --- All validation passed; write to DB ---` marker at L119:
```python
    # Quota guardrail (FR-B2): one meetup per region per month.
    if data["scale"] in ("local_meetup", "regional_meetup"):
        count = ActivityRepository.meetups_in_region_month(data["org_id"], data["starts_at"])
        if count >= MEETUPS_PER_CITY_PER_MONTH:
            raise ApiError(
                f"Quota guardrail: this region already has a meetup this month",
                "quota_exceeded",
                409,
            )
```
- PROG-01 `assert_fest_eligible(data["org_id"], data["city"])` goes right after the BUDGET-01 block (after L69).
- PROG-02 named count goes **after** the dedup loop (L102-117) and counts `len(valid_collab_orgs) + 1` — the loop is the only deduper:
```python
    collab_org_ids_raw = data.get("collaborating_org_ids", [])
    seen_org_ids = {org.id}
    valid_collab_orgs = []
    for collab_org_id in collab_org_ids_raw:
        if collab_org_id in seen_org_ids:
            continue  # deduplicate silently; primary appearing in list is ignored
```
- The `+1` is justified by L150-160, which writes the primary as a separate accepted `ActivityCollaborator` row.

**Approve-side checkpoint** (`proposal_service.py:274-297`) — insert after the quota re-check (ends L283), before `proposal.status = PROPOSAL_APPROVED` (L285):
```python
    if decision == "approve":
        # FR-B2: Enforce the 1-meetup-per-month quota before allowing approval
        if activity.scale in ["local_meetup", "regional_meetup"]:
            count = ActivityRepository.approved_meetups_in_region_month(activity.org_id, activity.starts_at)
            if count >= 1:
                raise ApiError(..., "quota_exceeded", 409)

        proposal.status = PROPOSAL_APPROVED
        activity.status = EVENT_UPCOMING
        AuditRepository.record("proposal", activity.id, "Approved & auto-published", admin, note)
```
Any guard placed after L285 leaves half-written session state (`decide()` has no rollback).

**PROG-03 unlock write** — same transaction, no extra commit. `decide()` commits once at L323:
```python
    db.session.commit()
    return activity
```
Call `record_unlock(...)` before that line, inside the approve branch, following the `db.session.add(ContributionPoint(...))` style at L290-297.

**Do not touch:** the `("local_meetup", "regional_meetup")` tuples at L59, L93, L276 — `regional_fest` is deliberately exempt from BUDGET-01 and the quota.

---

### `backend/app/controllers/org_profile_controller.py` — `GET /orgs/<org_id>/progression`

**Analog:** `get_profile`, same file L21-31:
```python
@org_profile_bp.get("/orgs/<org_id>/profile")
@auth_required
def get_profile(org_id):
    """Any authenticated reader. ..."""
    org = OrgRepository.by_id(org_id)
    if not org:
        raise ApiError("Organisation not found", "not_found", 404)
    return jsonify(org_profile_service.public_profile(org)), 200
```
Copy: decorator order, `OrgRepository.by_id` + 404 with code `not_found`, `jsonify(service(...)), 200`.
Change: read `city = request.args.get("city")` (`request` is already imported, L10) and call the new service. Add `from ..services import progression_service` to the L16 import.

No blueprint registration change — `org_profile_bp` is already in `ALL_BLUEPRINTS`.

---

### `backend/tests/test_progression_gating.py` (NEW)

**Analog:** `backend/tests/test_proposal_collaboration.py:1-83` — copy the whole header + helper block (module docstring naming req IDs, constant imports, `_token`, `_auth`, `_seed_user_with_por`, `_seed_org`, `_valid_payload`). Convention is duplication per module, not cross-module import.

```python
def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]

def _auth(client, email, password):
    return {"Authorization": f"Bearer {_token(client, email, password)}"}
```
Thresholds come from `app.constants` imports (L12-20 of the analog imports `MEGA_MEETUP_THRESHOLD` this way) — no literal `6` in assertions.
All tests drive `client.post(...)`, never the service function directly (PROG-04 is a statement about status codes).

---

### `frontend/src/lib/api.ts` — `orgProgression()` + adapter

**Query-param builder analog** (`api.ts:588-594`):
```ts
  events: (city?: string, scale?: string, dateRange?: string) => {
    const params = new URLSearchParams()
    if (city && city !== 'All') params.append('city', city)
    ...
    const qs = params.toString()
    return request<ApiActivity[]>(`/events${qs ? `?${qs}` : ''}`).then((rows) => rows.map(adaptEvent))
  },
```
**Simple fetch+adapt analog** (`api.ts:692-693`):
```ts
  orgProfile: (orgId: string): Promise<OrgProfile> =>
    request<ApiOrgProfile>(`/orgs/${orgId}/profile`).then(adaptOrgProfile),
```
**Adapter analog** (`api.ts:355-361`) — snake→camel mapping lives here, never in a page:
```ts
export function adaptOrgProfile(p: ApiOrgProfile): OrgProfile {
  return {
    ...adaptOrganisation(p),
    socialLinks: (p.social_links ?? []).map((l) => ({ platform: l.platform, url: l.url })),
    withheldPlatforms: p.withheld_platforms ?? [],
  }
}
```

### `frontend/src/lib/queries.ts` — `useOrgProgression`

**Analog** (`queries.ts:104-110`):
```ts
export const useOrgProfile = (orgId?: string) =>
  useQuery({
    queryKey: ['orgProfile', orgId],
    queryFn: () => api.orgProfile(orgId!),
    enabled: !!orgId,
  })
```
Add `city ?? null` to the key and `refetchOnWindowFocus: false`.

**Invalidation analog** (`queries.ts:191-200`) — extend `useDecision`'s `onSuccess`:
```ts
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
```

### `frontend/src/lib/types.ts`

**Analog** (`types.ts:91-98`) — exported interface, camelCase fields, doc comments on non-obvious ones:
```ts
export interface OrgProfile extends Organisation {
  socialLinks: SocialLink[]
  /** Platform keys only — never the URL and never a reason. ... */
  withheldPlatforms: string[]
  brandKit?: BrandKit
}
```

---

### `frontend/src/pages/ProposalNew.tsx` — locked fest card

**Card map to modify** (`ProposalNew.tsx:200-222`) — currently unconditional:
```tsx
            {(['local_meetup', 'regional_meetup', 'regional_fest'] as ActivityScale[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={
                  'rounded-xl border p-4 text-left transition-all duration-300 ease-material ' +
                  (scale === s
                    ? 'border-teal bg-teal/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-teal/40')
                }
              >
```
Gate `onClick`, add `aria-disabled="true"` (not `disabled` — keeps tab order), append the caption line under the existing `text-caption text-graytext-mid` div.

**Error-heading map to extend** (`ProposalNew.tsx:598-607`) — two entries, no structural change; the render block at L569-574 already does `errorHeading(code)` + verbatim `error.message` with `role="alert"`:
```ts
const ERROR_HEADINGS: Record<string, string> = {
  budget_cap_exceeded: 'Budget is over the ceiling',
  invalid_team: 'Assign exactly one Meetup Head',
  ...
}
function errorHeading(code?: string) {
  return (code && ERROR_HEADINGS[code]) || "Couldn't submit the proposal"
}
```

### `frontend/src/pages/OrgProfile.tsx` / `ApprovalQueue.tsx`

**Lock idiom — copy the SVG, do not invent a second one** (`OrgProfile.tsx:528-552`):
```tsx
      <Button variant={variant} size={size} disabled aria-disabled="true" title={reason} className="cursor-not-allowed opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        {label}
      </Button>
      <p className="mt-2 text-caption text-graytext-light">{reason}</p>
```

**Refusal display — inline, never a toast** (`OrgProfile.tsx:555-562`), lift verbatim into `ApprovalQueue.tsx`:
```tsx
function ErrorStrip({ heading, body }: { heading: string; body?: string }) {
  return (
    <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-[14px] text-red-300">
      <div className="font-semibold">{heading}</div>
      {body && <div className="mt-1">{body}</div>}
    </div>
  )
}
```

**`SponsorshipBanner` placement:** file-local function component at the bottom of `OrgProfile.tsx`, beside `LockedControl`/`ErrorStrip` — that is this file's existing convention for one-off presentational pieces; do not add it to `components/ui.tsx`.

---

## Shared Patterns

### Error envelope
**Source:** `backend/app/errors.py:8-16` + every raise in `proposal_service.py`
**Apply to:** `progression_service.py`, both guard blocks, the new controller
```python
raise ApiError(message, "code_snake_case", 403)
```
Positional args. The message carries the numeric shortfall; the frontend renders it verbatim (no re-derivation in TSX).

### Guard-before-write ordering
**Source:** `proposal_service.py:119` (`# --- All validation passed; write to DB ---`) and `decide()`'s quota check preceding L285
**Apply to:** both new checkpoints. `decide()` has no rollback path.

### Threshold constants
**Source:** `constants.py:409-412` (`MEGA_MEETUP_THRESHOLD = 3`, "including primary")
**Apply to:** `FEST_COLLAB_THRESHOLD = 6` immediately beside it; imported by services, tests and echoed to the client via the endpoint — never a literal `6` in a service, test, or TSX file.

### Read-route guard
**Source:** `org_profile_controller.py:21-23` (`@auth_required`, "any authenticated reader")
**Apply to:** the new progression GET. POR-predicate guards (`can_manage_org_required`) exist in the same file if the reviewer prefers the stricter option.

### Live computation over stored flags
**Source:** `models/__init__.py:1189-1195` (`OrgProgressionUnlock` docstring, threat T-01-18) and `Activity.is_mega_meetup` (L358-367)
**Apply to:** every eligibility read. `org_progression_unlocks` is written by the gate, never read by it.

## No Analog Found

None. Every file in this phase has a same-role, same-data-flow precedent in the tree.

## Metadata

**Analog search scope:** `backend/app/{constants,errors}.py`, `backend/app/{services,repositories,controllers,models}/`, `backend/tests/`, `frontend/src/{lib,pages,components}/`
**Files scanned:** 11 read (targeted ranges)
**Pattern extraction date:** 2026-08-23
