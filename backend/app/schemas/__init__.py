"""Marshmallow schemas — request validation only (422 on failure).

Responses are shaped by each model's to_dict(); these guard the write paths."""
from marshmallow import Schema, fields, validate

from ..constants import (
    ACADEMIC_LEVELS,
    ACADEMIC_STATUSES,
    ACTIVITY_SCALES,
    COLLAB_ACCEPTED,
    COLLAB_DECLINED,
    SOCIAL_PLATFORM_KEYS,
    TEAM_ROLES,
    UPLOAD_URL_PATTERN,
)
from ..url_safety import MAX_SOCIAL_URL_LENGTH


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


class OrgProfileSchema(Schema):
    """ORG-01 — the editable half of an organisation's public profile.

    The 1000-character bound is server-side because organisations.bio is an
    unbounded db.Text and nothing upstream caps it: a client-side counter over a
    server with no limit is a promise the server does not keep (T-04-04).
    `bio` is optional so a PATCH can carry other fields once 04-02 and 04-03 add
    them, and nullable so clearing a bio is expressible.

    `logo_url` is here only so a null can clear it — there is no separate delete
    endpoint (UI-SPEC S3). A NON-null value is matched against the exact served
    path this server issues, because the upload endpoint is the only legitimate
    writer of one: an arbitrary string would reintroduce the external-hotlink
    shape D-01 rejected, and would also let a caller aim the unlink-on-replace
    path at a file of their choosing (T-04-25). The pattern is exact rather than
    a prefix check for that second reason."""

    bio = fields.Str(required=False, allow_none=True, validate=validate.Length(max=1000))
    logo_url = fields.Str(
        required=False,
        allow_none=True,
        validate=[
            validate.Length(max=300),
            validate.Regexp(UPLOAD_URL_PATTERN, error="Not a stored image."),
        ],
    )


class SocialLinkSchema(Schema):
    """ORG-02 — one social handle in a replace-all payload.

    The platform allowlist is imported, never restated: a third copy of it in the
    schema is how the UI, the schema and the service drift apart (the
    AcademicStatusSchema precedent above).

    `url` carries a length bound only. The shape of a URL is decided by
    `app.url_safety`, whose check is strictly stronger than a regex — it runs the
    scheme allowlist unconditionally and first, then rejects credentials, ports,
    non-ASCII hosts, IP literals and off-allowlist hosts. Duplicating a weaker
    check here would pre-empt it with a 422 whose message the editor cannot place
    on the offending row, where the domain rejection carries an explicit code and
    a `details` object naming the platform.
    """

    platform = fields.Str(required=True, validate=validate.OneOf(SOCIAL_PLATFORM_KEYS))
    url = fields.Str(
        required=True, validate=validate.Length(max=MAX_SOCIAL_URL_LENGTH)
    )


class SocialLinksReplaceSchema(Schema):
    """ORG-02 — the whole social section in one replace-all write.

    `links` absent means "no links", which is a valid saved state. `website` is
    absent-means-unchanged rather than absent-means-cleared, matching the partial
    PATCH rule the profile service already follows, so a client that only edits
    links cannot silently erase a site it never mentioned.
    """

    links = fields.List(fields.Nested(SocialLinkSchema), load_default=list)
    website = fields.Str(
        required=False,
        allow_none=True,
        validate=validate.Length(max=MAX_SOCIAL_URL_LENGTH),
    )


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

