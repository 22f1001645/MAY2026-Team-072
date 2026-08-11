"""POR-based RBAC — permissions follow PORs, not the login role (PRD P3).

Two layers live here.

The coarse layer answers "is this person an organiser at all?". `admin_required`
gates governance endpoints and `organiser_required` allows any holder of an
active organiser POR. It cannot tell one event or organisation from another, so
it now exists only for the six pre-existing routes that already depended on it.

The resource-scoped layer answers "may this specific person act on this specific
activity or organisation?" — `can_manage_activity`, `can_participate_in_activity`,
`can_manage_org` and `is_meetup_head`, applied to routes through
`can_manage_activity_required`, `can_participate_in_activity_required`,
`meetup_head_required` and `can_manage_org_required`. Every activity- or
org-scoped endpoint added from this point uses the scoped layer (RBAC-02); the
gate in tests/test_rbac_enforcement.py fails the suite if one does not.

All four predicates are total functions: they return a plain bool for every
input, including a None user or a None resource, so an authorization question
can never turn into a 500 that a caller might handle permissively. Everything
here reads; nothing here writes.

Denies by default."""
from functools import wraps

from flask import g
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from .constants import (
    COLLAB_ACCEPTED,
    ORG_MANAGER_PORS,
    ORGANISER_PORS,
    REGISTRATION_CANCELLED,
    ROLE_ADMIN,
    TEAM_ROLE_MEETUP_HEAD,
)
from .errors import ApiError
from .models import (
    Activity,
    ActivityCollaborator,
    ActivityTeamMember,
    Organisation,
    Registration,
    User,
)


def _load_current_user() -> User:
    verify_jwt_in_request()
    user = User.query.get(get_jwt_identity())
    if not user:
        raise ApiError("Account not found", "unauthorized", 401)
    g.current_user = user
    return user


# --------------------------------------------------------------------------
# Shared traversal helpers
# --------------------------------------------------------------------------


def _active_pors(user):
    """Yield every ACTIVE PORAssignment the user holds, across all memberships.

    One traversal shared by the three POR-reading predicates. An expired or
    revoked POR is filtered out here and therefore grants nothing anywhere."""
    for membership in user.memberships:
        for por in membership.pors:
            if por.active:
                yield por


def _por_org_ids(por):
    """The Organisation ids a single POR assignment carries authority over.

    Two of them, because a POR can be scoped to an organisation other than the
    one its membership sits in: a Regional Coordinator's membership may live in
    a House while `region_id` points at the Region organisation they actually
    coordinate. Ids only — two organisations that happen to share a name or a
    city are still two organisations."""
    ids = set()
    membership = por.membership
    if membership is not None and membership.org_id:
        ids.add(membership.org_id)
    if por.region_id:
        ids.add(por.region_id)
    return ids


def _activity_org_ids(activity):
    """The set of Organisation ids that own or co-own this activity.

    Reads BOTH sides on purpose. `activity_collaborators` is the source of truth
    for "which organisations are running this activity" (plan 01-02), while
    `activities.org_id` survives as a denormalised cache of the primary. A
    predicate that trusted only one of them would deny a legitimate organiser
    for any activity where the two had not yet been written together."""
    ids = set()
    if activity.org_id:
        ids.add(activity.org_id)
    rows = ActivityCollaborator.query.filter_by(activity_id=activity.id).all()
    for row in rows:
        if row.org_id and (row.is_primary or row.status == COLLAB_ACCEPTED):
            ids.add(row.org_id)
    return ids


# --------------------------------------------------------------------------
# Coarse predicate (legacy)
# --------------------------------------------------------------------------


def is_organiser(user: User) -> bool:
    if user.role == ROLE_ADMIN:
        return True
    for m in user.memberships:
        for p in m.pors:
            if p.active and p.por_type in ORGANISER_PORS:
                return True
    return False


# --------------------------------------------------------------------------
# Resource-scoped predicates (RBAC-01, RBAC-03)
# --------------------------------------------------------------------------


