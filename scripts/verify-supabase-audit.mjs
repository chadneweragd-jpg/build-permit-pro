import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
  console.log('Querying Supabase production table directly...\n');

  // 1. Check Winnipeg Detached Garages
  const { data: garages, error: gErr } = await supabase
    .from('permits')
    .select('permit_number, address, permit_type, estimated_value')
    .ilike('city_region', '%Winnipeg%')
    .ilike('permit_type', '%Detached Garage%')
    .order('estimated_value', { ascending: false })
    .limit(10);

  if (gErr) console.error('Error:', gErr);
  console.log('Top 10 Valued Winnipeg "Detached Garage" permits in Supabase:');
  garages?.forEach(g => {
    console.log(`  - ${g.permit_number}: ${g.address} | $${g.estimated_value.toLocaleString()} CAD`);
  });

  // Check if any Winnipeg garage exceeds $90,000
  const { count: over90k } = await supabase
    .from('permits')
    .select('*', { count: 'exact', head: true })
    .ilike('city_region', '%Winnipeg%')
    .ilike('permit_type', '%Detached Garage%')
    .gt('estimated_value', 90000);

  console.log(`\nWinnipeg "Detached Garage" permits exceeding $90,000 CAD: ${over90k || 0}`);

  // 2. Check Trade Permits across entire DB
  const { count: tradeOver50k } = await supabase
    .from('permits')
    .select('*', { count: 'exact', head: true })
    .or('permit_type.ilike.%Plumbing%,permit_type.ilike.%Mechanical(MS)%,permit_type.ilike.%Drain and Site%,permit_type.ilike.%HVAC%')
    .gt('estimated_value', 50000);

  console.log(`Trade permits (Plumbing/HVAC/Drain) exceeding $50,000 CAD: ${tradeOver50k || 0}`);

  // 3. Check Overall DB Permit Count
  const { count: totalDb } = await supabase
    .from('permits')
    .select('*', { count: 'exact', head: true });

  console.log(`Total Unified Permits in Supabase: ${totalDb}`);
  console.log('\n✅ Supabase Direct Audit Complete.');
}

run();
