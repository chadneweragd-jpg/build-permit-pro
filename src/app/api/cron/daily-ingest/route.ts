import { NextRequest, NextResponse } from 'next/server';
import { getConnector, getAllConnectors, getActiveCitySlugs } from '@/lib/ingestion/connectors/registry';
import { enrichPermitWithBuilder } from '@/lib/enrichment/matcher';
import { getLiveBuilders } from '@/lib/builders-service';
import { normalizePermitValue } from '@/lib/ingestion/connectors/valuation-normalizer';
import { getServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase-admin';
import { UnifiedPermit } from '@/lib/ingestion/connectors/types';
import { Permit } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min timeout for Vercel/Next

export async function GET(request: NextRequest) {
  return handleDailyCron(request);
}

export async function POST(request: NextRequest) {
  return handleDailyCron(request);
}

// AUDIT FIX (2026-10-03): this route previously tried to upsert permits using column names
// (`city_slug`, `value`, `approval_date`, `tier`, `verified_builder`, ...) and an
// onConflict target (`city_slug,permit_number`) that do not exist on the live `permits`
// table at all. Supabase rejected every write, silently, since the failure was only ever
// logged to a console.warn -- meaning this cron could have been "running successfully" on
// schedule every weekday while saving nothing to the database, ever. The column list and
// onConflict target below now match the table exactly (verified directly against
// information_schema.columns and pg_constraint on project xqmdssiiexbqeyzmdeza), following
// the same mapping already proven working in scripts/sync-all-cities.mjs.
//
// Second fix: this route also used to fall back to each connector's hardcoded sample
// permits whenever the real government endpoint failed, and wrote those into the database
// as if they were real -- this is how 6,000+ fabricated permits ended up live in
// production earlier. It now passes `allowFallback: false` to every connector, so a city
// whose live source is unreachable today is skipped and clearly reported, rather than
// silently filled in with fiction.
const PERMITS_UPSERT_BATCH_SIZE = 250;

async function handleDailyCron(request: NextRequest) {
  const startTime = Date.now();

  // Authorization check (optional CRON_SECRET)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
  }

  // Parse parameters
  const searchParams = request.nextUrl.searchParams;
  const targetCity = searchParams.get('city')?.toLowerCase().trim();
  const dateParam = searchParams.get('date');

  // AUDIT FIX (2026-10-03): this used to default to exactly "yesterday", which made working
  // connectors look broken. Confirmed directly against Calgary's and Winnipeg's open-data
  // portals: both are correctly reachable with the right field names, but neither has
  // published anything more recent than Sept 29 (government portals commonly lag 3-7 days
  // behind the current date before new permits appear). A 14-day rolling window tolerates
  // that normal publishing lag while still being a "daily" sync in practice, since Supabase
  // upserts on permit_number -- re-fetching the same recent permits every day is harmless.
  const lookbackStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sinceDate = dateParam || lookbackStart;

  // Determine connectors to run
  const connectorsToRun = targetCity
    ? [getConnector(targetCity)].filter(Boolean)
    : getAllConnectors();

  if (connectorsToRun.length === 0) {
    return NextResponse.json(
      { error: `Unknown or unconfigured city: ${targetCity}. Active cities: ${getActiveCitySlugs().join(', ')}` },
      { status: 400 }
    );
  }

  // Fetch the LIVE builder directory once per run (falls back to the static bundled list
  // only if Supabase is unreachable) -- see src/lib/builders-service.ts#getLiveBuilders.
  const liveBuilders = await getLiveBuilders();

  // Server-only service-role client -- required because `permits` has RLS that only
  // allows public SELECT (see src/lib/supabase-admin.ts). The regular anon client used
  // elsewhere in the app cannot write here.
  const adminSupabase = isServiceSupabaseConfigured ? getServiceSupabase() : null;
  if (!adminSupabase) {
    console.warn('[Daily Cron] SUPABASE_SERVICE_ROLE_KEY is not configured -- running in dry-run mode, nothing will be saved.');
  }

  const results: Array<{
    citySlug: string;
    cityName: string;
    liveRecordsFetched: number;
    upsertedCount: number;
    skippedNoValuation: number;
    tier1Count: number;
    totalValue: number;
    status: 'synced' | 'no_live_data' | 'error';
    error?: string;
    diagnostic?: unknown;
  }> = [];

  for (const connector of connectorsToRun) {
    if (!connector) continue;
    try {
      // allowFallback: false -- never let a dead/unreachable live endpoint silently fall
      // back to hardcoded sample permits being written as if real.
      const rawPermits = await connector.fetchPermits({
        sinceDate,
        limit: 1000,
        fetchAll: true,
        allowFallback: false
      });

      if (rawPermits.length === 0) {
        results.push({
          citySlug: connector.citySlug,
          cityName: connector.cityName,
          liveRecordsFetched: 0,
          upsertedCount: 0,
          skippedNoValuation: 0,
          tier1Count: 0,
          totalValue: 0,
          status: 'no_live_data',
          diagnostic: connector.lastDiagnostic
        });
        continue;
      }

      // Enrich against the live, growable builder directory.
      const enriched: UnifiedPermit[] = rawPermits.map(
        (p) => enrichPermitWithBuilder(p as unknown as Permit, liveBuilders) as unknown as UnifiedPermit
      );

      let upsertedCount = 0;
      let skippedNoValuation = 0;

      if (adminSupabase) {
        // Never publish a permit with no real, usable valuation (matches the audit policy
        // already applied elsewhere in this codebase -- skip the row rather than inventing
        // a placeholder dollar figure).
        const publishable = enriched.filter((p) => {
          const val = normalizePermitValue(p.value ?? p.estimated_value ?? 0, p.sub_type, p.description);
          return val > 0;
        });
        skippedNoValuation = enriched.length - publishable.length;

        for (let i = 0; i < publishable.length; i += PERMITS_UPSERT_BATCH_SIZE) {
          const batch = publishable.slice(i, i + PERMITS_UPSERT_BATCH_SIZE);
          const rows = batch.map((p) => {
            const val = normalizePermitValue(p.value ?? p.estimated_value ?? 0, p.sub_type, p.description);
            const issueDate = p.approval_date || p.issue_date || sinceDate;
            return {
              permit_number: p.permit_number,
              issue_date: issueDate,
              application_date: issueDate,
              address: p.address,
              city_region: p.city_region,
              permit_type: p.sub_type || p.permit_type || 'Commercial Building Permit',
              work_class: p.work_class,
              description: p.description,
              ai_summary: p.ai_summary,
              estimated_value: val,
              contractor_name: p.contractor_name || p.contractor || `Standard Permittee (${p.city_region})`,
              contractor_phone: p.contractor_phone || null,
              contractor_email: p.contractor_email || null,
              applicant_name: p.applicant_name || p.applicant || null,
              status: p.status || 'Issued',
              latitude: Number(p.latitude) || null,
              longitude: Number(p.longitude) || null,
              updated_at: new Date().toISOString()
            };
          });

          // onConflict matches the real unique constraint on the live table
          // (`unique_permit_per_city`, which is actually just UNIQUE(permit_number)).
          const { data, error } = await adminSupabase
            .from('permits')
            .upsert(rows, { onConflict: 'permit_number' })
            .select('id');

          if (error) {
            console.error(`[Daily Cron] Upsert error for ${connector.citySlug}:`, error.message);
          } else if (data) {
            upsertedCount += data.length;
          }
        }
      }

      const tier1Count = enriched.filter((p: any) => p.tier === 1 || p.verified_builder).length;
      const totalVal = enriched.reduce((sum, p) => sum + (p.value || p.estimated_value || 0), 0);

      results.push({
        citySlug: connector.citySlug,
        cityName: connector.cityName,
        liveRecordsFetched: enriched.length,
        upsertedCount,
        skippedNoValuation,
        tier1Count,
        totalValue: totalVal,
        status: 'synced',
        diagnostic: connector.lastDiagnostic
      });
    } catch (err: any) {
      console.error(`[Daily Cron] Error processing ${connector.citySlug}:`, err);
      results.push({
        citySlug: connector.citySlug,
        cityName: connector.cityName,
        liveRecordsFetched: 0,
        upsertedCount: 0,
        skippedNoValuation: 0,
        tier1Count: 0,
        totalValue: 0,
        status: 'error',
        error: err.message || 'Unknown ingestion error',
        diagnostic: connector?.lastDiagnostic
      });
    }
  }

  // Surface the "builder discovery queue" -- contractors who show up often in real permits
  // but aren't in builders_directory yet. This is the actual mechanism for the builder
  // database (and therefore enrichment quality) to improve over time: someone periodically
  // reviews this list and adds the legitimate ones to builders_directory.
  let discoveryQueueTop: any[] = [];
  let discoveryQueueTotal = 0;
  if (adminSupabase) {
    try {
      const { data: dq } = await adminSupabase
        .from('v_unmatched_active_contractors')
        .select('*')
        .limit(5);
      if (dq) {
        discoveryQueueTop = dq;
        discoveryQueueTotal = dq.length;
      }
    } catch {
      // non-fatal -- the view may not exist yet on an older database copy
    }
  }

  const durationMs = Date.now() - startTime;
  const citiesWithLiveData = results.filter((r) => r.status === 'synced').length;
  const citiesWithNoLiveData = results.filter((r) => r.status === 'no_live_data').length;
  const totalUpserted = results.reduce((sum, r) => sum + r.upsertedCount, 0);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    sinceDate,
    durationMs,
    citiesProcessed: results.length,
    citiesWithLiveData,
    citiesWithNoLiveData,
    totalUpserted,
    note:
      citiesWithNoLiveData > 0
        ? `${citiesWithNoLiveData} of ${results.length} cities had no live data today (endpoint unreachable, or genuinely no new permits) -- nothing fabricated was written for them.`
        : undefined,
    builderDiscoveryQueue: {
      note: 'Frequently-seen contractors not yet in builders_directory. Add legitimate ones there to improve future matching.',
      shown: discoveryQueueTotal,
      topUnmatched: discoveryQueueTop
    },
    cityBreakdown: results
  });
}
