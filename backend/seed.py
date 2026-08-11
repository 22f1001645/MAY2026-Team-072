"""Seed the database with the same world the frontend prototype shows:
the pre-provisioned admin, an RC organiser, students, cities, orgs, a couple
of approved events with registrations/attendance, and one closed activity with
expenses.

Two modes, and only one of them destroys anything:

    python seed.py                    DESTRUCTIVE. Drops every table, rebuilds
                                      the schema through the migration chain,
                                      then seeds reference + demo data. Refuses
                                      to run against anything but a local SQLite
                                      development file.

    python seed.py --reference-only   Safe and idempotent. Houses, Regions and
                                      Cities only — no accounts, nothing
                                      dropped, re-runnable against any
                                      environment including a real deployment.

Since the milestone schema landed as a single Alembic revision, the destructive
path is no longer how you pick up a schema change. `flask db upgrade` is.
This script is for building a demo world from nothing.

These functions do no concurrent work and are meant to be run by one operator
at a time from a terminal; they claim no locking guarantee and need none.
"""
import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path, PurePosixPath, PureWindowsPath

from dotenv import load_dotenv

load_dotenv()

from flask_migrate import upgrade as alembic_upgrade
from sqlalchemy import text
from sqlalchemy.engine import make_url
from werkzeug.security import generate_password_hash

from app import create_app
from app.constants import HOUSES, POINTS, REGIONS, COUNCIL_UPPER_HOUSE, COUNCIL_LOWER_HOUSE
from app.extensions import db
from app.models import (
    Activity,
    ActivityFeeRecord,
    Attendance,
    BudgetLine,
    City,
    ContributionPoint,
    Expense,
    Membership,
    Notification,
    Organisation,
    PORAssignment,
    Proposal,
    Registration,
    Term,
    User,
    SystemSetting,
)

TERM = "May 2026"

BACKEND_ROOT = Path(__file__).resolve().parent
MIGRATIONS_DIR = str(BACKEND_ROOT / "migrations")

# --- Key cities scoped to their Regions (reference data) ---------------------
REGION_CITIES = {
    "Delhi (Delhi-NCR)": ["Delhi", "Noida", "Gurgaon", "Ghaziabad", "Faridabad"],
    "Chennai (Tamil Nadu)": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Salem"],
    "Bengaluru (Karnataka, Kerala)": ["Bengaluru", "Mysuru", "Kochi", "Trivandrum", "Mangaluru"],
    "Hyderabad (AP & Telangana)": ["Hyderabad", "Visakhapatnam", "Vijayawada", "Warangal", "Tirupati"],
    "Mumbai (Maharashtra, Gujarat)": ["Mumbai", "Pune", "Nashik", "Ahmedabad", "Surat"],
    "Kolkata (WB, NE, Odisha)": ["Kolkata", "Bhubaneswar", "Guwahati", "Siliguri", "Shillong"],
    "Patna (Bihar, Jharkhand, Chhattisgarh)": ["Patna", "Ranchi", "Raipur", "Dhanbad", "Bokaro"],
    "Chandigarh (Punjab, HP, RJ, J&K)": ["Chandigarh", "Jaipur", "Amritsar", "Shimla", "Jammu"],
    "Lucknow (UP, Gwalior)": ["Lucknow", "Kanpur", "Varanasi", "Agra", "Gwalior"],
    "International": ["International"],
}


def _refuse(reason):
    """Print why the destructive path is being refused, then exit non-zero."""
    print("REFUSING to reset this database.", file=sys.stderr)
    print(f"  Reason: {reason}", file=sys.stderr)
    print(
        "  Only a local SQLite file inside backend/ may be reset destructively.",
        file=sys.stderr,
    )
    print(
        "  To change the schema of a real database, write a forward migration"
        " and run `flask db upgrade`.",
        file=sys.stderr,
    )
    sys.exit(1)


