import os
import json
import urllib.request
import urllib.error

BASE = 'http://localhost:5000/api'

def req(path, method='GET', data=None, token=None):
    url = BASE + path
    b = None
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if data is not None:
        b = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=b, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print('HTTPError', e.code, body)
        return e.code, None
    except Exception as e:
        print('Error', e)
        return None, None

# 1) remove DB file
db_path = os.path.join(os.path.dirname(__file__), 'hospital.db')
if os.path.exists(db_path):
    print('Removing', db_path)
    os.remove(db_path)
else:
    print('No existing DB file')

# 2) init DB
print('\nCalling /api/init')
status, body = req('/init', 'POST')
print('init', status, body)

# 3) login admin
print('\nLogging in as admin')
status, body = req('/auth/login', 'POST', {'email': 'admin@hospital.com', 'password': 'admin123'})
print('login', status, body)
if not body or 'token' not in body:
    raise SystemExit('Failed to login as admin')
admin_token = body['token']

# 4) add a doctor
print('\nAdding doctor as super_admin')
doc_payload = {
    'name': 'Dr Alice',
    'email': 'doc1@hospital.com',
    'password': 'docpass',
    'specialization': 'General',
    'qualification': 'MBBS',
    'experience': 5,
    'consultation_fee': 100,
    'department_id': 1
}
status, body = req('/doctors', 'POST', doc_payload, token=admin_token)
print('add doctor', status, body)

# 5) register patient
print('\nRegistering test patient')
status, body = req('/auth/register', 'POST', {'name': 'Test Patient', 'email': 'testpatient@example.com', 'password': 'test123'})
print('register', status, body)
if not body or 'token' not in body:
    raise SystemExit('Failed to register patient')
patient_token = body['token']

# 6) get doctors to find id
print('\nFetching doctors list')
status, body = req('/doctors', 'GET', None, token=patient_token)
print('doctors', status, body)
if not body:
    raise SystemExit('Failed to fetch doctors')

doc_id = body[0]['id'] if isinstance(body, list) and len(body) > 0 else None
if not doc_id:
    raise SystemExit('No doctor found')

# 7) book appointment
print('\nBooking appointment with doctor id', doc_id)
book_payload = {'doctor_id': doc_id, 'appointment_date': '2026-02-20T10:00:00', 'reason': 'Test booking after reset'}
status, body = req('/appointments', 'POST', book_payload, token=patient_token)
print('book', status, body)

print('\nDone')
