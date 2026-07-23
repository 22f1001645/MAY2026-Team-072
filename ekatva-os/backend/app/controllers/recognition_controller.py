from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required
from ..services import recognition_service

recognition_bp = Blueprint("recognition", __name__, url_prefix="/api/v1")


@recognition_bp.get("/leaderboard")
@auth_required
def leaderboard():
    """FR-G5 — points leaderboard, scoped by city or overall."""
    city = request.args.get("city")
    return jsonify(recognition_service.leaderboard(city)), 200


@recognition_bp.get("/me/points")
@auth_required
def my_points():
    """FR-G4 — the caller's contribution ledger."""
    return jsonify(recognition_service.ledger(g.current_user)), 200
