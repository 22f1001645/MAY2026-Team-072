---
phase: 06-event-execution-close-out
plan: 04
subsystem: api
tags: [flask, marshmallow, sqlalchemy, attendance-gate, pytest]
status: complete

one_liner: "POST /activities/:id/feedback + GET /activities/:id/feedback/me — attendance-gated 1-5 star rating with 409 on duplicate via uq_event_feedback constraint."

outcome:
  delivered:
    - "backend/app/services/feedback_service.py — submit() + get_mine()"
    - "backend/app/controllers/feedback_controller.py — feedback_bp (POST 201, GET 200)"
    - "FeedbackSchema in schemas/__init__.py — rating 1-5, comment max 2000"
    - "feedback_bp registered in controllers/__init__.py ALL_BLUEPRINTS"
  gate: "python -c 'from app.controllers import feedback_bp' exits 0"
---
