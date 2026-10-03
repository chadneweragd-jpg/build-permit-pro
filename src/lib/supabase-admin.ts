import { createClient, SupabaseClient } from '@supabase/supabase-js';

// AUDIT FIX (2026-10-03): `src/lib/supabase.ts` (the client used almost everywhere in this
// app) connects with the public anon key on purpose -- it's bundled into client-side JS and
// visible to anyone, so RLS policies restrict it to read-only on tables like `permits`
// (see migrations/008_fix_tenant_isolation_rls.sql's note: permits/municipalities/subtrades
// are "intentionally public-read, not per-user"). That means the daily ingestion cron,
// which needs to WRITE new permits, could never have succeeded through that client no
// matter how correct its column mapping was -- RLS would silently reject every insert.
//
// This client is for trusted, server-only code that legitimately needs to write to those
// tables (the cron job here; src/app/api/stripe/webhook/route.ts already does the same
// thing for user_profiles). It uses the service role key, which bypasses RLS entirely, so
// it must NEVER be imported from a Client Component or any code path that reaches the
// browser bundle.
let adminClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  return adminClient;
}

export const isServiceSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
