-- ==============================================================================
-- Migration: 007_unified_multi_city_pipeline.sql
-- Description: Unified multi-city building permit schema with strict city_slug siloing
-- Target: All 17 active Canadian municipal open data feeds
-- ==============================================================================

-- 1. Ensure PostGIS and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Unified Master Permits Table
CREATE TABLE IF NOT EXISTS public.permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permit_number TEXT NOT NULL,
    city_slug TEXT NOT NULL,
    address TEXT NOT NULL,
    applicant TEXT,
    contractor TEXT,
    sub_type TEXT,
    value NUMERIC(14, 2) DEFAULT 0,
    approval_date DATE NOT NULL,

    -- Compatibility aliases for existing UI and components
    city_region TEXT NOT NULL DEFAULT 'Kelowna',
    applicant_name TEXT,
    contractor_name TEXT,
    permit_type TEXT,
    estimated_value NUMERIC(14, 2) DEFAULT 0,
    issue_date DATE,
    work_class TEXT DEFAULT 'Commercial',
    description TEXT,
    ai_summary TEXT,
    contractor_phone TEXT,
    contractor_email TEXT,
    status TEXT DEFAULT 'Issued',
    tier INTEGER DEFAULT 2,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location GEOMETRY(Point, 4326),
    municipality_id UUID DEFAULT '22222222-2222-2222-2222-222222222222',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Strict Idempotent Unique Constraint: city_slug + permit_number
    CONSTRAINT unique_city_permit UNIQUE (city_slug, permit_number)
);

-- 3. High-Performance Indexes for Siloing and Aggregation
CREATE INDEX IF NOT EXISTS idx_permits_city_slug ON public.permits (city_slug);
CREATE INDEX IF NOT EXISTS idx_permits_approval_date ON public.permits (approval_date DESC);
CREATE INDEX IF NOT EXISTS idx_permits_city_approval_date ON public.permits (city_slug, approval_date DESC);
CREATE INDEX IF NOT EXISTS idx_permits_value ON public.permits (value DESC);
CREATE INDEX IF NOT EXISTS idx_permits_sub_type ON public.permits (sub_type);
CREATE INDEX IF NOT EXISTS idx_permits_tier ON public.permits (tier);

-- 4. Automatic Column Synchronization Trigger (ensure aliases stay in sync)
CREATE OR REPLACE FUNCTION sync_permit_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.applicant_name := COALESCE(NEW.applicant_name, NEW.applicant);
    NEW.applicant := COALESCE(NEW.applicant, NEW.applicant_name);
    NEW.contractor_name := COALESCE(NEW.contractor_name, NEW.contractor);
    NEW.contractor := COALESCE(NEW.contractor, NEW.contractor_name);
    NEW.permit_type := COALESCE(NEW.permit_type, NEW.sub_type, 'Commercial Renovation');
    NEW.sub_type := COALESCE(NEW.sub_type, NEW.permit_type);
    NEW.estimated_value := COALESCE(NEW.estimated_value, NEW.value, 0);
    NEW.value := COALESCE(NEW.value, NEW.estimated_value, 0);
    NEW.issue_date := COALESCE(NEW.issue_date, NEW.approval_date);
    NEW.approval_date := COALESCE(NEW.approval_date, NEW.issue_date);
    NEW.city_region := COALESCE(NEW.city_region, initcap(replace(NEW.city_slug, '-', ' ')));
    
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_permit_columns ON public.permits;
CREATE TRIGGER trg_sync_permit_columns
    BEFORE INSERT OR UPDATE ON public.permits
    FOR EACH ROW
    EXECUTE FUNCTION sync_permit_columns();

-- 5. RLS Policies (Allow Read Access to Authenticated and Anon)
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view permits" ON public.permits;
CREATE POLICY "Public can view permits"
    ON public.permits FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Service role full access on permits" ON public.permits;
CREATE POLICY "Service role full access on permits"
    ON public.permits FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
