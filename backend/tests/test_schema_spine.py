"""Constraint tests for the proposal-to-campaign spine (SCHEMA-02).

Every assertion here is deliberately made at the database level rather than
against a service. The two singletons — one primary collaborating organisation
and one Meetup Head per Activity — are authorization inputs (threats T-01-06 and
T-01-07): if either can be duplicated, "who owns this activity" and "who may
approve its campaign" become ambiguous whenever data is corrupt or two requests
race. A service check cannot make that impossible; a partial unique index can.
So these tests assert IntegrityError, not a raised ApiError.

Everything is built through the models rather than the HTTP API, so the file
stays independent of the proposal-service rules Phase 3 will rewrite.
"""
import pytest
from sqlalchemy.exc import IntegrityError

from app.constants import (
    CAMPAIGN_DRAFT,
    COLLAB_ACCEPTED,
    COLLAB_PENDING,
    TEAM_ROLE_MEETUP_HEAD,
)
from app.extensions import db
from app.models import (
    Activity,
    ActivityCollaborator,
    ActivityTeamMember,
    CampaignPackage,
    EventScheduleItem,
    Organisation,
    User,
)


def _activity():
    """A minimal Activity owned by the seeded region org and RC.

    Committed rather than flushed: several tests below roll back a deliberate
    IntegrityError, and a merely-flushed Activity would be discarded with it.
    """
    org = Organisation.query.filter_by(type="region").first()
    rc = User.query.filter_by(email="rc@ekatva.os").first()
    activity = Activity(
        org_id=org.id,
        title="Hyderabad Monsoon Meetup",
        city="Hyderabad",
        scale="local_meetup",
        capacity=30,
        organiser_id=rc.id,
    )
    db.session.add(activity)
    db.session.commit()
    return activity


def _orgs():
    org_a = Organisation.query.filter_by(type="region").first()
    org_b = Organisation.query.filter_by(type="house").first()
    return org_a, org_b


def _users():
    rc = User.query.filter_by(email="rc@ekatva.os").first()
    student = User.query.filter_by(email="arav@ekatva.os").first()
    return rc, student


def test_only_one_primary_collaborator_per_activity(app):
    """T-01-07: two primary organisations would make ownership ambiguous."""
    activity = _activity()
    org_a, org_b = _orgs()

    db.session.add(
        ActivityCollaborator(
            activity_id=activity.id,
            org_id=org_a.id,
            is_primary=True,
            status=COLLAB_ACCEPTED,
        )
    )
    db.session.commit()

    db.session.add(
        ActivityCollaborator(
            activity_id=activity.id,
            org_id=org_b.id,
            is_primary=True,
            status=COLLAB_ACCEPTED,
        )
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    # The partial index must not block a legitimate second, non-primary
    # collaborator — that is the normal multi-entity case (PROPOSAL-01).
    db.session.add(
        ActivityCollaborator(
            activity_id=activity.id,
            org_id=org_b.id,
            is_primary=False,
            status=COLLAB_PENDING,
        )
    )
    db.session.commit()

    assert len(activity.collaborators) == 2
    assert sum(1 for c in activity.collaborators if c.is_primary) == 1


def test_same_org_cannot_be_named_twice(app):
    """One organisation appearing twice would double-count it toward the Mega
    Meetup label (PROPOSAL-03) and the fest threshold (PROG-02)."""
    activity = _activity()
    org_a, _ = _orgs()

    db.session.add(
        ActivityCollaborator(
            activity_id=activity.id, org_id=org_a.id, status=COLLAB_PENDING
        )
    )
    db.session.commit()

    db.session.add(
        ActivityCollaborator(
            activity_id=activity.id, org_id=org_a.id, status=COLLAB_ACCEPTED
        )
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    assert len(activity.collaborators) == 1


def test_only_one_meetup_head_per_activity(app):
    """T-01-06: the row RBAC-03's campaign-approval authority is read from."""
    activity = _activity()
    rc, student = _users()

    db.session.add(
        ActivityTeamMember(
            activity_id=activity.id, user_id=rc.id, role=TEAM_ROLE_MEETUP_HEAD
        )
    )
    db.session.commit()

    db.session.add(
        ActivityTeamMember(
            activity_id=activity.id, user_id=student.id, role=TEAM_ROLE_MEETUP_HEAD
        )
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    # The positive half: a constraint that blocks legitimate rows is as broken
    # as one that permits illegitimate ones.
    db.session.add(
        ActivityTeamMember(
            activity_id=activity.id, user_id=student.id, role="Co-Head"
        )
    )
    db.session.commit()

    roles = sorted(m.role for m in activity.team_members)
    assert roles == ["Co-Head", TEAM_ROLE_MEETUP_HEAD]


def test_same_user_can_hold_two_different_roles(app):
    """Uniqueness is on (activity, user, role) — one person can wear two hats,
    but not the same hat twice."""
    activity = _activity()
    rc, _ = _users()

    db.session.add_all(
        [
            ActivityTeamMember(
                activity_id=activity.id, user_id=rc.id, role="Designer"
            ),
            ActivityTeamMember(
                activity_id=activity.id, user_id=rc.id, role="Finance"
            ),
        ]
    )
    db.session.commit()

    assert sorted(m.role for m in activity.team_members) == ["Designer", "Finance"]

    db.session.add(
        ActivityTeamMember(activity_id=activity.id, user_id=rc.id, role="Designer")
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    assert len(activity.team_members) == 2


def test_ordered_collections_break_ties_deterministically(app):
    """The SCHEMA-02 ordering edge.

    The point is not which item wins a tie — it is that a tie has a specified
    and stable answer, supplied by the relationship's order_by, so no downstream
    page renders a schedule that shuffles between requests.
    """
    activity = _activity()

    db.session.add_all(
        [
            EventScheduleItem(
                activity_id=activity.id, position=1, title="Tied item A"
            ),
            EventScheduleItem(
                activity_id=activity.id, position=1, title="Tied item B"
            ),
            EventScheduleItem(
                activity_id=activity.id, position=0, title="Opening remarks"
            ),
        ]
    )
    db.session.commit()

    db.session.expire_all()
    first_read = [item.id for item in activity.schedule_items]
    db.session.expire_all()
    second_read = [item.id for item in activity.schedule_items]

    assert len(first_read) == 3
    assert first_read == second_read, "tied schedule items came back in a different order"
    assert activity.schedule_items[0].title == "Opening remarks"


def test_campaign_package_is_one_per_activity(app):
    """CAMPAIGN-06 approves a package, singular — two would mean the Meetup Head
    could approve one while a different one went live."""
    activity = _activity()

    db.session.add(
        CampaignPackage(
            activity_id=activity.id,
            mail_subject="Come to the monsoon meetup",
            status=CAMPAIGN_DRAFT,
        )
    )
    db.session.commit()

    db.session.add(
        CampaignPackage(activity_id=activity.id, mail_subject="Duplicate package")
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    assert activity.campaign is not None
    assert activity.campaign.mail_subject == "Come to the monsoon meetup"
