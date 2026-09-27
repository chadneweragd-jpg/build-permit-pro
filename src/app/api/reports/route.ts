export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SUPPORTED_CITIES } from '@/lib/cities';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || searchParams.get('city_slug') || 'kelowna';
  const dateRange = searchParams.get('dateRange') || searchParams.get('date_range') || 'all';

  const cityConfig = SUPPORTED_CITIES[city.toLowerCase()] || SUPPORTED_CITIES.kelowna;
  const cityName = cityConfig.name;

  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({
      city: cityName,
      citySlug: city,
      totalPermits: 0,
      totalValuation: 0,
      avgValuation: 0,
      commercialRatio: 0
    });
  }

  try {
    // 1. Exact count directly from Supabase (uncapped)
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
      } else if (dateRange === '2026') {
        countQuery = countQuery.gte('issue_date', '2026-01-01');
      }
    }

    const { count, error: countErr } = await countQuery;
    const totalPermits = count || 0;

    // 2. Query valuation sample to calculate total sum and commercial breakdown
    let valQuery = supabase
      .from('permits')
      .select('estimated_value, work_class, issue_date')
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
      } else if (dateRange === '2026') {
        valQuery = valQuery.gte('issue_date', '2026-01-01');
      }
    }

    const { data: records, error: valErr } = await valQuery
      .order('issue_date', { ascending: false })
      .limit(1000);

    let totalValuation = 0;
    let commercialRatio = 35;

    if (records && records.length > 0) {
      const sampleSum = records.reduce((acc, r) => acc + Number(r.estimated_value || 0), 0);
      if (totalPermits > records.length) {
        totalValuation = Math.round((sampleSum / records.length) * totalPermits);
      } else {
        totalValuation = sampleSum;
      }
      const commCount = records.filter(
        (r) => r.work_class === 'Commercial' || r.work_class === 'Industrial'
      ).length;
      commercialRatio = Math.round((commCount / records.length) * 100);
    }

    const avgValuation = totalPermits > 0 ? Math.round(totalValuation / totalPermits) : 0;

    return NextResponse.json({
      city: cityName,
      citySlug: city,
      dateRange,
      totalPermits,
      totalValuation,
      avgValuation,
      commercialRatio,
      sampleSize: records?.length || 0
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
