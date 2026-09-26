import { CANADIAN_CITY_CONNECTORS, getAllConnectors, getActiveCitySlugs } from '../src/lib/ingestion/connectors/registry.js';

console.log('========================================================================');
console.log(' TEST: MULTI-CITY INGESTION CONNECTORS (17 CANADIAN MUNICIPALITIES)');
console.log('========================================================================\n');

const EXPECTED_CITIES = [
  'vancouver', 'surrey', 'burnaby', 'richmond', 'coquitlam', 'kelowna',
  'calgary', 'edmonton', 'toronto', 'mississauga', 'brampton', 'markham',
  'vaughan', 'hamilton', 'ottawa', 'kitchener-waterloo', 'winnipeg'
];

const REQUIRED_SCHEMA_COLUMNS = [
  'id',
  'permit_number',
  'city_slug',
  'address',
  'applicant',
  'contractor',
  'sub_type',
  'value',
  'approval_date'
];

let allPassed = true;
const activeSlugs = getActiveCitySlugs();
console.log(`[*] Registered city connectors (${activeSlugs.length}):`, activeSlugs.join(', '));

// Verify 17 expected cities are present
for (const slug of EXPECTED_CITIES) {
  if (!activeSlugs.includes(slug)) {
    console.error(`[-] Missing expected connector for city: ${slug}`);
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
}

// Test each connector fetch & unified schema compliance
async function testConnectors() {
  const connectors = getAllConnectors();
  console.log(`\nTesting ${connectors.length} municipal connectors against Unified Schema...\n`);

  for (const connector of connectors) {
    try {
      const permits = await connector.fetchPermits({ limit: 5 });
      if (!Array.isArray(permits) || permits.length === 0) {
        console.error(`❌ [${connector.citySlug}] Returned empty or non-array result!`);
        allPassed = false;
        continue;
      }

      // Check first permit schema
      const sample = permits[0];
      const missingFields = REQUIRED_SCHEMA_COLUMNS.filter(f => sample[f] === undefined || sample[f] === null);

      if (missingFields.length > 0) {
        console.error(`❌ [${connector.citySlug}] Missing required unified schema fields: ${missingFields.join(', ')}`);
        allPassed = false;
      } else if (sample.city_slug !== connector.citySlug) {
        console.error(`❌ [${connector.citySlug}] city_slug mismatch! Expected '${connector.citySlug}', got '${sample.city_slug}'`);
        allPassed = false;
      } else {
        console.log(`  ✓ [${connector.citySlug.padEnd(20)}] ${connector.cityName} (${connector.province}) - Fetched ${permits.length} permits | Schema OK (e.g. ${sample.permit_number} | $${(sample.value / 1e6).toFixed(1)}M)`);
      }
    } catch (err) {
      console.error(`❌ [${connector.citySlug}] Ingestion error:`, err.message);
      allPassed = false;
    }
  }

  console.log('\n========================================================================');
  if (allPassed) {
    console.log('✅ ALL 17 CANADIAN MUNICIPAL CONNECTORS PASSED UNIFIED SCHEMA AUDIT.');
  } else {
    console.error('❌ ONE OR MORE CONNECTOR TESTS FAILED.');
    process.exit(1);
  }
}

testConnectors();
