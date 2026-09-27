export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SUPPORTED_CITIES } from '@/lib/cities';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || searchParams.get('city_slug') || 'calgary';
  const dateRange = searchParams.get('dateRange') || searchParams.get('date_range') || 'all';

  // 1. Ensure safe city name fallback
  const cityConfig = SUPPORTED_CITIES[city.toLowerCase()];
  const cityName = cityConfig?.name || city || 'Calgary';

  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({
      city: cityName,
      citySlug: city,
      totalPermits: 0,
      totalValuation: 0,
      avgValuation: 0,
      commercialRatio: 0,
      tradeMap: {}
    });
  }

  try {
    // 2. Safe Exact Count (Uses Supabase built-in HEAD count, zero row limit cap)
    // Uses native city_region column to avoid missing column error
    let countQuery = supabase
      .from('permits')
      .select('*', { count: 'exact', head: true })
      .ilike('city_region', `%${cityName}%`);

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      if (dateRange === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        countQuery = countQuery.gte('issue_date', d.toISOString().split('T')[0]);
      } else if (dateRange === '90d') {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        countQuery = countQuery.gte('issue_date', d.toISOString().split('T')[0]);
      } else if (dateRange === '6m') {
        const d = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        countQuery = countQuery.gte('issue_date', d.toISOString().split('T')[0]);
      } else if (dateRange === '2026' || dateRange === 'all_2026' || dateRange === 'ytd') {
        countQuery = countQuery.gte('issue_date', '2026-01-01');
      }
    }

    const { count: totalCount, error: countErr } = await countQuery;
    if (countErr) console.error('Count Error:', countErr);

    const totalPermits = totalCount || 0;

    // 3. Safe Lightweight Valuation & Subtrade Aggregation
    // Fetch only the lightweight numeric valuation and subtype columns (NOT full permit rows)
    let valQuery = supabase
      .from('permits')
      .select('estimated_value, permit_type, work_class, issue_date')
      .ilike('city_region', `%${cityName}%`);

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      if (dateRange === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        valQuery = valQuery.gte('issue_date', d.toISOString().split('T')[0]);
      } else if (dateRange === '90d') {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        valQuery = valQuery.gte('issue_date', d.toISOString().split('T')[0]);
      } else if (dateRange === '6m') {
        const d = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        valQuery = valQuery.gte('issue_date', d.toISOString().split('T')[0]);
      } else if (dateRange === '2026' || dateRange === 'all_2026' || dateRange === 'ytd') {
        valQuery = valQuery.gte('issue_date', '2026-01-01');
      }
    }

    const { data: valData, error: valErr } = await valQuery
      .order('issue_date', { ascending: false })
      .limit(1000);

    if (valErr) console.error('Valuation Error:', valErr);

    // 4. Calculate Totals Safely with Defaults
    const sampleSum = (valData || []).reduce((sum, p: any) => sum + (Number(p.estimated_value || p.valuation) || 0), 0);
    const totalValuation = totalPermits && totalPermits > (valData?.length || 0)
      ? Math.round((sampleSum / (valData?.length || 1)) * totalPermits)
      : sampleSum;
    const avgValuation = totalPermits && totalPermits > 0 ? Math.round(totalValuation / totalPermits) : 0;

    // Subtrade aggregation safely mapped
    const tradeMap: Record<string, { count: number; val: number }> = {};
    let commercialCount = 0;

    (valData || []).forEach((p: any) => {
      const trade = p.permit_type || p.project_subtype || 'General Construction';
      const val = Number(p.estimated_value || p.valuation) || 0;
      if (!tradeMap[trade]) tradeMap[trade] = { count: 0, val: 0 };
      tradeMap[trade].count += 1;
      tradeMap[trade].val += val;

      if (p.work_class === 'Commercial' || p.work_class === 'Industrial' || /commercial|office|retail|industrial/i.test(trade)) {
        commercialCount += 1;
      }
    });

    const commercialRatio = valData && valData.length > 0 ? Math.round((commercialCount / valData.length) * 100) : 35;

    return NextResponse.json({
      city: cityName,
      citySlug: city,
      dateRange,
      totalPermits,
      totalValuation,
      avgValuation,
      commercialRatio,
      tradeMap,
      sampleSize: valData?.length || 0
    });
  } catch (err: any) {
    console.error('Reports API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
