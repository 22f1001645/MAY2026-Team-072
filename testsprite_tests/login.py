import requests

def test_login():
    r = requests.post(f"{TARGET_URL}/api/v1/auth/login", json={"email":"admin@ekatva.os", "password":"admin123"})
    assert r.status_code == 200
    assert "access_token" in r.json()

test_login()
