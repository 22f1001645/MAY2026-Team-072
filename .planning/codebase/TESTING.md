# Testing Patterns

**Analysis Date:** 2026-08-02

## Test Framework

**Backend:** Python

**Runner:**
- pytest 8.3.2
- Config: `backend/pytest.ini`
- Coverage plugin: pytest-cov 5.0.0

**Run Commands:**
```bash
pytest                     # Run all tests with coverage report
pytest -v                  # Verbose output
pytest tests/test_auth.py  # Run specific test file
pytest -k test_login       # Run tests matching pattern
```

**pytest.ini Configuration:**
```ini
[pytest]
testpaths = tests
addopts = -q --cov=app --cov-report=term-missing
filterwarnings =
    ignore::sqlalchemy.exc.LegacyAPIWarning
```

**Coverage Requirements:**
- Gate: 85% minimum (enforced via `--cov=app` flag)
- Current coverage: 90% overall (1186 statements, 119 missed)
- Report includes missing line numbers in terminal output

**Frontend:** No test suite configured

- No test runner, framework, or test scripts in `package.json`
- Scripts available: `dev`, `build`, `preview` (no test command)
- TypeScript compilation enabled but no test dependencies present

## Test File Organization

**Backend Location:**
- All tests: `backend/tests/`
- Named: `test_<feature>.py`
- Examples:
  - `backend/tests/test_auth.py`
  - `backend/tests/test_org_service_unit.py`
  - `backend/tests/test_org_service_and_dashboards.py`
  - `backend/tests/test_proposal_flow.py`
  - `backend/tests/test_reimbursement_and_rbac.py`

**Naming Convention:**
- Files: `test_<module_name>.py`
- Test functions: `test_<what_is_being_tested>()`
- Helper functions: `_<name>()` (private underscore prefix)

**File Structure:**
```
backend/
├── tests/
│   ├── conftest.py                          # Pytest fixtures (app, client, auth headers)
│   ├── test_auth.py                         # Authentication tests
│   ├── test_org_service_unit.py             # Organization service unit tests
│   ├── test_org_service_and_dashboards.py   # Integration tests for org features
│   ├── test_proposal_flow.py                # Proposal workflow tests
│   └── test_reimbursement_and_rbac.py       # Expense & RBAC tests
```

## Test Structure

**Suite Organization (from conftest.py):**
```python
import pytest
from werkzeug.security import generate_password_hash

from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import (
    Activity,
    ActivityFeeRecord,
    # ... model imports
    User,
)

@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        _seed_minimal()
        yield app
        db.session.remove()
        db.drop_all()
        db.engine.dispose()

@pytest.fixture
def client(app):
    return app.test_client()
```

**Test Setup/Teardown:**
- `app` fixture: Creates app with TestConfig, seeds database, yields app for test, cleans up
- Database: In-memory SQLite for speed (`SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"`)
- Cleanup: Explicit `db.drop_all()` and `db.engine.dispose()` after each test

**Database Seeding Pattern:**
```python
def _seed_minimal():
    org = Organisation(name="Hyderabad Regional Chapter", type="region", city="Hyderabad")
    house = Organisation(name="Nilgiri House", type="house", city="Pan-India")
    db.session.add_all([org, house])
    db.session.flush()

    db.session.add(City(name="Hyderabad", region_id=org.id))

    admin = User(name="Admin", email="admin@ekatva.os",
                 password_hash=generate_password_hash("admin123"), role="admin", city="Chennai")
    rc = User(name="Sai Teja", email="rc@ekatva.os", ...)
    student = User(name="Arav", email="arav@ekatva.os", ...)
    db.session.add_all([admin, rc, student])
    db.session.flush()

    # Setup relationships, PORs, etc.
    db.session.commit()
```

## Test Patterns

**Assertion Pattern (from test_auth.py):**
```python
def test_login_success_returns_token(client):
    res = client.post("/api/v1/auth/login", json={"email": "admin@ekatva.os", "password": "admin123"})
    assert res.status_code == 200
    body = res.get_json()
    assert "access_token" in body
    assert body["user"]["role"] == "admin"
```

