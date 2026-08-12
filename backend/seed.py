"""Seed the database with the same world the frontend prototype shows:
the pre-provisioned admin, an RC organiser, students, cities, orgs, a couple
of approved events with registrations/attendance, and one closed activity with
expenses. Run: `python seed.py` (drops and recreates all tables)."""
from datetime import datetime, timedelta

from dotenv import load_dotenv

load_dotenv()

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
    User,
)

TERM = "May 2026"


def reset_db():
    app = create_app()
    with app.app_context():
        db_url = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        if not (db_url.startswith("sqlite://") or "localhost" in db_url or "127.0.0.1" in db_url):
            raise RuntimeError("reset_db() refused to run against a non-dev DATABASE_URL")
        print("Dropping all tables...")
        # drop_all doesn't drop alembic_version, so we must drop it manually or use create_all+stamp
        db.drop_all()
        db.session.execute(db.text("DROP TABLE IF EXISTS alembic_version"))
        db.session.commit()
        from flask_migrate import upgrade
        print("Running migrations...")
        upgrade()
        print("Schema recreated.")


def seed_reference_data():
    app = create_app()
    with app.app_context():
        # --- 12 Forest Houses (IIT Madras BS Non-Academic Guidelines A.1) ---
        house_orgs = {}
        for name in HOUSES:
            h = Organisation(name=name, type="house", city="Pan-India")
            db.session.add(h)
            house_orgs[name] = h
        db.session.flush()

        # --- 10 Geographic Regions (IIT Madras BS Non-Academic Guidelines A.2) ---
        region_orgs = {}
        for name in REGIONS:
            r = Organisation(name=name, type="region", city=name.split(" ")[0])
            db.session.add(r)
            region_orgs[name] = r
        db.session.flush()

        # --- Legacy org aliases (used by seeded activities) ---
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

        # --- Seed key cities scoped to their Regions ---
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
        city_objs = {}  # (region_name, city_name) → City
        for region_name, cities in REGION_CITIES.items():
            r_org = region_orgs[region_name]
            for city_name in cities:
                c = City(name=city_name, region_id=r_org.id)
                db.session.add(c)
                city_objs[(region_name, city_name)] = c
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

        # --- Activity fee records: everyone paid the Rs 100 term fee ---
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


if __name__ == "__main__":
    reset_db()
    seed_reference_data()
