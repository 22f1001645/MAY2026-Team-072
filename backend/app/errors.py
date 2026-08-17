"""Central error handling — uniform { error, code, details? } envelope
(Milestone 2 §2, cross-cutting middleware)."""
from flask import jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    """Raised by services to signal an HTTP error with a stable code."""

    def __init__(self, message, code="error", status=400, details=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.details = details


def envelope(message, code, status, details=None):
    body = {"error": message, "code": code}
    if details:
        body["details"] = details
    return jsonify(body), status


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def _api_error(e: ApiError):
        return envelope(e.message, e.code, e.status, e.details)

    @app.errorhandler(ValidationError)
    def _validation(e: ValidationError):
        app.logger.error(f"Validation Error: {e.messages}")
        return envelope("Validation failed", "validation_error", 422, e.messages)

    @app.errorhandler(HTTPException)
    def _http(e: HTTPException):
        return envelope(e.description, e.name.lower().replace(" ", "_"), e.code or 500)

    @app.errorhandler(Exception)
    def _unhandled(e: Exception):
        app.logger.exception(e)
        return envelope("Internal server error", "internal_error", 500)
