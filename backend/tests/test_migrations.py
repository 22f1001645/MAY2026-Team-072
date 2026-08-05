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
from app.models import Organisation, User

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
    """
    org = Organisation(name="Hyderabad Regional Chapter", type="region", city="Hyderabad")
    db.session.add(org)
    db.session.flush()

    user = User(
        email="probe@ekatva.os",
        name="Probe",
        password_hash="not-a-real-hash",
        role="student",
        region_id=org.id,
    )
    db.session.add(user)
    db.session.commit()
    user_id = user.id
    db.session.remove()  # release the session's connection before running DDL

    # --- add ---------------------------------------------------------------
    _batch_users(
        lambda batch_op: batch_op.add_column(
            sa.Column("scratch_probe", sa.String(16), nullable=True)
        )
    )
    survivor = db.session.get(User, user_id)
    assert survivor is not None, "row lost during batch add_column"
    assert survivor.email == "probe@ekatva.os"
    db.session.remove()

    # --- drop --------------------------------------------------------------
    _batch_users(lambda batch_op: batch_op.drop_column("scratch_probe"))
    survivor = db.session.get(User, user_id)
    assert survivor is not None, "row lost during batch drop_column"
    assert survivor.email == "probe@ekatva.os"

    columns = {c["name"] for c in sa.inspect(db.engine).get_columns("users")}
    assert "scratch_probe" not in columns

    # The unique index has to have survived the table copy, otherwise the drop
    # silently removed a constraint the application depends on.
    db.session.add(
        User(
            email="probe@ekatva.os",
            name="Duplicate",
            password_hash="not-a-real-hash",
            role="student",
        )
    )
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()


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
        and _entry_table(entry) not in PENDING_BATCH_TABLES
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
