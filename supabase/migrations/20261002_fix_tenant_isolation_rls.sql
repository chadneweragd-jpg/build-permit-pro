-- =====================================================================================
-- AUDIT FIX (2026-10-02): Multi-Tenant Data Isolation
-- =====================================================================================
-- Every RLS policy previously written for trip_legs, crm_deals, routes, route_stops, and
-- user_favorites used `USING (true)` / `WITH CHECK (true)`. Row Level Security was ENABLED
-- on these tables, which gives a false sense of security, but the policies themselves placed
-- no restriction at all: any authenticated user (or any caller holding the anon key, if RLS
-- is the only thing standing between them and the table) could read, insert, update, or
-- delete every OTHER user's CRA mileage logs, CRM pipeline deals, saved routes, and
-- favorited permits.
--
-- This migration replaces those policies with ones that actually scope access to
-- `auth.uid() = user_id`, per the audit requirement. It must be applied to the live
-- Supabase project (via `supabase db push`, the SQL editor, or your CI/CD migration step) --
-- this repo audit could not do that directly because no Supabase credentials were available
-- in the audit environment.
--
-- NOTE ON NAMING: the audit brief refers to these tables as `crm_pipeline`, `cra_trips`,
-- `user_notes`, and `saved_routes`. The tables that actually exist in this schema are
-- `crm_deals` (CRM pipeline), `trip_legs` (CRA trip/mileage log), and `routes` / `route_stops`
-- (saved routes). There is no `user_notes` table in this schema -- `crm_deals.notes` and
-- `trip_legs.notes` are plain text columns, not a separate notes table. This migration fixes
-- the real tables; if a dedicated `user_notes` table is wanted, it should be created with the
-- same `user_id UUID REFERENCES auth.users(id)` + `auth.uid() = user_id` pattern used below.
-- =====================================================================================

-- ---------------------------------------------------------------------------
-- 1. trip_legs (CRA mileage logbook -- financial/tax records, highest sensitivity)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read trip_legs" ON trip_legs;
DROP POLICY IF EXISTS "Allow insert trip_legs" ON trip_legs;
DROP POLICY IF EXISTS "Allow update trip_legs" ON trip_legs;
DROP POLICY IF EXISTS "Allow delete trip_legs" ON trip_legs;

CREATE POLICY "Users can read own trip_legs" ON trip_legs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trip_legs" ON trip_legs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trip_legs" ON trip_legs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own trip_legs" ON trip_legs
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. crm_deals (CRM / quotes pipeline)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read crm_deals" ON crm_deals;
DROP POLICY IF EXISTS "Allow insert crm_deals" ON crm_deals;
DROP POLICY IF EXISTS "Allow update crm_deals" ON crm_deals;
DROP POLICY IF EXISTS "Allow delete crm_deals" ON crm_deals;

CREATE POLICY "Users can read own crm_deals" ON crm_deals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own crm_deals" ON crm_deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own crm_deals" ON crm_deals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own crm_deals" ON crm_deals
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. routes (saved routes) -- had no user_id NOT NULL constraint; tighten that too so the
--    policy below can't be bypassed by inserting a row with user_id = NULL.
-- ---------------------------------------------------------------------------
ALTER TABLE routes ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Allow public read" ON routes;
DROP POLICY IF EXISTS "Allow insert routes" ON routes;

CREATE POLICY "Users can read own routes" ON routes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routes" ON routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routes" ON routes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own routes" ON routes
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. route_stops -- no user_id column of its own; ownership is via its parent route.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read" ON route_stops;
DROP POLICY IF EXISTS "Allow insert route_stops" ON route_stops;

CREATE POLICY "Users can read own route_stops" ON route_stops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own route_stops" ON route_stops
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can update own route_stops" ON route_stops
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
  );
CREATE POLICY "Users can delete own route_stops" ON route_stops
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM routes r WHERE r.id = route_stops.route_id AND r.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 5. user_favorites
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read" ON user_favorites;
DROP POLICY IF EXISTS "Allow insert user_favorites" ON user_favorites;

CREATE POLICY "Users can read own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. Service role (used by the server-side ingestion/cron jobs) must retain full access to
--    the shared, non-tenant-scoped tables (permits, municipalities, subtrades) -- those are
--    intentionally public-read, not per-user, and are unaffected by this migration.
--    Nothing here changes `permits` policies; see migrations/007_unified_multi_city_pipeline.sql.
-- ---------------------------------------------------------------------------
