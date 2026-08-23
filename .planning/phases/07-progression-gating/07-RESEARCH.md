# Phase 7: Progression Gating - Research

**Researched:** 2026-08-23
**Domain:** In-repo business-rule authorization (server-computed eligibility gate) — Flask 3 / SQLAlchemy service layer + React/TanStack Query read surface
**Confidence:** HIGH (every claim below was read out of the working tree this session; zero external dependencies, zero new packages)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** REQUIREMENTS.md's PROG-02 text ("named on the proposal") and ROADMAP.md's Phase 7 success criterion #3 ("accepted collaborating organisations") conflict — collaborators always start `pending` on a brand-new proposal (only the primary org auto-accepts at creation), so an "accepted >= 6" check can never pass at the instant of submission. Resolved as a **two-point check with two different definitions**: `submit_proposal()` checks the **named** count (`collaborating_org_ids` + primary >= 6) — structural, "did you name enough orgs." `decide()`'s approve branch re-checks the **live accepted** count (`COLLAB_ACCEPTED` rows including primary >= 6) — substantive, mirrors `Activity.is_mega_meetup`'s existing dynamic-property pattern (`MEGA_MEETUP_THRESHOLD`-style, no stored flag). A fest proposal can sit in the admin queue while named collaborators accept/decline; approval blocks (with a reason naming the shortfall) until 6 have actually accepted. — **Reversibility:** reversible — this is business-rule logic in two service functions, no schema commitment either way.

- **D-02 (rejected alternatives):** "Accepted count required at submit too" was rejected — no mechanism exists in the schema to carry over already-accepted collaborators from a prior activity, so this would make a first-time fest proposal structurally impossible. "Named count checked both times" was also rejected — it would let a fest proposal with 6 named-but-declined collaborators still get approved, defeating PROPOSAL-06's consent guarantee that PROG-02 is meant to lean on.

- **D-03:** Track-record eligibility stays **scoped per city**, exactly as REQUIREMENTS.md states ("in that same city") and as the existing `org_progression_unlocks` table already models (unique key on `org_id, city`, migrated in Phase 1). An org unlocks `regional_fest` in a specific city only once it has completed >= 1 `local_meetup` AND >= 1 `regional_meetup` **in that same city** — not an org-wide aggregate across all cities. No schema change needed; this was a clarifying confirmation, not a new decision. — **Reversibility:** reversible.

- **D-04:** The `regional_fest` scale-selector button on `ProposalNew.tsx` (currently one of 3 unconditionally-clickable option cards, rendered above the org/city pickers on the same step) gets a **live-fetch lock state**: a new endpoint is queried whenever `org_id` or `city` changes on the form; the button shows a lock affordance + "1 of 2 completed" style caption and is unclickable until the org is eligible for that specific org+city pair. — **Reversibility:** reversible (additive UI + new read endpoint).

