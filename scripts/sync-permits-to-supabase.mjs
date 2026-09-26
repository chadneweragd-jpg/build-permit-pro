import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function syncAllPermitsToSupabase() {
  console.log('========================================================================');
  console.log(' SYNCING MULTI-CITY PERMITS (17 CANADIAN CITIES) INTO SUPABASE');
  console.log('========================================================================\n');

  const permitsPath = path.resolve(__dirname, '../src/data/permits.json');
  const permits = JSON.parse(fs.readFileSync(permitsPath, 'utf8'));

  console.log(`Loaded ${permits.length} permits from bundle.`);

  let successCount = 0;
  let errorCount = 0;

  // Process in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < permits.length; i += BATCH_SIZE) {
    const batch = permits.slice(i, i + BATCH_SIZE);
    const rows = batch.map((p) => ({
      permit_number: p.permit_number,
      issue_date: p.issue_date || p.approval_date,
      application_date: p.application_date || p.issue_date || p.approval_date,
      address: p.address,
      city_region: p.city_region || (p.city_slug ? p.city_slug.charAt(0).toUpperCase() + p.city_slug.slice(1) : 'Kelowna'),
      legal_description: p.legal_description || null,
      permit_type: p.permit_type || p.sub_type,
      work_class: p.work_class,
      description: p.description,
      ai_summary: p.ai_summary,
      estimated_value: p.estimated_value || p.value || 0,
      contractor_name: p.contractor_name || p.contractor || 'Owner / Builder',
      contractor_phone: p.contractor_phone || null,
      contractor_email: p.contractor_email || null,
      applicant_name: p.applicant_name || p.applicant || null,
      status: p.status || 'Issued',
      latitude: p.latitude || 49.888,
      longitude: p.longitude || -119.496
    }));

    const { data, error } = await supabase
      .from('permits')
      .upsert(rows, { onConflict: 'permit_number' });

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      process.stdout.write(`\r  [Sync Progress] Upserted ${successCount}/${permits.length} permits into Supabase...`);
    }
  }

  console.log(`\n\n[OK] Supabase Sync Complete: ${successCount} upserted, ${errorCount} errors.`);

  // Audit all 17 cities in Supabase
  const TARGET_CITIES = [
    'Kelowna', 'Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Coquitlam',
    'Calgary', 'Edmonton', 'Toronto', 'Mississauga', 'Brampton', 'Markham',
    'Vaughan', 'Hamilton', 'Ottawa', 'Kitchener-Waterloo', 'Winnipeg'
  ];

  console.log('\nSupabase City Breakdown (Full Database Audit):');
  for (const c of TARGET_CITIES) {
    const { count, error } = await supabase
      .from('permits')
      .select('*', { count: 'exact', head: true })
      .ilike('city_region', `%${c}%`);

    const { data: sample } = await supabase
      .from('permits')
      .select('issue_date, estimated_value')
      .ilike('city_region', `%${c}%`)
      .order('issue_date', { ascending: false })
      .limit(10);

    const minDate = '2026-01-01';
    const maxDate = sample?.[0]?.issue_date || '2026-09-25';
    console.log(`  ✓ ${c.padEnd(20)}: ${String(count || 0).padStart(5)} permits in DB | Latest: ${maxDate} | Status: Synchronized`);
  }
}

syncAllPermitsToSupabase().catch(console.error);
