# Build Permit Pro (BPP) — Commercial SaaS Platform

**Build Permit Pro (BPP)** is a commercial B2B intelligence SaaS for trade contractors (electrical, HVAC & mechanical, roofing, drywall & steel stud, commercial overhead doors, glazing, framing, concrete) and building material suppliers.

Built around the flagship sandbox **City of Kelowna, BC (The Okanagan Valley Hub)**, and architected with PostGIS to scale across Canadian regional hubs (Lower Mainland, Calgary, Edmonton, Greater Toronto Area).

---

## Architecture & Features

1. **Interactive Map & Clustered Permit Pins**:
   - Leaflet + OpenStreetMap / Carto tiles with custom trade-badged pins (custom colors, Lucide icons, short valuation tags).
   - Instant trade filtering, search, and min-valuation slider.
2. **Construction Activity Heat Map**:
   - Macro-level density visualization of construction valuation across neighborhoods (Downtown high-rises, Clement Ave industrial, Rutland residential, Airport business park).
   - **Route Mode Dynamic Dimming**: Automatically fades down opacity when BPP Scout is active so the driving route and corridor permits stand out with high contrast.
3. **BPP Scout (The Route Corridor Lead Finder)**:
   - Origin selection (GPS or contractor depots: YLW Kelowna Airport, Downtown Core, West Kelowna, Orchard Park).
   - Target permit / destination selection.
   - OSRM driving route polyline calculation.
   - Interactive Corridor Buffer Slider (**2 km, 3 km, 5 km, 10 km**) generating spatial buffer polygons via `@turf/turf` and PostGIS.
   - Lists active permits within that corridor with exact perpendicular distance from route (`X.X km from route`).
   - "Open in Native Maps" turn-by-turn deep links for **Apple Maps** (`maps://?daddr=...`) and **Google Maps** (`https://www.google.com/maps/dir/?api=1&destination=...`) for in-truck contractor navigation.
4. **AI Trade Categorization & Estimator Flash Summaries**:
   - Automated regex & keyword classification engine in Python & TypeScript.
   - Concise 2-sentence plain-English project summaries highlighting scope and bidding opportunities for estimators.
5. **Contractor Workspace & Mini-CRM**:
   - Pipeline stages: `New`, `Under Review`, `Site Visited`, `Quote Sent`, `Won`, `Lost`.
   - Kanban board with stage totals and pipeline valuation tally.
   - Private job notes, quote bid value, and follow-up reminder dates.
   - Full CSV / Excel export.
6. **Automated Lead Alerts**:
   - Saved search filters and daily 6:00 AM automated email digest generator.
   - Interactive live HTML email previewer in the app.
7. **Monetization & Regional Hub Subscriptions (Stripe)**:
   - "The Okanagan Valley Hub" package.
   - **Tier 1: Regional Solo ($129 CAD/mo)**: 1 Hub, 1 Trade.
   - **Tier 2: Regional Pro / Scout ($199 CAD/mo)**: 1 Hub, BPP Scout corridor slider, all trades unlocked, 3 team seats.
   - **Tier 3: Provincial Supplier ($499 CAD/mo)**: All Hubs in province, unlimited seats, CRM webhooks.
   - Built-in role switcher for instant sandbox testing of each tier.

---

## Project Structure

```
build-permit-pro/
├── harvester/                       # Python 3.11+ Harvester & AI Pipeline
│   ├── arcgis_harvester.py          # City of Kelowna ArcGIS REST API Client
│   ├── ai_classifier.py             # Subtrade keyword & regex classification engine
│   ├── db_loader.py                 # Exports to JSON & Supabase PostGIS
│   ├── cli.py                       # Harvester CLI commands
│   └── requirements.txt             # Harvester dependencies
├── schema.sql                       # PostgreSQL + PostGIS Schema & Stored Functions
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── alerts/digest/       # 6:00 AM daily digest generator
│   │   │   ├── permits/             # Permit queries
│   │   │   ├── permits/corridor/    # PostGIS & Turf.js route corridor search
│   │   │   └── stripe/              # Checkout, Portal & Webhook handlers
│   │   ├── globals.css              # Tailwind, Leaflet custom pins, animations
│   │   ├── layout.tsx               # Root application layout
│   │   └── page.tsx                 # Main application dashboard
│   ├── components/
│   │   ├── Alerts/AlertsManager.tsx # 6 AM alerts & email previewer
│   │   ├── CRM/ContractorCRM.tsx    # Mini-CRM Kanban pipeline & CSV export
│   │   ├── Map/PermitMap.tsx        # Clustered pins, route polyline, corridor polygon
│   │   ├── Map/HeatmapLayer.tsx     # Valuation heatmap with route dynamic dimming
│   │   ├── Navigation/Navbar.tsx    # Top brand bar, mode switcher & tier badge
│   │   ├── Permits/PermitDetailModal.tsx # Full permit inspector & CRM notes
│   │   ├── Permits/TradeFilterBar.tsx    # Subtrade pills, valuation slider
│   │   ├── Pricing/PricingModal.tsx      # Stripe subscription tiers
│   │   └── Scout/BPPScoutDrawer.tsx      # BPP Scout route corridor drawer
│   ├── data/permits.json            # Enriched Okanagan permits dataset
│   ├── lib/
│   │   ├── email-digest.ts          # HTML email template generator
│   │   ├── permits-repo.ts          # Storage, filtering & CRM persistence
│   │   ├── spatial.ts               # Turf.js buffering, OSRM routing, native links
│   │   ├── stripe.ts                # Stripe configuration
│   │   ├── supabase.ts              # Supabase client wrapper
│   │   └── trades-data.ts           # Subtrade catalog & tier configs
│   └── types/index.ts               # Core domain TypeScript interfaces
└── package.json
```

---

## Quickstart

### 1. Run Development Server
```bash
npm.cmd run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Run Harvester & AI Pipeline
```bash
cd harvester
python cli.py harvest --city kelowna
python cli.py classify --text "Tenant improvement including 400A electrical service and heat pump"
```

### 3. Database Deployment
To deploy to a production Supabase project with PostGIS:
1. Copy the contents of `schema.sql` into the Supabase SQL Editor.
2. Provide `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