**Error Testing Pattern:**
```python
def test_login_wrong_password(client):
    res = client.post("/api/v1/auth/login", json={"email": "admin@ekatva.os", "password": "nope"})
    assert res.status_code == 401
    assert res.get_json()["code"] == "invalid_credentials"
```

**Exception Testing Pattern (from test_org_service_unit.py):**
```python
def test_assign_por_invalid_org_or_user(app):
    admin = User.query.filter_by(role="admin").first()
    house = Organisation.query.filter_by(type="house").first()
    student = User.query.filter_by(role="student").first()

    with pytest.raises(ApiError) as exc:
        org_service.assign_por("invalid_org_id", student.id, "House Secretary", "May 2026", admin)
    assert exc.value.code == "org_not_found"
```

## Authentication & Authorization Testing

**Header Fixtures (from conftest.py):**
```python
def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]

@pytest.fixture
def admin_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'admin@ekatva.os', 'admin123')}"}

@pytest.fixture
def rc_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'rc@ekatva.os', 'rc12345')}"}

@pytest.fixture
def student_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'arav@ekatva.os', 'student123')}"}
```

**Usage Pattern:**
```python
def test_me_returns_identity(client, student_headers):
    res = client.get("/api/v1/auth/me", headers=student_headers)
    assert res.status_code == 200
    assert res.get_json()["email"] == "arav@ekatva.os"

def test_student_cannot_verify_reimbursement(client, rc_headers, admin_headers, student_headers):
    # Setup
    aid = _make_approved_activity(client, rc_headers, admin_headers)
    eid = client.post("/api/v1/expenses", json={
        "activity_id": aid, "label": "x", "amount": 100,
    }, headers=rc_headers).get_json()["id"]
    # Assert authorization
    assert client.patch(f"/api/v1/expenses/{eid}/verify", headers=student_headers).status_code == 403
```

## Mocking

**Framework:** No explicit mocking library (pytest-mock not installed)

**Database Isolation Pattern:**
- Each test runs against in-memory SQLite
- No separate mocking needed; database fixtures provide isolation
- Test data created via model constructors and session operations

**Direct Model Usage:**
```python
def test_create_org(app):
    admin = User.query.filter_by(role="admin").first()
    data = {"name": "Test Org", "type": "society", "city": "Test City"}
    org = org_service.create_org(data, admin)
    
    assert org.id is not None
    assert org.name == "Test Org"
```

## Test Data & Fixtures

**Fixture Location:** `backend/tests/conftest.py`

**Available Fixtures:**
- `app` - Flask test app with in-memory database
- `client` - Flask test client
- `admin_headers` - Authorization header for admin user
- `rc_headers` - Authorization header for Regional Coordinator
- `student_headers` - Authorization header for student

**Minimal Seed Data (in _seed_minimal()):**
- 1 region Organisation ("Hyderabad Regional Chapter")
- 1 house Organisation ("Nilgiri House")
- 1 City scoped to region
- 3 Users: admin, rc (Regional Coordinator), student
- ActivityFeeRecord for student (term May 2026, paid=True)
- Membership + PORAssignment for rc (Regional Coordinator role)

**Helper Functions (test files):**
```python
def _org_id():
    return Organisation.query.first().id

def _make_approved_activity(client, rc_headers, admin_headers):
    # Create activity, approve it via admin decision endpoint
    payload = {...}
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{aid}/decision",
                json={"decision": "approve", "note": ""}, headers=admin_headers)
    return aid
```

**Inline Test Data Creation:**
```python
def test_reimbursement_pipeline_advances_in_order(client, rc_headers, admin_headers):
    aid = _make_approved_activity(client, rc_headers, admin_headers)
    
    # Create 25 test attendees
    for i in range(25):
        uid = f"dummy_{aid}_{i}"
        if not User.query.get(uid):
            db.session.add(User(id=uid, email=f"{uid}@ds.study.iitm.ac.in", 
                               name=uid, role="student", password_hash="dummy"))
        r = Registration(activity_id=aid, student_id=uid)
        db.session.add(r)
        db.session.flush()
        db.session.add(Attendance(registration_id=r.id, checked_in_by="test"))
    db.session.commit()
```