def can_manage_org(user, org) -> bool:
    """May this user act on behalf of THIS organisation? (ORG-01, PROPOSAL-06)

    Cross-org authority is the threat this closes: a Secretary of org A naming
    org B's id in a URL. The boundary is org id identity — never name, never
    city. Team membership on an activity is never consulted here, because an
    Activity-scoped crew row grants zero org-wide permission (TEAM-03)."""
    if not user or not org:
        return False
    if user.role == ROLE_ADMIN:
        return True
    for por in _active_pors(user):
        if por.por_type in ORG_MANAGER_PORS and org.id in _por_org_ids(por):
            return True
    return False


def can_manage_activity(user, activity) -> bool:
    """May this user run THIS activity?

    Four independent grants: admin, the activity's own organiser, an event-team
    row on this activity, or an organiser POR in one of the organisations that
    own or co-own it. The team-membership branch returns immediately and does no
    organisation lookup at all — widening a crew row into org-wide permission is
    exactly what TEAM-03 forbids."""
    if not user or not activity:
        return False
    if user.role == ROLE_ADMIN:
        return True
    if activity.organiser_id and activity.organiser_id == user.id:
        return True
    crew = ActivityTeamMember.query.filter_by(
        activity_id=activity.id, user_id=user.id
    ).first()
    if crew is not None:
        return True
    org_ids = _activity_org_ids(activity)
    if not org_ids:
        return False
    for por in _active_pors(user):
        if por.por_type in ORGANISER_PORS and _por_org_ids(por) & org_ids:
            return True
    return False


def can_participate_in_activity(user, activity) -> bool:
    """May this user see and use THIS activity's attendee surfaces?

    A live registration is the ordinary grant; a cancelled one is not. Anyone
    who can manage the activity can also participate in it, so organisers and
    admins always see the surfaces their attendees see."""
    if not user or not activity:
        return False
    registration = Registration.query.filter_by(
        activity_id=activity.id, student_id=user.id
    ).first()
    if registration is not None and registration.status != REGISTRATION_CANCELLED:
        return True
    return can_manage_activity(user, activity)


def is_meetup_head(user, activity) -> bool:
    """Is this user the ONE assigned Meetup Head of THIS activity? (RBAC-03)

    There is deliberately no admin short-circuit and no can_manage_activity
    fallback, and neither should ever be added as a convenience. PROPOSAL-05
    gives an admin the power to REASSIGN the Meetup Head, which is a different
    power from acting as one. CAMPAIGN-06 (push a campaign live), FEEDBACK-01
    (submit the post-event report) and REIMB-01 (submit the reimbursement) all
    read this single function as "the one accountable submitter" — admitting a
    fallback here would silently turn three separate "only the Meetup Head
    submits" rules into "the Meetup Head or anyone senior to them".

    Written as an existence query so the answer is well-defined even under
    corrupt data, though plan 01-02's uq_team_meetup_head partial unique index
    makes a second Meetup Head row impossible at the database level."""
    if not user or not activity:
        return False
    row = ActivityTeamMember.query.filter_by(
        activity_id=activity.id, user_id=user.id, role=TEAM_ROLE_MEETUP_HEAD
    ).first()
    return row is not None


# --------------------------------------------------------------------------
# Guard decorators
# --------------------------------------------------------------------------


def _mark(wrapper, fn, name):
    """Record on the view function which guards wrap it.

    tests/test_rbac_enforcement.py reads this tuple off app.view_functions to
    police RBAC-02; without it the gate would have to parse source. Because
    functools.wraps copies __dict__ from the wrapped function onto the wrapper,
    the marker survives further decoration and guards accumulate in order."""
    inherited = tuple(getattr(fn, "_rbac_guards", ()))
    wrapper._rbac_guards = inherited + (name,)
    return wrapper


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        _load_current_user()
        return fn(*args, **kwargs)

    return _mark(wrapper, fn, "auth_required")


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _load_current_user()
        if user.role != ROLE_ADMIN:
            raise ApiError("Admin privileges required", "forbidden", 403)
        return fn(*args, **kwargs)

    return _mark(wrapper, fn, "admin_required")