def _is_absolute_path(raw):
    """True when `raw` is absolute in EITHER path convention.

    `Path.is_absolute()` alone is not enough: on Windows it reports False for
    '/var/lib/prod.db' because that string carries no drive letter. Relying on
    it would mean the containment check below silently stops running whenever a
    developer is on Windows and the URI uses POSIX form — a guard that quietly
    disables itself on one platform is worse than no guard, because it still
    reads like protection.
    """
    return (
        raw.startswith("/")
        or raw.startswith("\\")
        or PureWindowsPath(raw).drive != ""
        or PurePosixPath(raw).is_absolute()
    )


def require_dev_database(app):
    """Refuse to destroy anything that is not a local SQLite development file.

    This reads `app.config["SQLALCHEMY_DATABASE_URI"]` and nothing else, and it
    takes no override argument and honours no override variable — on purpose.

    A production Postgres URL and a dev SQLite file are one `export DATABASE_URL`
    apart, which is exactly how a scratch reset becomes a wiped deployment. A
    guard that some variable can switch off is not a guard: that variable would
    be set in precisely the environment where the mistake happens. So there is
    deliberately no debug flag, no environment-name check, and no allow-override
    escape hatch here, and `tests/test_seed_guard.py` asserts that none appears
    later — including by asserting an invented override name has no effect.

    Returns None when the database is safe to reset. Never returns otherwise.
    """
    uri = app.config["SQLALCHEMY_DATABASE_URI"]

    try:
        url = make_url(uri)
    except Exception:
        _refuse("the configured database URI could not be parsed")

    backend = url.get_backend_name()
    if backend != "sqlite":
        _refuse(f"the configured database is {backend!r}, not sqlite")

    # A SQLite URI can still point outside the project — sqlite:////var/lib/prod.db
    # is a local file too. Every path is resolved to a real location and then
    # required to live inside backend/, rather than only checking the ones that
    # look absolute: a relative path can escape just as well via '../..'.
    database = url.database
    if database and database != ":memory:":
        if _is_absolute_path(database):
            resolved = Path(database).resolve()
        else:
            # Flask resolves a relative SQLite path into the instance folder.
            resolved = (Path(app.instance_path) / database).resolve()
        if resolved != BACKEND_ROOT and BACKEND_ROOT not in resolved.parents:
            _refuse(f"the SQLite file {resolved} is outside the backend/ directory")

    return None


def reset_destructive(app):
    """Drop everything, then rebuild the schema through the migration chain.

    The order here is the single most breakable thing in this file:

    1. `db.drop_all()` removes the application tables but NOT `alembic_version`
       — that table is not in `db.metadata`, so drop_all() never sees it.
    2. `alembic_version` is therefore dropped explicitly. Skipping this leaves a
       version marker pointing at a head whose tables no longer exist.
    3. The schema is rebuilt with `flask_migrate.upgrade()`, NOT `db.create_all()`.
       create_all() would produce the tables with no version marker at all.

    Either mistake is completely invisible here and surfaces days later, on
    someone else's machine, as a `flask db upgrade` that fails with a confusing
    error — because their database claims a version its schema does not match.
    """
    require_dev_database(app)

    with app.app_context():
        db.drop_all()
        db.session.execute(text("DROP TABLE IF EXISTS alembic_version"))
        db.session.commit()
        alembic_upgrade(directory=MIGRATIONS_DIR)


def _get_or_create_org(name, org_type, city):
    """Fetch an Organisation by its natural key, creating it only if absent.

    `Organisation.name` carries no unique constraint, so nothing in the database
    would reject a second identical row — re-running this without the lookup
    would simply produce 24 Houses.
    """
    existing = Organisation.query.filter_by(name=name, type=org_type).first()
    if existing is not None:
        return existing, False
    org = Organisation(name=name, type=org_type, city=city)
    db.session.add(org)
    return org, True


