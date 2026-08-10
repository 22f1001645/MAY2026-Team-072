import requests

def test_health():
    r = requests.get(f"{TARGET_URL}/api/v1/health")
    assert r.status_code == 200
    
test_health()
