"""Marshmallow schemas — request validation only (422 on failure).

Responses are shaped by each model's to_dict(); these guard the write paths."""
from marshmallow import (
    Schema,
    ValidationError,
    fields,
    validate,
    validates,
    validates_schema,
)

from ..constants import (
    ACADEMIC_LEVELS,
    ACADEMIC_STATUSES,
    ACTIVITY_SCALES,
    BRAND_KIT_MANUAL,
    BRAND_KIT_SOURCES,
    COLLAB_ACCEPTED,
    COLLAB_DECLINED,
    FORM_FIELD_TYPES,
    REPORT_STATES,
    SOCIAL_PLATFORM_KEYS,
    STUDENT_EMAIL_DOMAIN,
    TASK_STATUSES,
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

    @validates("email")
    def validate_student_email(self, value):
        """Only IIT Madras online-degree student addresses are permitted.

        The domain is a single constant (STUDENT_EMAIL_DOMAIN) so the rule lives
        in one place. Lowercase before comparing so casing accidents are not
        a silent bypass."""
        if not value.lower().endswith(f"@{STUDENT_EMAIL_DOMAIN}"):
            raise ValidationError(
                f"Only @{STUDENT_EMAIL_DOMAIN} email addresses are accepted."
            )


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


class ExpenseDraftRowSchema(Schema):
    """REIMB-01 — one row of the expense draft list.

    `id` present means "edit this row", absent means "create one", and that is
    the only thing that decides which fields are required. Every field is
    nullable so an edit carrying only `amount` says nothing about the label and
    expense_service leaves that column alone — the EditEventSchema and
    TaskPatchSchema rule, applied to a row inside a list.

    A NEW row still needs a label, because a bill with no description is not a
    draft of anything. That rule is conditional on `id`, so it lives in
    `_label_is_required_on_a_new_row` rather than in `required=True`, which
    cannot see the rest of the row. Both string bounds match the declared column
    widths, so an over-long value is a placeable 422 rather than a database
    error on commit.
    """

    id = fields.Str(load_default=None, allow_none=True)
    label = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(min=1, max=200)
    )
    amount = fields.Int(
        load_default=None, allow_none=True, validate=validate.Range(min=0)
    )
    bill_name = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(max=200)
    )

    @validates_schema
    def _label_is_required_on_a_new_row(self, data, **kwargs):
        if not data.get("id") and not data.get("label"):
            raise ValidationError(
                "Missing data for required field.", field_name="label"
            )


class ExpenseDraftSchema(Schema):
    """REIMB-01/REIMB-02 — the whole expense list in one write, plus the
    Meetup Head's optional submit.

    `expenses` defaults to an empty list so a bare `{"submit": true}` is a valid
    "submit what is already drafted" call. `submit` is a flag rather than a
    second endpoint because the UI's Submit button both saves the row the user
    is still typing and closes the list (decision D-11); splitting it would let
    those two halves land in either order.

    `social_post_url` carries a length bound only, following SocialLinkSchema:
    the shape of a URL is decided by `app.url_safety`, and whether one is
    REQUIRED depends on `submit`, which is a service-layer question. Duplicating
    either check here would pre-empt a placeable, coded rejection with a bare
    422 the Reimbursement panel cannot attach to the field.
    """

    expenses = fields.List(fields.Nested(ExpenseDraftRowSchema), load_default=list)
    submit = fields.Bool(load_default=False)
    social_post_url = fields.Str(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=MAX_SOCIAL_URL_LENGTH),
    )


class BroadcastSchema(Schema):
    title = fields.Str(required=True)
    body = fields.Str(required=True)


class CheckInSchema(Schema):
    registration_ids = fields.List(fields.Str(), required=True)


class ScanSchema(Schema):
    qr_token = fields.Str(required=False, allow_none=True)
    registration_id = fields.Str(required=False, allow_none=True)


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
    name = fields.Str(required=True, validate=validate.Length(min=1, max=150))
    type = fields.Str(load_default="society", validate=validate.OneOf(["house", "society", "region", "council"]))
    city = fields.Str(required=False, allow_none=True, load_default="Online")
    category = fields.Str(required=False, allow_none=True, validate=validate.Length(max=80))
    tagline = fields.Str(required=False, allow_none=True, validate=validate.Length(max=255))
    description = fields.Str(required=False, allow_none=True)
    bio = fields.Str(required=False, allow_none=True)
    logo_url = fields.Str(required=False, allow_none=True)
    banner_url = fields.Str(required=False, allow_none=True)
    website = fields.Str(required=False, allow_none=True, validate=validate.Length(max=300))
    instagram = fields.Str(required=False, allow_none=True, validate=validate.Length(max=300))
    linkedin = fields.Str(required=False, allow_none=True, validate=validate.Length(max=300))
    x = fields.Str(required=False, allow_none=True, validate=validate.Length(max=300))
    youtube = fields.Str(required=False, allow_none=True, validate=validate.Length(max=300))
    facebook = fields.Str(required=False, allow_none=True, validate=validate.Length(max=300))
    github = fields.Str(required=False, allow_none=True, validate=validate.Length(max=300))


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


