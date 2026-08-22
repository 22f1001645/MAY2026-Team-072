from flask import Blueprint, g, jsonify, request

from ..rbac import admin_required, organiser_required
from ..schemas import ExpenseSchema
from ..services import expense_service

expense_bp = Blueprint("expenses", __name__, url_prefix="/api/v1")


@expense_bp.post("/expenses")
@organiser_required
def submit():
    """FR-E2 — submit an expense with a bill against a budget line."""
    data = ExpenseSchema().load(request.get_json() or {})
    return jsonify(expense_service.submit_expense(data, g.current_user).to_dict()), 201


@expense_bp.get("/events/<activity_id>/expenses")
@organiser_required
def for_activity(activity_id):
    return jsonify([e.to_dict() for e in expense_service.for_activity(activity_id)]), 200


@expense_bp.patch("/expenses/<expense_id>/verify")
@admin_required
def verify(expense_id):
    """FR-E3/E4 — verify / advance reimbursement one stage."""
    return jsonify(expense_service.advance(expense_id, g.current_user).to_dict()), 200


@expense_bp.patch("/expenses/<expense_id>/amount")
@admin_required
def update_amount(expense_id):
    """Allow admins to partially approve a reimbursement by lowering the amount."""
    data = request.get_json() or {}
    new_amount = data.get("amount")
    if new_amount is None:
        from ..errors import bad_request
        return bad_request("Missing amount")
    return jsonify(expense_service.update_amount(expense_id, int(new_amount), g.current_user).to_dict()), 200


@expense_bp.get("/reimbursements")
@admin_required
def queue():
    return jsonify([e.to_dict() for e in expense_service.all_expenses()]), 200


@expense_bp.patch("/expenses/bulk-verify")
@admin_required
def bulk_verify():
    """FR-E3 — bulk advance reimbursement status for multiple expenses."""
    data = request.get_json() or {}
    expense_ids = data.get("expense_ids", [])
    updated = expense_service.bulk_advance(expense_ids, g.current_user)
    return jsonify([e.to_dict() for e in updated]), 200
