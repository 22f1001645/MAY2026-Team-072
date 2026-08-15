"""Marshmallow schemas — request validation only (422 on failure).

Responses are shaped by each model's to_dict(); these guard the write paths."""
from marshmallow import Schema, fields, validate

from ..constants import (
    ACADEMIC_LEVELS,
    ACADEMIC_STATUSES,
    ACTIVITY_SCALES,
    COLLAB_ACCEPTED,
    COLLAB_DECLINED,
    FORM_FIELD_TYPES,
    TEAM_ROLES,
)


class RegisterSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=2, max=120))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))
    region_id = fields.Str(required=True)            # Official 10-region anchor
    city = fields.Str(load_default=None, allow_none=True)  # Specific city (optional)


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)


class BudgetLineSchema(Schema):
    label = fields.Str(required=True)
    planned = fields.Int(required=True, validate=validate.Range(min=0))


class TeamMemberInputSchema(Schema):
    """PROPOSAL-02: one member of the proposed team roster."""
    user_id = fields.String(required=True)
    role = fields.String(required=True, validate=validate.OneOf(TEAM_ROLES))


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
    # Phase 3 additions (PROPOSAL-01, PROPOSAL-02)
    team = fields.List(fields.Nested(TeamMemberInputSchema), load_default=list)
    collaborating_org_ids = fields.List(fields.String(), load_default=list)


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


class ScanSchema(Schema):
    registration_id = fields.Str(required=True)


class ProfileSchema(Schema):
    city = fields.Str(load_default=None, allow_none=True)


class EditEventSchema(Schema):
    title = fields.Str(load_default=None, allow_none=True)
    description = fields.Str(load_default=None, allow_none=True)
    starts_at = fields.DateTime(load_default=None, allow_none=True)
    venue = fields.Str(load_default=None, allow_none=True)
    update_message = fields.Str(load_default="", allow_none=True)


class AcademicStatusSchema(Schema):
    """AUTH-04 self-confirmation. The allowlists are imported, never restated —
    a third copy of these enums is how the UI, the schema and the service drift
    apart."""

    academic_level = fields.Str(required=True, validate=validate.OneOf(ACADEMIC_LEVELS))
    academic_status = fields.Str(required=True, validate=validate.OneOf(ACADEMIC_STATUSES))


class AdminAcademicOverrideSchema(AcademicStatusSchema):
    """D-22 admin override. `reason` is optional by design: the audit row already
    carries actor, target, old and new, so a mandatory reason would be a gate the
    requirement does not ask for and would train admins to type "."."""

    reason = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=500))


class PORSchema(Schema):
    user_id = fields.Str(required=True)
    por_type = fields.Str(required=True)
    term = fields.Str(load_default="May 2026")
    region_id = fields.Str(load_default=None, allow_none=True)   # Required for RC assignments


class OrgSchema(Schema):
    name = fields.Str(required=True)
    type = fields.Str(required=True, validate=validate.OneOf(["house", "society", "region", "council"]))
    city = fields.Str(required=True)


class ReportSchema(Schema):
    summary = fields.Str(required=True, validate=validate.Length(min=10))


class VolunteerSchema(Schema):
    user_id = fields.Str(required=True)
    role_name = fields.Str(load_default="Volunteer")


class CollabRespondSchema(Schema):
    """PROPOSAL-06: accept or decline a collaboration invite."""
    status = fields.String(
        required=True,
        validate=validate.OneOf([COLLAB_ACCEPTED, COLLAB_DECLINED]),
    )


class ReassignMeetupHeadSchema(Schema):
    """PROPOSAL-05: reassign the Meetup Head role to a different user."""
    new_meetup_head_user_id = fields.String(required=True)


class FormFieldSchema(Schema):
    """CAMPAIGN-05: create one custom registration field.

    `field_type` is validated against FORM_FIELD_TYPES imported from constants
    — never a restated literal. A value outside that tuple returns 422 from the
    Marshmallow central handler (never a 400 from hand-written code)."""

    label = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    field_type = fields.Str(required=True, validate=validate.OneOf(FORM_FIELD_TYPES))
    options = fields.List(
        fields.Str(validate=validate.Length(min=1, max=120)),
        load_default=list,
    )
    required = fields.Bool(load_default=False)
    position = fields.Int(load_default=0, validate=validate.Range(min=0))


class FormFieldPatchSchema(Schema):
    """CAMPAIGN-05: partial update of one custom field.

    Follows EditEventSchema's nullable-partial shape."""

    label = fields.Str(load_default=None, allow_none=True, validate=validate.Length(min=1, max=120))
    field_type = fields.Str(load_default=None, allow_none=True, validate=validate.OneOf(FORM_FIELD_TYPES))
    options = fields.List(
        fields.Str(validate=validate.Length(min=1, max=120)),
        load_default=None,
        allow_none=True,
    )
    required = fields.Bool(load_default=None, allow_none=True)
    position = fields.Int(load_default=None, allow_none=True, validate=validate.Range(min=0))


class ScheduleItemSchema(Schema):
    """DESIGN-01: create one row of the event agenda."""

    time_block = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=60))
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    owner_id = fields.Str(load_default=None, allow_none=True)
    owner_label = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=120))
    notes = fields.Str(load_default=None, allow_none=True)
    position = fields.Int(load_default=None, allow_none=True, validate=validate.Range(min=0))


class ScheduleItemPatchSchema(Schema):
    """DESIGN-01: partial update of one agenda row."""

    time_block = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=60))
    title = fields.Str(load_default=None, allow_none=True, validate=validate.Length(min=1, max=200))
    owner_id = fields.Str(load_default=None, allow_none=True)
    owner_label = fields.Str(load_default=None, allow_none=True, validate=validate.Length(max=120))
    notes = fields.Str(load_default=None, allow_none=True)
    position = fields.Int(load_default=None, allow_none=True, validate=validate.Range(min=0))
