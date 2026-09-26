import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from harvesters.kelowna_harvester import fetch_live_kelowna_permits
from harvesters.kelowna_backfill_2026 import scrape_kelowna_live_portal

print("=== 1. Testing Live Harvester Incremental Polling (since_date='2026-09-20') ===")
harvester_res = fetch_live_kelowna_permits(since_date="2026-09-20")
assert len(harvester_res) > 0, "Harvester returned 0 records"
latest_h = max(r.get("issue_date", "") for r in harvester_res)
earliest_h = min(r.get("issue_date", "") for r in harvester_res)
print(f"Results: {len(harvester_res)} records | Date Range: {earliest_h} to {latest_h}")
assert earliest_h >= "2026-09-20", f"Found record before since_date: {earliest_h}"
assert latest_h == "2026-09-25", f"Latest date is not 2026-09-25: {latest_h}"

print("\n=== 2. Testing Backfill Portal Incremental Polling (since_date='2026-09-22') ===")
backfill_res = scrape_kelowna_live_portal(since_date="2026-09-22")
assert len(backfill_res) > 0, "Backfill returned 0 records"
latest_b = max(r.get("issue_date", "") for r in backfill_res)
earliest_b = min(r.get("issue_date", "") for r in backfill_res)
print(f"Results: {len(backfill_res)} records | Date Range: {earliest_b} to {latest_b}")
assert earliest_b >= "2026-09-22", f"Found record before since_date: {earliest_b}"
assert latest_b == "2026-09-25", f"Latest date is not 2026-09-25: {latest_b}"

print("\n[OK] ALL INCREMENTAL POLLING AND DATE RANGE TESTS PASSED (100%)")
