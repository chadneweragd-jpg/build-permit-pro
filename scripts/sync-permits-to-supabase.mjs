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

  // Process in batches of 50
  const BATCH_SIZE = 50;
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

  // Audit cities in Supabase
  const { data: allRows, error: fetchErr } = await supabase
    .from('permits')
    .select('city_region, issue_date, estimated_value');

  if (allRows) {
    const cityMap = {};
    for (const r of allRows) {
      const c = (r.city_region || 'Kelowna').toLowerCase();
      if (!cityMap[c]) cityMap[c] = { count: 0, minDate: r.issue_date, maxDate: r.issue_date, totalVal: 0 };
      cityMap[c].count += 1;
      cityMap[c].totalVal += Number(r.estimated_value || 0);
      if (r.issue_date < cityMap[c].minDate) cityMap[c].minDate = r.issue_date;
      if (r.issue_date > cityMap[c].maxDate) cityMap[c].maxDate = r.issue_date;
    }

    console.log('\nSupabase City Breakdown:');
    for (const [c, stat] of Object.entries(cityMap)) {
      console.log(`  ✓ ${c.padEnd(20)}: ${String(stat.count).padStart(3)} permits | Date Range: ${stat.minDate} to ${stat.maxDate} | $${(stat.totalVal / 1e6).toFixed(1)}M CAD`);
    }
  }
}

syncAllPermitsToSupabase().catch(console.error);
