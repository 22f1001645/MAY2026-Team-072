"""Schedule service — CRUD for EventScheduleItem rows (DESIGN-01).

Design decisions:
- ``list_items`` reads the ordered backref; no ``.order_by()`` is added here
  because the ordering is declared on the backref itself (models/__init__.py:584).
  Adding a second ``.order_by()`` here would shadow the declared one and make the
  ordering definition live in two places.
- ``create_item`` / ``update_item`` / ``delete_item`` each call
  ``campaign_service.assert_editable`` first — the single chokepoint for the
  live-campaign immutability rule (PROB-P3, AC-06).
- Services are the only place ``db.session.commit()`` is called; controllers do
  not open a database session.
"""
from ..constants import SCHEDULE_PRESETS
from ..errors import ApiError
from ..extensions import db
from ..models import EventScheduleItem
from . import campaign_service


def list_items(activity) -> list:
    """Return all schedule items for *activity* in declared backref order."""
    return [i.to_dict() for i in activity.schedule_items]


def assert_schedule_non_empty(activity) -> None:
    """Raise 400/schedule_empty when the activity has no schedule items.

    Called by the unlock-check route (AC-04) and by plan 05-02's campaign
    mutations. This is the single definition of the unlock predicate — the
    route is the check's addressable surface, not a second definition."""
    if not activity.schedule_items:
        raise ApiError(
            "Add at least one schedule item to unlock the campaign builder.",
            "schedule_empty",
            400,
        )


def create_item(activity, data: dict, actor) -> dict:
    """Append a new schedule item to *activity* and return its dict.

    Defaults ``position`` to ``len(activity.schedule_items)`` when the
    payload omits it, so new items append naturally."""
    campaign_service.assert_editable(activity)

    position = data.get("position")
    if position is None:
        position = len(activity.schedule_items)

    item = EventScheduleItem(
        activity_id=activity.id,
        position=position,
        time_block=data.get("time_block"),
        title=data["title"],
        owner_id=data.get("owner_id"),
        owner_label=data.get("owner_label"),
        notes=data.get("notes"),
    )
    db.session.add(item)
    db.session.commit()
    return item.to_dict()


def update_item(activity, item_id: str, data: dict, actor) -> dict:
    """Apply a partial update to one schedule item and return its dict.

    Raises 404/not_found when the item is missing or belongs to a different
    activity (cross-activity write guard, threat T-05-02). Applies only the
    keys whose value is not ``None`` so a PATCH carrying only ``position``
    leaves ``title`` / ``time_block`` / ``notes`` untouched."""
    campaign_service.assert_editable(activity)

    item = EventScheduleItem.query.get(item_id)
    if item is None or item.activity_id != activity.id:
        raise ApiError("Schedule item not found", "not_found", 404)

    # Only-position PATCH → delegate to reorder_item for full renumbering
    if (
        data.get("position") is not None
        and data.get("title") is None
        and data.get("time_block") is None
        and data.get("notes") is None
        and data.get("owner_id") is None
        and data.get("owner_label") is None
    ):
        return reorder_item(activity, item_id, data["position"])

    # Partial field update (non-None values only)
    updatable = ["time_block", "title", "owner_id", "owner_label", "notes", "position"]
    for key in updatable:
        val = data.get(key)
        if val is not None:
            setattr(item, key, val)

    db.session.commit()
    return item.to_dict()


def delete_item(activity, item_id: str, actor) -> None:
    """Delete one schedule item. Returns None (controller responds 204)."""
    campaign_service.assert_editable(activity)

    item = EventScheduleItem.query.get(item_id)
    if item is None or item.activity_id != activity.id:
        raise ApiError("Schedule item not found", "not_found", 404)

    db.session.delete(item)
    db.session.commit()


def reorder_item(activity, item_id: str, new_position: int) -> dict:
    """Move *item_id* to *new_position* and renumber every sibling.

    Clamps *new_position* into ``range(0, len(activity.schedule_items))``, removes
    the target from the ordered list, reinserts at the clamped index, then assigns
    each item's ``position`` to its list index. This keeps positions contiguous and
    prevents a save-in-flight on a different field from overwriting the reorder
    (plan 05-06's blur-save depends on the position-only PATCH path staying
    separate from the field-update path)."""
    item = EventScheduleItem.query.get(item_id)
    if item is None or item.activity_id != activity.id:
        raise ApiError("Schedule item not found", "not_found", 404)

    items = list(activity.schedule_items)  # already in declared order
    items = [i for i in items if i.id != item_id]
    clamped = max(0, min(new_position, len(items)))
    items.insert(clamped, item)

    for idx, i in enumerate(items):
        i.position = idx

    db.session.commit()
    return item.to_dict()


def presets_for_scale(scale: str) -> list:
    """Return the preset list for *scale*, or ``[]`` for an unknown scale.

    Uses dict.get with a default so an unknown scale yields an empty list
    rather than a KeyError (AC-07)."""
    return SCHEDULE_PRESETS.get(scale, [])
