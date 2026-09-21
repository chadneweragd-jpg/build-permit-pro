"""
Build Permit Pro - Ingestion CLI
Command line utility for running harvests, AI categorization, and data exports.
Usage:
    python cli.py harvest [--city kelowna] [--output ../src/data/permits.json]
    python cli.py classify --text "Tenant improvement including 400A electrical service"
"""

import argparse
import json
import sys
from arcgis_harvester import ArcGISHarvester
from ai_classifier import classify_permit, generate_estimator_summary
from db_loader import save_to_json, sync_to_supabase

def main():
    parser = argparse.ArgumentParser(description="Build Permit Pro Data Harvester & AI Pipeline")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Harvest command
    harvest_parser = subparsers.add_parser("harvest", help="Harvest and classify permits")
    harvest_parser.add_argument("--city", default="kelowna", help="Target city")
    harvest_parser.add_argument("--endpoint", default="https://opendata.kelowna.ca/api", help="ArcGIS REST endpoint")
    harvest_parser.add_argument("--output", default="../src/data/permits.json", help="Path to output JSON")
    harvest_parser.add_argument("--sync-db", action="store_true", help="Sync to Supabase database")

    # Classify command
    classify_parser = subparsers.add_parser("classify", help="Test AI classifier on text")
    classify_parser.add_argument("--text", required=True, help="Permit description text")
    classify_parser.add_argument("--class-type", default="Commercial", help="Work class")

    args = parser.parse_args()

    if args.command == "harvest" or args.command is None:
        print(f"Starting harvest for City of {getattr(args, 'city', 'kelowna')}...")
        harvester = ArcGISHarvester(endpoint_url=getattr(args, "endpoint", "https://opendata.kelowna.ca/api"))
        permits = harvester.harvest()
        save_to_json(permits, getattr(args, "output", "../src/data/permits.json"))
        if getattr(args, "sync_db", False):
            sync_to_supabase(permits)
        print(f"Harvest complete. {len(permits)} permits ready.")
    elif args.command == "classify":
        matches = classify_permit(args.text, work_class=args.class_type)
        summary = generate_estimator_summary("BP-TEST-001", "100 Test St, Kelowna, BC", args.class_type, 1500000.0, args.text, matches)
        print("\n--- AI TRADE CLASSIFICATION RESULT ---")
        print(json.dumps(matches, indent=2))
        print("\n--- ESTIMATOR FLASH SUMMARY ---")
        print(summary)

if __name__ == "__main__":
    main()
