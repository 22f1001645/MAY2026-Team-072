# Architecture

**Analysis Date:** 2026-08-11

## System Pattern
- **Client-Server Architecture:** Decoupled SPA frontend (React) and RESTful API backend (Flask).

## Frontend Architecture
- **State Management:** React Query (`@tanstack/react-query`) for server state.
- **Routing:** Client-side routing with `react-router-dom`.

## Backend Architecture
- **API Design:** REST API using Flask blueprints.
- **Data Layer:** SQLAlchemy ORM with Flask-Migrate for schema versions.

## Data Flow
- Client makes HTTP requests to Flask API.
- Flask API authenticates via JWT, processes via SQLAlchemy, and returns JSON.

<!-- refreshed: 2026-08-11 -->
