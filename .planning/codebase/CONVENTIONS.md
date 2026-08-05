# Coding Conventions

**Analysis Date:** 2026-08-02

## Naming Patterns

**Files:**
- Python backend: `snake_case.py` (e.g., `auth_service.py`, `auth_controller.py`)
- TypeScript/React frontend: `PascalCase.tsx` for components (e.g., `Layout.tsx`, `IndiaMap.tsx`), `camelCase.ts` for utilities (e.g., `api.ts`, `format.ts`)
- Test files: `test_<feature>.py` (e.g., `test_auth.py`, `test_org_service_unit.py`)

**Functions/Methods:**
- Python: snake_case for public functions and methods
  - Private functions prefixed with underscore: `def _token(user: User) -> str`
  - Services: functional style, exported by module (e.g., `auth_service.login()`)
  - Repositories: static methods in PascalCase classes (e.g., `UserRepository.by_email()`)
- TypeScript: camelCase for functions
  - React components: PascalCase for component functions (e.g., `export default function Layout`)
  - Hooks: `use` prefix (e.g., `useSession()`, `useAuth()`)

**Variables:**
- Python: snake_case (`current_user`, `region_id`, `password_hash`)
- TypeScript: camelCase (`searchQuery`, `mobileOpen`, `searchUsers`)
- Constants: UPPER_SNAKE_CASE in Python (e.g., `CURRENT_TERM = "May 2026"`, `ROLE_STUDENT`)
- TypeScript constants: UPPER_SNAKE_CASE or PascalCase for lookup objects (e.g., `const NAV: Record<Role, NavItem[]>`)

**Types:**
- TypeScript interfaces: PascalCase (e.g., `interface NavItem`, `interface Expense`)
- Union types: camelCase values (e.g., `type Role = 'student' | 'organiser' | 'admin'`)
- Imported types in modules: `import type { Role, EkatvaEvent }` (from `src/lib/types.ts`)

## Code Style

**Formatting:**
- Frontend: TypeScript strict mode enabled (`"strict": true` in tsconfig.json)
- No explicit ESLint or Prettier configuration present
- Imports are organized with type imports separated (e.g., `import type { NavItem }`)
- Indentation: 2 spaces (inferred from code samples)

**Linting:**
- No .eslintrc or ESLint config file present
- No Prettier config present
- Relying on TypeScript compiler for type safety

**Backend Python:**
- Import style: relative imports from package root (e.g., `from ..services import auth_service`, `from ..models import User`)
- No Black or flake8 config detected; style inferred from code patterns

## Import Organization

**Order (Backend Python):**
1. Standard library imports (e.g., `from datetime import datetime`)
2. Third-party framework imports (e.g., `from flask import Blueprint, g, jsonify`)
3. Local package imports using relative paths (e.g., `from ..errors import ApiError`, `from ..services import auth_service`)

**Example from `app/controllers/auth_controller.py`:**
```python
from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required
from ..schemas import LoginSchema, RegisterSchema
from ..services import auth_service

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")
```

**Order (Frontend TypeScript):**
1. React and external library imports
2. Type imports with `type` keyword
3. Local imports from lib/
4. Local component imports

**Example from `src/components/Layout.tsx`:**
```typescript
import { useState, useRef, useEffect, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { Role } from '../lib/types'
```

**Path Aliases:**
- Frontend uses `@/*` alias configured in `tsconfig.json`: `"@/*": ["src/*"]`
- Allows imports like `import type { Role } from '@/lib/types'` (though codebase uses relative paths)

## Error Handling

**Backend Pattern:**
- Centralized `ApiError` class in `app/errors.py` for application errors
- Constructor: `ApiError(message, code="error", status=400, details=None)`
- Raised by services to signal HTTP errors with stable codes

**Example from `app/services/auth_service.py`:**
```python
if UserRepository.by_email(email):
    raise ApiError("An account with that email already exists", "email_taken", 409)
```

