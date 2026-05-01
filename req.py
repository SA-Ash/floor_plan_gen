import urllib.request
import json
req = urllib.request.Request(
    'http://127.0.0.1:8001/generate',
    data=json.dumps({'requirement':'I want a 3 floor house with 4 bedrooms'}).encode(),
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req) as res:
        print(res.read().decode())
except urllib.error.HTTPError as e:
    print(f'HTTPError: {e.code} {e.reason}')
    print(e.read().decode())
