"""
Database and Seed Data Loader for Build Permit Pro
Exports harvested permits to JSON for client consumption and inserts into Supabase Postgres if configured.
"""

import json
import os
import sys
from typing import List, Dict, Any

def save_to_json(permits: List[Dict[str, Any]], target_path: str = "../src/data/permits.json"):
    """
    Saves permit records to the Next.js static data directory.
    """
    abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), target_path))
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "w", encoding="utf-8") as f:
        json.dump(permits, f, indent=2, ensure_ascii=False)
    print(f"Successfully saved {len(permits)} permits to {abs_path}")

def sync_to_supabase(permits: List[Dict[str, Any]], supabase_url: str = None, supabase_key: str = None):
    """
    Upserts permits and subtrade junctions into Supabase PostGIS if credentials are provided.
    """
    supabase_url = supabase_url or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = supabase_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key or "your-project" in supabase_url:
        print("Supabase credentials not configured or using placeholders. Skipping remote Supabase upsert.")
        return

    try:
        import urllib.request
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }
        
        # Prepare records with PostGIS Point format: 'POINT(lon lat)'
        records = []
        for p in permits:
            rec = dict(p)
            trades = rec.pop("trades", [])
            lat = rec.get("latitude")
            lon = rec.get("longitude")
            if lat and lon:
                rec["location"] = f"POINT({lon} {lat})"
            records.append(rec)

        req = urllib.request.Request(
            f"{supabase_url}/rest/v1/permits",
            data=json.dumps(records).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            print(f"Supabase REST upsert status: {resp.status}")
    except Exception as err:
        print(f"Error syncing to Supabase: {err}")