## Coverage Analysis

**Current Coverage (90%):**
```
1186 total statements
119 missed statements
90% overall coverage
```

**High Coverage Areas (95%+):**
- `app/services/auth_service.py` - 97%
- `app/services/org_service.py` - 98%
- `app/models/__init__.py` - 98%
- `app/services/recognition_service.py` - 95%
- `app/rbac.py` - 95%
- `app/services/analytics_service.py` - 93%
- `app/config.py` - 94%

**Lower Coverage Areas (<85%):**
- `app/controllers/community_controller.py` - 68%
- `app/services/proposal_service.py` - 74%
- `app/controllers/event_controller.py` - 78%

**Missing Lines (sample):**
- `app/controllers/community_controller.py`: Lines 14, 20, 27-33, 40-41, 48-49 (bulk operations, edge cases)
- `app/services/proposal_service.py`: Lines 23, 66, 70, 79, 103-121, 128, 139, 152, 155 (state transitions)

## Test Types

**Unit Tests:**
- Scope: Individual service functions in isolation
- Example: `test_org_service_unit.py` tests `org_service.create_org()`, `org_service.assign_por()`
- Approach: Setup test data, call service function, assert result or exception

**Integration Tests:**
- Scope: API endpoints with full request/response cycle
- Example: `test_org_service_and_dashboards.py` tests complete workflows
- Approach: Use `client.post()`, `client.get()`, `client.patch()` to invoke endpoints
- Includes auth headers, database state validation, multi-step workflows

**Example Integration Test (test_reimbursement_and_rbac.py):**
```python
def test_reimbursement_pipeline_advances_in_order(client, rc_headers, admin_headers):
    # Step 1: Create approved activity
    aid = _make_approved_activity(client, rc_headers, admin_headers)
    
    # Step 2: Create attendees and registrations
    for i in range(25):
        # ... create users and attendance records
    
    # Step 3: Submit expense
    exp = client.post("/api/v1/expenses", json={...}, headers=rc_headers)
    assert exp.status_code == 201
    eid = exp.get_json()["id"]
    
    # Step 4: Admin advances pipeline through states
    for expected in ["verified", "approved", "paid"]:
        res = client.patch(f"/api/v1/expenses/{eid}/verify", headers=admin_headers)
        assert res.status_code == 200
        assert res.get_json()["status"] == expected
    
    # Step 5: Further advance is blocked
    assert client.patch(f"/api/v1/expenses/{eid}/verify", headers=admin_headers).status_code == 409
```

**No E2E Tests:** Selenium/Cypress/Playwright not configured

## Common Test Patterns

**HTTP Status Assertions:**
```python
assert res.status_code == 200      # Success
assert res.status_code == 201      # Created
assert res.status_code == 400      # Bad request
assert res.status_code == 401      # Unauthorized
assert res.status_code == 403      # Forbidden
assert res.status_code == 409      # Conflict
assert res.status_code == 422      # Validation error
```

**Response Body Assertions:**
```python
body = res.get_json()
assert "access_token" in body
assert body["code"] == "invalid_credentials"
assert body["user"]["role"] == "admin"
assert isinstance(res.get_json(), list)
```

**Context Manager Pattern (app context):**
```python
def test_register_creates_student(client):
    from app.extensions import db
    from app.models import Organisation
    with client.application.app_context():
        region = Organisation.query.filter_by(type='region').first()
    res = client.post("/api/v1/auth/register", json={...})
    assert res.status_code == 201
```

## Frontend Testing Gap

**Current State:**
- No test runner installed
- No test files present
- No test configuration (jest.config.ts, vitest.config.ts, etc.)

**Implication:**
- Frontend has zero test coverage
- React components (`src/components/`, `src/pages/`) untested
- Utilities in `src/lib/` untested (api.ts, auth.tsx, format.ts, etc.)

**Recommended Future Setup:**
- Framework: Vitest (modern, Vite-native) or Jest
- Component testing: React Testing Library
- E2E: Playwright or Cypress
- Add to package.json: `"test": "vitest"`, `"test:ui": "vitest --ui"`

---

*Testing analysis: 2026-08-02*
