"""Controller layer — Blueprints. HTTP only: parse, validate, call a service,
shape the response. One blueprint per PRD module (Milestone 2 §3)."""
from .auth_controller import auth_bp
from .community_controller import community_bp
from .proposal_controller import proposal_bp
from .event_controller import event_bp
from .registration_controller import registration_bp
from .expense_controller import expense_bp
from .recognition_controller import recognition_bp
from .analytics_controller import analytics_bp
from .misc_controller import misc_bp

ALL_BLUEPRINTS = [
    auth_bp,
    community_bp,
    proposal_bp,
    event_bp,
    registration_bp,
    expense_bp,
    recognition_bp,
    analytics_bp,
    misc_bp,
]
