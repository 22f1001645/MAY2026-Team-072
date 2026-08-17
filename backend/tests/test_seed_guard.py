"""Seed-script safety tests (SCHEMA-03).

Two independent properties are proven here, and both exist because the failure
they prevent is silent and expensive:

1. The destructive path in `seed.py` refuses every database that is not a local
   SQLite development file, and NO environment variable can re-enable it. A
   production Postgres URL and a dev SQLite file are one `export` apart.
2. Reference data (Houses, Regions, Cities) seeds idempotently and is NOT
   guarded, because ROADMAP Phase 1 requires it to be re-seedable against any
   environment, including a real deployment.

No test here opens a database connection for the guard cases. The guard refuses
by reading configuration, before any connection is attempted, so these tests
must not depend on a Postgres server — or even a Postgres driver — existing.
"""
import inspect
import os

import pytest

import seed
from app import create_app
from app.config import TestConfig, _normalise_db_url
from app.extensions import db
from app.models import City, Organisation

POSTGRES_URI = "postgresql://ekatva:hunter2@db.production.example.com:5432/ekatva"
MYSQL_URI = "mysql://root:hunter2@db.production.example.com:3306/ekatva"


def _app_with_uri(uri):
    """A real app whose configured database URI is `uri`.

    The URI is set AFTER create_app rather than through a Config subclass,
    because Flask-SQLAlchemy builds the engine during create_app and would raise
    ModuleNotFoundError on a Postgres URI wherever psycopg2 is not installed —
    failing the test for a reason that has nothing to do with the guard. The
    guard reads app.config["SQLALCHEMY_DATABASE_URI"] when it is called, so this
    is exactly the value it inspects in production.
    """
    app = create_app(TestConfig)
    app.config["SQLALCHEMY_DATABASE_URI"] = uri
    return app


@pytest.fixture
def clean_app():
    """An app with the full schema and NO seeded rows.

    Deliberately not the shared `app` fixture: that one seeds a handful of
    organisations and a city, which would make the absolute 12 / 10 / 46 counts
    below untrue for reasons unrelated to idempotence.
    """
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()
        db.engine.dispose()


# --------------------------------------------------------------------------- #
# The destructive-database guard (SCHEMA-03, threats T-01-19 / T-01-20)
# --------------------------------------------------------------------------- #


def test_guard_refuses_postgres_url():
    """The headline case: a production Postgres URL must never be resettable."""
    app = _app_with_uri(POSTGRES_URI)

    with pytest.raises(SystemExit) as excinfo:
        seed.require_dev_database(app)

    assert excinfo.value.code == 1


def test_guard_refuses_mysql_url():
    """A second non-SQLite scheme, so the check is on the scheme CLASS and not
    on the word 'postgres' appearing in a string."""
    app = _app_with_uri(MYSQL_URI)

    with pytest.raises(SystemExit) as excinfo:
        seed.require_dev_database(app)

    assert excinfo.value.code == 1


def test_guard_refuses_sqlite_file_outside_the_backend_tree():
    """SQLite is not automatically safe — sqlite:////var/lib/prod.db is a local
    file too. Both path conventions are checked, because Path.is_absolute()
    reports False for a POSIX-style path on Windows and the containment check
    would otherwise silently stop running there."""
    for uri in ("sqlite:////var/lib/ekatva/prod.db", "sqlite:///C:/Windows/Temp/prod.db"):
        app = _app_with_uri(uri)

        with pytest.raises(SystemExit) as excinfo:
            seed.require_dev_database(app)

        assert excinfo.value.code == 1, uri


def test_guard_allows_unset_database_url_default(monkeypatch):
    """An absent DATABASE_URL is the normal developer case, not a suspicious one.

    Re-evaluates the exact expression app/config.py uses, with the variable
    unset, and asserts the guard accepts the result.
    """
    monkeypatch.delenv("DATABASE_URL", raising=False)

    default_uri = _normalise_db_url(os.getenv("DATABASE_URL", "sqlite:///ekatva.db"))
    assert default_uri == "sqlite:///ekatva.db"

    app = _app_with_uri(default_uri)
    assert seed.require_dev_database(app) is None


def test_guard_cannot_be_bypassed_by_environment(monkeypatch):
    """The SCHEMA-03 guard-bypass edge, as a permanent gate.

    EKATVA_ALLOW_DESTRUCTIVE_RESET does not exist. Naming it here is the point:
    this test asserts that no such escape hatch exists NOW and fails loudly if
    somebody adds one later. An override variable would inevitably be set in the
    same environment where the destructive mistake happens, which is why the
    guard reads the resolved database URI and nothing else.
    """
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("FLASK_DEBUG", "1")
    monkeypatch.setenv("EKATVA_ALLOW_DESTRUCTIVE_RESET", "1")

    app = _app_with_uri(POSTGRES_URI)
    # The in-process equivalents of the same idea, closed off too.
    app.debug = True
    app.config["TESTING"] = True

    with pytest.raises(SystemExit) as excinfo:
        seed.require_dev_database(app)

    assert excinfo.value.code == 1

    source = inspect.getsource(seed.require_dev_database)
    for smell in ("FLASK_ENV", "FLASK_DEBUG", "EKATVA_ALLOW_DESTRUCTIVE_RESET",
                  "os.getenv", "os.environ", "app.debug"):
        assert smell not in source, (
            f"require_dev_database now consults {smell!r}; the guard must read "
            "only the resolved SQLALCHEMY_DATABASE_URI"
        )


# --------------------------------------------------------------------------- #
# Reference data: idempotent, and deliberately unguarded
# --------------------------------------------------------------------------- #


def test_reference_data_is_idempotent(clean_app):
    """Running the reference seeder twice must change nothing the second time.

    `Organisation.name` carries NO unique constraint, so the database itself
    would happily accept a second copy of all 12 Houses. The get-or-create in
    seed_reference_data is the only thing standing between a re-run and 24
    Houses — which is precisely why this asserts counts AND distinctness.
    """
    seed.seed_reference_data()

    first = (
        Organisation.query.filter_by(type="house").count(),
        Organisation.query.filter_by(type="region").count(),
        City.query.count(),
    )
    assert first == (12, 10, 46)

    seed.seed_reference_data()

    second = (
        Organisation.query.filter_by(type="house").count(),
        Organisation.query.filter_by(type="region").count(),
        City.query.count(),
    )
    assert second == first, "a second run of seed_reference_data changed the counts"

    names = [org.name for org in Organisation.query.all()]
    assert len(names) == len(set(names)), "duplicate Organisation rows were created"

    cities = [(c.name, c.region_id) for c in City.query.all()]
    assert len(cities) == len(set(cities)), "duplicate City rows were created"


def test_reference_data_does_not_consult_the_dev_guard():
    """ROADMAP Phase 1 success criterion 2: reference data must be seedable
    against ANY environment, including a real deployment. It creates no accounts
    and destroys nothing, so guarding it would block a legitimate operation."""
    assert "require_dev_database" not in inspect.getsource(seed.seed_reference_data)


def test_demo_data_does_consult_the_dev_guard():
    """The other half of the same rule: demo accounts carry passwords published
    in the README, so they must never be creatable outside development
    (threat T-01-24)."""
    assert "require_dev_database" in inspect.getsource(seed.seed_demo_data)
