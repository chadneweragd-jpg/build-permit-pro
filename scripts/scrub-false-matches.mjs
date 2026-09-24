import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [k, ...v] = trimmed.split('=');
    const key = k.trim();
    const val = v.join('=').trim();
    if (key === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY' && (!supabaseKey || supabaseKey.startsWith('sb_publishable'))) supabaseKey = val;
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !supabaseKey) supabaseKey = val;
  }
}

const STOPWORDS = [
  'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation', 'llc', 'llp',
  'contracting', 'construction', 'builders', 'builder', 'building',
  'homes', 'home', 'developments', 'development', 'enterprises',
  'projects', 'services', 'group', 'design', 'custom', 'holdings'
];

function getCoreName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.includes(word))
    .join(' ')
    .trim();
}

async function scrubFalseMatches() {
  console.log('====================================================');
  console.log(' BUILD PERMIT PRO — SUPABASE FALSE MATCH SCRUBBER');
  console.log('====================================================');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch all builders into a map
  const { data: builders, error: bErr } = await supabase
    .from('builders_directory')
    .select('id, company_name, city, province');

  if (bErr) {
    console.warn('builders_directory table query error:', bErr.message);
  }

  const builderMap = new Map();
  for (const b of builders || []) {
    builderMap.set(b.id, b);
  }
  console.log(`Loaded ${builderMap.size} verified builders from builders_directory.`);

  // 2. Fetch all permits with a verified_builder_id
  const { data: permits, error: pErr } = await supabase
    .from('permits')
    .select('id, permit_number, contractor_name, address, city_region, verified_builder_id')
    .not('verified_builder_id', 'is', null);

  if (pErr) {
    if (pErr.message?.includes('verified_builder_id does not exist')) {
      console.log('Note: Column "verified_builder_id" is not present on Supabase permits table.');
      console.log('Builder verification links are managed dynamically in-memory by BuildersService.');
      console.log('✓ Database is free of corrupt verified_builder_id links.');
      return;
    }
    console.error('Error querying permits table:', pErr.message);
    return;
  }

  console.log(`Found ${permits?.length || 0} permits with verified_builder_id attached.`);

  let scrubbedCount = 0;
  const scrubbedDetails = [];

  for (const permit of permits || []) {
    const builder = builderMap.get(permit.verified_builder_id);
    let shouldScrub = false;
    let reason = '';

    if (!builder) {
      shouldScrub = true;
      reason = 'Builder ID not in builders_directory';
    } else {
      const permitCore = getCoreName(permit.contractor_name);
      const builderCore = getCoreName(builder.company_name);

      const isCalgary = (permit.city_region?.toLowerCase() === 'calgary') || (permit.address?.toLowerCase().includes('calgary'));
      const isKelownaBuilder = (builder.city?.toLowerCase() !== 'calgary') && (builder.province?.toUpperCase() !== 'AB');

      // Rule A: Wipe all Calgary permits where a Kelowna builder was attached
      if (isCalgary && isKelownaBuilder) {
        shouldScrub = true;
        reason = `Cross-city contamination: Calgary permit attached to Kelowna builder (${builder.company_name})`;
      }
      // Rule B: Name mismatch on core brand
      else if (!permitCore || !builderCore || permitCore !== builderCore) {
        shouldScrub = true;
        reason = `Brand mismatch: "${permit.contractor_name}" (core: "${permitCore}") != "${builder.company_name}" (core: "${builderCore}")`;
      }
    }

    if (shouldScrub) {
      const { error: uErr } = await supabase
        .from('permits')
        .update({ verified_builder_id: null })
        .eq('id', permit.id);

      if (uErr) {
        console.error(`Failed to scrub permit ${permit.permit_number}:`, uErr.message);
      } else {
        scrubbedCount++;
        scrubbedDetails.push({
          permit: permit.permit_number,
          contractor: permit.contractor_name,
          builder: builder?.company_name || 'UNKNOWN',
          reason
        });
      }
    }
  }

  console.log(`\nScrubbed ${scrubbedCount} false matches from permits table.`);
  if (scrubbedDetails.length > 0) {
    console.table(scrubbedDetails);
  } else {
    console.log('No corrupt builder links found in database. All existing links are valid.');
  }
}

scrubFalseMatches().catch((err) => {
  console.error('Scrub script fatal error:', err);
  process.exit(1);
});
