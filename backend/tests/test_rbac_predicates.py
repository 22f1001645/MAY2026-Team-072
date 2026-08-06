"""The resource-scoped authorization matrix (RBAC-01, RBAC-03).

Every assertion here is about ONE specific person against ONE specific activity
or organisation. The coarse `organiser_required` cannot tell two events apart;
these four predicates are what replaces it, so the matrix covers not just the
happy grants but the four edges an authorization function fails on quietly:
absent inputs, empty relations, adjacent-but-different resources, and ordering.
"""
from datetime import datetime, timedelta

from app.constants import (
    REGISTRATION_CANCELLED,
    REGISTRATION_CONFIRMED,
    TEAM_ROLE_MEETUP_HEAD,
)
from app.extensions import db
from app.models import (
    Activity,
    ActivityTeamMember,
    Membership,
    Organisation,
    PORAssignment,
    Registration,
    User,
)
from app.rbac import (
    can_manage_activity,
    can_manage_org,
    can_participate_in_activity,
    is_meetup_head,
)

from .conftest import (
    admin_user,
    crew_user,
    meetup_head_user,
    other_org,
    rc_user,
    region_org,
    student_user,
)


def _make_activity(org, organiser, title="Hyderabad Monsoon Meetup"):
    activity = Activity(
        org_id=org.id,
        title=title,
        city="Hyderabad",
        scale="local_meetup",
        starts_at=datetime.utcnow() + timedelta(days=7),
        capacity=50,
        organiser_id=organiser.id,
    )
    db.session.add(activity)
    db.session.flush()
    return activity


def _scenario():
    """One activity with a full cast: organiser, crew, Meetup Head, registrant."""
    org = region_org()
    rc = rc_user()
    activity = _make_activity(org, rc)

    db.session.add_all([
        ActivityTeamMember(activity_id=activity.id, user_id=crew_user().id, role="Designer"),
        ActivityTeamMember(
            activity_id=activity.id, user_id=meetup_head_user().id, role=TEAM_ROLE_MEETUP_HEAD
        ),
        Registration(
            activity_id=activity.id, student_id=student_user().id, status=REGISTRATION_CONFIRMED
        ),
    ])
    db.session.flush()
    return activity


def _give_por(user, org, por_type, active=True, region=None):
    membership = Membership(user_id=user.id, org_id=org.id)
    db.session.add(membership)
    db.session.flush()
    por = PORAssignment(
        membership_id=membership.id,
        por_type=por_type,
        term="May 2026",
        active=active,
        region_id=region.id if region else None,
    )
    db.session.add(por)
    db.session.flush()
    db.session.expire(user)
    return por


def _nobody():
    """A user with no membership, no POR, no registration and no team row."""
    user = User(name="Nobody", email="nobody@ekatva.os",
                password_hash="x", role="student", city="Hyderabad")
    db.session.add(user)
    db.session.flush()
    return user


# --- can_manage_org: the boundary is org id identity -------------------------


def test_can_manage_org_grants_own_org_and_denies_the_next_one(app):
    rc = rc_user()
    home = region_org()
    org_b = other_org()

    assert home.id != org_b.id

    assert can_manage_org(rc, home) is True
    assert can_manage_org(rc, org_b) is False


def test_can_manage_org_does_not_merge_two_orgs_that_share_a_name_and_city(app):
    """The adjacency edge — a lookalike organisation is still a different one."""
    rc = rc_user()
    home = region_org()

    twin = Organisation(name=home.name, type=home.type, city=home.city)
    db.session.add(twin)
    db.session.flush()

    assert twin.id != home.id
    assert twin.name == home.name and twin.city == home.city
    assert can_manage_org(rc, home) is True
    assert can_manage_org(rc, twin) is False


def test_can_manage_org_ignores_team_membership(app):
    """TEAM-03 — an Activity crew row must never widen into org-wide authority."""
    activity = _scenario()
    crew = crew_user()

    assert can_manage_activity(crew, activity) is True
    assert can_manage_org(crew, region_org()) is False
    assert can_manage_org(crew, other_org()) is False


# --- can_manage_activity -----------------------------------------------------


def test_can_manage_activity_grants(app):
    activity = _scenario()

    assert can_manage_activity(admin_user(), activity) is True
    assert can_manage_activity(rc_user(), activity) is True          # the organiser
    assert can_manage_activity(crew_user(), activity) is True        # a team row
    assert can_manage_activity(meetup_head_user(), activity) is True # also a team row
    assert can_manage_activity(student_user(), activity) is False    # merely registered


