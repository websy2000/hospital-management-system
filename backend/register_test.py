import json
import urllib.request

url = 'http://localhost:5000/api/auth/register'
data = json.dumps({
    'name': 'Test Patient',
    'email': 'testpatient@example.com',
    'password': 'test123'
}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    resp = urllib.request.urlopen(req)
    print(resp.status)
    print(resp.read().decode())
except Exception as e:
    import traceback
    traceback.print_exc()
