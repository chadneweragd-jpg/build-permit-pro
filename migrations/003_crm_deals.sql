-- Migration 003: Lite CRM & Quotes Pipeline
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

-- RLS Policies
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read crm_deals" ON crm_deals FOR SELECT USING (true);
CREATE POLICY "Allow insert crm_deals" ON crm_deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update crm_deals" ON crm_deals FOR UPDATE USING (true);
CREATE POLICY "Allow delete crm_deals" ON crm_deals FOR DELETE USING (true);
