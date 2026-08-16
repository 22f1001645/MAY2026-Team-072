"""Task service — CRUD for the activity Kanban board (TEAM-02).

Design decisions, mirroring schedule_service (plan 05-01):
- ``list_tasks`` reads the ordered backref and adds no sort of its own. The
  ordering ``(position, created_at, id)`` is declared on the backref itself
  (models/__init__.py:560-567). A second sort here would shadow the declared
  one, would drop the tiebreak, and would put AC-31/AC-32's correctness in two
  places.
- Services are the only place ``db.session.commit()`` is called; controllers do
  not open a database session.
- Every function starts with ``campaign_service.assert_campaign_live`` — the
  inverse of the ``assert_editable`` chokepoint, defined once in plan 05-01
  (AC-27, AC-33). The status comparison is deliberately not restated here: the
  helper exists so that the next route added to this board cannot forget it,
  including the read, since a workspace readable before publication is the
  disclosure T-05-21 names.
"""
from ..constants import TASK_TODO
from ..errors import ApiError
from ..extensions import db
from ..models import ActivityTask
from . import campaign_service


def list_tasks(activity) -> list:
    """Return all tasks for *activity* in declared backref order."""
    campaign_service.assert_campaign_live(activity)
    return [t.to_dict() for t in activity.tasks]


def create_task(activity, data: dict, actor) -> dict:
    """Create one task on *activity* and return its dict.

    Defaults ``status`` to TASK_TODO and ``position`` to ``len(activity.tasks)``
    when the payload omits them, so a new card lands at the end of the board."""
    campaign_service.assert_campaign_live(activity)

    task = ActivityTask(
        activity_id=activity.id,
        created_by=actor.id,
        title=data["title"],
        description=data.get("description"),
        assignee_id=data.get("assignee_id"),
        deadline=data.get("deadline"),
        status=data.get("status") or TASK_TODO,
        position=data.get("position") if data.get("position") is not None
        else len(activity.tasks),
    )
    db.session.add(task)
    db.session.commit()
    return task.to_dict()


def _task_for(activity, task_id: str) -> ActivityTask:
    """Load one task and prove it belongs to *activity*.

    The per-row identity check is the second half of T-05-20: the route guard
    proves authority over the activity in the URL, and this proves the task in
    the URL is one of that activity's own."""
    task = ActivityTask.query.get(task_id)
    if task is None or task.activity_id != activity.id:
        raise ApiError("Task not found", "not_found", 404)
    return task


def update_task(activity, task_id: str, data: dict, actor) -> dict:
    """Apply a partial update to one task and return its dict.

    Applies only the keys whose loaded value is not ``None``, so a PATCH
    carrying just ``status`` cannot blank ``deadline`` or ``assignee_id``
    (T-05-24)."""
    campaign_service.assert_campaign_live(activity)

    task = _task_for(activity, task_id)

    for key in ("title", "description", "assignee_id", "deadline", "status", "position"):
        val = data.get(key)
        if val is not None:
            setattr(task, key, val)

    db.session.commit()
    return task.to_dict()


def delete_task(activity, task_id: str, actor) -> None:
    """Delete one task. Returns None (controller responds 204)."""
    campaign_service.assert_campaign_live(activity)

    task = _task_for(activity, task_id)
    db.session.delete(task)
    db.session.commit()
