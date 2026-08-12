import pytest
from app.rbac import is_organiser, can_manage_org, can_manage_activity, can_participate_in_activity, is_meetup_head
from app.models import User, Organisation, Activity, Registration
from app.constants import ROLE_ADMIN

def test_is_organiser_admin():
    admin = User(role=ROLE_ADMIN)
    assert is_organiser(admin) is True

def test_is_organiser_student(app):
    with app.app_context():
        # Create a completely fresh user to guarantee no PORs
        student = User(role='student', email='fresh@test.com', name='Fresh')
        db.session.add(student)
        assert is_organiser(student) is False

def test_can_manage_org(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        student = User(role='student', email='fresh2@test.com', name='Fresh2')
        org = Organisation.query.first()
        
        assert can_manage_org(admin, org) is True
        assert can_manage_org(student, org) is False

def test_can_manage_activity(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        student = User(role='student', email='fresh3@test.com', name='Fresh3')
        
        # Need an activity that has an org assigned to it to avoid NoneType
        activity = Activity.query.filter(Activity.org_id != None).first()
        
        if activity:
            assert can_manage_activity(admin, activity) is True
            assert can_manage_activity(student, activity) is False

def test_can_participate(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        activity = Activity.query.first()
        
        assert can_participate_in_activity(admin, activity) is True

def test_is_meetup_head(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        activity = Activity.query.first()
        
        assert is_meetup_head(admin, activity) is True
