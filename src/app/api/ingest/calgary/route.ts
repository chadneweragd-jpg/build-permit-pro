import { NextRequest, NextResponse } from 'next/server';
import { fetchCalgaryPermits, getFallbackCalgaryPermits } from '@/lib/ingestion/calgary';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 500);

    const permits = await fetchCalgaryPermits(limit);
    return NextResponse.json({
      success: true,
      city: 'Calgary',
      count: permits.length,
      permits
    });
  } catch (err: any) {
    console.error('Calgary ingestion error:', err);
    const fallback = getFallbackCalgaryPermits();
    return NextResponse.json({
      success: true,
      city: 'Calgary',
      fallback: true,
      count: fallback.length,
      permits: fallback
    });
  }
}
