-- Enable PostGIS and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Regional Hubs & Municipalities
CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'BC'
);

CREATE TABLE IF NOT EXISTS municipalities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    api_platform TEXT NOT NULL, -- 'arcgis', 'socrata', 'ckan', 'manual'
    api_endpoint_url TEXT,
    last_synced_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);

-- 2. Master Permits Table
CREATE TABLE IF NOT EXISTS permits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipality_id UUID REFERENCES municipalities(id) ON DELETE CASCADE,
    permit_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    application_date DATE,
    address TEXT NOT NULL,
    city_region TEXT NOT NULL DEFAULT 'Kelowna',
    legal_description TEXT,
    permit_type TEXT NOT NULL,
    work_class TEXT, -- Commercial, Residential, Industrial, Institutional
    description TEXT,
    ai_summary TEXT,
    estimated_value NUMERIC(14, 2) DEFAULT 0,
    contractor_name TEXT,
    contractor_phone TEXT,
    contractor_email TEXT,
    applicant_name TEXT,
    status TEXT DEFAULT 'Issued',
    location GEOMETRY(Point, 4326),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_permit_per_city UNIQUE (municipality_id, permit_number)
);

CREATE INDEX IF NOT EXISTS idx_permits_location ON permits USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_permits_issue_date ON permits(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_permits_value ON permits(estimated_value DESC);
CREATE INDEX IF NOT EXISTS idx_permits_type ON permits(permit_type);

-- 3. Subtrades
CREATE TABLE IF NOT EXISTS subtrades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    icon_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permit_subtrades (
    permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    subtrade_id UUID REFERENCES subtrades(id) ON DELETE CASCADE,
    confidence_score NUMERIC(4, 2) DEFAULT 1.00,
    PRIMARY KEY (permit_id, subtrade_id)
);

-- 4. User Profiles & Subscriptions
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY, -- references auth.users(id)
    full_name TEXT,
    company_name TEXT,
    phone TEXT,
    assigned_hub UUID REFERENCES regions(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'trialing',
    subscription_tier TEXT DEFAULT 'pro_scout',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Saved Routes and Stops
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    title TEXT NOT NULL DEFAULT 'New Route',
    origin_address TEXT NOT NULL,
    origin_location GEOMETRY(Point, 4326),
    destination_address TEXT NOT NULL,
    destination_location GEOMETRY(Point, 4326),
    total_distance_km NUMERIC(6, 2) DEFAULT 0,
    total_duration_min INTEGER DEFAULT 0,
    corridor_buffer_km INTEGER DEFAULT 3,
    route_geometry_geojson JSONB,
    turn_by_turn_directions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    permit_id UUID REFERENCES permits(id) ON DELETE SET NULL,
    address TEXT NOT NULL,
    stop_order INTEGER NOT NULL,
    location GEOMETRY(Point, 4326),
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_stops_order ON route_stops(route_id, stop_order);

-- 6. User Favorites and Notes
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id UUID NOT NULL,
    permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, permit_id)
);

-- 7. High-Performance Corridor Query Function for BPP Scout
CREATE OR REPLACE FUNCTION get_permits_along_corridor(
    route_linestring_geojson TEXT,
    buffer_meters DOUBLE PRECISION
)
RETURNS TABLE (
    id UUID,
    permit_number TEXT,
    issue_date DATE,
    address TEXT,
    city_region TEXT,
    permit_type TEXT,
    work_class TEXT,
    description TEXT,
    ai_summary TEXT,
    estimated_value NUMERIC,
    contractor_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION
) AS $$
DECLARE
    route_geom GEOMETRY;
BEGIN
    route_geom := ST_SetSRID(ST_GeomFromGeoJSON(route_linestring_geojson), 4326);

    RETURN QUERY
    SELECT 
        p.id,
        p.permit_number,
        p.issue_date,
        p.address,
        p.city_region,
        p.permit_type,
        p.work_class,
        p.description,
        p.ai_summary,
        p.estimated_value,
        p.contractor_name,
        p.latitude,
        p.longitude,
        ST_Distance(p.location::geography, route_geom::geography) AS distance_meters
    FROM permits p
    WHERE ST_DWithin(p.location::geography, route_geom::geography, buffer_meters)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Seed Subtrades
