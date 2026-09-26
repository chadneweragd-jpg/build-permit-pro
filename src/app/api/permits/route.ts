import { NextResponse } from 'next/server';
import { PermitsRepository } from '@/lib/permits-repo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SubtradeKey, WorkClass } from '@/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1. Single Permit Fetch by exact ID or Permit Number
  const permitId = searchParams.get('id') || searchParams.get('permitId');
  if (permitId) {
    const cached = PermitsRepository.getPermitById(permitId);
    if (cached) {
      return NextResponse.json({ permit: cached, source: 'cache' });
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('permits')
        .select(`
          *,
          permit_subtrades (
            confidence_score,
            subtrades (
              slug,
              name,
              color_hex,
              icon_name
            )
          )
        `)
        .or(`id.eq.${permitId},permit_number.eq.${permitId}`)
        .maybeSingle();

      if (data && !error) {
        PermitsRepository.appendPermits([data as any]);
        const mapped = PermitsRepository.getPermitById(permitId) || (data as any);
        return NextResponse.json({ permit: mapped, source: 'supabase_live' });
      }
    }

    return NextResponse.json({ error: 'Permit not found', permitId }, { status: 404 });
  }

  // 2. City Filter & Date Range
  const city = searchParams.get('city') || searchParams.get('city_slug') || undefined;
  const dateRange = searchParams.get('dateRange') || searchParams.get('date_range') || undefined;

  // Sync latest from Supabase with server-side city & date filters applied
  await PermitsRepository.fetchPermitsFromSupabase(dateRange, city);

  const trades = searchParams.get('trades') ? (searchParams.get('trades')!.split(',') as SubtradeKey[]) : undefined;
  const minValue = searchParams.get('minValue') ? parseFloat(searchParams.get('minValue')!) : undefined;
  const workClasses = searchParams.get('workClasses') ? (searchParams.get('workClasses')!.split(',') as WorkClass[]) : undefined;
  const permitType = searchParams.get('permitType') || undefined;
  const q = searchParams.get('q') || undefined;

  let permits = city && city !== 'all'
    ? PermitsRepository.getPermitsByCity(city)
    : PermitsRepository.getAllPermits();

  if (trades || minValue || workClasses || permitType || q) {
    permits = PermitsRepository.filterPermits({
      selectedTrades: trades,
      minValue,
      workClasses,
      permitType,
      searchQuery: q,
      dateRange
    });
    if (city && city !== 'all') {
      const target = city.toLowerCase().trim();
      permits = permits.filter((p) => {
        const slug = (p.city_slug || '').toLowerCase().trim();
        const region = (p.city_region || '').toLowerCase().trim();
        return slug === target || region === target || region.replace(/\s+/g, '-') === target;
      });
    }
  }

  return NextResponse.json({
    total: permits.length,
    permits,
    source: 'supabase_live'
  });
}
