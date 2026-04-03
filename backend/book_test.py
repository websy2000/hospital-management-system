import json
import urllib.request

url = 'http://localhost:5000/api/appointments'
payload = {
    'doctor_id': 1,
    'appointment_date': '2026-02-20T10:00:00',
    'reason': 'Test booking'
}
# replace token below with the token from register_test output if needed
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo2LCJyb2xlIjoicGF0aWVudCIsImV4cCI6MTc3MDk3NjMzMH0.354Uxr317twl6IQljXeGq1LIZyyKpSinfmoGLdF5SFY'

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {TOKEN}'})
try:
    resp = urllib.request.urlopen(req)
    print(resp.status)
    print(resp.read().decode())
except Exception as e:
    import traceback
    traceback.print_exc()
