import urllib.request
import json
import sys

BASE_URL = 'http://localhost:3000'

PAGES = [
    ('/', 'Root / Dashboard'),
    ('/dashboard', 'Executive Dashboard'),
    ('/search', 'Map Search & Permit Explorer'),
    ('/routes', 'Routes Hub'),
    ('/routes/builder', 'Active Route Builder & BPP Scout'),
    ('/routes/mileage', 'CRA Mileage Logbook & Expense Report'),
    ('/permits', 'Master Permits Table'),
    ('/reports', 'BPP Reports & Analytics'),
    ('/settings', 'Account & Cloud Settings'),
    ('/login', 'Authentication Page')
]

def test_pages():
    print("=== TESTING FRONTEND PAGES ===")
    all_ok = True
    for path, name in PAGES:
        try:
            req = urllib.request.urlopen(f"{BASE_URL}{path}", timeout=5)
            print(f"  [OK] {path.ljust(18)} -> HTTP {req.status} ({name})")
        except Exception as e:
            print(f"  [FAIL] {path} -> {e}")
            all_ok = False
    return all_ok

def test_api_routes():
    print("\n=== TESTING API ENDPOINTS ===")
    
    # 1. Permits API
    res = urllib.request.urlopen(f"{BASE_URL}/api/permits?trades=electrical")
    data = json.loads(res.read().decode())
    print(f"  [OK] /api/permits: {data.get('total')} electrical permits returned")

    # 2. Corridor API
    corridor_payload = json.dumps({
        "startLat": 49.9575,
        "startLng": -119.3810,
        "destLat": 49.8895,
        "destLng": -119.4932,
        "bufferKm": 3
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/permits/corridor", data=corridor_payload, headers={'Content-Type': 'application/json'}, method='POST')
    res = urllib.request.urlopen(req)
    c_data = json.loads(res.read().decode())
    print(f"  [OK] /api/permits/corridor: Found {len(c_data.get('permits', []))} permits along {c_data.get('route', {}).get('properties', {}).get('distanceKm')} km route")

    # 3. AI Analysis API
    ai_payload = json.dumps({
        "permitNumber": "BP010011",
        "address": "1250 Ellis Street, Kelowna, BC",
        "workClass": "Commercial",
        "estimatedValue": 48500000,
        "description": "Construct 26-storey mixed-use tower with 600V electrical and VRF heat pump HVAC."
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/ai/analyze-permit", data=ai_payload, headers={'Content-Type': 'application/json'}, method='POST')
    res = urllib.request.urlopen(req)
    ai_data = json.loads(res.read().decode())
    print(f"  [OK] /api/ai/analyze-permit: Flash summary generated: {ai_data.get('analysis', {}).get('flashSummary')[:70]}...")

    # 4. Stripe Checkout API
    stripe_payload = json.dumps({"tier": "pro_scout"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/stripe/checkout", data=stripe_payload, headers={'Content-Type': 'application/json'}, method='POST')
    res = urllib.request.urlopen(req)
    s_data = json.loads(res.read().decode())
    print(f"  [OK] /api/stripe/checkout: Checkout generated for {s_data.get('tier')}")

    # 5. CRA Mileage API
    res = urllib.request.urlopen(f"{BASE_URL}/api/mileage")
    m_data = json.loads(res.read().decode())
    stats = m_data.get('stats', {})
    print(f"  [OK] /api/mileage: {m_data.get('total')} trips logged | {stats.get('totalBusinessKm')} km business (${stats.get('totalDeductibleCad')} CAD allowance)")

if __name__ == '__main__':
    ok = test_pages()
    test_api_routes()
    if ok:
        print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY.")
    else:
        sys.exit(1)