- **D-05:** The PROG-03 "Sponsorship & outreach tools unlocked" marker (an `org_progression_unlocks` row) surfaces as a **banner on `OrgProfile.tsx`** (the org's own ORG-01 identity page), visible to that org's Secretary/Deputy Secretary/RC, listing which city/cities have unlocked it. No notification-on-creation was requested — banner only. — **Reversibility:** reversible.

### Claude's Discretion

- The exact response shape of the new read endpoint ("shape TBD by planner" — CONTEXT.md §Integration Points). Recommendation in §New Read Endpoint below.
- Whether the `OrgProfile.tsx` banner reads unlocks from the existing org-profile payload or a small new endpoint (CONTEXT.md leaves both open). Recommendation below.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope. (Phase-level out-of-scope: sponsorship/outreach CRM build-out = SPONSOR-01, explicit v2; multi-department fest orchestration beyond named collaborators.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROG-01 | Org's eligibility to propose `regional_fest` in a city unlocks once it has completed, in that same city, >=1 `local_meetup` and >=1 `regional_meetup` (computed as `approved AND starts_at < now()`, not `status == completed`) | §Standard Stack (no new deps), §Architecture Pattern 1 (`fest_eligibility()` single function), §Pattern 2 (repository count query, `ActivityRepository.meetups_in_region_month` precedent verified at repos.py:198-220), §Pitfall 1 (naive-vs-aware datetime), §Pitfall 3 (`status == completed` trap is real — `sync_past_events()` mutates it) |
| PROG-02 | A `regional_fest` proposal additionally requires >= 6 collaborating Organisations | §Pattern 3 (`FEST_COLLAB_THRESHOLD = 6` beside `MEGA_MEETUP_THRESHOLD = 3`, constants.py:412), §Pattern 4 (named-count at submit / accepted-count at approve, mirroring `Activity.is_mega_meetup` at models/__init__.py:358-367), §Pitfall 2 (dedup + primary inclusion) |
| PROG-03 | Reaching fest-tier eligibility sets a server-recorded "Sponsorship & outreach tools unlocked" flag for that org/city, surfaced as UI messaging | §Pattern 5 (get-or-create on `OrgProgressionUnlock`, verified at models/__init__.py:1186-1212), §New Read Endpoint (banner payload), 07-UI-SPEC.md §5.5 |
| PROG-04 | Progression is enforced server-side — a direct API call to propose a locked scale returns 403 | §Pattern 1 (one function, two call sites), §Error Contract (403 + `fest_locked` / `fest_collaborators_required`), §Validation Architecture (both checkpoints tested via HTTP, not via the service function) |
</phase_requirements>

## Summary

This phase adds **zero new packages, zero new tables, and zero migrations**. Every model, constant location, and insertion point CONTEXT.md named still exists in the working tree at (or within two lines of) the line it cited — verified file-by-file this session. The entire backend half is: one new constant, one new repository count method, one new service module (or one new function block in `proposal_service.py`), two guard blocks wired into functions that already carry a structurally identical guard pair, one get-or-create write, and one new read route.

The single genuinely open design question CONTEXT.md left for the planner is the **shape of the new eligibility read endpoint**. It is settled below by a hard UI constraint: 07-UI-SPEC.md §5.1 requires the two track-record halves to be rendered **independently** ("✓ Local meetup in {City}" / "Regional meetup in {City} — not yet" / "Locked · 1 of 2 completed"), so a boolean response is not implementable. The endpoint must return both counts plus the derived boolean plus the collaborator threshold, and it must fail closed.

The two real technical hazards are both about *which* datum is authoritative, not about how to write the code. First, `Activity.status` is **not** a safe eligibility input: `ActivityRepository.sync_past_events()` (repos.py:184-196) is a lazy cron that flips `upcoming`/`live` to `completed` on any past-dated activity **regardless of proposal status**, so an unapproved past proposal already reads `completed` in that column. PROJECT.md's locked formula (`approved AND starts_at < now()`) exists precisely to route around that column, and the planner must not "simplify" back to it. Second, this codebase mixes naive `datetime.now()` (repositories) with aware `datetime.now(UTC)` (services); the new count query lives in a repository and must use the naive form to match the naive `DateTime` columns it compares against.

**Primary recommendation:** Write one function `fest_eligibility(org_id, city) -> dict` returning both counts and the boolean; call it from exactly three places (the new GET route, `submit_proposal()`, `decide()`'s approve branch) and never inline the rule anywhere else. Raise `ApiError(msg, "fest_locked", 403)` / `ApiError(msg, "fest_collaborators_required", 403)` with the shortfall spelled out numerically in `msg`, because 07-UI-SPEC.md §6 renders the server string verbatim and does not re-derive it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Eligibility computation (PROG-01) | API / Backend — service layer | Database (count query in repository) | PROG-04 makes this an authorization decision; the browser is an untrusted caller. `OrgProgressionUnlock`'s own docstring (models/__init__.py:1189-1195) forbids reading a stored flag for this. |
| Submit-time gate (PROG-01 + named PROG-02) | API / Backend — `proposal_service.submit_proposal()` | — | Must run before any DB write, alongside the existing BUDGET-01 / quota / team guards. |
| Approve-time gate (PROG-01 re-check + accepted PROG-02) | API / Backend — `proposal_service.decide()` approve branch | — | Defensive re-check; mirrors the existing quota re-check that already sits in that branch (proposal_service.py:275-283). |
| Unlock-marker write (PROG-03) | API / Backend — `decide()` approve branch | Database (`org_progression_unlocks`, unique on `org_id, city`) | One-way marker, written where the authoritative decision happens. Uniqueness is a DB constraint, so the write is get-or-create. |
| Eligibility read for the form (D-04) | API / Backend — new GET route | Browser / Client (TanStack Query cache) | The client renders it; it never decides with it. |
| Lock affordance + explanation (ROADMAP #1) | Browser / Client — `ProposalNew.tsx` | — | Pure presentation of a server-computed fact. |
| Unlock banner (D-05) | Browser / Client — `OrgProfile.tsx` | API / Backend (read of an existing table) | Status display only; no CRM behind it (SPONSOR-01 is v2). |
| Refusal messaging | API / Backend (composes the numeric shortfall string) | Browser / Client (renders verbatim) | 07-UI-SPEC.md §6 "Server-message contract" — the UI must not restate or re-derive the numbers. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| — | — | — | **No new libraries.** This phase is entirely in-repo business logic on the already-installed Flask 3 / SQLAlchemy / Marshmallow / TanStack Query stack. |

Everything the phase needs already exists in the tree:

| Existing asset | Location (verified this session) | Phase 7 use |
|---|---|---|
| `ApiError(message, code="error", status=400, details=None)` | `backend/app/errors.py:8-16` | The two 403 refusals. Positional call style used throughout `proposal_service.py`. |
| `ACTIVITY_SCALES = ("local_meetup", "regional_meetup", "regional_fest")` | `backend/app/constants.py:126` | The `regional_fest` literal the gate keys on. |
| `MEGA_MEETUP_THRESHOLD = 3` | `backend/app/constants.py:412` (with the "including primary" convention in its comment at :409-411) | The line `FEST_COLLAB_THRESHOLD = 6` sits beside. |
| `COLLAB_PENDING` / `COLLAB_ACCEPTED` / `COLLAB_DECLINED` | `backend/app/constants.py:149-152` | Accepted-count filter. |
| `Activity.is_mega_meetup` | `backend/app/models/__init__.py:358-367` | The dynamic-property pattern the accepted-count check mirrors. |
| `ActivityCollaborator` (`status`, `is_primary`, `org_id`, `activity_id`) | `backend/app/models/__init__.py:469-517` | Accepted-collaborator source of truth. |
| `OrgProgressionUnlock` (`org_id`, `city`, `unlocked_at`, unique `uq_org_progression`) | `backend/app/models/__init__.py:1186-1212` | PROG-03 marker. Already migrated (Phase 1). |
| `ActivityRepository.meetups_in_region_month` / `.approved_meetups_in_region_month` | `backend/app/repositories/repos.py:198-220` | Query-shape precedent for the new completed-count method. |
| `auth_required`, `org_scoped`, `can_manage_org` | `backend/app/rbac.py:263`, `:373`, `:162` | Guard for the new read route. |
| `Card`, `Badge`, `Button`, `LockedControl`, `ErrorStrip` | `frontend/src/components/ui.tsx`; `frontend/src/pages/OrgProfile.tsx:528` (`LockedControl`), `:555` (`ErrorStrip`) | All Phase 7 UI, per 07-UI-SPEC.md §1. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| A new `progression_service.py` module | Adding the functions to `proposal_service.py` | Either is fine. `proposal_service.py` is already 492 lines and both call sites live in it, so a separate small module reads better and gives the new tests an obvious import target. Not load-bearing — pick one and be consistent. |
| New `GET /orgs/<id>/progression` route file | Adding the route to `org_profile_controller.py` | `org_profile_controller.py` already owns `/orgs/<org_id>/…` and is where `can_manage_org_required` lives. Recommend adding there; a new blueprint would need registration in `ALL_BLUEPRINTS` and a `test_blueprint_registration.py` update for no gain. |
| Attaching unlocks to `org_profile_service.public_profile()` | A separate `GET /orgs/<id>/progression/unlocks` | Recommend **attaching to the eligibility endpoint response** (see below) and having `OrgProfile.tsx` call that one endpoint with no `city` param. One endpoint, two callers, one query hook — fewer moving parts than a third route. Do **not** put unlocks into `public_profile()`: that payload is documented as identical for every authenticated caller (`org_profile_service.py:81-83`) and D-05 scopes the banner to org managers. |

**Installation:** none. `npm install` / `pip install` are not part of this phase.

## Package Legitimacy Audit

**Not applicable — this phase installs zero external packages.** No `npm install`, no `pip install`, no new entry in `requirements.txt` or `package.json`. 07-UI-SPEC.md §9 independently confirms this ("new npm dependencies: **none**"). No legitimacy gate was run because there is nothing to verify.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Project Constraints (from CLAUDE.md)

Every directive below is binding on the plan; the plan-checker should verify each.

| Directive | Phase 7 consequence |
|---|---|
| "State machines live in `constants.py`, not inline." | `FEST_COLLAB_THRESHOLD = 6` goes in `constants.py` beside `MEGA_MEETUP_THRESHOLD` (:412). No `6` literal anywhere in a service, controller, or test assertion — tests import the constant, as `test_proposal_collaboration.py:19` already does for `MEGA_MEETUP_THRESHOLD`. |
| "RBAC checks POR, not `user.role`." | The new read route uses `auth_required` or `org_scoped(can_manage_org)` — never `user.role == 'student'`. Note `submit_proposal()` already admits an admin bypass on the POR check (`proposal_service.py:51`); the PROG gate deliberately has **no** admin bypass (PROG-04 says "a direct API call … returns 403", and an admin-proposing-on-behalf path that skips the gate is exactly the bypass the requirement forbids). |
| "Adapt snake_case→camelCase once, in `lib/api.ts`." | The eligibility response is adapted in `lib/api.ts`, not inside `ProposalNew.tsx`. `lib/types.ts` gets the camelCase shape. |
| "No Alembic yet." — *stale*: `test_migrations.py` exists and SCHEMA-01 (Flask-Migrate) is marked complete in REQUIREMENTS.md:12. | Moot either way: **this phase needs no migration.** `org_progression_unlocks` was migrated in the Phase 1 batch. Do not generate one. |
| "Match existing brand tokens." | 07-UI-SPEC.md §2-4 already resolves every token; it introduces no new ones. Follow it literally. |
| "Minimum diff for the ask." | Do not refactor `meetups_in_region_month`'s backward-compat aliases, the `MEETUPS_PER_CITY_PER_MONTH` alias (`constants.py:290`), or the naive/aware datetime inconsistency noted in Pitfall 1. Note them; don't fix them. |
| "Verify with the real gate: `pytest` / `npm run build`." | `.planning/config.json` `workflow.test_command` already encodes both: `cd backend && . .venv/Scripts/activate && python -m pytest -q --tb=short && cd ../frontend && npm run build`. |
| Git: never add a `Co-Authored-By: Claude` trailer; commit as `22f1001645`; plain-English commit messages. | Applies to every commit this phase produces. |

## Architecture Patterns

### System Architecture Diagram

```
                            ┌──────────────────────────────────────────┐
  ProposalNew.tsx           │  org_id / city change on the form        │
  (Step 1 scale selector)   └───────────────┬──────────────────────────┘
                                            │  useFestEligibility(orgId, city)
                                            ▼
  OrgProfile.tsx  ─────────►  GET /api/v1/orgs/<org_id>/progression[?city=]
  (banner, no city param)                   │
                                            │  read-only, decides nothing
                                            ▼
                        ┌───────────────────────────────────────────┐
                        │  fest_eligibility(org_id, city) -> dict   │  ◄── ONE function.
                        │   local_done / regional_done / eligible   │      Three callers.
                        └──────────┬────────────────────────────────┘      Zero duplicates.
                                   │
                                   ▼
                 ActivityRepository.completed_meetups_by_scale(org_id, city, scale)
                   Activity.org_id == org_id
                   Activity.city   == city
                   Activity.scale  == scale
                   JOIN Proposal → Proposal.status == "approved"
                   Activity.starts_at < now()        ◄── NOT Activity.status
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │  activities table    │
                        └──────────────────────┘

  ── enforcement path (PROG-04) ──────────────────────────────────────────────

  POST /proposals ──► submit_proposal()
                        ├─ scale == regional_fest?
                        │    ├─ fest_eligibility() not eligible ──► 403 fest_locked
                        │    └─ NAMED count (collab ids + primary) < 6
                        │                              ──► 403 fest_collaborators_required
                        └─ (existing BUDGET-01 / team / quota / collab-id guards)
                                   │  all guards pass
                                   ▼  writes Activity + BudgetLine + team + collaborators + Proposal

  POST /proposals/<id>/decision ──► decide()  [decision == "approve"]
                        ├─ (existing quota re-check)
                        ├─ scale == regional_fest?
                        │    ├─ fest_eligibility() not eligible ──► 403 fest_locked
                        │    └─ ACCEPTED count (COLLAB_ACCEPTED incl. primary) < 6
                        │                              ──► 403 fest_collaborators_required
                        ├─ proposal.status = approved; activity auto-publishes
                        └─ get-or-create OrgProgressionUnlock(org_id, city)   ◄── PROG-03
```

### Recommended Project Structure

```
backend/app/
├── constants.py                       # + FEST_COLLAB_THRESHOLD = 6  (beside MEGA_MEETUP_THRESHOLD, L412)
├── repositories/repos.py              # + ActivityRepository.completed_meetups_by_scale()  (beside L198-220)
├── services/
│   ├── progression_service.py         # NEW: fest_eligibility(), assert_fest_allowed_*(), record_unlock()
│   └── proposal_service.py            # 2 guard blocks + 1 unlock write, wired in
├── controllers/
│   └── org_profile_controller.py      # + GET /orgs/<org_id>/progression
└── tests/
    └── test_progression_gating.py     # NEW: PROG-01/02/03/04 (see Validation Architecture)

frontend/src/
├── lib/api.ts                         # + orgProgression() fetch + snake→camel adapter
├── lib/queries.ts                     # + useFestEligibility(orgId, city) / useOrgProgression(orgId)
├── lib/types.ts                       # + FestEligibility, OrgUnlock camelCase shapes
└── pages/
    ├── ProposalNew.tsx                # locked fest card (L201-222) + fest collaborator counter + 2 ERROR_HEADINGS
    ├── ApprovalQueue.tsx              # accepted-count header + ErrorStrip on refused approve
    └── OrgProfile.tsx                 # local <SponsorshipBanner/> beside LockedControl (L528) / ErrorStrip (L555)
```

### Pattern 1: One eligibility function, three callers (PROG-01 + PROG-04)

**What:** A single pure-read function computes eligibility. The read route serializes it; both write paths assert on it. ROADMAP success criterion #2 says "computed by **one** function, and checked on **both** submit and approve" — that is a structural requirement, not a style preference.

**When to use:** always. If the plan produces two places that know the rule "one local + one regional", it has failed criterion #2.

**Example:**

```python
# backend/app/services/progression_service.py
"""PROG-01/02/03/04 — the fest-tier progression gate.

Eligibility is COMPUTED on every call, never read from org_progression_unlocks.
That table's own docstring names the threat (T-01-18): a stale or forged row
there would grant fest-proposal rights the activity history does not support.
"""
from ..constants import FEST_COLLAB_THRESHOLD, COLLAB_ACCEPTED
from ..errors import ApiError
from ..extensions import db
from ..models import OrgProgressionUnlock
from ..repositories.repos import ActivityRepository


def fest_eligibility(org_id: str, city: str) -> dict:
    """The one computation. Both counts travel separately because ROADMAP
    criterion 1 requires the UI to say WHICH half is missing, and the refusal
    message has to name the shortfall — neither is derivable from a boolean."""
    local_done = ActivityRepository.completed_meetups_by_scale(org_id, city, "local_meetup")
    regional_done = ActivityRepository.completed_meetups_by_scale(org_id, city, "regional_meetup")
    return {
        "org_id": org_id,
        "city": city,
        "local_meetups_completed": local_done,
        "regional_meetups_completed": regional_done,
        "requirements_met": (1 if local_done else 0) + (1 if regional_done else 0),
        "requirements_total": 2,
        "fest_eligible": bool(local_done and regional_done),
        "collaborator_threshold": FEST_COLLAB_THRESHOLD,
    }


def assert_fest_eligible(org_id: str, city: str) -> None:
    """PROG-04's 403. Raised identically from submit and from approve."""
    e = fest_eligibility(org_id, city)
    if e["fest_eligible"]:
        return
    missing = []
    if not e["local_meetups_completed"]:
        missing.append("1 local meetup")
    if not e["regional_meetups_completed"]:
        missing.append("1 regional meetup")
    raise ApiError(
        f"Regional Fest is not unlocked in {city} yet — complete "
        f"{' and '.join(missing)} there first "
        f"({e['requirements_met']} of {e['requirements_total']} done)",
        "fest_locked",
        403,
    )
```

**Verification hook:** `grep -rn "regional_meetup" backend/app/services/ backend/app/controllers/` after implementation should show the scale literal only inside `progression_service.py` and the pre-existing BUDGET-01/quota tuples in `proposal_service.py:59,93` and `decide()`'s `:276`.

### Pattern 2: The completed-count repository query (PROG-01)

**What:** A count method beside the two existing quota counters, differing from them in three ways: it filters by `city` (they filter by `org_id` only), it takes one scale rather than `in_([...])`, and it adds the `starts_at < now()` clause that makes it "completed" rather than "scheduled".

**Example:**

```python
# backend/app/repositories/repos.py — beside meetups_in_region_month (L198)
    @staticmethod
    def completed_meetups_by_scale(org_id: str, city: str, scale: str) -> int:
        """PROG-01: activities this org has actually run in this city at this scale.

        `approved AND starts_at < now()` is the locked formula (PROJECT.md
        §Key Decisions), deliberately NOT `Activity.status == "completed"`:
        sync_past_events() (below) flips that column on any past-dated activity
        regardless of proposal status, so it would count a rejected proposal.

        Naive datetime.now() to match published_feed/sync_past_events and the
        naive DateTime column — see the module's existing convention.
        """
        return (
            Activity.query.filter(
                Activity.org_id == org_id,
                Activity.city == city,
                Activity.scale == scale,
                Activity.starts_at < datetime.now(),
            )
            .join(Proposal)
            .filter(Proposal.status == "approved")
            .count()
        )
```

`Proposal.status == "approved"` also excludes `revoked` for free — `decide()`'s revoke branch (`proposal_service.py:311`) overwrites the status, so a revoked activity never counts toward a later unlock.

### Pattern 3: Threshold constant beside its sibling (PROG-02)

```python
# backend/app/constants.py — immediately after MEGA_MEETUP_THRESHOLD (L412)

# --- Regional-fest collaborator threshold (PROG-02) ---
# Minimum number of collaborating orgs INCLUDING the primary, same convention as
# MEGA_MEETUP_THRESHOLD above. Checked twice with two different definitions
# (D-01): NAMED at submit (collaborating_org_ids + primary), ACCEPTED at approve
# (COLLAB_ACCEPTED rows incl. primary). A brand-new proposal has exactly one
# accepted collaborator — the primary, auto-accepted at creation — so an
# accepted-count check at submit could never pass.
FEST_COLLAB_THRESHOLD = 6
```

### Pattern 4: Two definitions, two checkpoints (D-01, PROG-02)

**What:** The same threshold, two different counting rules, at two different moments.

**Submit — named count.** Insert **after** the collaborating-org-id validation loop (`proposal_service.py:102-117`), not before it: the loop is what deduplicates (`:107-108` silently skips a repeat and skips the primary appearing in the list) and 404s an unknown org. Counting the raw `data["collaborating_org_ids"]` list before that loop would let six repeats of one org id pass.

```python
    # PROG-02 (named half, D-01): structural check — did you name enough orgs?
    # Counted AFTER the dedup loop above so six copies of one org id is 2, not 7.
    if data["scale"] == "regional_fest":
        named = len(valid_collab_orgs) + 1  # +1 = the primary org
        if named < FEST_COLLAB_THRESHOLD:
            raise ApiError(
                f"A Regional Fest needs {FEST_COLLAB_THRESHOLD} collaborating "
                f"organisations — {named} of {FEST_COLLAB_THRESHOLD} named",
                "fest_collaborators_required",
                403,
            )
```

PROG-01's `assert_fest_eligible(data["org_id"], data["city"])` goes earlier — recommended immediately after the BUDGET-01 block (`:58-69`), so a locked org is refused before it burns effort on team/quota/collaborator validation. Either position satisfies the requirement; earlier is cheaper.

**Approve — accepted count.** Inside the `if decision == "approve":` branch (`:274`), after the existing quota re-check (`:275-283`) and before `proposal.status = PROPOSAL_APPROVED` (`:285`):

```python
        # PROG-01 re-check + PROG-02 (accepted half, D-01). Defensive by design,
        # exactly like the quota re-check above it: eligibility and consent can
        # both change while a proposal waits in the queue.
        if activity.scale == "regional_fest":
            assert_fest_eligible(activity.org_id, activity.city)
            accepted = sum(
                1 for c in activity.collaborators if c.status == COLLAB_ACCEPTED
            )  # includes the primary, auto-accepted at submit — Activity.is_mega_meetup counts the same way
            if accepted < FEST_COLLAB_THRESHOLD:
                raise ApiError(
                    f"{accepted} of {FEST_COLLAB_THRESHOLD} collaborating "
                    f"organisations have accepted — approval is blocked until all "
                    f"{FEST_COLLAB_THRESHOLD} accept",
                    "fest_collaborators_required",
                    403,
                )
```

The accepted-count expression is character-for-character the body of `Activity.is_mega_meetup` (models/__init__.py:364-366) with a different threshold — which is what CONTEXT.md means by "mirror the pattern". Do **not** add a second `@property` to `Activity` for this; `is_mega_meetup` is a display label consumed by `to_dict()` (`:385`), whereas this is an authorization decision that belongs in the service beside the other guards.

### Pattern 5: Get-or-create the unlock marker (PROG-03)

**What:** After a fest approval succeeds, record the one-way marker. Unique constraint `uq_org_progression` on `(org_id, city)` (models/__init__.py:1199) makes a naive insert an `IntegrityError` on the second fest in the same city.

```python
def record_unlock(org_id: str, city: str) -> None:
    """PROG-03 — the one-way 'sponsorship & outreach unlocked' marker.

    Idempotent by the uq_org_progression unique constraint. Get-or-create rather
    than catch-IntegrityError: this runs inside decide()'s transaction, and a
    caught IntegrityError would leave the session needing a rollback that would
    also discard the approval itself."""
    if OrgProgressionUnlock.query.filter_by(org_id=org_id, city=city).first():
        return
    db.session.add(OrgProgressionUnlock(org_id=org_id, city=city))
```

Called from `decide()` after the approval writes, before `db.session.commit()` (`:323`) so it lands in the same transaction as the approval it records. No separate commit.

**Where to call it — decide carefully.** Two readings exist and the plan must state which it picked:
- **(a) On approving a `regional_fest`** — the org has demonstrably reached fest tier. Simple, one call site, matches "reaching fest-tier".
- **(b) Whenever `fest_eligibility()` first turns true** — i.e. also when approving the *regional_meetup* that completes the pair. This is the more literal reading of PROG-03 ("reaching fest-tier **eligibility**"), and it is what makes 07-UI-SPEC.md §5.5's banner appear at the moment the fest card unlocks rather than one fest later.

**Recommendation: (b), implemented as one call at the end of every successful approval** — `if fest_eligibility(activity.org_id, activity.city)["fest_eligible"]: record_unlock(...)`. It subsumes (a) (a fest approval implies eligibility), it is one call site either way, and it is the only reading under which the banner and the unlocked scale card ever agree. `[ASSUMED]` — CONTEXT.md D-05 does not state the trigger moment; flag for confirmation if the planner disagrees.

### New Read Endpoint (fills CONTEXT.md's "shape TBD by planner")

**Route:** `GET /api/v1/orgs/<org_id>/progression?city=<city>` — added to `org_profile_controller.py` (already owns the `/orgs/<org_id>/…` prefix, `:18`).

**Guard:** `@auth_required`. Rationale: eligibility is derivable by any signed-in user from the public event feed (`published_feed` already exposes org, city, scale and date for every approved activity), so it is not a secret, and `get_profile` at `:21-31` establishes the "any authenticated reader" precedent for org reads. The `unlocks` array is likewise non-sensitive. Using `org_scoped(can_manage_org)` instead would be defensible but would 403 an admin-proposing-on-behalf flow that `submit_proposal():50-51` explicitly permits. `[ASSUMED]` — flag if the reviewer prefers the stricter guard.

**Response (snake_case on the wire, adapted in `lib/api.ts`):**

```json
{
  "org_id": "abc123",
  "city": "Hyderabad",
  "local_meetups_completed": 1,
  "regional_meetups_completed": 0,
  "requirements_met": 1,
  "requirements_total": 2,
  "fest_eligible": false,
  "collaborator_threshold": 6,
  "unlocks": [
    { "id": "u1", "org_id": "abc123", "city": "Pune", "unlocked_at": "2026-07-14T09:00:00+00:00" }
  ]
}
```

Shape rationale, each field earning its place:
- `local_meetups_completed` / `regional_meetups_completed` — **required by 07-UI-SPEC.md §5.1**, which renders one line per half ("✓ Local meetup in {City}" vs "Regional meetup in {City} — not yet"). A boolean response makes that spec unimplementable.
- `requirements_met` / `requirements_total` — the "1 of 2 completed" summary line (§6) rendered without the client doing arithmetic on the two counts. Cheap, and keeps the "2" in one place if a third requirement is ever added.
- `fest_eligible` — the lock decision, so the client never re-derives it from the counts (§6's server-message contract).
- `collaborator_threshold` — feeds §5.2's "{n} of 6 organisations named" counter without a hardcoded `6` in TSX. Satisfies CLAUDE.md's "state machines live in constants.py" on the frontend side too.
- `unlocks` — `[OrgProgressionUnlock.to_dict()]` (models/__init__.py:1206-1212, already written) for **every** city this org has unlocked, independent of the `city` query param. This is what lets `OrgProfile.tsx` (D-05) call the same endpoint with **no** `city` param and render its gold city chips, instead of needing a third route.

**When `city` is omitted:** return the same envelope with `city: null`, both counts `null`, `fest_eligible: false`, and a populated `unlocks` array. That is the exact payload `OrgProfile.tsx` needs and it matches 07-UI-SPEC.md §5.1's "Indeterminate (no org or no city chosen yet)" card state, which the form also hits before the user picks a city.

**404 on unknown `org_id`**, matching `get_profile`'s `ApiError("Organisation not found", "not_found", 404)` (`org_profile_controller.py:30`).

### Frontend query hook

```ts
// frontend/src/lib/queries.ts — beside useOrgProfile (L104)
export const useOrgProgression = (orgId?: string, city?: string) =>
  useQuery({
    queryKey: ['orgProgression', orgId, city ?? null],
    queryFn: () => api.orgProgression(orgId!, city),
    enabled: !!orgId,
    // 07-UI-SPEC §7: refetch on org/city change only. The queryKey IS that
    // trigger — no polling, no refetchOnWindowFocus (matches the 05-09 gate).
    refetchOnWindowFocus: false,
  })
```

`enabled: !!orgId` follows the existing `useEvent` / `useOrgProfile` convention (`queries.ts:25,104-106`). The `city ?? null` in the key keeps the no-city `OrgProfile` call and the with-city form call as distinct cache entries.

Cache invalidation: add `qc.invalidateQueries({ queryKey: ['orgProgression'] })` to the approve/decide mutation's `onSuccess` (beside the existing `['proposals']` / `['events']` invalidations at `queries.ts:196-198`), so approving the second meetup makes the fest card unlock without a reload.

### Anti-Patterns to Avoid

- **Reading `org_progression_unlocks` to decide eligibility.** Named as threat T-01-18 in the model's own docstring (models/__init__.py:1189-1195). The table records a consequence; it is never an input to the gate.
- **`Activity.status == "completed"` as the completion test.** `sync_past_events()` (repos.py:184-196) sets it on any past `upcoming`/`live` activity with no reference to `Proposal.status`. PROJECT.md's locked formula exists to avoid exactly this.
- **A second `@property` on `Activity` for fest eligibility.** Eligibility is per-(org, city) and has no `Activity` to hang off at the moment `ProposalNew` asks. `is_mega_meetup` is a per-activity display label — a different shape of question.
- **Disabling the Submit button when the fest collaborator count is short.** 07-UI-SPEC.md §5.2 is explicit: the button stays enabled and the server refuses, because a disabled button hides the reason. Same rule as the existing BUDGET-01 cap indicator.
- **Rendering the refusal as a toast.** §1: "a rule the user must act on cannot expire in 3.5s." Inline `ErrorStrip` only.
- **`disabled` on the locked scale card.** §7 requires `aria-disabled="true"` so the control stays in tab order and a keyboard user can reach the explanation.
- **Restating the shortfall numbers in TSX.** §6's server-message contract: the UI renders `error.message` verbatim.
- **Adding an admin bypass to the PROG gate.** `submit_proposal():51` bypasses the *POR* check for admins; PROG-04 has no such carve-out.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Uniqueness of the unlock marker | A check-then-insert race guard, or a `try/except IntegrityError` | The existing `uq_org_progression` constraint + a get-or-create read | The constraint already exists (models/__init__.py:1199). Catching `IntegrityError` mid-`decide()` forces a rollback that would also discard the approval. |
| Deduplicating named collaborator org ids | A new `set()` pass over `collaborating_org_ids` | Count `valid_collab_orgs` after the existing loop (`proposal_service.py:102-117`) | That loop already dedups and 404s unknown ids. A second pass would be a second rule about the same list. |
| Counting accepted collaborators | A new repository query | The in-memory expression from `Activity.is_mega_meetup` (models/__init__.py:364-366) | `activity.collaborators` is already loaded by the relationship, and `proposals_by_status` even `joinedload`s it (repos.py:171). A query here would be an extra round trip for a list already in the session. |
| The lock icon / error strip / status badge UI | New components | `LockedControl`'s SVG path (`OrgProfile.tsx:528`), `ErrorStrip` (`:555`), `Badge` from `ui.tsx` | 07-UI-SPEC.md §1 mandates reuse; a second lock idiom is exactly what it forbids. |
| Error-envelope plumbing | A custom response for the 403 | `raise ApiError(msg, code, 403)` | `register_error_handlers` (errors.py:26-29) already turns it into `{ error, code }` and `lib/api.ts` already parses that into `ApiError` with `.code`. |
| A "1 of 2" progress computation on the client | Client-side arithmetic over the two counts | `requirements_met` / `requirements_total` in the response | One source of truth for the sentence the user reads; also what §6 demands. |

**Key insight:** this phase's entire risk surface is *duplication of the rule*, not implementation difficulty. Every hand-rolled variant above is a second place the "one local + one regional + six orgs" rule would live, and ROADMAP criterion #2 explicitly asks for one.

## Runtime State Inventory

Not a rename/refactor/migration phase — but two of the five categories still matter here, so they are answered rather than skipped.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `org_progression_unlocks` is empty in every existing dev DB (the table was created in the Phase 1 migration batch and nothing has ever written to it — no `OrgProgressionUnlock(` constructor call exists outside the model definition). Existing approved activities therefore have **no** retroactive unlock rows. | None required for correctness — PROG-01 eligibility is computed live and never reads this table, so a seeded org with a completed local+regional pair unlocks the fest card immediately with no backfill. The *banner* (D-05) will only appear for orgs that get an approval after this phase ships. Acceptable; flag in the summary rather than writing a backfill. |
| Live service config | None. No external service holds progression state. | None |
| OS-registered state | None. | None |
| Secrets/env vars | None. | None |
| Build artifacts | None — no new package, no `pyproject.toml`/`package.json` change, so no reinstall. | None |
| Seed data | `seed.py` seeds demo activities. Whether the seeded orgs have a completed local+regional pair in one city determines whether the fest card is reachable in a manual demo. **Verify before UAT**; if not, the phase's headline UI state is undemonstrable without hand-editing the DB. | Check `seed.py`; if no org qualifies, add a completed regional_meetup to the seed (idempotent-reference path, not the destructive one). |

## Common Pitfalls

### Pitfall 1: Naive vs aware datetime in the completed-count query

**What goes wrong:** `Activity.starts_at` is a plain `db.Column(db.DateTime)` (models/__init__.py:327) — naive, no timezone. `proposal_service.py:1` imports `datetime, UTC` and uses aware `datetime.now(UTC)` (`:151`, `:205`, `:433`), while `repos.py` uses naive `datetime.now()` (`:145`, `:187`). Writing `Activity.starts_at < datetime.now(UTC)` binds an aware value against naive stored strings; on SQLite this silently compares lexicographically against a differently-formatted string and on Postgres it raises or shifts by the offset.

**Why it happens:** the new function is conceptually a service concern but lives in the repository layer, so the natural import to copy is the service's.

**How to avoid:** the count method lives in `repos.py` and uses `datetime.now()` (naive), matching that module's existing two call sites and the column. Do not "fix" the service's aware usage — out of scope per CLAUDE.md's minimum-diff rule.

**Warning signs:** an eligibility test that passes on a far-future `starts_at` but fails on one a few hours in the past; a `TypeError: can't compare offset-naive and offset-aware datetimes` from SQLAlchemy's Python-side comparison.

### Pitfall 2: The `+1` for the primary org

**What goes wrong:** `FEST_COLLAB_THRESHOLD = 6` means six organisations **including the primary** (the same convention `MEGA_MEETUP_THRESHOLD`'s comment states at constants.py:409-411). At submit, `data["collaborating_org_ids"]` holds only the *secondary* orgs — `submit_proposal()` writes the primary as a separate `ActivityCollaborator` row at `:152-160`. Forget the `+1` and a valid 6-org fest is refused at 5; count the raw request list instead of `valid_collab_orgs` and six duplicate ids pass.

**Why it happens:** the two counting sites read different data structures (a request list vs. a relationship collection) for the same conceptual number.

**How to avoid:** submit-side counts `len(valid_collab_orgs) + 1`, after the dedup loop. Approve-side counts `COLLAB_ACCEPTED` rows with no adjustment — the primary is already an accepted row (`:156`). 07-UI-SPEC.md §5.2 makes the same choice visible: the copy says "organisations", never "collaborators", so the +1 isn't surprising to the user.

**Warning signs:** a test that names 5 secondaries and expects success, or one that names 6 secondaries and expects success — exactly one of those is right (the first).

### Pitfall 3: `Activity.status == "completed"` looks like the obvious check and is wrong

**What goes wrong:** `ActivityRepository.sync_past_events()` (repos.py:184-196) sets `status = "completed"` on **every** `upcoming`/`live` activity with `starts_at < now()`, with no `Proposal` join. A rejected or never-decided proposal whose date has passed therefore carries `status == "completed"`, and would count toward an unlock the org never earned. `submit_report()` (`proposal_service.py:343`) also writes that literal.

**Why it happens:** the column is named exactly what the requirement says, and the requirement's parenthetical warning is easy to skim past.

**How to avoid:** join `Proposal` and filter `Proposal.status == "approved"` plus `Activity.starts_at < now()`. REQUIREMENTS.md:95 states the formula; PROJECT.md §Key Decisions locks it. Put the reason in the docstring so a later reader doesn't "simplify" it.

**Warning signs:** an eligibility test that passes without ever approving anything.

### Pitfall 4: An eligibility change between submit and approve

**What goes wrong:** a fest proposal is submitted while eligible, then the qualifying regional meetup's approval is **revoked** (`decide()`'s revoke branch, `:310-321`, sets `Proposal.status = revoked`). Eligibility silently drops. Without the approve-time PROG-01 re-check the fest approves anyway.

**Why it happens:** submit-time validation feels sufficient because the data "was" valid.

**How to avoid:** the approve branch calls `assert_fest_eligible()` too — the whole point of the two-checkpoint pattern, and the same reason the quota re-check at `:275-283` exists.

**Warning signs:** a fest approved for an org whose eligibility endpoint returns `fest_eligible: false`.

### Pitfall 5: Half-written state on a refused approval

**What goes wrong:** if either PROG guard is placed *after* `proposal.status = PROPOSAL_APPROVED` (`:285`) or after the `ContributionPoint` write (`:290-297`), the raise aborts the request but the session already carries mutations. `decide()` has no explicit rollback — it relies on the guards being first, exactly as the quota re-check is.

**How to avoid:** both PROG checks go immediately after the quota re-check and before line 285. Same rule `submit_proposal()` follows with its `# --- All validation passed; write to DB ---` marker at `:119`.

**Warning signs:** a test asserting 403 that then finds `proposal.status == "approved"`, or an orphan "organised" `ContributionPoint`.

### Pitfall 6: Fest scale escapes the BUDGET-01 and quota guards by design

**What goes wrong:** not a bug — a thing to not "fix". `regional_fest` is excluded from the BUDGET-01 cap (`:59`) and the quota guardrail (`:93`, `:276`) because it is sponsor-funded (REQUIREMENTS.md:45). A plan that adds fest to those tuples while "tidying up" changes a locked requirement.

**How to avoid:** touch only the new `if data["scale"] == "regional_fest":` blocks; leave the existing `("local_meetup", "regional_meetup")` tuples alone.

### Pitfall 7: The `ProposalNew` auto-revert can loop

**What goes wrong:** 07-UI-SPEC.md §5.1 specifies that selecting a city where fest is locked auto-reverts the scale to `regional_meetup`. Implemented as an unguarded `useEffect` on `[scale, eligibility]` that calls `setScale`, this re-renders, re-evaluates, and can flip state repeatedly while the query is in flight.

**How to avoid:** revert only when the query has **resolved** and reports ineligible (`!isLoading && !isError && data && !data.festEligible && scale === 'regional_fest'`). The loading and error states keep the card locked visually but must not mutate `scale` — §5.1 gives both a distinct caption precisely because they are not "ineligible".

**Warning signs:** the scale selector flickering when changing city; React "maximum update depth exceeded".

## Code Examples

### The controller route

```python
# backend/app/controllers/org_profile_controller.py — after get_profile (L31)
@org_profile_bp.get("/orgs/<org_id>/progression")
@auth_required
def get_progression(org_id):
    """PROG-01/PROG-03 read surface. Serves two callers: ProposalNew's fest-card
    lock (with ?city=) and OrgProfile's unlock banner (without it).

    Computed on every call — never a cached or stored verdict (T-01-18)."""
    org = OrgRepository.by_id(org_id)
    if not org:
        raise ApiError("Organisation not found", "not_found", 404)
    city = request.args.get("city")
    return jsonify(progression_service.progression_for(org, city)), 200
```

### The two `ERROR_HEADINGS` entries (07-UI-SPEC.md §5.3)

```ts
// frontend/src/pages/ProposalNew.tsx — extend the existing map (L598)
const ERROR_HEADINGS: Record<string, string> = {
  // …existing entries unchanged…
  fest_locked: "Regional Fest isn't unlocked here yet",
  fest_collaborators_required: 'A Regional Fest needs 6 organisations',
}
```

The existing error block at `:569-574` already renders `errorHeading(code)` + `error.message` and already carries `role="alert"` — no structural change, two map entries.

## State of the Art

Nothing external moved here — this is in-repo domain logic on a pinned stack. The only "state of the art" that matters is the repo's own recent convention, and Phase 7 inherits rather than changes it:

| Older approach in this repo | Current approach | Where established | Phase 7 impact |
|---|---|---|---|
| Business rule checked once, at write time | Two-checkpoint enforcement (submit + approve) | Quota guardrail, `proposal_service.py:92-100` and `:275-283` | Phase 7 adds a **third rule pair to the same two functions** — no new pattern, per CONTEXT.md §Established Patterns |
| Stored boolean flags for derived state | Computed dynamic properties | `Activity.is_mega_meetup` (models/__init__.py:358-367), and the explicit prohibition in `OrgProgressionUnlock`'s docstring | Eligibility is computed on every call |
| Bare error line on a failed mutation | `ErrorStrip` with heading + `role="alert"` | `OrgProfile.tsx:555` (Phase 4) | 07-UI-SPEC.md §5.4 lifts it into `ApprovalQueue.tsx` |
| Coarse `organiser_required` | Predicate guards (`can_manage_org`, `can_manage_activity`, `is_meetup_head`) | `rbac.py:162-249` (RBAC-01/02/03, Phase 1) | The new read route picks a guard from this set, not the coarse decorator |

**Deprecated / not to be extended:** `ActivityRepository.meetups_in_city_month` (repos.py:223+, explicitly labelled "Keep old method for backward compat with existing tests") and the `MEETUPS_PER_CITY_PER_MONTH` alias (constants.py:290). Read them for query shape; don't add to them.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest (backend, config at `backend/pytest.ini`); no frontend test runner — `npm run build` (`tsc -b && vite build`) is the frontend gate |
| Config file | `backend/pytest.ini` — `testpaths = tests`, `addopts = -q --cov=app --cov-report=term-missing` |
| Quick run command | `cd backend && python -m pytest tests/test_progression_gating.py -q` |
| Full suite command | `cd backend && . .venv/Scripts/activate && python -m pytest -q --tb=short && cd ../frontend && npm run build` (verbatim from `.planning/config.json` `workflow.test_command`) |
| Fixtures | `backend/tests/conftest.py` — `app` (creates + drops tables per test, `_seed_minimal()`), `client`. Test-local helpers `_token` / `_auth` / `_seed_user_with_por` / `_seed_org` / `_valid_payload` are duplicated per test module by convention (see `test_proposal_collaboration.py:38-83`) — copy that block rather than importing across test modules. |

### Phase Requirements → Test Map

All in one new file, `backend/tests/test_progression_gating.py`. Every test drives the **HTTP layer** with `client.post(...)` — never `proposal_service.submit_proposal()` directly — because ROADMAP criterion #2 is a statement about what a direct API call returns, and a service-level test cannot observe the status code.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROG-01 | Org with 0 completed meetups in city → fest submit refused 403 `fest_locked` | integration | `pytest tests/test_progression_gating.py::test_fest_locked_with_no_track_record -x` | ❌ Wave 0 |
| PROG-01 | Org with 1 approved+past `local_meetup` only → still 403; message names the missing regional half | integration | `…::test_fest_locked_with_only_local -x` | ❌ Wave 0 |
| PROG-01 | Org with approved+past local **and** regional in the city → fest submit accepted (201) | integration | `…::test_fest_unlocks_with_both -x` | ❌ Wave 0 |
| PROG-01 | Pair completed in **city A**, fest proposed for **city B** → 403 (D-03 per-city scoping) | integration | `…::test_eligibility_is_per_city -x` | ❌ Wave 0 |
| PROG-01 | Past-dated meetups whose proposal is `rejected`/`revoked` do **not** count (Pitfall 3) | integration | `…::test_unapproved_past_meetups_do_not_count -x` | ❌ Wave 0 |
| PROG-01 | Approved but **future-dated** meetups do not count (`starts_at < now()`) | integration | `…::test_future_meetups_do_not_count -x` | ❌ Wave 0 |
| PROG-01 | `Activity.status == "completed"` set by `sync_past_events()` on an unapproved activity does not unlock (regression pin on the locked formula) | unit | `…::test_status_completed_is_not_the_eligibility_source -x` | ❌ Wave 0 |
| PROG-02 | Eligible org, fest with 4 named orgs → 403 `fest_collaborators_required`, message contains "5 of 6" (4 secondaries + primary) | integration | `…::test_fest_named_shortfall_refused -x` | ❌ Wave 0 |
| PROG-02 | Eligible org, fest with `FEST_COLLAB_THRESHOLD - 1` secondaries → 201 (the +1 boundary, Pitfall 2) | integration | `…::test_fest_named_threshold_boundary -x` | ❌ Wave 0 |
| PROG-02 | Six *duplicate* org ids named → still refused (dedup happens before the count) | integration | `…::test_duplicate_collaborator_ids_do_not_satisfy_threshold -x` | ❌ Wave 0 |
| PROG-02 | Submitted fest with 6 named, only 3 accepted → admin approve returns 403, message contains "3 of 6" (D-01 second definition) | integration | `…::test_approve_blocked_until_six_accepted -x` | ❌ Wave 0 |
| PROG-02 | All 6 accept → approve succeeds, `Proposal.status == approved` | integration | `…::test_approve_succeeds_when_all_accept -x` | ❌ Wave 0 |
| PROG-02 | A `declined` collaborator does not count toward the accepted total | integration | `…::test_declined_collaborator_does_not_count -x` | ❌ Wave 0 |
| PROG-03 | After a successful approval that makes the org fest-eligible, exactly one `OrgProgressionUnlock` row exists for `(org, city)` | integration | `…::test_unlock_row_recorded_on_approval -x` | ❌ Wave 0 |
| PROG-03 | A second qualifying approval in the same city does not create a second row and does not raise (idempotency / `uq_org_progression`) | integration | `…::test_unlock_row_is_idempotent -x` | ❌ Wave 0 |
| PROG-03 | `GET /orgs/<id>/progression` with no `city` returns the `unlocks` array the banner renders | integration | `…::test_progression_endpoint_lists_unlocks -x` | ❌ Wave 0 |
| PROG-04 | **Direct API bypass, submit:** a locked org POSTing `scale: regional_fest` with a valid token gets **403** (not 400, not 422, not 409) | integration | `…::test_direct_submit_of_locked_scale_is_403 -x` | ❌ Wave 0 |
| PROG-04 | **Direct API bypass, approve:** admin POSTing `decision: approve` on an ineligible fest gets **403** | integration | `…::test_direct_approve_of_locked_scale_is_403 -x` | ❌ Wave 0 |
| PROG-04 | Both refusals leave **no** partial state — no `Activity` row after a refused submit; `Proposal.status` still `submitted` and no `ContributionPoint` after a refused approve (Pitfall 5) | integration | `…::test_refusals_write_nothing -x` | ❌ Wave 0 |
| PROG-04 | One function: eligibility asserted at submit and at approve produces the **same** `code` (`fest_locked`) at both checkpoints | integration | `…::test_both_checkpoints_share_one_rule -x` | ❌ Wave 0 |
| D-04 | `GET /orgs/<id>/progression?city=X` returns both counts independently and `requirements_met`/`requirements_total` (ROADMAP #1's "1 of 2" is renderable) | integration | `…::test_progression_endpoint_returns_both_counts -x` | ❌ Wave 0 |
| D-04 | Endpoint 404s an unknown `org_id`; requires auth (401 without a token) | integration | `…::test_progression_endpoint_guards -x` | ❌ Wave 0 |
| — | Frontend compiles with the new types/hook/page changes | build | `cd frontend && npm run build` | ✅ exists |
| — | Blueprint registration unchanged (route added to an existing blueprint) | integration | `pytest tests/test_blueprint_registration.py -q` | ✅ exists |
| — | No regression in the existing proposal suite (the new guards sit inside functions those tests exercise) | integration | `pytest tests/test_proposal_flow.py tests/test_proposal_collaboration.py -q` | ✅ exists |

**Manual-only (justified):** the three lock-state captions in 07-UI-SPEC.md §5.1 (loading / fetch-error / indeterminate) and the gold banner's visual appearance. There is no frontend test runner in this project (no vitest/jest config, no `test` script in `frontend/package.json`), so `npm run build` is the only automated frontend gate and these are UAT checks.

### Test-data helper the whole file needs

Six of the tests need "this org has an approved, past-dated meetup of scale S in city C". Write it **once** at the top of the new file, next to the copied `_auth`/`_seed_org` helpers:

```python
def _seed_completed_meetup(org, city, scale, days_ago=30):
    """An activity that PROG-01 counts: approved proposal + a start date in the past.

    Deliberately does NOT set Activity.status = "completed" — PROG-01 must pass
    without it (that column is written by sync_past_events regardless of proposal
    status, which is why the locked formula ignores it)."""
    a = Activity(
        org_id=org.id, title=f"Past {scale}", city=city, scale=scale,
        venue="Somewhere", starts_at=datetime.now() - timedelta(days=days_ago),
        capacity=50, status="upcoming",
    )
    _db.session.add(a)
    _db.session.flush()
    _db.session.add(Proposal(activity_id=a.id, status="approved"))
    _db.session.commit()
    return a
```

Naive `datetime.now()` here, matching the column and Pitfall 1.

**Fest payload note:** `_valid_payload` in `test_proposal_collaboration.py:69-83` uses `"scale": "local_meetup"` and `"starts_at": "2027-03-15T10:00:00"`. A fest variant must also drop or keep the `budget` list — `regional_fest` is exempt from BUDGET-01 (`proposal_service.py:59`) so any budget passes — and must still include exactly one `Meetup Head` in `team`, or the PROPOSAL-02 guard at `:74-79` fires first and the test asserts the wrong 400.

### Sampling Rate

- **Per task commit:** `cd backend && python -m pytest tests/test_progression_gating.py -q`
- **Per wave merge:** `cd backend && python -m pytest -q --tb=short` (full backend suite — the new guards sit inside `submit_proposal`/`decide`, which ~5 existing modules exercise)
- **Phase gate:** the full `workflow.test_command` (backend suite + `npm run build`) green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `backend/tests/test_progression_gating.py` — new file, covers PROG-01/02/03/04 (22 automated cases above)
- [ ] `_seed_completed_meetup()` helper inside that file (no shared fixtures module exists in this project; per-module helpers are the convention)
- [ ] Framework install: **none needed** — pytest, pytest-cov and the `app`/`client` fixtures are all present

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged — the phase adds no auth surface; the new route reuses `auth_required` (rbac.py:263) |
| V3 Session Management | no | Unchanged — AUTH-01's access/refresh flow is untouched |
| V4 Access Control | **yes — this phase IS an access-control feature** | Server-side enforcement in `proposal_service`, computed per request; 403 on refusal; no client-supplied eligibility input; **no admin bypass** (contrast `submit_proposal():51`, which bypasses only the POR check) |
| V5 Input Validation | yes (existing) | `ProposalSchema.scale` is already `validate.OneOf(ACTIVITY_SCALES)` (schemas/__init__.py:72), so an unknown scale is 422 before the gate runs. The new route's `city` comes from `request.args` and is used only as a SQLAlchemy filter value (parameterized) and interpolated into a message — never into SQL text and never into `innerHTML` (React escapes it). |
| V6 Cryptography | no | No crypto in this phase |
| V7 Error Handling & Logging | yes | Every gate refusal must be observable. `decide()` already writes an `AuditLog` on each decision via `AuditRepository.record` (proposal_service.py:288/304/308/313); consider one on a refused fest approval so a repeated bypass attempt is visible in the trail. `[ASSUMED]` — not required by PROG-01..04; propose, don't assume. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| **T-01-18 (named in `OrgProgressionUnlock`'s docstring):** a stale or forged `org_progression_unlocks` row grants fest rights the activity history does not support | Elevation of Privilege | Never read the table for authorization — compute from `activities` + `proposals` every time. This is the single most important security property of the phase. |
| Client-side-only gate bypassed by a direct `POST /api/v1/proposals` with `scale: regional_fest` | Elevation of Privilege | PROG-04's server check. The exact scenario the ROADMAP criterion-2 test asserts. |
| Eligibility revoked between submit and approve (Pitfall 4) | Elevation of Privilege | Approve-time re-check — TOCTOU on a queued proposal |
| Consent bypass: 6 orgs named, none accepted, fest approved anyway | Spoofing (of collaborator consent) | D-01's accepted-count check at approve; the reason D-02 rejected "named count both times" |
| Duplicate collaborator ids inflating the threshold | Tampering | Count after `submit_proposal()`'s existing dedup loop (`:102-117`), never the raw request list |
| Enumeration of other orgs' track records via the new GET | Information Disclosure | Accepted: the same facts are already public in `published_feed` (org, city, scale, date of every approved activity). No new disclosure. |
| Partial write on a refused approval leaving an orphan `ContributionPoint` | Tampering / integrity | Guards placed before line 285, per Pitfall 5 |

## Environment Availability

**Skipped — no external dependencies.** This phase adds no tool, service, runtime, CLI, database, or package requirement beyond what the repo already runs (`python -m pytest`, `npm run build`), both already encoded in `.planning/config.json` `workflow.test_command`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The PROG-03 unlock row is written whenever an approval makes `fest_eligibility()` newly true (option **b**), not only when a `regional_fest` itself is approved (option **a**) | Pattern 5 | Banner and unlocked scale card disagree — the fest card unlocks but no banner appears until a fest is actually run. Low blast radius (one `if`), but it changes observable behavior for ROADMAP criterion #4. **Confirm with the user.** |
| A2 | The new `GET /orgs/<id>/progression` route uses `auth_required`, not `org_scoped(can_manage_org)` | New Read Endpoint | A stricter guard would 403 an admin proposing on behalf of an org — a flow `submit_proposal():50-51` explicitly permits. A looser one exposes nothing not already in the public feed. Reviewer preference, not a correctness question. |
| A3 | PROG-01 counts activities where the org is **primary** (`Activity.org_id`), not activities it merely accepted a collaboration invite on | Pattern 2 | An org that co-hosted (but did not own) a local and a regional meetup in a city would not unlock. Matches REQUIREMENTS.md's "that org has completed" read narrowly and matches the existing quota query's use of `Activity.org_id` — but `ActivityCollaborator` is documented as "the source of truth for which organisations are running this activity" (models/__init__.py:472-474), so the broader reading is defensible. **Confirm with the user**; it changes the repository query's join. |
| A4 | An `AuditLog` row on a refused fest approval is desirable but not required | Security Domain V7 | If the grader/PRD expects every refusal audited, the plan would need one more write. No requirement text demands it. |
| A5 | `org_progression_unlocks` is empty in every existing dev database (no constructor call exists outside the model) | Runtime State Inventory | If a dev DB somehow holds rows, the banner would show cities the org has not earned. Harmless — the table is never an authorization input (T-01-18). |
| A6 | `seed.py`'s demo data may not contain an org with both a completed local and a completed regional meetup in one city | Runtime State Inventory | The phase's headline UI state (unlocked fest card, gold banner) would be undemonstrable in manual UAT without hand-editing. Cheap to check; check before UAT. |

## Open Questions

1. **Does a *collaborating* (non-primary) completed meetup count toward PROG-01?** (= A3)
   - What we know: REQUIREMENTS.md:95 says "that org has completed". The existing quota queries key on `Activity.org_id` (the primary pointer). `ActivityCollaborator`'s docstring calls itself the source of truth for "which organisations are running this activity".
   - What's unclear: whether "completed by the org" means owned or participated-in.
   - Recommendation: **primary-only** (`Activity.org_id`), matching the existing repository precedent and the narrower security posture. Surface it to the user in one line during planning; it is a one-clause change to the query if they disagree.

2. **When exactly is the PROG-03 unlock recorded?** (= A1)
   - What we know: PROG-03 says "reaching fest-tier eligibility sets a flag"; D-05 specifies only where it surfaces.
   - Recommendation: record on any approval that makes eligibility newly true (option b). One `if` at the end of `decide()`'s approve branch.

3. **Should a refused fest approval write an `AuditLog` row?** (= A4)
   - What we know: every *successful* decision writes one (`:288`, `:304`, `:308`, `:313`). No refusal anywhere in the file writes one — the quota refusal at `:279` does not.
   - Recommendation: follow the existing convention — **no audit row on refusal**. Consistency beats a new pattern in a phase whose whole point is reusing the existing one.

## Sources

### Primary (HIGH confidence — read from the working tree this session)

- `backend/app/constants.py` — L126 `ACTIVITY_SCALES`, L149-152 `COLLAB_*`, L288-290 quota constants, L401-406 BUDGET-01, L408-412 `MEGA_MEETUP_THRESHOLD`
- `backend/app/models/__init__.py` — L315-392 `Activity` (L327 `starts_at` column, L358-367 `is_mega_meetup`, L369-392 `to_dict`), L434-447 `Proposal`, L469-517 `ActivityCollaborator`, L1186-1212 `OrgProgressionUnlock`
- `backend/app/services/proposal_service.py` — L1-41 imports, L44-183 `submit_proposal`, L102-117 collab-id dedup loop, L119 write marker, L186-207 `respond_collab`, L263-324 `decide` (L274 approve branch, L275-283 quota re-check, L285-297 approval writes, L310-321 revoke), L335-346 `submit_report`
- `backend/app/repositories/repos.py` — L54-88 `OrgRepository`, L112-229 `ActivityRepository` (L136-150 `published_feed`, L160-177 `proposals_by_status`, L184-196 `sync_past_events`, L198-220 the two quota counters, L223+ deprecated alias)
- `backend/app/errors.py` — L8-16 `ApiError` signature, L26-43 handlers
- `backend/app/controllers/org_profile_controller.py` — L1-50 blueprint prefix, `get_profile` guard/404 pattern
- `backend/app/services/org_profile_service.py` — L80-120 `public_profile` (the "identical for every caller" contract)
- `backend/app/rbac.py` — decorator/predicate inventory (L162 `can_manage_org`, L263 `auth_required`, L373 `org_scoped`)
- `backend/app/schemas/__init__.py` — L68-81 `ProposalSchema` (L72 scale `OneOf`, L80 `collaborating_org_ids`)
- `backend/tests/conftest.py` — `app`/`client` fixtures, `_seed_minimal`
- `backend/tests/test_proposal_collaboration.py` — L1-83 helper conventions, `_valid_payload` shape
- `backend/pytest.ini` — testpaths/addopts
- `frontend/src/pages/ProposalNew.tsx` — L195-257 scale selector + org/city fields, L549 collab empty copy, L569-574 error block, L598-606 `ERROR_HEADINGS`
- `frontend/src/pages/OrgProfile.tsx` — L55-56 `canEdit`, L261/L296 layout anchors, L528 `LockedControl`, L555 `ErrorStrip`
- `frontend/src/lib/queries.ts` — L104-121 `useOrgProfile`/`useBrandKit` hook shape, L187-198 proposal-mutation invalidations
- `.planning/phases/07-progression-gating/07-CONTEXT.md`, `07-UI-SPEC.md`; `.planning/REQUIREMENTS.md`; `.planning/STATE.md` L237-252; `.planning/config.json`; `./CLAUDE.md`

### Secondary (MEDIUM confidence)

- `.planning/PROJECT.md` §Key Decisions — the `approved AND starts_at < now()` formula, cited via CONTEXT.md L44 rather than read directly this session

### Tertiary (LOW confidence)

- None. No external search was performed; no external source is relevant to an in-repo business rule with zero new dependencies.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — the stack is "nothing new"; every reused asset was read at its cited line this session
- Architecture: **HIGH** — the pattern is a third instance of a two-checkpoint guard pair that already exists twice in the same two functions
- Pitfalls: **HIGH** — each of the seven was derived from code read this session (`sync_past_events`, the naive/aware split, the dedup loop, the write-marker ordering), not from general knowledge
- New endpoint shape: **MEDIUM-HIGH** — every field is forced by a specific line of 07-UI-SPEC.md, but the guard choice (A2) and the `unlocks`-on-the-same-endpoint consolidation are recommendations
- Validation architecture: **HIGH** — framework, fixtures, helper conventions and the exact test command all verified in-repo

**Line-reference currency check (CONTEXT.md's citations vs. the tree today):**

| CONTEXT.md said | Actual | Status |
|---|---|---|
| `submit_proposal()` L44 | L44 | exact |
| `decide()` L263 | L263 | exact |
| approve branch L274 | L274 | exact |
| collaborator loop L102 | L102-117 | exact |
| `meetups_in_region_month` L199-220 | L198-220 | exact (decorator on 197) |
| `ProposalNew.tsx` scale selector L204-228 | L200-223 (grid L200, buttons L201-222) | **shifted ~4 lines** — use L201-222, as 07-UI-SPEC.md §5.1 already does |
| `ProposalNew.tsx` org/city L55-56, L247-259 | `form` state L54-57; org field L234-248, city field L249-257 | **shifted** — org/city inputs are L234-257, not L247-259 |
| `MEGA_MEETUP_THRESHOLD` in constants.py | L412 | present |
| `ACTIVITY_SCALES` in constants.py | L126 | present |
| `OrgProgressionUnlock` in models | L1186 | present |
| `ActivityCollaborator` in models | L469 | present |
| `Activity.is_mega_meetup` | L358-367 | present |
| `FEST_COLLAB_THRESHOLD` | **does not exist yet** | to be added |

Everything CONTEXT.md claimed still holds; only the two `ProposalNew.tsx` frontend ranges have drifted, and 07-UI-SPEC.md already carries the corrected ones.

**Research date:** 2026-08-23
**Valid until:** 2026-09-22 (30 days — in-repo logic on a pinned stack; the only invalidator is someone editing `proposal_service.py`, `repos.py`, or `ProposalNew.tsx` before this phase executes)
