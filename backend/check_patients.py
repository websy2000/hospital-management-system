import json
import urllib.request

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
    with urllib.request.urlopen(req) as r:
        print(r.status)
        print(r.read().decode())

# login as admin
login_data = {'email': 'admin@hospital.com', 'password': 'admin123'}
url = BASE + '/auth/login'
req_obj = urllib.request.Request(url, data=json.dumps(login_data).encode('utf-8'), headers={'Content-Type':'application/json'}, method='POST')
with urllib.request.urlopen(req_obj) as r:
    body = json.loads(r.read().decode())
    token = body['token']
    print('Logged in, token len:', len(token))

# fetch patients
req('/patients', method='GET', token=token)
