"""The one-batch invariant (SCHEMA-02).

The milestone schema landed as a SINGLE Alembic revision on top of the baseline.
That is not a stylistic preference — it is what makes the "do two migrations
touch the same table in a conflicting order?" question unanswerable-because-
impossible, and it is what lets a teammate pick up 16 tables and 11 columns with
one `flask db upgrade` instead of a destructive reseed.

These tests fail if that stops being true.
"""
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.config import Config as AlembicConfig
from alembic.script import ScriptDirectory
from flask_migrate import upgrade as alembic_upgrade

from app import create_app
from app.config import TestConfig
from app.extensions import db
import app.models  # noqa: F401  - registers every model on db.metadata

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"

BASELINE_REVISION = "312ea9fc2c96"
BATCH_REVISION = "213804635519"
HEAD_REVISION = "dd6a0887416b" # dd6a0887416b — add action_url to notifications
# If a FUTURE phase legitimately adds a revision, this number is the thing to
# update – deliberately, in a review, alongside a note saying which revision was
# added and why. It is not the thing to delete. The count is what stops a
# schema change from quietly arriving as three half-reviewed revisions.
EXPECTED_REVISION_COUNT = 11
# 7th: f997686e136b adds organisations.website — ORG-02 decision D-03 models the
# organisation's own site as a distinct column rather than a `platform` row on
# organisation_social_links, so the host-allowlist guarantee stays true of every
# social-link row without a carve-out. Additive, nullable, no reseed.
# 9th: fb6abd48384e adds city_alert_subscriptions — student-dashboard feature,
# additive new table, no reseed.
# 10th: f53685e71b8e adds notifications.target_role — student-dashboard feature,
# additive nullable column, no reseed.

# The 16 tables the batch revision introduced.
BATCH_TABLES = {
    "activity_collaborators",
    "activity_team_members",
    "activity_tasks",
    "event_schedule_items",
    "registration_form_fields",
    "registration_field_responses",
    "campaign_packages",
    "organisation_social_links",
    "brand_kits",
    "event_feedback",
    "event_polls",
    "event_poll_votes",
    "event_queries",
    "refresh_token_blocklist",
    "org_progression_unlocks",
    "reimbursement_requests",
}


def _script_directory():
    config = AlembicConfig(str(MIGRATIONS_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    return ScriptDirectory.from_config(config)


@pytest.fixture
def fresh_migrated_app(tmp_path):
    """An app whose database was built by the migration chain from EMPTY.

    Same shape as `migrated_app` in test_migrations.py, replicated rather than
    imported so this module stands alone. Alembic needs a persistent connection
    target, so this uses a real file under tmp_path — never
    backend/instance/ekatva.db.
    """
    db_file = tmp_path / "fresh.db"
    assert not db_file.exists(), "the fixture must start from a database that does not exist"

    class _FreshConfig(TestConfig):
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_file.as_posix()}"

    app = create_app(_FreshConfig)
    with app.app_context():
        alembic_upgrade(directory=str(MIGRATIONS_DIR))
        yield app
        db.session.remove()
        db.engine.dispose()


def test_exactly_one_migration_head():
    """Two heads mean two people generated a revision against the same parent,
    and the next `flask db upgrade` fails with a multiple-heads error."""
    heads = _script_directory().get_heads()

    assert len(heads) == 1, f"expected a single head, found: {heads}"
    assert heads[0] == HEAD_REVISION


def test_exactly_two_revisions():
    """The baseline plus one batch. With a single batch revision, two migrations
    cannot conflict over a shared table, because there is only one."""
    script = _script_directory()
    revisions = list(script.walk_revisions())

    assert len(revisions) == EXPECTED_REVISION_COUNT, (
        "expected exactly the baseline + the milestone batch, found: "
        f"{[r.revision for r in revisions]}"
    )

    batch = script.get_revision(BATCH_REVISION)
    assert batch.down_revision == BASELINE_REVISION, (
        "the batch revision must chain directly onto the baseline"
    )
    assert script.get_revision(BASELINE_REVISION).down_revision is None


def test_fresh_database_upgrades_to_full_schema_in_one_run(fresh_migrated_app):
    """The SCHEMA-02 fresh/empty edge: a brand-new database reaches the complete
    schema in one upgrade, and a second upgrade is a harmless no-op."""
    inspector = sa.inspect(db.engine)
    tables = set(inspector.get_table_names())

    missing_batch = BATCH_TABLES - tables
    assert not missing_batch, f"batch tables absent from a fresh upgrade: {sorted(missing_batch)}"

    # Every model the application declares, not just the new ones. The batch
    # window is closed, so there are no permitted exceptions left.
    missing_any = set(db.metadata.tables) - tables
    assert not missing_any, f"migration chain did not create: {sorted(missing_any)}"

    assert len(tables) >= 35, (  # 34 application tables + alembic_version
        f"expected at least 35 tables including alembic_version, found {len(tables)}"
    )

    # Running upgrade again at head must do nothing rather than fail.
    alembic_upgrade(directory=str(MIGRATIONS_DIR))

    assert set(sa.inspect(db.engine).get_table_names()) == tables