def seed_reference_data():
    """Seed the 12 Houses, 10 Regions and 46 Cities. Idempotent, and unguarded.

    Deliberately does NOT consult the destructive-database guard: this creates
    no accounts, destroys nothing, and ROADMAP Phase 1 requires reference data
    to be seedable against any environment, including a real deployment. Running
    it twice leaves identical counts.

    Must be called inside an application context.
    """
    created = {"houses": 0, "regions": 0, "cities": 0, "terms": 0}
    existing = {"houses": 0, "regions": 0, "cities": 0, "terms": 0}

    # --- Terms ---
    found_term = Term.query.filter_by(name=TERM).first()
    if found_term is None:
        db.session.add(Term(name=TERM, start_date=datetime(2026, 5, 1).date(), end_date=datetime(2026, 8, 31).date(), is_current=True))
        created["terms"] += 1
    else:
        existing["terms"] += 1

    # --- 12 Forest Houses (IIT Madras BS Non-Academic Guidelines A.1) ---
    for name in HOUSES:
        _, is_new = _get_or_create_org(name, "house", "Pan-India")
        created["houses"] += is_new
        existing["houses"] += not is_new

    # --- 10 Geographic Regions (IIT Madras BS Non-Academic Guidelines A.2) ---
    region_orgs = {}
    for name in REGIONS:
        org, is_new = _get_or_create_org(name, "region", name.split(" ")[0])
        region_orgs[name] = org
        created["regions"] += is_new
        existing["regions"] += not is_new
    db.session.flush()

    # --- Cities, scoped to their Region ---
    for region_name, cities in REGION_CITIES.items():
        region = region_orgs[region_name]
        for city_name in cities:
            found = City.query.filter_by(name=city_name, region_id=region.id).first()
            if found is None:
                db.session.add(City(name=city_name, region_id=region.id))
                created["cities"] += 1
            else:
                existing["cities"] += 1

    # --- System Settings (Phase 9) ---
    setting = SystemSetting.query.filter_by(key="recognition_points").first()
    if setting is None:
        db.session.add(SystemSetting(key="recognition_points", value_json={"attended": 30, "organised": 50, "volunteered": 20}))
    
    db.session.commit()

    print(
        "Reference data: "
        f"houses +{created['houses']} ({existing['houses']} already present), "
        f"regions +{created['regions']} ({existing['regions']} already present), "
        f"cities +{created['cities']} ({existing['cities']} already present), "
        f"terms +{created['terms']} ({existing['terms']} already present)"
    )
    return {"created": created, "existing": existing}


