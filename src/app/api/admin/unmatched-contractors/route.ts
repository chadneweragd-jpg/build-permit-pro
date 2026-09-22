import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PermitsRepository } from '@/lib/permits-repo';
import { getUnmatchedActiveContractors } from '@/lib/builders-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Try querying the Supabase discovery queue view if available
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('v_unmatched_active_contractors')
        .select('*');

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          success: true,
          source: 'supabase_view',
          count: data.length,
          contractors: data
        });
      }
    }

    // 2. High-performance fallback: compute in-memory using trigram Jaccard matching
    const allPermits = PermitsRepository.getAllPermits();
    const unmatched = getUnmatchedActiveContractors(allPermits);

    return NextResponse.json({
      success: true,
      source: 'memory_trigram',
      count: unmatched.length,
      contractors: unmatched
    });
  } catch (error: any) {
    console.error('Error fetching unmatched contractors discovery queue:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
