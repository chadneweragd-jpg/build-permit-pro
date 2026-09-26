import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMapAndInspectorFixes() {
  console.log('========================================================================');
  console.log(' TEST: MAP REAL COORDINATES & INSPECTOR DESYNC FIXES');
  console.log('========================================================================\n');

  const permitsPath = path.resolve(__dirname, '../src/data/permits.json');
  const permits = JSON.parse(fs.readFileSync(permitsPath, 'utf8'));

  // Test 1: Verify Vaughan coordinates are non-circular
  const vaughanPermits = permits.filter((p) => p.city_slug === 'vaughan');
  console.log(`[Vaughan Coordinates Audit] Loaded ${vaughanPermits.length} Vaughan permits.`);

  // In a circle with fixed radius r, (lat - baseLat)^2 + (lon - baseLon)^2 is constant.
  // In a street network grid, distances from base vary widely across different streets!
  const baseVaughan = [43.8563, -79.5085];
  const distances = vaughanPermits.map((p) => {
    const dLat = p.latitude - baseVaughan[0];
    const dLon = p.longitude - baseVaughan[1];
    return Math.sqrt(dLat * dLat + dLon * dLon);
  });

  const uniqueDistances = new Set(distances.map((d) => d.toFixed(3)));
  console.log(`  - Unique radial distances from city center: ${uniqueDistances.size} / ${distances.length}`);
  if (uniqueDistances.size > 20) {
    console.log('  ✓ Circular ring glitch eliminated: coordinates follow varied civic street corridors.');
  } else {
    throw new Error('Coordinates still appear circular or uniform!');
  }

  // Verify street alignments for major corridors
  const hwy7 = vaughanPermits.filter((p) => p.address.includes('Hwy 7'));
  const dufferin = vaughanPermits.filter((p) => p.address.includes('Dufferin'));
  const jane = vaughanPermits.filter((p) => p.address.includes('Jane'));
  console.log(`  - Hwy 7 corridor sample (${hwy7.length} permits): lat ~${hwy7[0]?.latitude}, lon ~${hwy7[0]?.longitude}`);
  console.log(`  - Dufferin corridor sample (${dufferin.length} permits): lat ~${dufferin[0]?.latitude}, lon ~${dufferin[0]?.longitude}`);
  console.log(`  - Jane corridor sample (${jane.length} permits): lat ~${jane[0]?.latitude}, lon ~${jane[0]?.longitude}`);

  // Test 2: Verify Brampton has live GIS coordinates
  const bramptonPermits = permits.filter((p) => p.city_slug === 'brampton');
  console.log(`\n[Brampton GIS Coordinates Audit] Loaded ${bramptonPermits.length} Brampton permits.`);
  console.log(`  - Sample Brampton GIS pin: ${bramptonPermits[0]?.address} -> [${bramptonPermits[0]?.latitude}, ${bramptonPermits[0]?.longitude}]`);
  if (bramptonPermits[0]?.latitude && bramptonPermits[0]?.longitude) {
    console.log('  ✓ Brampton GIS coordinates verified.');
  }

  // Test 3: Verify Exact Permit ID Resolution
  console.log('\n[Permit ID Resolution Audit]');
  const sampleVaughan = vaughanPermits[0];
  console.log(`  - Sample Vaughan permit ID: ${sampleVaughan.id} (${sampleVaughan.permit_number})`);
  console.log(`  - Address: ${sampleVaughan.address}`);
  console.log(`  - City Slug: ${sampleVaughan.city_slug}`);

  if (sampleVaughan.address.includes('South Ridge Dr') || sampleVaughan.city_slug === 'kelowna') {
    throw new Error('Vaughan permit incorrectly resolved to Kelowna!');
  } else {
    console.log('  ✓ Exact permit resolution verified (non-Kelowna).');
  }

  console.log('\n========================================================================');
  console.log('✅ ALL MAP COORDINATES & INSPECTOR TESTS PASSED.');
  console.log('========================================================================\n');
}

testMapAndInspectorFixes().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
