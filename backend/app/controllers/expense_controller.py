from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..rbac import admin_required, can_manage_activity_required, organiser_required
from ..schemas import ExpenseDraftSchema, ExpenseSchema
from ..services import expense_service

expense_bp = Blueprint("expenses", __name__, url_prefix="/api/v1")


@expense_bp.post("/expenses")
@organiser_required
def submit():
    """FR-E2 — submit an expense with a bill against a budget line."""
    data = ExpenseSchema().load(request.get_json() or {})
    return jsonify(expense_service.submit_expense(data, g.current_user).to_dict()), 201


@expense_bp.patch("/activities/<activity_id>/expenses")
@can_manage_activity_required
def draft_expenses(activity_id):
    """REIMB-01/REIMB-02 - save the expense draft list; optionally submit it.

    The route guard is can_manage_activity_required, not meetup_head_required,
    because the guard answers the question the whole call cannot avoid: may this
    person touch this event's expenses at all? Any team member may (REIMB-01).
    The narrower "only the Meetup Head submits" rule (REIMB-02) is conditional
    on the `submit` flag in the body, which a route guard cannot see, so it is
    enforced in the service - the one place that knows whether this particular
    call is a save or a submission.

    The URL id is deliberately the only one the guard checks; expense ids in the
    body are re-checked against it in the service so a row belonging to another
    event cannot be edited through an event this caller does manage.

    `activities/` rather than the legacy `events/` prefix: the path parameter on
    an activity-scoped route is `activity_id` and the segment matches it.
    """
    data = ExpenseDraftSchema().load(request.get_json() or {})
    result = expense_service.draft_and_submit(
        activity_id,
        data["expenses"],
        data["submit"],
        data.get("social_post_url"),
        g.current_user,
    )
    return jsonify(result), 200


@expense_bp.post("/activities/<activity_id>/expenses/bill")
@can_manage_activity_required
def upload_bill(activity_id):
    """Store a receipt or invoice and return the name to attach to an expense.

    Same guard as the draft route: any team member may build the expense list,
    so any of them may attach the bills that go with it (REIMB-01).

    Like the poster route, this deliberately does not measure the upload —
    MAX_CONTENT_LENGTH refuses an oversize body before Flask buffers it, whereas
    a length check here could only run once the whole body was already in memory.
    There is no serve route here either: GET /api/v1/uploads/<filename> already
    routes through send_from_directory and sets nosniff.
    """
    bill = request.files.get("bill")
    if bill is None:
        raise ApiError("Attach a bill to upload.", "missing_file", 400)
    return jsonify(expense_service.store_bill(g.activity, bill, g.current_user)), 200


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
