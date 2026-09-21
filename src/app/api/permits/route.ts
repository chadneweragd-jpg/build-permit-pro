import { NextResponse } from 'next/server';
import { PermitsRepository } from '@/lib/permits-repo';
import { SubtradeKey, WorkClass } from '@/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Extract date range preset ('30d', '90d', '6m', '2026', 'all')
  const dateRange = searchParams.get('dateRange') || searchParams.get('date_range') || undefined;

  // Sync latest from Supabase with server-side date filter applied
  await PermitsRepository.fetchPermitsFromSupabase(dateRange);

  const trades = searchParams.get('trades') ? (searchParams.get('trades')!.split(',') as SubtradeKey[]) : undefined;
  const minValue = searchParams.get('minValue') ? parseFloat(searchParams.get('minValue')!) : undefined;
  const workClasses = searchParams.get('workClasses') ? (searchParams.get('workClasses')!.split(',') as WorkClass[]) : undefined;
  const permitType = searchParams.get('permitType') || undefined;
  const q = searchParams.get('q') || undefined;

  const permits = PermitsRepository.filterPermits({
    selectedTrades: trades,
    minValue,
    workClasses,
    permitType,
    searchQuery: q,
    dateRange
  });

  return NextResponse.json({
    total: permits.length,
    permits,
    source: 'supabase_live'
  });
}
