def test_health(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "ok"


def test_login_success_returns_token(client):
    res = client.post("/api/v1/auth/login", json={"email": "admin@ekatva.os", "password": "admin123"})
    assert res.status_code == 200
    body = res.get_json()
    assert "access_token" in body
    assert body["user"]["role"] == "admin"


def test_login_wrong_password(client):
    res = client.post("/api/v1/auth/login", json={"email": "admin@ekatva.os", "password": "nope"})
    assert res.status_code == 401
    assert res.get_json()["code"] == "invalid_credentials"


def test_register_creates_student(client):
    from app.extensions import db
    from app.models import Organisation
    from flask import current_app
    with client.application.app_context():
        region = Organisation.query.filter_by(type='region').first()
    res = client.post("/api/v1/auth/register", json={
        "name": "New Student", "email": "new@ds.study.iitm.ac.in",
        "password": "secret1", "region_id": region.id,
    })
    assert res.status_code == 201
    body = res.get_json()
    assert body["user"]["role"] == "student"
    assert body["user"]["region_id"] == region.id


def test_register_duplicate_email_conflicts(client):
    with client.application.app_context():
        from app.models import Organisation
        region = Organisation.query.filter_by(type='region').first()
    # The seeded students are all on @ekatva.os, which RegisterSchema now turns
    # away at the schema layer (STUDENT_EMAIL_DOMAIN) before the service ever
    # looks for a duplicate. So the first registration here is the setup, not
    # the assertion — it is what puts the address in the table.
    payload = {
        "name": "Dup", "email": "dup@ds.study.iitm.ac.in",
        "password": "secret1", "region_id": region.id,
    }
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201

    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 409
    assert res.get_json()["code"] == "email_taken"


def test_register_validation_error(client):
    res = client.post("/api/v1/auth/register", json={"email": "bad"})
    assert res.status_code == 422


def test_me_requires_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_returns_identity(client, student_headers):
    res = client.get("/api/v1/auth/me", headers=student_headers)
    assert res.status_code == 200
    assert res.get_json()["email"] == "arav@ekatva.os"
