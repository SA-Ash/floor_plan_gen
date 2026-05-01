import urllib.request
import json
def test(req_text):
    req = urllib.request.Request(
        'http://127.0.0.1:8001/generate',
        data=json.dumps({'requirement':req_text}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode())
        print(f"Prompt: {req_text}")
        print(f"Floors: {data['nlp'].get('floors')}")
        for floor_id, rooms in data['building'].items():
            print(f"  {floor_id}: {len(rooms)} rooms, first room: {rooms[0] if rooms else None}")
        print("-" * 40)

test('I want a 1 floor small house with 1 bedroom and 1 bathroom')
test('I want a massive 5 floor building with 10 bedrooms, 5 bathrooms, gym, office, huge garage')