def organiser_required(fn):
    """Coarse guard — any organiser POR anywhere. Legacy only.

    It cannot tell one activity from another, so it stays on the six routes that
    already used it and is not applied to anything new. New activity- or
    org-scoped routes use the scoped decorators below."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _load_current_user()
        if not is_organiser(user):
            raise ApiError("An organiser POR is required for this action", "forbidden", 403)
        return fn(*args, **kwargs)

    return _mark(wrapper, fn, "organiser_required")


_DENIAL_MESSAGES = {
    "can_manage_activity": "Organiser or event-team authority over this event is required",
    "can_participate_in_activity": "You must be registered for this event to do this",
    "is_meetup_head": "Only the assigned Meetup Head of this event may do this",
    "can_manage_org": "Authority over this organisation is required",
}


def _denial(predicate):
    return _DENIAL_MESSAGES.get(
        predicate.__name__, f"{predicate.__name__} is required for this action"
    )


def activity_scoped(predicate, param="activity_id"):
    """Build a guard that loads the Activity named in the URL and asks `predicate`.

    404 before the predicate, 403 after it. Activities are already readable by
    any authenticated user from the public city feed, so their existence is not
    a secret worth masking behind a uniform 404 (threat T-01-32, accepted).

    The loaded Activity is left on `g.activity` so the view does not re-query."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = _load_current_user()
            activity_id = kwargs.get(param)
            activity = Activity.query.get(activity_id) if activity_id else None
            if activity is None:
                raise ApiError("Event not found", "not_found", 404)
            if not predicate(user, activity):
                raise ApiError(_denial(predicate), "forbidden", 403)
            g.activity = activity
            return fn(*args, **kwargs)

        return _mark(wrapper, fn, predicate.__name__)

    return decorator


def org_scoped(predicate, param="org_id"):
    """Build a guard that loads the Organisation named in the URL and asks `predicate`.

    Same shape as `activity_scoped`; the loaded Organisation is left on `g.org`."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = _load_current_user()
            org_id = kwargs.get(param)
            org = Organisation.query.get(org_id) if org_id else None
            if org is None:
                raise ApiError("Organisation not found", "not_found", 404)
            if not predicate(user, org):
                raise ApiError(_denial(predicate), "forbidden", 403)
            g.org = org
            return fn(*args, **kwargs)

        return _mark(wrapper, fn, predicate.__name__)

    return decorator


# The four ready-made guards Phases 2-8 import. The factories above exist for
# the rarer route whose id parameter is not named `activity_id` or `org_id`.
can_manage_activity_required = activity_scoped(can_manage_activity)
can_participate_in_activity_required = activity_scoped(can_participate_in_activity)
meetup_head_required = activity_scoped(is_meetup_head)
can_manage_org_required = org_scoped(can_manage_org)


def manageable_orgs(user: User) -> list:
    if not user:
        return []
    if user.role == ROLE_ADMIN:
        return Organisation.query.all()
    org_ids = set()
    for por in _active_pors(user):
        if por.por_type in ORG_MANAGER_PORS:
            org_ids.update(_por_org_ids(por))
    if not org_ids:
        return []
    return Organisation.query.filter(Organisation.id.in_(org_ids)).all()


def manageable_activities(user: User) -> list:
    if not user:
        return []
    if user.role == ROLE_ADMIN:
        return Activity.query.all()
    
    activity_ids = set()
    
    # 1. Activities where user is the organiser
    for a in Activity.query.filter_by(organiser_id=user.id).all():
        activity_ids.add(a.id)
        
    # 2. Activities where user is in the team
    for c in ActivityTeamMember.query.filter_by(user_id=user.id).all():
        activity_ids.add(c.activity_id)
        
    # 3. Activities through POR
    org_ids = set()
    for por in _active_pors(user):
        if por.por_type in ORGANISER_PORS:
            org_ids.update(_por_org_ids(por))
            
    if org_ids:
        for a in Activity.query.filter(Activity.org_id.in_(org_ids)).all():
            activity_ids.add(a.id)
        for c in ActivityCollaborator.query.filter(
            ActivityCollaborator.org_id.in_(org_ids),
            (ActivityCollaborator.is_primary == True) | (ActivityCollaborator.status == COLLAB_ACCEPTED)
        ).all():
            activity_ids.add(c.activity_id)
            
    if not activity_ids:
        return []
    return Activity.query.filter(Activity.id.in_(activity_ids)).all()

