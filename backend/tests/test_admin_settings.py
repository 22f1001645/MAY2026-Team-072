import pytest
from app.models import SystemSetting, ContributionPoint

def test_admin_settings_points(client, admin_headers, student_headers, app):
    # Non-admin gets forbidden
    r = client.get("/api/v1/admin/settings/points", headers=student_headers)
    assert r.status_code == 403
    
    r = client.get("/api/v1/admin/settings/points", headers=admin_headers)
    assert r.status_code == 200
    points = r.json
    # Default is 30 because of seed_reference_data if seeded, or constants.POINTS if not
    assert "attended" in points
    
    new_points = {"attended": 42, "organised": 55, "volunteered": 25}
    r = client.put(
        "/api/v1/admin/settings/points",
        headers=admin_headers,
        json=new_points
    )
    assert r.status_code == 200
    assert r.json["attended"] == 42
    
    r = client.get("/api/v1/admin/settings/points", headers=admin_headers)
    assert r.json["attended"] == 42
