import { NextResponse } from 'next/server';
import { PermitsRepository } from '@/lib/permits-repo';
import { SubtradeKey, WorkClass } from '@/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Sync latest from Supabase
  await PermitsRepository.fetchPermitsFromSupabase();

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
    searchQuery: q
  });

  return NextResponse.json({
    total: permits.length,
    permits,
    source: 'supabase_live'
  });
}
