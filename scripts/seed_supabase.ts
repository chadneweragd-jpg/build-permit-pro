import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read credentials from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqmdssiiexbqeyzmdeza.supabase.co';
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = line.split('=')[1].trim();
  }
});

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndSeed() {
  // Test connection to permits table
  const { data, error } = await supabase.from('permits').select('id').limit(1);
  if (error) {
    console.log('Table check status:', error.message);
    if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
      console.log('NOTE: The tables have not been created yet in Supabase.');
      console.log('Please execute schema.sql in your Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/xqmdssiiexbqeyzmdeza/sql/new');
      return;
    }
  }

  console.log('Table exists! Reading permits dataset...');
  const permitsRaw = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/permits.json'), 'utf8')
  );

  console.log(`Found ${permitsRaw.length} Okanagan permits to sync.`);

  for (const permit of permitsRaw) {
    const row = {
      permit_number: permit.permit_number,
      issue_date: permit.issue_date,
      application_date: permit.application_date || permit.issue_date,
      address: permit.address,
      city_region: permit.city_region || 'Kelowna',
      legal_description: permit.legal_description,
      permit_type: permit.permit_type,
      work_class: permit.work_class,
      description: permit.description,
      ai_summary: permit.ai_summary,
      estimated_value: permit.estimated_value,
      contractor_name: permit.contractor_name,
      contractor_phone: permit.contractor_phone,
      contractor_email: permit.contractor_email,
      applicant_name: permit.applicant_name,
      status: permit.status || 'Issued',
      latitude: permit.latitude,
      longitude: permit.longitude
    };

    const { error: insertErr } = await supabase
      .from('permits')
      .upsert(row, { onConflict: 'permit_number' });

    if (insertErr) {
      console.warn(`Warning inserting ${permit.permit_number}:`, insertErr.message);
    }
  }

  console.log('Successfully synced permits to Supabase!');
}

checkAndSeed().catch(console.error);
