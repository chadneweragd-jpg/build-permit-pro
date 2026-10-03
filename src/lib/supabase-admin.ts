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

// DIAGNOSTIC (2026-10-03): a live test of the fixed cron (see route.ts) showed
// isServiceSupabaseConfigured evaluating to false in production even though the Vercel
// dashboard shows SUPABASE_SERVICE_ROLE_KEY present and scoped to Production+Preview. This
// logs ONLY whether each var is present and how many characters long it is -- never the
// actual value -- so we can tell from the Vercel function logs whether the variable is
// truly missing at runtime, or present but empty/whitespace (e.g. the name was added with
// no value pasted in, or the .env.example placeholder text was never replaced). Safe to
// remove once the cause is confirmed and fixed.
let loggedDiagnostic = false;
function logConfigDiagnosticOnce(url: string | undefined, serviceKey: string | undefined) {
  if (loggedDiagnostic) return;
  loggedDiagnostic = true;
  console.warn(
    '[Daily Cron][env-diagnostic]',
    JSON.stringify({
      NEXT_PUBLIC_SUPABASE_URL_present: Boolean(url),
      NEXT_PUBLIC_SUPABASE_URL_length: url?.length ?? 0,
      NEXT_PUBLIC_SUPABASE_URL_trimmed_equal: url ? url === url.trim() : null,
      SUPABASE_SERVICE_ROLE_KEY_present: Boolean(serviceKey),
      SUPABASE_SERVICE_ROLE_KEY_length: serviceKey?.length ?? 0,
      SUPABASE_SERVICE_ROLE_KEY_trimmed_equal: serviceKey ? serviceKey === serviceKey.trim() : null,
      SUPABASE_SERVICE_ROLE_KEY_looks_like_placeholder: serviceKey === 'your-service-role-key'
    })
  );
}

// Run the diagnostic at module load time (not just inside getServiceSupabase), because
// route.ts only calls getServiceSupabase() when isServiceSupabaseConfigured is already
// true -- if the bug is that the vars read as falsy, that function would otherwise never
// run and we'd never see why.
logConfigDiagnosticOnce(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