def seed_demo_data(app):
    """Seed the demo world: accounts, PORs, three activities and their history.

    Guarded, unlike `seed_reference_data`: this creates accounts whose passwords
    are published in the README, which must never exist outside development.
    """
    require_dev_database(app)

    with app.app_context():
        house_orgs = {
            org.name: org
            for org in Organisation.query.filter_by(type="house").all()
        }
        region_orgs = {
            org.name: org
            for org in Organisation.query.filter_by(type="region").all()
        }

        # --- Demo-only orgs that host the seeded activities ---
        orgs = {
            "hyd_region": region_orgs["Hyderabad (AP & Telangana)"],
            "blr_region": region_orgs["Bengaluru (Karnataka, Kerala)"],
            "neelgiri": house_orgs["Nilgiri House"],
            "rhythm": Organisation(name="Rhythm Dance Society", type="society", city="Chennai"),
            "sec": Organisation(name="Student Executive Council", type="council", city="Chennai"),
        }
        db.session.add(orgs["rhythm"])
        db.session.add(orgs["sec"])
        db.session.flush()

        # --- Users (passwords match the frontend demo accounts) ---
        hyd_region = region_orgs["Hyderabad (AP & Telangana)"]
        blr_region = region_orgs["Bengaluru (Karnataka, Kerala)"]
        che_region = region_orgs["Chennai (Tamil Nadu)"]

        admin = User(name="Student Affairs", email="admin@ekatva.os",
                     password_hash=generate_password_hash("admin123"), role="admin", city="Chennai")
        saiteja = User(name="Sai Teja", email="saiteja@ds.study.iitm.ac.in",
                       password_hash=generate_password_hash("rc12345"), role="student",
                       city="Hyderabad", region_id=hyd_region.id)
        arav = User(name="Arav Mehta", email="arav@ds.study.iitm.ac.in",
                    password_hash=generate_password_hash("student123"), role="student",
                    city="Hyderabad", region_id=hyd_region.id)
        extras = [
            User(name="Madhavi", email="madhavi@ds.study.iitm.ac.in",
                 password_hash=generate_password_hash("student123"), role="student",
                 city="Chennai", region_id=che_region.id),
            User(name="Tanu", email="tanu@ds.study.iitm.ac.in",
                 password_hash=generate_password_hash("student123"), role="student",
                 city="Chennai", region_id=che_region.id),
            User(name="Neha S", email="neha@ds.study.iitm.ac.in",
                 password_hash=generate_password_hash("student123"), role="student",
                 city="Hyderabad", region_id=hyd_region.id),
            User(name="Ayush", email="ayush@ds.study.iitm.ac.in",
                 password_hash=generate_password_hash("student123"), role="student",
                 city="Bengaluru", region_id=blr_region.id),
        ]
        for u in [admin, saiteja, arav, *extras]:
            db.session.add(u)
        db.session.flush()

        students = [saiteja, arav, *extras]

        # --- Activity fee records: everyone paid the term fee ---
        for u in students:
            db.session.add(ActivityFeeRecord(user_id=u.id, term=TERM, paid=True))

        # --- Sai Teja: RC (Lower House Council) for Nilgiri House, Hyderabad Region ---
        m = Membership(user_id=saiteja.id, org_id=house_orgs["Nilgiri House"].id)
        db.session.add(m)
        db.session.flush()
        db.session.add(PORAssignment(
            membership_id=m.id, por_type="Regional Coordinator", term=TERM, active=True,
            region_id=region_orgs["Hyderabad (AP & Telangana)"].id,
            council_tier=COUNCIL_LOWER_HOUSE,
        ))

        # --- Ayush: RC (Lower House Council) for Nilgiri House, Bengaluru Region ---
        m2 = Membership(user_id=extras[3].id, org_id=house_orgs["Nilgiri House"].id)
        db.session.add(m2)
        db.session.flush()
        db.session.add(PORAssignment(
            membership_id=m2.id, por_type="Regional Coordinator", term=TERM, active=True,
            region_id=region_orgs["Bengaluru (Karnataka, Kerala)"].id,
            council_tier=COUNCIL_LOWER_HOUSE,
        ))

        # --- Madhavi: House Secretary (Upper House Council) for Nilgiri House ---
        m3 = Membership(user_id=extras[0].id, org_id=house_orgs["Nilgiri House"].id)
        db.session.add(m3)
        db.session.flush()
        db.session.add(PORAssignment(
            membership_id=m3.id, por_type="House Secretary", term=TERM, active=True,
            council_tier=COUNCIL_UPPER_HOUSE,
        ))

        # --- Tanu: Deputy House Secretary (Upper House Council) for Nilgiri House ---
        m4 = Membership(user_id=extras[1].id, org_id=house_orgs["Nilgiri House"].id)
        db.session.add(m4)
        db.session.flush()
        db.session.add(PORAssignment(
            membership_id=m4.id, por_type="Deputy House Secretary", term=TERM, active=True,
            council_tier=COUNCIL_UPPER_HOUSE,
        ))

        now = datetime(2026, 7, 23, 10, 0, 0)

        def make_activity(org, title, city, scale, days, venue, desc, cap, organiser, status,
                          budget, approved=True):
            act = Activity(org_id=org.id, title=title, city=city, scale=scale,
                           venue=venue, description=desc, capacity=cap,
                           starts_at=now + timedelta(days=days), status=status,
                           organiser_id=organiser.id)
            db.session.add(act)
            db.session.flush()
            for label, planned in budget:
                db.session.add(BudgetLine(activity_id=act.id, label=label, planned=planned))
            db.session.add(Proposal(activity_id=act.id, submitted_by=organiser.id,
                                    status="approved" if approved else "submitted"))
            return act

        # Upcoming approved fest (Hyderabad)
        fest = make_activity(
            orgs["hyd_region"], "Ekatva Hyderabad — Regional Fest", "Hyderabad", "regional_fest",
            17, "T-Hub, Hyderabad",
            "The one that started it all, back for its next edition. Games, performances, food, and 230+ students meeting IRL.",
            250, saiteja, "upcoming",
            [("Venue & AV", 45000), ("Transport (3 buses)", 60000), ("Meals (266)", 80000), ("Decor", 25000)],
        )

        boardgames = make_activity(
            orgs["blr_region"], "Bangalore Board-Game Night", "Bangalore", "local_meetup",
            4, "Cubbon Park Reads, Bangalore",
            "A relaxed evening of Catan, Codenames and chai. Perfect first meetup.",
            40, extras[3], "upcoming",
            [("Snacks & chai", 4000), ("Venue booking", 3000)],
        )

        # Completed activity with attendance + expenses (Hyderabad Coffee & Code)
        coffee = make_activity(
            orgs["hyd_region"], "Hyderabad Coffee & Code", "Hyderabad", "local_meetup",
            -18, "Roastery Coffee House, Banjara Hills",
            "A morning of pair-programming and flat whites. Ran clean and closed on time.",
            45, saiteja, "completed",
            [("Coffee tab", 9000), ("Venue", 5000)],
        )

        db.session.flush()

        # Registrations
        for u in [arav, *extras[:3]]:
            db.session.add(Registration(activity_id=fest.id, student_id=u.id))
        db.session.add(Registration(activity_id=boardgames.id, student_id=arav.id))

        # Coffee & Code: registrations + attendance for a few, plus points
        for u in [arav, extras[0], extras[2]]:
            reg = Registration(activity_id=coffee.id, student_id=u.id)
            db.session.add(reg)
            db.session.flush()
            db.session.add(Attendance(registration_id=reg.id, checked_in_by=saiteja.id))
            db.session.add(ContributionPoint(user_id=u.id, activity_id=coffee.id,
                                             action="attended", points=POINTS["attended"]))
        # Organiser points for the completed + approved activities
        for act in [coffee, fest, boardgames]:
            db.session.add(ContributionPoint(user_id=act.organiser_id, activity_id=act.id,
                                             action="organised", points=POINTS["organised"]))

        # Expenses on the completed activity (mid-pipeline)
        coffee_lines = BudgetLine.query.filter_by(activity_id=coffee.id).all()
        db.session.add(Expense(activity_id=coffee.id, budget_line_id=coffee_lines[0].id,
                               label="Roastery bill — 38 covers", amount=8600, status="verified",
                               bill_name="roastery-invoice.pdf", submitted_by=saiteja.id))
        db.session.add(Expense(activity_id=coffee.id, budget_line_id=coffee_lines[1].id,
                               label="Private room booking", amount=5000, status="approved",
                               bill_name="venue-receipt.jpg", submitted_by=saiteja.id))

        # A welcome notification for Arav
        db.session.add(Notification(user_id=arav.id, activity_id=fest.id, type="reminder",
                                    title="Tomorrow: Bangalore Board-Game Night",
                                    body="5:30 PM at Cubbon Park Reads. Bring a friend."))

        db.session.commit()

        print("Seed complete.")
        print(f"  Users: {User.query.count()}  Activities: {Activity.query.count()}  "
              f"Registrations: {Registration.query.count()}  Expenses: {Expense.query.count()}")
        print("  Admin login:     admin@ekatva.os / admin123")
        print("  Organiser (RC):  saiteja@ds.study.iitm.ac.in / rc12345")
        print("  Student:         arav@ds.study.iitm.ac.in / student123")


def _database_label(app):
    """A human-readable name for the database about to be rebuilt."""
    url = make_url(app.config["SQLALCHEMY_DATABASE_URI"])
    if url.get_backend_name() == "sqlite" and url.database:
        path = Path(url.database)
        if not path.is_absolute():
            path = Path(app.instance_path) / path
        return str(path)
    return str(url)


def main():
    parser = argparse.ArgumentParser(
        description="Seed the Ekatva OS database.",
        epilog="Without --reference-only this DROPS EVERY TABLE and rebuilds it.",
    )
    parser.add_argument(
        "--reference-only",
        action="store_true",
        help="seed Houses, Regions and Cities only — idempotent, destroys nothing,"
             " and safe to run against any environment",
    )
    args = parser.parse_args()

    app = create_app()

    if args.reference_only:
        with app.app_context():
            seed_reference_data()
        return

    print(f"DESTRUCTIVE RESET — rebuilding {_database_label(app)}")
    reset_destructive(app)
    with app.app_context():
        seed_reference_data()
    seed_demo_data(app)


if __name__ == "__main__":
    main()
