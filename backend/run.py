"""Dev entrypoint: `python run.py` (creates tables if missing, then serves)."""
from dotenv import load_dotenv

load_dotenv()

from app import create_app
from app.extensions import db

app = create_app()


def ensure_schema_columns():
    """Ensure optional columns on SQLite dev databases exist."""
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(db.engine)
        if "organisations" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("organisations")]
            with db.engine.connect() as conn:
                if "category" not in columns:
                    conn.execute(text("ALTER TABLE organisations ADD COLUMN category VARCHAR(80)"))
                if "tagline" not in columns:
                    conn.execute(text("ALTER TABLE organisations ADD COLUMN tagline VARCHAR(255)"))
                if "banner_url" not in columns:
                    conn.execute(text("ALTER TABLE organisations ADD COLUMN banner_url VARCHAR(300)"))
                conn.commit()
    except Exception:
        pass


@app.cli.command("init-db")
def init_db():
    """Create all tables (dev convenience; prod uses migrations)."""
    with app.app_context():
        db.create_all()
        ensure_schema_columns()
    print("Tables created.")


if __name__ == "__main__":
    with app.app_context():
        ensure_schema_columns()
    app.run(host="0.0.0.0", port=5000, debug=True)