**Global Error Handler:**
- Registered via `register_error_handlers(app)` in factory function
- Handlers for `ApiError`, `ValidationError`, `HTTPException`, and unhandled `Exception`
- Uniform response envelope: `{ "error": message, "code": code, "details"?: unknown }`

**Validation:**
- Marshmallow schemas for request validation: `LoginSchema`, `RegisterSchema`, etc. in `app/schemas/`
- Validation errors return 422 with details

**Frontend Pattern:**
- Custom `ApiError` class in `src/lib/api.ts` with `code`, `status`, and optional `details`
- Thrown by request handler; caught by pages

**Example from `src/lib/api.ts`:**
```typescript
export class ApiError extends Error {
  code: string
  status: number
  details?: unknown
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}
```

## Logging

**Framework:** Python standard library `logging` via Flask's `app.logger`

**Patterns:**
- Only used in error handler for unhandled exceptions: `app.logger.exception(e)`
- No structured logging library present
- Frontend: No explicit logging library

## Comments

**When to Comment:**
- Module-level docstrings describe purpose and design principles
- Comments explain domain logic or PRD references (e.g., "Milestone 2 §2" references)

**Examples:**
```python
# From app/__init__.py
"""Application factory — three-tier Flask backend (Milestone 2 §1-2).

Presentation (Blueprints) → application (services) → data (repositories/ORM),
with JWT + POR-RBAC, Marshmallow validation, and a uniform error envelope as
cross-cutting middleware."""

# From app/errors.py
"""Central error handling — uniform { error, code, details? } envelope
(Milestone 2 §2, cross-cutting middleware)."""

# From src/lib/api.ts
/* ---------------------------------------------------------------------------
 * API client — a thin fetch wrapper that adds the base URL + JWT, and parses
 * the backend's { error, code } envelope. Mirrors Milestone 2 §7 (src/lib).
 * ------------------------------------------------------------------------- */
```

**JSDoc/TSDoc:**
- Not extensively used; inline type annotations and TypeScript interfaces preferred
- Function signatures document intent through types

## Function Design

**Size:** 
- Functions are compact and focused (10-50 lines typical)
- Example: `def login(email: str, password: str) -> dict:` in `app/services/auth_service.py` is 4 lines

**Parameters:** 
- Named parameters preferred; decorated functions use `@wraps` to preserve metadata
- Services accept keyword arguments matching schema fields (e.g., `register(name: str, email: str, password: str, region_id: str, city: str = None)`)

**Return Values:**
- Services return dictionaries for serialization to JSON
- Controllers call `jsonify()` to wrap return values
- Repositories return model instances or lists of instances
- React components return JSX elements

## Module Design

**Exports:**
- Backend controllers export module-level Blueprint: `auth_bp = Blueprint(...)`
- Services export functions at module level: `from app.services import auth_service; auth_service.login()`
- Frontend exports default component or named functions: `export default function Layout`, `export function getToken()`

**Barrel Files:**
- `app/models/__init__.py`: exports all model classes
- `app/schemas/__init__.py`: exports all schemas
- `app/controllers/__init__.py`: collects all blueprints in `ALL_BLUEPRINTS` list
- `app/services/__init__.py`: re-exports service modules

**Example from `app/controllers/__init__.py`:**
```python
from .auth_controller import auth_bp
from .proposal_controller import proposal_bp
# ... others

ALL_BLUEPRINTS = [auth_bp, proposal_bp, ...]
```

## Architecture Pattern

**Backend:** Three-tier layered architecture
- **Presentation layer** (`app/controllers/`): Blueprints handle HTTP, call services
- **Application layer** (`app/services/`): Business logic, raises `ApiError` for failures
- **Data layer** (`app/repositories/`, `app/models/`): Query building, ORM models

**Frontend:** Modular React with shared utilities
- **Pages** (`src/pages/`): Full-page components handling routing
- **Components** (`src/components/`): Reusable UI components
- **Libraries** (`src/lib/`): API client, auth, types, utilities

---

*Convention analysis: 2026-08-02*
