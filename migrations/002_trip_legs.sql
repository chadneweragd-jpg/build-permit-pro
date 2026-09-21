-- Migration 002: Itemized Trip Legs & CRA Mileage Logbook
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

-- RLS Policies
ALTER TABLE trip_legs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read trip_legs" ON trip_legs FOR SELECT USING (true);
CREATE POLICY "Allow insert trip_legs" ON trip_legs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update trip_legs" ON trip_legs FOR UPDATE USING (true);
CREATE POLICY "Allow delete trip_legs" ON trip_legs FOR DELETE USING (true);
