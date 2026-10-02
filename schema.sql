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
    -- AUDIT FIX (2026-10-02): persisted regional entitlement, written by the Stripe webhook
    -- on checkout.session.completed and read by src/lib/auth-service.ts#isCityAllowed.
    allowed_regions TEXT[] NOT NULL DEFAULT ARRAY['kelowna'],
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

-- Enable Row Level Security (RLS)
-- AUDIT FIX (2026-10-02): regions/municipalities/permits/subtrades/permit_subtrades are
-- genuinely public reference/catalog data (every tenant should see all permits), so
-- "Allow public read ... USING (true)" is correct for those. routes, route_stops, and
-- user_favorites are PER-USER data and must NOT be USING (true) -- see the scoped policies
-- below (auth.uid() = user_id), which match migrations/008_fix_tenant_isolation_rls.sql.
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

-- routes: per-user data, scoped to the owning user only.
CREATE POLICY "Users can read own routes" ON routes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routes" ON routes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routes" ON routes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own routes" ON routes FOR DELETE USING (auth.uid() = user_id);

-- route_stops: ownership inherited from the parent route (no user_id column of its own).
CREATE POLICY "Users can read own route_stops" ON route_stops FOR SELECT USING (
  EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
);
CREATE POLICY "Users can insert own route_stops" ON route_stops FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
);
CREATE POLICY "Users can update own route_stops" ON route_stops FOR UPDATE USING (
  EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
);
CREATE POLICY "Users can delete own route_stops" ON route_stops FOR DELETE USING (
  EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
);

-- user_favorites: per-user data, scoped to the owning user only.
CREATE POLICY "Users can read own favorites" ON user_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- user_profiles: AUDIT FIX (2026-10-02) -- this table previously had RLS never enabled at all,
-- meaning Postgres applied no row filtering and any client could read/write every user's
-- billing fields (stripe_customer_id, subscription_status, allowed_regions). Subscription
-- fields are only ever written by the service-role Stripe webhook, never by the user directly.
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

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
-- AUDIT FIX (2026-10-02): CRA mileage logs are per-user tax/financial records -- scope strictly
-- to the owning user (previously USING (true), which exposed every user's trip logs to every
-- other authenticated/anon caller).
CREATE POLICY "Users can read own trip_legs" ON trip_legs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trip_legs" ON trip_legs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trip_legs" ON trip_legs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own trip_legs" ON trip_legs FOR DELETE USING (auth.uid() = user_id);

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
-- AUDIT FIX (2026-10-02): CRM pipeline deals are per-user -- scope strictly to the owning user
-- (previously USING (true), which exposed every user's deals/contacts/quotes to every other
-- authenticated/anon caller).
CREATE POLICY "Users can read own crm_deals" ON crm_deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own crm_deals" ON crm_deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own crm_deals" ON crm_deals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own crm_deals" ON crm_deals FOR DELETE USING (auth.uid() = user_id);

