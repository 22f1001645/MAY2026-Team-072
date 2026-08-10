import pytest

def test_get_constants(client):
    """Test that the constants endpoint returns the expected standard sets."""
    res = client.get("/api/v1/config/constants")
    assert res.status_code == 200
    data = res.get_json()
    
    assert "POR_TYPES" in data
    assert "REGIONS" in data
    assert "HOUSE_META" in data
    
    assert isinstance(data["POR_TYPES"], list)
    assert isinstance(data["REGIONS"], list)
    assert isinstance(data["HOUSE_META"], dict)
    
    # House Secretary should be in POR_TYPES
    assert "House Secretary" in data["POR_TYPES"]
    # Delhi should be in REGIONS
    assert any("Delhi" in r for r in data["REGIONS"])
