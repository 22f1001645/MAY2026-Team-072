from flask import Blueprint, g, jsonify

from ..constants import ROLE_ADMIN
from ..rbac import auth_required, is_organiser
from ..repositories.repos import (
    ActivityRepository,
    AuditRepository,
    ExpenseRepository,
    NotificationRepository,
    RegistrationRepository,
    UserRepository,
)

misc_bp = Blueprint("misc", __name__, url_prefix="/api/v1")


@misc_bp.get("/health")
def health():
    return jsonify({"status": "ok", "service": "ekatva-os-api", "version": "v1"}), 200


@misc_bp.get("/notifications")
@auth_required
def notifications():
    items = NotificationRepository.for_user(g.current_user.id)
    return jsonify([n.to_dict() for n in items]), 200


@misc_bp.get("/dashboard")
@auth_required
def dashboard():
    """FR-F4 — role-based dashboard surface (events, tasks, approvals, reimbursements)."""
    user = g.current_user

    if user.role == ROLE_ADMIN:
        pending = ActivityRepository.proposals_by_status("pending")
        reimb = [e for e in ExpenseRepository.all() if e.status != "paid"]
        recent = AuditRepository.all_logs(limit=5)
        published = ActivityRepository.published_feed()
        students = UserRepository.students()
        return jsonify(
            {
                "role": "admin",
                "pending_approvals": len(pending),
                "pending_reimbursements": len(reimb),
                "reimbursement_value": sum(e.amount for e in reimb),
                "total_events": len(published),
                "total_students": len(students),
                "recent_audits": [a.to_dict() for a in recent],
            }
        ), 200

    if is_organiser(user):
        mine = ActivityRepository.by_organiser(user.id)
        total_reg = sum(a.registered_count() for a in mine)
        return jsonify(
            {
                "role": "organiser",
                "my_events": [a.to_dict() for a in mine],
                "total_registered": total_reg,
            }
        ), 200

    regs = RegistrationRepository.for_student(user.id)
    return jsonify(
        {
            "role": "student",
            "registrations": [r.to_dict() for r in regs],
            "attended": sum(1 for r in regs if r.attendance is not None),
        }
    ), 200
