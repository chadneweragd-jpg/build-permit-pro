const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xqmdssiiexbqeyzmdeza.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAndSeed() {
  console.log('Testing connection to Supabase permits table...');
  const { data, error } = await supabase.from('permits').select('id').limit(1);

  if (error) {
    console.log('Status:', error.message);
    if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
      console.log('NOT_READY: Tables not created yet.');
      return false;
    }
  }

  console.log('Table exists! Loading permits.json...');
  const permitsRaw = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../src/data/permits.json'), 'utf8')
  );

  console.log(`Syncing ${permitsRaw.length} Okanagan permits into Supabase...`);
  let successCount = 0;

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
      console.warn(`Error inserting ${permit.permit_number}:`, insertErr.message);
    } else {
      successCount++;
    }
  }

  console.log(`SUCCESS: Successfully synced ${successCount}/${permitsRaw.length} permits into Supabase!`);
  return true;
}

checkAndSeed().catch(console.error);
