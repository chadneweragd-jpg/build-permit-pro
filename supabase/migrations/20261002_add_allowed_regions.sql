-- =====================================================================================
-- AUDIT FIX (2026-10-02): Tier-Based Dropdown Locking needs a real, persisted entitlement.
-- =====================================================================================
-- Section 3.2 of the audit requires reading `user.allowed_regions` from the authenticated
-- profile to decide which cities render locked vs. active. Before this migration there was no
-- `allowed_regions` column anywhere in the schema -- the app instead hardcoded three partner
-- email addresses (plus an @buildpermitpro.ca domain check) to grant `['all']`, and gave every
-- other user a fixed `['kelowna']` with no way for a real purchase to ever change it (the
-- Stripe webhook only logged events; see the fix in src/app/api/stripe/webhook/route.ts).
--
-- This adds the column the entitlement check now reads (src/lib/auth-service.ts) and the
-- webhook now writes to on a completed checkout.
-- =====================================================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS allowed_regions TEXT[] NOT NULL DEFAULT ARRAY['kelowna'];

COMMENT ON COLUMN user_profiles.allowed_regions IS
  'City/hub slugs this user''s subscription has unlocked, or [''all''] for Provincial Enterprise. Written by the Stripe webhook on checkout.session.completed; read by src/lib/auth-service.ts#isCityAllowed.';

-- =====================================================================================
-- SEPARATE AUDIT FINDING: user_profiles had NO Row Level Security at all (not even an
-- open `USING (true)` policy -- RLS was never enabled on this table in schema.sql). With RLS
-- disabled, Postgres applies no row filtering, so any client using the anon/authenticated
-- Supabase key could read or write every user's billing info (stripe_customer_id,
-- subscription_status, allowed_regions, etc.) for every other user. Locking this down now.
-- =====================================================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
-- Deliberately NOT allowing users to UPDATE subscription_status/allowed_regions themselves --
-- those columns must only change via the service-role Stripe webhook. Non-billing profile
-- fields (full_name, company_name, phone) can be split into a separate user-editable table if
-- self-service profile editing is needed later; for now, profile updates go through the
-- service role key from server-side code only.
