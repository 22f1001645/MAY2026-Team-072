import os
from app import create_app
from app.extensions import db
from flask_migrate import upgrade, migrate

app = create_app()
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///temp_mig_db.sqlite'

with app.app_context():
    # Upgrade to current head
    upgrade()
    # Generate migration for drift
    migrate(message="add main branch columns")
