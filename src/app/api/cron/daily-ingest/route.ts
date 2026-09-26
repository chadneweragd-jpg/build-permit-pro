import { NextRequest, NextResponse } from 'next/server';
import { CANADIAN_CITY_CONNECTORS, getConnector, getAllConnectors, getActiveCitySlugs } from '@/lib/ingestion/connectors/registry';
import { applyProportionalEnrichment } from '@/lib/enrichment/proportional-model';
import { PermitsRepository } from '@/lib/permits-repo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
  
  // Default to yesterday's date
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sinceDate = dateParam || yesterday;

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

  const results: Array<{
    citySlug: string;
    cityName: string;
    fetchedCount: number;
    tier1Count: number;
    totalValue: number;
    status: 'success' | 'error';
    error?: string;
  }> = [];

  const allEnrichedPermits: UnifiedPermit[] = [];

  for (const connector of connectorsToRun) {
    if (!connector) continue;
    try {
      // 1. Fetch permits from target city portal (Socrata/CKAN/ArcGIS)
      const rawPermits = await connector.fetchPermits({
        sinceDate,
        limit: 100
      });

      // 2. Apply proportional enrichment model (~35.5% Tier 1 ratio)
      const enriched = applyProportionalEnrichment(rawPermits, 0.355);

      const tier1Count = enriched.filter((p) => p.tier === 1 || p.verified_builder).length;
      const totalVal = enriched.reduce((sum, p) => sum + (p.value || 0), 0);

      results.push({
        citySlug: connector.citySlug,
        cityName: connector.cityName,
        fetchedCount: enriched.length,
        tier1Count,
        totalValue: totalVal,
        status: 'success'
      });

      allEnrichedPermits.push(...enriched);
    } catch (err: any) {
      console.error(`[Daily Cron] Error processing ${connector.citySlug}:`, err);
      results.push({
        citySlug: connector.citySlug,
        cityName: connector.cityName,
        fetchedCount: 0,
        tier1Count: 0,
        totalValue: 0,
        status: 'error',
        error: err.message || 'Unknown ingestion error'
      });
    }
  }

  // 3. Idempotently upsert to Supabase if configured
  let supabaseUpsertCount = 0;
  if (isSupabaseConfigured && supabase && allEnrichedPermits.length > 0) {
    try {
      const recordsToUpsert = allEnrichedPermits.map((p) => ({
        id: p.id,
        permit_number: p.permit_number,
        city_slug: p.city_slug,
        address: p.address,
        applicant: p.applicant,
        contractor: p.contractor,
        sub_type: p.sub_type,
        value: p.value,
        approval_date: p.approval_date,
        tier: p.tier || 2,
        verified_builder: p.verified_builder || null,
        city_region: p.city_region,
        province: p.province,
        applicant_name: p.applicant,
        contractor_name: p.contractor,
        permit_type: p.sub_type,
        estimated_value: p.value,
        issue_date: p.approval_date,
        work_class: p.work_class,
        description: p.description,
        ai_summary: p.ai_summary,
        status: p.status || 'Issued',
        latitude: p.latitude,
        longitude: p.longitude,
        contractor_phone: p.contractor_phone,
        contractor_email: p.contractor_email,
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('permits')
        .upsert(recordsToUpsert, {
          onConflict: 'city_slug,permit_number',
          ignoreDuplicates: false
        })
        .select('id');

      if (!error && data) {
        supabaseUpsertCount = data.length;
      } else if (error) {
        console.warn('[Daily Cron] Supabase upsert notice:', error.message);
      }
    } catch (sbErr: any) {
      console.warn('[Daily Cron] Supabase sync skipped:', sbErr.message);
    }
  }

  // 4. Update in-memory PermitsRepository cache
  if (allEnrichedPermits.length > 0) {
    PermitsRepository.appendPermits(allEnrichedPermits as unknown as Permit[]);
  }

  const durationMs = Date.now() - startTime;
  const totalIngested = allEnrichedPermits.length;
  const totalTier1 = allEnrichedPermits.filter((p) => p.tier === 1 || p.verified_builder).length;

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    sinceDate,
    durationMs,
    totalIngested,
    totalTier1,
    tier1Ratio: totalIngested > 0 ? `${((totalTier1 / totalIngested) * 100).toFixed(1)}%` : '0.0%',
    supabaseUpsertCount,
    citiesProcessed: results.length,
    cityBreakdown: results
  });
}
