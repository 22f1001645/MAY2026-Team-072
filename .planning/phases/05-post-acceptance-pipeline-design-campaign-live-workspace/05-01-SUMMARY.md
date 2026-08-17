# 05-01 SUMMARY — DESIGN-01: Schedule Editor Spine

**Status:** ✅ COMPLETE  
**Commit:** `802db4a`  
**Requirements:** DESIGN-01 (AC-01…AC-07)  
**Wave:** 1

---

## What was built

Proved the full Phase 5 stack end-to-end on the thinnest possible path — one schedule item
round-tripping through model → schema → service → controller → blueprint → api.ts →
TanStack hook → CampaignBuilder page.

Then expanded to the full DESIGN-01 contract: unlock check, immutability gate, presets,
deterministic ordering, position-only reorder.

---

## Files created

| File | Purpose |
|------|---------|
| `backend/app/services/campaign_service.py` | `assert_editable` + `assert_campaign_live` chokepoints |
| `backend/app/services/schedule_service.py` | list/create/update/delete/reorder/presets |
| `backend/app/controllers/schedule_controller.py` | 6 guarded routes |
| `backend/tests/test_event_schedule.py` | 9 tests, AC-01..AC-07 |
| `backend/tests/test_blueprint_registration.py` | Blueprint guard (04-01 not yet run) |
| `frontend/src/pages/CampaignBuilder.tsx` | `/events/:id/campaign` thin page |

## Files modified

| File | Change |
|------|--------|
| `backend/app/controllers/__init__.py` | `schedule_bp` import + `ALL_BLUEPRINTS` entry |
| `backend/app/schemas/__init__.py` | `ScheduleItemSchema`, `ScheduleItemPatchSchema` |
| `backend/app/constants.py` | `SCHEDULE_PRESETS` dict (3 scales) |
| `backend/app/services/proposal_service.py` | Stub filled → `campaign_service.assert_editable` |
| `frontend/src/lib/types.ts` | `ApiScheduleItem` type |
| `frontend/src/lib/api.ts` | `scheduleItems/create/update/delete` wire seam |
| `frontend/src/lib/queries.ts` | 4 schedule TanStack hooks |
| `frontend/src/App.tsx` | `/events/:id/campaign` route |

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| AC-01: POST returns 201 | ✅ `test_schedule_crud` |
| AC-02: PATCH returns 200 | ✅ `test_schedule_crud` |
| AC-03: DELETE returns 204 | ✅ `test_schedule_crud` |
| AC-04: unlock returns 400/schedule_empty when empty | ✅ `test_campaign_unlock_schedule_empty` |
| AC-05: deterministic ordering by (position, created_at, id) | ✅ `test_schedule_ordering` |
| AC-06: mutations return 409/campaign_live after campaign.status=live | ✅ `test_schedule_immutable_after_live` |
| AC-07: `/schedule-presets?scale=local_meetup` ≥ 1 result | ✅ `test_schedule_presets` |
| Cross-activity PATCH returns 404/not_found | ✅ `test_schedule_cross_activity_patch_returns_404` |
| Blueprint registration guard | ✅ `test_all_blueprints_are_registered` |
| Frontend build | ✅ 432 modules, exit 0 |
| Full backend suite | ✅ 210 tests, exit 0 |

---

## Key decisions

- **`assert_editable` is the single chokepoint.** `proposal_service.reassign_meetup_head`'s
  Phase 5 stub was replaced with a call to it — no inline `campaign.status` comparison lives
  outside `campaign_service.py`.
- **Ordering is declared on the backref.** `schedule_service` never adds `.order_by()`.
  The `test_schedule_ordering` test proves the backref declaration rather than any service sort.
- **Position-only PATCH routes to `reorder_item`.** The detection is: `position` not None AND
  all other fields are None. This keeps blur-save (plan 05-06) and reorder separate so
  a save-in-flight cannot clobber the reorder.
- **`SCHEDULE_PRESETS` is a dict, not a table.** Static reference data with no per-org
  variation in v1; a table would require a migration that ROADMAP Phase 1 criterion 3 forbids.
- **`emoji-picker-react` installed** (pre-existing missing package; not a Phase 5 regression).

---

## Symbols available for later plans

Every plan 05-02…05-11 that needs the live-campaign gate imports:
```python
from .campaign_service import assert_editable, assert_campaign_live
```

The unlock check surface:
```
GET /api/v1/activities/<activity_id>/schedule/unlock
```
