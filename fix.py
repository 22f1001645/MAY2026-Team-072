import re
with open('backend/tests/test_scan_qr.py', 'r') as f:
    code = f.read()

code = code.replace('reg_id = res.get_json()["qr_token"]', 'reg_id = res.get_json()["id"]\n    qr_token = res.get_json()["qr_token"]')
code = code.replace('json={"registration_id": reg_id}', 'json={"registration_id": qr_token}')

with open('backend/tests/test_scan_qr.py', 'w') as f:
    f.write(code)