def test_an_inactive_por_grants_nothing(app):
    """An expired or revoked POR is not a weaker grant; it is no grant."""
    activity = _scenario()
    home = region_org()
    former = _nobody()
    _give_por(former, home, "House Secretary", active=False)

    assert can_manage_activity(former, activity) is False
    assert can_manage_org(former, home) is False


# --- can_participate_in_activity ---------------------------------------------


def test_can_participate_follows_a_live_registration(app):
    activity = _scenario()
    student = student_user()

    assert can_participate_in_activity(student, activity) is True

    registration = Registration.query.filter_by(
        activity_id=activity.id, student_id=student.id
    ).first()
    registration.status = REGISTRATION_CANCELLED
    db.session.flush()

    assert can_participate_in_activity(student, activity) is False


def test_can_participate_falls_back_to_the_manage_path(app):
    """Crew hold no registration at all, yet must see what attendees see."""
    activity = _scenario()
    crew = crew_user()

    assert Registration.query.filter_by(
        activity_id=activity.id, student_id=crew.id
    ).first() is None
    assert can_participate_in_activity(crew, activity) is True


# --- is_meetup_head: a distinct per-activity authority (RBAC-03) -------------


def test_is_meetup_head_is_narrower_than_can_manage_activity(app):
    """Asserted side by side so the distinction cannot be optimised away."""
    activity = _scenario()
    head = meetup_head_user()
    crew = crew_user()

    assert is_meetup_head(head, activity) is True

    assert can_manage_activity(crew, activity) is True
    assert is_meetup_head(crew, activity) is False


def test_is_meetup_head_denies_an_admin_and_the_organiser(app):
    """Admin authority over the role is reassignment, never impersonation."""
    activity = _scenario()

    assert can_manage_activity(admin_user(), activity) is True
    assert is_meetup_head(admin_user(), activity) is False

    assert can_manage_activity(rc_user(), activity) is True
    assert is_meetup_head(rc_user(), activity) is False


# --- Empty edges -------------------------------------------------------------


def test_a_user_with_no_relations_is_denied_everything(app):
    activity = _scenario()
    nobody = _nobody()

    assert can_manage_activity(nobody, activity) is False
    assert can_participate_in_activity(nobody, activity) is False
    assert is_meetup_head(nobody, activity) is False
    assert can_manage_org(nobody, region_org()) is False


def test_an_activity_with_no_team_has_no_meetup_head(app):
    bare = _make_activity(region_org(), rc_user(), title="Team-less Meetup")

    assert ActivityTeamMember.query.filter_by(activity_id=bare.id).count() == 0
    for user in (admin_user(), rc_user(), crew_user(), student_user(), _nobody()):
        assert is_meetup_head(user, bare) is False


# --- Ordering edge -----------------------------------------------------------


def test_two_pors_do_not_depend_on_traversal_order(app):
    """The predicates are any-match existence checks over ALL active PORs.

    A second, unrelated POR must not change the first one's answer, and the
    answer must not depend on which POR the traversal happens to reach first."""
    home = region_org()
    org_b = other_org()

    one_por = _nobody()
    _give_por(one_por, home, "House Secretary")
    assert can_manage_org(one_por, home) is True
    assert can_manage_org(one_por, org_b) is False

    two_pors = User(name="Both", email="both@ekatva.os",
                    password_hash="x", role="student", city="Hyderabad")
    db.session.add(two_pors)
    db.session.flush()
    home_por = _give_por(two_pors, home, "House Secretary")
    _give_por(two_pors, org_b, "Society Secretary")

    # Adding the second POR changed neither outcome for the first organisation.
    assert can_manage_org(two_pors, home) is True
    assert can_manage_org(two_pors, org_b) is True

    # Deactivating one revokes exactly one grant and leaves the other standing.
    home_por.active = False
    db.session.flush()
    db.session.expire(two_pors)
    assert can_manage_org(two_pors, home) is False
    assert can_manage_org(two_pors, org_b) is True


# --- Absent inputs -----------------------------------------------------------


def test_every_predicate_is_total(app):
    """No predicate may raise. A 500 from an authorization question is a hazard,
    because a caller that catches broadly could treat it as a soft failure."""
    activity = _scenario()
    org = region_org()
    student = student_user()

    for predicate, resource in (
        (can_manage_activity, activity),
        (can_participate_in_activity, activity),
        (is_meetup_head, activity),
        (can_manage_org, org),
    ):
        assert predicate(None, resource) is False
        assert predicate(student, None) is False
        assert predicate(None, None) is False