INSERT INTO subtrades (slug, name, color_hex, icon_name) VALUES
('electrical', 'Electrical', '#2563EB', 'Zap'),
('hvac_plumbing', 'Plumbing & Mechanical / HVAC', '#DC2626', 'Flame'),
('roofing', 'Roofing & Sheet Metal', '#16A34A', 'Home'),
('drywall_framing', 'Drywall & Steel Stud', '#D97706', 'Layers'),
('commercial_doors', 'Commercial Overhead Doors & Dock', '#EA580C', 'DoorOpen'),
('glazing', 'Glazing & Building Envelope', '#0891B2', 'Maximize'),
('concrete', 'Concrete & Foundations', '#4B5563', 'Hammer')
ON CONFLICT (slug) DO NOTHING;

-- Seed Okanagan Valley Region & Kelowna
INSERT INTO regions (id, slug, name, province) VALUES 
('11111111-1111-1111-1111-111111111111', 'okanagan-valley', 'Okanagan Valley', 'BC')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO municipalities (id, region_id, name, api_platform, api_endpoint_url) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'City of Kelowna', 'arcgis', 'https://opendata.kelowna.ca/api')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) & Public Read Policies
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_subtrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON regions FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON municipalities FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON permits FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON subtrades FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON permit_subtrades FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON routes FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON route_stops FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON user_favorites FOR SELECT USING (true);

-- Allow insertions for demo routes & favorites
CREATE POLICY "Allow insert routes" ON routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert route_stops" ON route_stops FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert user_favorites" ON user_favorites FOR INSERT WITH CHECK (true);

-- 7. Itemized Trip Legs & CRA Mileage Logbook
CREATE TABLE IF NOT EXISTS trip_legs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    permit_id UUID REFERENCES permits(id) ON DELETE SET NULL,
    leg_number INTEGER NOT NULL DEFAULT 1,
    origin_address TEXT NOT NULL,
    destination_address TEXT NOT NULL,
    distance_km NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    duration_min INTEGER DEFAULT 0,
    trip_type TEXT NOT NULL DEFAULT 'business' CHECK (trip_type IN ('business', 'personal')),
    purpose_tag TEXT NOT NULL DEFAULT 'Sales Call' 
        CHECK (purpose_tag IN ('Sales Call', 'Site Measure', 'Installer Check', 'Delivery', 'Office', 'Personal')),
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_legs_user_date ON trip_legs(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_legs_type ON trip_legs(trip_type);

ALTER TABLE trip_legs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read trip_legs" ON trip_legs FOR SELECT USING (true);
CREATE POLICY "Allow insert trip_legs" ON trip_legs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update trip_legs" ON trip_legs FOR UPDATE USING (true);
CREATE POLICY "Allow delete trip_legs" ON trip_legs FOR DELETE USING (true);

-- 8. Lite CRM & Quotes Pipeline Deals
CREATE TABLE IF NOT EXISTS crm_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permit_id UUID REFERENCES permits(id) ON DELETE SET NULL,
    project_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city_region TEXT NOT NULL DEFAULT 'Kelowna',
    general_contractor TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    subtrade_category TEXT NOT NULL DEFAULT 'General',
    stage TEXT NOT NULL DEFAULT 'watched'
        CHECK (stage IN ('watched', 'visited', 'estimating', 'quoted', 'won')),
    quote_amount NUMERIC(12, 2) DEFAULT 0.00,
    bid_due_date DATE,
    follow_up_date DATE,
    lost_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_updated ON crm_deals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_permit ON crm_deals(permit_id);

ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read crm_deals" ON crm_deals FOR SELECT USING (true);
CREATE POLICY "Allow insert crm_deals" ON crm_deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update crm_deals" ON crm_deals FOR UPDATE USING (true);
CREATE POLICY "Allow delete crm_deals" ON crm_deals FOR DELETE USING (true);

