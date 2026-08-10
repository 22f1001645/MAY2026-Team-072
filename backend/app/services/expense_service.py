from ..constants import ACTIVITY_FEE_INR, EXPENSE_FLOW, EXPENSE_SUBMITTED, EXPENSE_APPROVED, EXPENSE_PAID
from ..errors import ApiError
from ..extensions import db
from ..models import Expense
from ..repositories.repos import ActivityRepository, AuditRepository, ExpenseRepository


def submit_expense(data: dict, organiser) -> Expense:
    activity = ActivityRepository.by_id(data["activity_id"])
    if not activity:
        raise ApiError("Activity not found", "activity_not_found", 404)

    expense = Expense(
        activity_id=activity.id,
        budget_line_id=data.get("budget_line_id"),
        label=data["label"],
        amount=data["amount"],
        status=EXPENSE_SUBMITTED,
        bill_name=data.get("bill_name", "bill.pdf"),
        submitted_by=organiser.id,
        # REIMB-02: supplementary social post link, stored for admin review
        social_post_link=data.get("social_post_link"),
    )
    db.session.add(expense)
    AuditRepository.record("expense", expense.id, "Expense submitted", organiser, data["label"])
    db.session.commit()
    return expense


def advance(expense_id: str, admin) -> Expense:
    """Move one step along Submitted → Verified → Approved → Paid (FR-E3/E4).
    The system tracks status only; it never moves real money (FR-E6)."""
    expense = ExpenseRepository.by_id(expense_id)
    if not expense:
        raise ApiError("Expense not found", "expense_not_found", 404)

    idx = EXPENSE_FLOW.index(expense.status)
    if idx >= len(EXPENSE_FLOW) - 1:
        raise ApiError("Expense is already marked paid", "already_paid", 409)

    next_status = EXPENSE_FLOW[idx + 1]
    
    if next_status == EXPENSE_APPROVED:
        activity = expense.activity
        if activity:
            approved_total = sum(e.amount for e in activity.expenses if e.status in (EXPENSE_APPROVED, EXPENSE_PAID))
            max_allowed = ACTIVITY_FEE_INR * activity.attended_count()
            if (approved_total + expense.amount) > max_allowed:
                raise ApiError(f"Reimbursement cap exceeded. Max allowed based on actual check-ins is ₹{max_allowed}.", "cap_exceeded", 409)

    expense.status = next_status
    AuditRepository.record(
        "expense", expense.id, f"Advanced to {expense.status}", admin
    )
    db.session.commit()
    return expense


def for_activity(activity_id):
    return ExpenseRepository.for_activity(activity_id)


def all_expenses():
    return ExpenseRepository.all()


def bulk_advance(expense_ids: list, admin) -> list:
    """FR-E3 — Bulk advance multiple expense bills at once."""
    updated = []
    for eid in expense_ids:
        expense = ExpenseRepository.by_id(eid)
        if not expense:
            continue
        idx = EXPENSE_FLOW.index(expense.status)
        if idx < len(EXPENSE_FLOW) - 1:
            expense.status = EXPENSE_FLOW[idx + 1]
            AuditRepository.record("expense", expense.id, f"Bulk advanced to {expense.status}", admin)
            updated.append(expense)
    db.session.commit()
    return updated
