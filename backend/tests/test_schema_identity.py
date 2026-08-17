"""Schema tests for organisation identity, close-out, channel and session
(SCHEMA-02, second half).

Two kinds of assertion live here.

The first is the SCHEMA-02 existing-rows edge, kept as a permanent gate rather
than a one-time review: eleven columns land on four tables that already contain
rows on five developers' machines, and a single non-nullable column without a
server_default breaks every one of their `flask db upgrade` runs (threat
T-01-17). That check runs on every suite run and names all offenders at once.

The second is the once-per-user and one-per-parent family. Like the spine tests
in test_schema_spine.py, these assert IntegrityError rather than service
behaviour: a service check cannot make a second poll vote impossible, a unique
constraint can (threats T-01-14, T-01-15).
"""
import pytest
from sqlalchemy.exc import IntegrityError

from app.constants import BRAND_KIT_AI_DRAFT, POLL_OPEN
from app.extensions import db
from app.models import (
    Activity,
    BrandKit,
    EventFeedback,
    EventPoll,
    EventPollVote,
    Organisation,
    OrgProgressionUnlock,
    RefreshTokenBlocklist,
    ReimbursementRequest,
    User,
    _utcnow,
)

# The eleven columns plan 01-03 adds to tables that already hold rows.
NEW_COLUMNS_ON_POPULATED_TABLES = (
    ("users", "academic_level"),
    ("users", "academic_status"),
    ("users", "academic_confirmed_at"),
    ("organisations", "bio"),
    ("organisations", "logo_url"),
    ("reports", "challenges"),
    ("reports", "learnings"),
    ("reports", "status"),
    ("reports", "submitted_by"),
    ("reports", "submitted_at"),
    ("attendance", "method"),
)


def _activity(title="Hyderabad Monsoon Meetup"):
    """A minimal Activity owned by the seeded region org and RC.

    Committed rather than flushed, following test_schema_spine.py: several tests
    below roll back a deliberate IntegrityError, and a merely-flushed Activity
    would be discarded along with it.
    """
    org = Organisation.query.filter_by(type="region").first()
    rc = User.query.filter_by(email="rc@ekatva.os").first()
    activity = Activity(
        org_id=org.id,
        title=title,
        city="Hyderabad",
        scale="local_meetup",
        capacity=30,
        organiser_id=rc.id,
    )
    db.session.add(activity)
    db.session.commit()
    return activity


def _users():
    rc = User.query.filter_by(email="rc@ekatva.os").first()
    student = User.query.filter_by(email="arav@ekatva.os").first()
    return rc, student


def test_new_columns_on_populated_tables_are_upgrade_safe(app):
    """The SCHEMA-02 existing-rows edge (threat T-01-17).

    A teammate runs `flask db upgrade` against a database that already has rows.
    A non-nullable column with no server_default fails that upgrade outright, and
    the failure surfaces on their machine rather than here unless something
    checks. This is that something, and it stays live for every future column
    added to these tables.
    """
    offenders = []
    for table_name, column_name in NEW_COLUMNS_ON_POPULATED_TABLES:
        table = db.metadata.tables[table_name]
        assert column_name in table.c, f"{table_name}.{column_name} is not declared"
        column = table.c[column_name]
        if not column.nullable and column.server_default is None:
            offenders.append(f"{table_name}.{column_name}")

    assert not offenders, (
        "these columns are NOT NULL with no server_default, so applying them to "
        "a database that already has rows will fail: " + ", ".join(offenders)
    )


def test_existing_rows_backfill_to_truthful_defaults(app):
    """The two backfills record history rather than inventing it.

    Every Report row that exists today was in fact submitted - drafts had
    nowhere to live before this column - so `submitted` is what happened. Every
    Attendance row came from the tap-based roster flow, because QR check-in does
    not exist yet, so `manual` is what happened. A different default here would
    be a guess written into rows nobody can go back and check.
    """
    report_status = db.metadata.tables["reports"].c["status"]
    attendance_method = db.metadata.tables["attendance"].c["method"]

    assert report_status.server_default is not None
    assert attendance_method.server_default is not None
    assert "submitted" in str(report_status.server_default.arg)
    assert "manual" in str(attendance_method.server_default.arg)


