"""Migration-foundation tests (SCHEMA-01).

These prove the four things the migration path has to be true for, and would
otherwise only be discovered when a teammate's database breaks:

1. the metadata naming convention is registered and unchanged,
2. an empty database upgrades to the complete schema,
3. a SQLite batch add-then-drop column keeps every row and the unique index,
4. the models and the migrations have not drifted apart.

Every test here runs against a throwaway SQLite file under pytest's tmp_path.
Nothing in this module ever touches backend/instance/ekatva.db.
"""
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.operations import Operations
from flask_migrate import upgrade as alembic_upgrade
from sqlalchemy.exc import IntegrityError

from app import create_app
from app.config import TestConfig
from app.extensions import NAMING_CONVENTION, db
import app.models  # noqa: F401  - registers every model on db.metadata

MIGRATIONS_DIR = str(Path(__file__).resolve().parents[1] / "migrations")

# Structural differences that are always real drift. SQLite reflection routinely
# reports cosmetic server-default and type differences that are not.
STRUCTURAL_OPS = {"add_table", "remove_table", "add_column", "remove_column"}

# --------------------------------------------------------------------------- #
# The Phase 1 batch window (SCHEMA-02)
# --------------------------------------------------------------------------- #
# SCHEMA-02 requires every table this milestone needs to be declared in ONE
# batch, so no later phase forces a second destructive reset. Plans 01-02 and
# 01-03 therefore declare models with no migration, and plan 01-04 emits a
# single revision covering all of them at once.
#
# For that window only, these tables are allowed to exist in the models while
# being absent from the migration chain. The gate stays fully live for every
# other table: anything drifting outside this list still fails.
#
# Plan 01-03 appends its own tables here. Plan 01-04 empties this set in the
# same commit as the batch revision — and `test_pending_batch_list_is_accurate`
# below forces that, because it fails once a listed table is actually migrated.
PENDING_BATCH_TABLES = frozenset(
    {
        # declared by plan 01-02 (proposal → campaign spine)
        "activity_collaborators",
        "activity_team_members",
        "activity_tasks",
        "event_schedule_items",
        "registration_form_fields",
        "registration_field_responses",
        "campaign_packages",
        # declared by plan 01-03 (org identity, close-out, channel, session)
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
)

# Plan 01-03 also adds columns to four tables that are ALREADY fully migrated.
# Those are listed as (table, column) pairs rather than by table name on purpose:
# allowlisting `users` wholesale would blind the drift gate to every future
# column on the most security-relevant table in the schema, which is a far bigger
# hole than the one the batch window needs.
PENDING_BATCH_COLUMNS = frozenset(
    {
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
    }
)


def _entry_table(entry):
    """The table name an autogenerate diff tuple refers to."""
    op = entry[0]
    if op in {"add_table", "remove_table"}:
        return entry[1].name
    if op in {"add_column", "remove_column"}:
        return entry[2]
    return None


def _is_inside_batch_window(entry):
    """True when this diff is one of the deliberately unmigrated declarations."""
    table = _entry_table(entry)
    if table in PENDING_BATCH_TABLES:
        return True
    if entry[0] in {"add_column", "remove_column"}:
        return (table, entry[3].name) in PENDING_BATCH_COLUMNS
    return False


@pytest.fixture
def migrated_app(tmp_path):
    """An app whose database was built by the migration chain, not create_all().

    Alembic needs a persistent connection target, so this uses a real file in
    tmp_path rather than TestConfig's `sqlite:///:memory:`.
    """
    db_file = tmp_path / "migrated.db"

    class _MigratedConfig(TestConfig):
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{db_file.as_posix()}"

    app = create_app(_MigratedConfig)
    with app.app_context():
        alembic_upgrade(directory=MIGRATIONS_DIR)
        yield app
        db.session.remove()
        db.engine.dispose()


def _batch_users(operation):
    """Run one batch_alter_table operation on `users` in its own transaction."""
    with db.engine.connect() as connection:
        with connection.begin():
            context = MigrationContext.configure(connection)
            operations = Operations(context)
            with operations.batch_alter_table(
                "users", naming_convention=NAMING_CONVENTION
            ) as batch_op:
                operation(batch_op)


_STAMP = "2026-01-01 00:00:00"


def _insert_user(user_id, email, name, region_id=None):
    """Insert one users row naming only columns the migration chain created."""
    with db.engine.begin() as connection:
        connection.execute(
            sa.text(
                "INSERT INTO users (id, email, name, password_hash, role, region_id,"
                " created_at, updated_at) VALUES (:id, :email, :name, :pw, 'student',"
                " :region_id, :now, :now)"
            ),
            {
                "id": user_id,
                "email": email,
                "name": name,
                "pw": "not-a-real-hash",
                "region_id": region_id,
                "now": _STAMP,
            },
        )


def _insert_probe_rows():
    """One organisation and one user, so the FK on users.region_id is exercised."""
    with db.engine.begin() as connection:
        connection.execute(
            sa.text(
                "INSERT INTO organisations (id, name, type, city, created_at,"
                " updated_at) VALUES ('org-probe', 'Hyderabad Regional Chapter',"
                " 'region', 'Hyderabad', :now, :now)"
            ),
            {"now": _STAMP},
        )
    _insert_user("user-probe", "probe@ekatva.os", "Probe", region_id="org-probe")


def _probe_email():
    with db.engine.connect() as connection:
        return connection.execute(
            sa.text("SELECT email FROM users WHERE id = 'user-probe'")
        ).scalar()


def _flatten(diff):
    """Autogenerate returns tuples, or lists of tuples for multi-column changes."""
    for entry in diff:
        if isinstance(entry, list):
            yield from entry
        else:
            yield entry


def test_naming_convention_is_registered():
    """The convention must stay exactly as the baseline revision rendered it.

    Editing it after revisions exist produces constraints SQLite batch mode
    cannot reflect, so this asserts the format strings, not just the keys.
    """
    convention = db.metadata.naming_convention

    assert convention == NAMING_CONVENTION
    assert set(convention) == {"ix", "uq", "ck", "fk", "pk"}
    assert convention["ix"] == "ix_%(column_0_label)s"
    assert convention["uq"] == "uq_%(table_name)s_%(column_0_name)s"
    assert convention["ck"] == "ck_%(table_name)s_%(constraint_name)s"
    assert (
        convention["fk"]
        == "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"
    )
    assert convention["pk"] == "pk_%(table_name)s"


def test_upgrade_from_empty_creates_full_schema(migrated_app):
    """SCHEMA-01 empty-database edge: the first upgrade on a clean file must
    produce the whole schema, not a partial one."""
    tables = set(sa.inspect(db.engine).get_table_names())

    missing = set(db.metadata.tables) - tables - PENDING_BATCH_TABLES
    assert not missing, f"migration chain did not create: {sorted(missing)}"
    assert "alembic_version" in tables


def test_batch_add_and_drop_column_preserves_rows(migrated_app):
    """The ROADMAP Phase 1 criterion: add AND drop a column on SQLite with all
    rows preserved.

    `users` is deliberately the subject — it carries both a unique index and a
    foreign key, so the table-copy that batch mode performs has to reflect and
    recreate both. A table without them would not exercise the risky path.

    Rows go in through explicit SQL rather than the ORM: during the SCHEMA-02
    batch window the models carry columns (users.academic_level,
    organisations.bio) that the migration chain has not created yet, so an ORM
    insert would fail here for a reason that has nothing to do with batch mode
    and would mask the behaviour this test exists to prove.
    """
    _insert_probe_rows()

    # --- add ---------------------------------------------------------------
    _batch_users(
        lambda batch_op: batch_op.add_column(
            sa.Column("scratch_probe", sa.String(16), nullable=True)
        )
    )
    assert _probe_email() == "probe@ekatva.os", "row lost during batch add_column"

    # --- drop --------------------------------------------------------------
    _batch_users(lambda batch_op: batch_op.drop_column("scratch_probe"))
    assert _probe_email() == "probe@ekatva.os", "row lost during batch drop_column"

    columns = {c["name"] for c in sa.inspect(db.engine).get_columns("users")}
    assert "scratch_probe" not in columns

    # The unique index has to have survived the table copy, otherwise the drop
    # silently removed a constraint the application depends on.
    with pytest.raises(IntegrityError):
        _insert_user("user-duplicate", "probe@ekatva.os", "Duplicate")


def test_models_match_migrations_no_drift(migrated_app):
    """A model changed without a migration means a teammate's `flask db upgrade`
    yields a schema the code cannot use. Fail here instead of there."""
    with db.engine.connect() as connection:
        context = MigrationContext.configure(
            connection, opts={"compare_type": True}
        )
        diff = compare_metadata(context, db.metadata)

    structural = [
        entry
        for entry in _flatten(diff)
        if isinstance(entry, tuple)
        and entry
        and entry[0] in STRUCTURAL_OPS
        and not _is_inside_batch_window(entry)
    ]

    assert not structural, (
        "models and migrations have drifted — run `flask db migrate`:\n"
        + "\n".join(repr(entry) for entry in structural)
    )


def test_pending_batch_list_is_accurate(migrated_app):
    """The SCHEMA-02 batch window must not outlive its purpose.

    Two ways the allowlist above could rot into a permanent hole in the drift
    gate, both closed here: naming a table that no model declares, and keeping a
    table listed after plan 01-04's revision has actually created it.
    """
    undeclared = PENDING_BATCH_TABLES - set(db.metadata.tables)
    assert not undeclared, (
        "PENDING_BATCH_TABLES names tables no model declares: "
        f"{sorted(undeclared)}"
    )

    migrated = set(sa.inspect(db.engine).get_table_names())
    already_done = PENDING_BATCH_TABLES & migrated
    assert not already_done, (
        "these tables are in the migration chain now — remove them from "
        f"PENDING_BATCH_TABLES: {sorted(already_done)}"
    )

    # The same two failure modes, for the (table, column) half of the window.
    inspector = sa.inspect(db.engine)
    undeclared_columns = {
        (table, column)
        for table, column in PENDING_BATCH_COLUMNS
        if table not in db.metadata.tables
        or column not in db.metadata.tables[table].c
    }
    assert not undeclared_columns, (
        "PENDING_BATCH_COLUMNS names columns no model declares: "
        f"{sorted(undeclared_columns)}"
    )

    already_done_columns = {
        (table, column)
        for table, column in PENDING_BATCH_COLUMNS
        if table in migrated
        and column in {c["name"] for c in inspector.get_columns(table)}
    }
    assert not already_done_columns, (
        "these columns are in the migration chain now — remove them from "
        f"PENDING_BATCH_COLUMNS: {sorted(already_done_columns)}"
    )
