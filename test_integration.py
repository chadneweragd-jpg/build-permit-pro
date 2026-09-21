import urllib.request
import json
import sys

def main():
    # 1. Home page
    res1 = urllib.request.urlopen('http://localhost:3000')
    print(f"1. Home Page Status: {res1.status}")

    # 2. Permits query API
    res2 = urllib.request.urlopen('http://localhost:3000/api/permits?trades=electrical')
    data2 = json.loads(res2.read().decode('utf-8'))
    print(f"2. Permits API (Electrical): {data2['total']} permits matching")

    # 3. BPP Scout Corridor API
    corridor_payload = json.dumps({
        "startLat": 49.9575,
        "startLng": -119.3810,
        "destLat": 49.8895,
        "destLng": -119.4932,
        "bufferKm": 3
    }).encode('utf-8')
    req3 = urllib.request.Request(
        'http://localhost:3000/api/permits/corridor',
        data=corridor_payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res3 = urllib.request.urlopen(req3)
    data3 = json.loads(res3.read().decode('utf-8'))
    permits_count = len(data3.get('permits', []))
    route_dist = data3.get('route', {}).get('properties', {}).get('distanceKm')
    print(f"3. Corridor API: Found {permits_count} permits along {route_dist} km route ({data3.get('bufferKm')} km buffer)")

    # 4. Daily 6 AM Digest API
    digest_payload = json.dumps({
        "email": "estimator@okanagan-builders.ca",
        "savedSearchName": "Kelowna Commercial Pipeline"
    }).encode('utf-8')
    req4 = urllib.request.Request(
        'http://localhost:3000/api/alerts/digest',
        data=digest_payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res4 = urllib.request.urlopen(req4)
    data4 = json.loads(res4.read().decode('utf-8'))
    print(f"4. 6 AM Digest API: Success={data4.get('success')}, PermitCount={data4.get('permitCount')}, HTML size={len(data4.get('htmlPreview', ''))} bytes")

    # 5. Stripe Checkout API
    checkout_payload = json.dumps({
        "tier": "pro_scout",
        "hubId": "okanagan-valley"
    }).encode('utf-8')
    req5 = urllib.request.Request(
        'http://localhost:3000/api/stripe/checkout',
        data=checkout_payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res5 = urllib.request.urlopen(req5)
    data5 = json.loads(res5.read().decode('utf-8'))
    print(f"5. Stripe Checkout API: URL={data5.get('url')}, Tier={data5.get('tier')}, Mock={data5.get('mock')}")

if __name__ == '__main__':
    main()