def test_user_votes_once_per_poll(app):
    """T-01-14: uq_poll_vote is the whole of "each registrant votes once"."""
    activity = _activity()
    rc, student = _users()

    poll = EventPoll(
        activity_id=activity.id,
        question="Which slot suits you?",
        options=["Morning", "Evening"],
        status=POLL_OPEN,
        created_by=rc.id,
    )
    db.session.add(poll)
    db.session.commit()

    db.session.add(
        EventPollVote(poll_id=poll.id, user_id=student.id, option_index=0)
    )
    db.session.commit()

    db.session.add(
        EventPollVote(poll_id=poll.id, user_id=student.id, option_index=1)
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    # The positive half: a constraint that blocks a legitimate second voter
    # would break the poll entirely.
    db.session.add(EventPollVote(poll_id=poll.id, user_id=rc.id, option_index=1))
    db.session.commit()

    assert len(poll.votes) == 2
    assert sorted(v.option_index for v in poll.votes) == [0, 1]


def test_attendee_rates_once_per_activity(app):
    """T-01-15: one person must not be able to move an event's average alone."""
    activity = _activity()
    rc, student = _users()

    db.session.add(
        EventFeedback(activity_id=activity.id, user_id=student.id, rating=5,
                      comment="Well run")
    )
    db.session.commit()

    db.session.add(
        EventFeedback(activity_id=activity.id, user_id=student.id, rating=5)
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    # A second, different attendee still rates normally.
    db.session.add(
        EventFeedback(activity_id=activity.id, user_id=rc.id, rating=4)
    )
    db.session.commit()

    assert len(activity.feedback) == 2


def test_single_brand_kit_per_org_and_single_reimbursement_request_per_activity(app):
    """Two brand kits would make "the org's voice" ambiguous for the campaign
    generator; two reimbursement requests would make REIMB-02's admin review
    ambiguous about which claim it approved."""
    region = Organisation.query.filter_by(type="region").first()
    house = Organisation.query.filter_by(type="house").first()
    activity = _activity()
    rc, _ = _users()

    db.session.add(BrandKit(org_id=region.id, voice_tone="Warm and direct"))
    db.session.commit()

    db.session.add(BrandKit(org_id=region.id, source=BRAND_KIT_AI_DRAFT))
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    # A different organisation still gets its own kit.
    db.session.add(BrandKit(org_id=house.id, voice_tone="Playful"))
    db.session.commit()

    db.session.add(
        ReimbursementRequest(
            activity_id=activity.id,
            social_post_link="https://example.org/post/1",
            submitted_by=rc.id,
        )
    )
    db.session.commit()

    db.session.add(
        ReimbursementRequest(
            activity_id=activity.id,
            social_post_link="https://example.org/post/2",
            submitted_by=rc.id,
        )
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    # A different activity still gets its own request.
    other = _activity(title="Chennai Winter Meetup")
    db.session.add(
        ReimbursementRequest(
            activity_id=other.id,
            social_post_link="https://example.org/post/3",
            submitted_by=rc.id,
        )
    )
    db.session.commit()

    assert region.brand_kit is not None
    assert house.brand_kit is not None
    assert activity.reimbursement_request.social_post_link.endswith("/1")
    assert other.reimbursement_request is not None


def test_refresh_token_jti_is_unique_and_indexed(app):
    """T-01-13: a revoked refresh token must never be accepted again.

    Uniqueness keeps one jti to one revocation record. The indexes matter as
    much: the jti lookup runs on every single refresh, and the expires_at prune
    would otherwise scan what becomes the hottest table in the auth flow.
    """
    rc, _ = _users()
    expiry = _utcnow()

    db.session.add(
        RefreshTokenBlocklist(jti="jti-aaaa", user_id=rc.id, expires_at=expiry)
    )
    db.session.commit()

    db.session.add(RefreshTokenBlocklist(jti="jti-aaaa", expires_at=expiry))
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    # A different token from the same user still records normally.
    db.session.add(
        RefreshTokenBlocklist(jti="jti-bbbb", user_id=rc.id, expires_at=expiry)
    )
    db.session.commit()

    table = db.metadata.tables["refresh_token_blocklist"]
    indexed_columns = {
        column.name for index in table.indexes for column in index.columns
    }
    assert "jti" in indexed_columns, "the per-refresh revocation lookup is unindexed"
    assert "expires_at" in indexed_columns, (
        "pruning expired blocklist rows would be a full table scan"
    )
    assert RefreshTokenBlocklist.query.count() == 2


def test_org_progression_unlock_is_unique_per_org_and_city(app):
    """PROG-03 records one unlock per (org, city). The row is the marker, not the
    eligibility source - PROG-01 stays computed from completed activities."""
    region = Organisation.query.filter_by(type="region").first()

    db.session.add(OrgProgressionUnlock(org_id=region.id, city="Hyderabad"))
    db.session.commit()

    db.session.add(OrgProgressionUnlock(org_id=region.id, city="Hyderabad"))
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()

    # The same organisation unlocking a second city is the normal case.
    db.session.add(OrgProgressionUnlock(org_id=region.id, city="Chennai"))
    db.session.commit()

    cities = sorted(u.city for u in OrgProgressionUnlock.query.all())
    assert cities == ["Chennai", "Hyderabad"]
