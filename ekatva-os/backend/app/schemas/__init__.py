"""Marshmallow schemas — request validation only (422 on failure).

Responses are shaped by each model's to_dict(); these guard the write paths."""
from marshmallow import Schema, fields, validate

from ..constants import ACTIVITY_SCALES


class RegisterSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))
    city = fields.Str(required=True)


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class BudgetLineSchema(Schema):
    label = fields.Str(required=True)
    planned = fields.Int(required=True, validate=validate.Range(min=0))


class ProposalSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=3, max=200))
    org_id = fields.Str(required=True)
    city = fields.Str(required=True)
    scale = fields.Str(required=True, validate=validate.OneOf(ACTIVITY_SCALES))
    venue = fields.Str(required=True)
    starts_at = fields.DateTime(required=True)
    capacity = fields.Int(required=True, validate=validate.Range(min=1))
    description = fields.Str(load_default="")
    budget = fields.List(fields.Nested(BudgetLineSchema), load_default=list)


class DecisionSchema(Schema):
    decision = fields.Str(required=True, validate=validate.OneOf(["approve", "changes", "reject"]))
    note = fields.Str(load_default="")


class ExpenseSchema(Schema):
    activity_id = fields.Str(required=True)
    budget_line_id = fields.Str(load_default=None, allow_none=True)
    label = fields.Str(required=True)
    amount = fields.Int(required=True, validate=validate.Range(min=1))
    bill_name = fields.Str(load_default="bill.pdf")


class BroadcastSchema(Schema):
    title = fields.Str(required=True)
    body = fields.Str(required=True)


class CheckInSchema(Schema):
    registration_ids = fields.List(fields.Str(), required=True)


class PORSchema(Schema):
    user_id = fields.Str(required=True)
    por_type = fields.Str(required=True)
    term = fields.Str(load_default="May 2026")


class OrgSchema(Schema):
    name = fields.Str(required=True)
    type = fields.Str(required=True, validate=validate.OneOf(["house", "society", "region", "council"]))
    city = fields.Str(required=True)


class ReportSchema(Schema):
    summary = fields.Str(required=True, validate=validate.Length(min=10))


class VolunteerSchema(Schema):
    user_id = fields.Str(required=True)
    role_name = fields.Str(load_default="Volunteer")
