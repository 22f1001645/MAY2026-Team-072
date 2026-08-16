"""Task controller — TEAM-02 CRUD for the activity Kanban board.

Route shape follows schedule_controller.py (plan 05-01):
  - Blueprint url_prefix="/api/v1"
  - URL parameter MUST be spelled <activity_id>: activity_scoped reads
    kwargs.get("activity_id"), so any other spelling silently 404s.
  - g.activity is already loaded and authorised; task_service takes the
    Activity object and never re-queries by id.

Every route carries can_manage_activity_required — the board belongs to the
crew of one activity and to nobody else (T-05-20).
"""
from flask import Blueprint, g, jsonify, request

from ..rbac import can_manage_activity_required
from ..schemas import TaskPatchSchema, TaskSchema
from ..services import task_service

task_bp = Blueprint("tasks", __name__, url_prefix="/api/v1")


@task_bp.get("/activities/<activity_id>/tasks")
@can_manage_activity_required
def list_tasks(activity_id):
    return jsonify(task_service.list_tasks(g.activity)), 200


@task_bp.post("/activities/<activity_id>/tasks")
@can_manage_activity_required
def create_task(activity_id):
    data = TaskSchema().load(request.get_json() or {})
    task = task_service.create_task(g.activity, data, g.current_user)
    return jsonify(task), 201


@task_bp.patch("/activities/<activity_id>/tasks/<task_id>")
@can_manage_activity_required
def update_task(activity_id, task_id):
    data = TaskPatchSchema().load(request.get_json() or {})
    task = task_service.update_task(g.activity, task_id, data, g.current_user)
    return jsonify(task), 200


@task_bp.delete("/activities/<activity_id>/tasks/<task_id>")
@can_manage_activity_required
def delete_task(activity_id, task_id):
    task_service.delete_task(g.activity, task_id, g.current_user)
    return "", 204
