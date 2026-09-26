// Supabase Edge Function: daily-permit-cron
// Scheduled midnight cron job (e.g. '0 7 * * *' UTC / midnight CST)
// Polls Canadian municipal permit endpoints and idempotently upserts permits

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface DailyCronPayload {
  city?: string;
  date?: string;
  forceAll?: boolean;
}

serve(async (req: Request) => {
  const start = Date.now();

  try {
    // 1. Verify authorization if invoked from external webhook
    const authHeader = req.headers.get('Authorization');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let payload: DailyCronPayload = {};
    if (req.method === 'POST') {
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';

    // 2. Invoke the Next.js API cron endpoint or run direct ingestion
    const targetUrl = new URL('/api/cron/daily-ingest', appUrl);
    if (payload.city) targetUrl.searchParams.set('city', payload.city);
    if (payload.date) targetUrl.searchParams.set('date', payload.date);

    console.log(`[Edge Cron] Triggering multi-city ingestion at: ${targetUrl.toString()}`);

    const res = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(expectedSecret ? { 'Authorization': `Bearer ${expectedSecret}` } : {})
      }
    });

    const result = await res.json();
    const durationMs = Date.now() - start;

    return new Response(
      JSON.stringify({
        ok: true,
        edgeDurationMs: durationMs,
        result
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('[Edge Cron] Daily permit ingestion failed:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Edge function error',
        durationMs: Date.now() - start
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