class BrandKitSchema(Schema):
    """ORG-03 — the whole brand kit in one replace-all write.

    Every bound here is the only bound that exists. `brand_kits.palette` and
    `sample_phrases` are JSON columns, and neither SQLite nor Postgres enforces
    anything about what goes inside one, so nothing below is a duplicate of a
    database constraint.

    The palette pattern is a stored-XSS gate rather than a formatting
    preference (T-04-26). Phase 5's campaign generator interpolates these
    strings into generated mail HTML in a CSS context, so a free-text colour is
    a CSS-context injection. Six hex digits only: no `rgb()` form, no named
    colour, no three-digit shorthand — each of those would need its own parser
    downstream, and the one that gets it wrong is the one that ships.

    `source` is provenance metadata, never an authorization input (T-04-29): a
    client that lies about it changes nothing that matters. The enum is
    validated anyway so a Phase 5 reader can rely on the value set, and it is
    imported rather than restated, following AcademicStatusSchema above.
    """

    voice_tone = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(max=500)
    )
    palette = fields.List(
        fields.Str(
            validate=validate.Regexp(
                r"^#[0-9a-fA-F]{6}$", error="Use a six-digit hex colour like #5ce6c9."
            )
        ),
        load_default=list,
        validate=validate.Length(max=6),
    )
    sample_phrases = fields.List(
        fields.Str(validate=validate.Length(min=1, max=200)),
        load_default=list,
        validate=validate.Length(max=10),
    )
    source = fields.Str(
        load_default=BRAND_KIT_MANUAL, validate=validate.OneOf(BRAND_KIT_SOURCES)
    )


class ReportSchema(Schema):
    summary = fields.Str(required=True, validate=validate.Length(min=10))


class ReportPatchSchema(Schema):
    """FEEDBACK-01 — the post-event reflection, saved as a draft or submitted.

    Every field is nullable and defaults to None, so a PATCH carrying only
    `challenges` says nothing about `learnings` and proposal_service leaves that
    column alone (the EditEventSchema / TaskPatchSchema partial-PATCH rule).
    The panel auto-saves each textarea on blur (D-03, D-12), which is exactly a
    request that mentions one field and not the other.

    `status` is a field rather than a second endpoint because the Submit button
    both saves the textarea the user is still in and closes the report (D-11's
    reasoning, applied to D-12): splitting it would let those two halves land in
    either order. WHO may set it to `submitted` is deliberately not decided here
    — that depends on the caller, not on the payload, so it lives in the service
    where `is_meetup_head` can be asked (RBAC-03).

    Neither text field carries a length bound: both columns are `Text`, so a
    bound here would be a limit this schema invented rather than one the
    database has, and it would truncate a genuinely long reflection with a 422
    the panel could not explain.
    """

    challenges = fields.Str(load_default=None, allow_none=True)
    learnings = fields.Str(load_default=None, allow_none=True)
    status = fields.Str(
        load_default=None, allow_none=True, validate=validate.OneOf(REPORT_STATES)
    )


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


class TaskSchema(Schema):
    """TEAM-02: create one card on the activity's Kanban board.

    `status` is validated against TASK_STATUSES imported from constants — the
    three status strings are never restated here, following FormFieldSchema and
    AcademicStatusSchema above. A value outside that tuple is turned into a 422
    by the central Marshmallow ValidationError handler (errors.py:31-34), so it
    never reaches a column, which is what AC-34 asserts.

    The 200-character title bound matches the declared column width, so the
    server keeps the promise the character counter makes (T-05-23)."""

    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    description = fields.Str(load_default=None, allow_none=True)
    assignee_id = fields.Str(load_default=None, allow_none=True)
    deadline = fields.DateTime(load_default=None, allow_none=True)
    status = fields.Str(
        load_default=None, allow_none=True, validate=validate.OneOf(TASK_STATUSES)
    )
    position = fields.Int(load_default=None, allow_none=True, validate=validate.Range(min=0))


class TaskPatchSchema(TaskSchema):
    """TEAM-02: partial update of one card. Follows EditEventSchema's shape —
    every field nullable, so a PATCH carrying only `status` says nothing about
    the rest and task_service leaves those columns alone (T-05-24)."""

    title = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(min=1, max=200)
    )


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


class MailSchema(Schema):
    """CAMPAIGN-01: the organiser's edited mail subject and body.

    Both nullable so a PATCH carrying only the body says nothing about the
    subject — campaign_service.save_mail applies only the keys it was given.
    ``mail_subject`` is capped at the column's own width so an over-long subject
    is a placeable 422 rather than a database error on commit.
    """

    mail_subject = fields.Str(
        load_default=None, allow_none=True, validate=validate.Length(max=200)
    )
    mail_body = fields.Str(load_default=None, allow_none=True)


class CityAlertSubscriptionCreate(Schema):
    email = fields.Email(required=True)
    city = fields.Str(required=True, validate=validate.Length(min=1))


class FeedbackSchema(Schema):
    """FEEDBACK-02 — one attendee's post-event rating.

    `rating` is required and bounded to 1-5 at the schema layer, which means
    the service never receives an out-of-range value and can skip re-validation.
    `comment` is optional; the Text column has no fixed cap, but 2 000 chars
    matches UX expectations (a meaningful paragraph, not an essay).
    """

    rating = fields.Int(required=True, validate=validate.Range(min=1, max=5))
    comment = fields.Str(load_default=None, allow_none=True,
                         validate=validate.Length(max=2000))
