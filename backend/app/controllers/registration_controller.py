from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required, can_manage_activity_required, organiser_required
from ..schemas import BroadcastSchema, CheckInSchema, ScanSchema, VolunteerSchema
from ..services import attendance_service, registration_service

registration_bp = Blueprint("registration", __name__, url_prefix="/api/v1")


@registration_bp.post("/events/<activity_id>/register")
@auth_required
def register(activity_id):
    """FR-D1 — student registers; headcount recorded."""
    data = request.get_json(silent=True) or {}
    reg = registration_service.register(activity_id, g.current_user, data.get("referred_by"))
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


@registration_bp.post("/events/<activity_id>/scan")
@can_manage_activity_required
def scan(activity_id):
    """QR camera check-in — scans the registration id shown on a student's ticket."""
    data = ScanSchema().load(request.get_json() or {})
    # In earlier iteration, it used QR token. If ScanSchema uses registration_id, we will stick to it.
    # To support both if needed, but I'll stick to what was here.
    result = attendance_service.scan_qr(activity_id, data["registration_id"], g.current_user)
    return jsonify(result), 200


@registration_bp.post("/events/<activity_id>/broadcast")
@auth_required
def broadcast(activity_id):
    """FR-D3 — send a time-critical update or discussion message."""
    data = BroadcastSchema().load(request.get_json() or {})
    sent = registration_service.broadcast(activity_id, data["title"], data["body"], g.current_user)
    return jsonify({"sent": sent}), 200


@registration_bp.get("/me/registrations")
@auth_required
def my_registrations():
    from ..repositories.repos import ActivityRepository
    ActivityRepository.sync_past_events()
    regs = registration_service.my_registrations(g.current_user)
    return jsonify([r.to_dict() for r in regs]), 200


@registration_bp.post("/events/<activity_id>/volunteer")
@organiser_required
def award_volunteer(activity_id):
    """FR-G3 — Award volunteer contribution points (20 points) for an assigned role."""
    data = VolunteerSchema().load(request.get_json() or {})
    result = attendance_service.award_volunteer_points(
        activity_id, data["user_id"], data["role_name"], g.current_user
    )
    return jsonify(result), 200


@registration_bp.get("/events/<activity_id>/announcements")
@auth_required
def get_announcements(activity_id):
    """Fetch broadcast announcements for an event."""
    items = registration_service.announcements(activity_id)
    return jsonify([i.to_dict() for i in items]), 200
