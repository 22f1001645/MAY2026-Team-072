"""Controller layer — Blueprints. HTTP only: parse, validate, call a service,
shape the response. One blueprint per PRD module (Milestone 2 §3)."""
from .auth_controller import admin_auth_bp, auth_bp
from .community_controller import community_bp
from .proposal_controller import proposal_bp
from .event_controller import event_bp
from .registration_controller import registration_bp
from .expense_controller import expense_bp
from .recognition_controller import recognition_bp
from .analytics_controller import analytics_bp
from .misc_controller import misc_bp
from .org_profile_controller import org_profile_bp
from .settings_controller import settings_bp
from .upload_controller import upload_bp
from .schedule_controller import schedule_bp
from .campaign_controller import campaign_bp
from .task_controller import task_bp
from .feedback_controller import feedback_bp
from .timeline_controller import timeline_bp

ALL_BLUEPRINTS = [
    auth_bp,
    # auth_controller contributes TWO blueprints — every other controller below
    # contributes exactly one, and that asymmetry is precisely why this entry was
    # missed and the admin override endpoint 404'd.
    admin_auth_bp,
    community_bp,
    proposal_bp,
    event_bp,
    registration_bp,
    expense_bp,
    recognition_bp,
    analytics_bp,
    misc_bp,
    org_profile_bp,
    settings_bp,
    upload_bp,
    schedule_bp,
    campaign_bp,
    task_bp,
    feedback_bp,
    timeline_bp,
]
