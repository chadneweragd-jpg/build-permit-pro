import { NextRequest, NextResponse } from 'next/server';
import { fetchKelownaPermits, getFallbackKelownaPermits } from '@/lib/ingestion/kelowna';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);
    const sinceDate = searchParams.get('since') || undefined;

    const permits = await fetchKelownaPermits({ sinceDate, limit });
    const latestDate = permits.length > 0 ? permits[0].issue_date : 'None';

    return NextResponse.json({
      success: true,
      city: 'Kelowna',
      count: permits.length,
      latest_permit_date: latestDate,
      permits
    });
  } catch (err: any) {
    console.error('Kelowna ingestion error:', err);
    const fallback = getFallbackKelownaPermits();
    const latestDate = fallback.length > 0 ? fallback[0].issue_date : 'None';
    return NextResponse.json({
      success: true,
      city: 'Kelowna',
      fallback: true,
      count: fallback.length,
      latest_permit_date: latestDate,
      permits: fallback
    });
  }
}
