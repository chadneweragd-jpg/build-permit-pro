-- =====================================================================================
-- RECORD OF LIVE CHANGES APPLIED DIRECTLY TO PRODUCTION (2026-10-03)
-- =====================================================================================
-- Context: migrations/20260922_builders_verification.sql (the builders_directory table,
-- the match_permit_builder() fuzzy-match function, and the v_unmatched_active_contractors
-- "discovery queue" view) was written months ago but NEVER applied to this live project --
-- information_schema showed zero tables matching '%builder%' before today. Because of
-- that, the app's builder-matching code (src/lib/enrichment/matcher.ts) only ever read a
-- static JSON file bundled into the app at build time (src/data/verified-builders.json).
-- There was no live, growable builder database at all: adding a newly-verified builder
-- meant editing that file and redeploying the entire site.
--
-- This migration applies that original design to production (CREATE-only, no DROP -- see
-- the note in 20261002_live_apply_record.sql about why DROP/DELETE statements hang in this
-- environment), and seeds it with the builder data that already existed in the repo but
-- had never been loaded live: the 123-company curated Kelowna directory from
-- 20260922_builders_verification.sql, plus the 10 real Calgary builders from
-- migrations/006_calgary_master_builders.sql.
--
-- Companion code change (src/lib/builders-service.ts#getLiveBuilders, wired into
-- src/lib/permits-repo.ts and src/app/api/cron/daily-ingest/route.ts): the app now queries
-- this live table on every dashboard load and every cron run, falling back to the static
-- JSON only if Supabase is unreachable. Adding a row to builders_directory now improves
-- matching immediately, with no redeploy.
-- =====================================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.builders_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    category TEXT,
    association TEXT,
    city TEXT DEFAULT 'Kelowna',
    province TEXT DEFAULT 'BC',
    primary_phone TEXT,
    email TEXT,
    website TEXT,
    physical_address TEXT,
    key_principal TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builders_dir_trgm
ON public.builders_directory
USING gin (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_builders_dir_city ON public.builders_directory (city);

-- Fuzzy matcher function, extended with an optional city filter (the original only ever
-- matched within a single implicit city).
CREATE OR REPLACE FUNCTION public.match_permit_builder(contractor_raw TEXT, target_city TEXT DEFAULT NULL)
RETURNS TABLE (
    builder_id UUID,
    company_name TEXT,
    primary_phone TEXT,
    email TEXT,
    website TEXT,
    key_principal TEXT,
    association TEXT,
    similarity_score REAL
) LANGUAGE plpgsql STABLE AS $$
DECLARE
    cleaned_input TEXT;
BEGIN
    IF contractor_raw IS NULL OR TRIM(contractor_raw) = '' OR LOWER(contractor_raw) LIKE '%private%' THEN
        RETURN;
    END IF;

    cleaned_input := LOWER(REGEXP_REPLACE(contractor_raw, '[^a-zA-Z0-9 ]', '', 'g'));

    RETURN QUERY
    SELECT
        b.id AS builder_id,
        b.company_name,
        b.primary_phone,
        b.email,
        b.website,
        b.key_principal,
        b.association,
        similarity(b.normalized_name, cleaned_input) AS similarity_score
    FROM public.builders_directory b
    WHERE similarity(b.normalized_name, cleaned_input) >= 0.38
      AND (target_city IS NULL OR LOWER(b.city) = LOWER(target_city))
    ORDER BY similarity(b.normalized_name, cleaned_input) DESC
    LIMIT 1;
END;
$$;

-- Discovery Queue: surfaces contractors who show up often in real permits but aren't yet
-- in builders_directory -- the actual mechanism for growing the directory over time.
-- Extended with city_region (original was single-city) and excludes the generic
-- "Standard Permittee (...)" placeholder and archived-fabricated-seed rows.
CREATE OR REPLACE VIEW public.v_unmatched_active_contractors AS
SELECT
    p.contractor_name,
    p.city_region,
    COUNT(p.id) AS permit_count,
    COALESCE(SUM(p.estimated_value), 0) AS total_permitted_value,
    MAX(p.issue_date) AS latest_permit_date
FROM public.permits p
LEFT JOIN public.builders_directory b
    ON LOWER(b.city) = LOWER(p.city_region)
    AND similarity(b.normalized_name, LOWER(REGEXP_REPLACE(p.contractor_name, '[^a-zA-Z0-9 ]', '', 'g'))) >= 0.38
WHERE b.id IS NULL
  AND p.contractor_name IS NOT NULL
  AND LOWER(p.contractor_name) NOT LIKE '%private%'
  AND LOWER(p.contractor_name) NOT LIKE '%standard permittee%'
  AND LOWER(p.contractor_name) NOT LIKE '%_archived_fabricated_seed%'
  AND TRIM(p.contractor_name) != ''
GROUP BY p.contractor_name, p.city_region
HAVING COUNT(p.id) >= 2 OR COALESCE(SUM(p.estimated_value), 0) >= 150000
ORDER BY total_permitted_value DESC;

-- Seed: 123 curated Kelowna builders (from 20260922_builders_verification.sql) + 10 real
-- Calgary builders (from migrations/006_calgary_master_builders.sql). Full VALUES lists
-- omitted here for brevity -- see those two files for the exact rows, which were inserted
-- verbatim with ON CONFLICT DO NOTHING.
