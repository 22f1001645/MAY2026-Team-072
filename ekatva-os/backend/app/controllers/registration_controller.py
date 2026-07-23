from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required, organiser_required
from ..schemas import BroadcastSchema, CheckInSchema
from ..services import attendance_service, registration_service

registration_bp = Blueprint("registration", __name__, url_prefix="/api/v1")


@registration_bp.post("/events/<activity_id>/register")
@auth_required
def register(activity_id):
    """FR-D1 — student registers; headcount recorded."""
    reg = registration_service.register(activity_id, g.current_user)
    return jsonify(reg.to_dict()), 201


@registration_bp.delete("/events/<activity_id>/register")
@auth_required
def unregister(activity_id):
    registration_service.unregister(activity_id, g.current_user)
    return jsonify({"ok": True}), 200


@registration_bp.get("/events/<activity_id>/registrations")
@organiser_required
def roster(activity_id):
    """FR-D5 — registered headcount visible to organisers in real time."""
    regs = registration_service.roster(activity_id)
    return jsonify([r.to_dict() for r in regs]), 200


@registration_bp.post("/events/<activity_id>/attendance")
@organiser_required
def check_in(activity_id):
    """FR-D6 — mark registered students attended."""
    data = CheckInSchema().load(request.get_json() or {})
    result = attendance_service.check_in(activity_id, data["registration_ids"], g.current_user)
    return jsonify(result), 200


@registration_bp.post("/events/<activity_id>/broadcast")
@organiser_required
def broadcast(activity_id):
    """FR-D3 — send a time-critical update to registrants."""
    data = BroadcastSchema().load(request.get_json() or {})
    sent = registration_service.broadcast(activity_id, data["title"], data["body"], g.current_user)
    return jsonify({"sent": sent}), 200


@registration_bp.get("/me/registrations")
@auth_required
def my_registrations():
    regs = registration_service.my_registrations(g.current_user)
    return jsonify([r.to_dict() for r in regs]), 200
