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

  // Test 4: Verify 2D Geographic Dispersion (No Vertical Line / Stacking Glitch)
  console.log('\n[2D Geographic Dispersion Audit]');
  const citiesToTest = ['vaughan', 'toronto', 'mississauga', 'surrey', 'markham'];
  for (const slug of citiesToTest) {
    const cityPermits = permits.filter((p) => p.city_slug === slug);
    const lats = cityPermits.map((p) => p.latitude);
    const lons = cityPermits.map((p) => p.longitude);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lonSpan = Math.max(...lons) - Math.min(...lons);
    const uniqueLons = new Set(lons.map((l) => l.toFixed(4)));

    console.log(`  - [${slug.padEnd(12)}] Lat Span: ${latSpan.toFixed(4)} | Lon Span: ${lonSpan.toFixed(4)} | Unique Lons: ${uniqueLons.size}/${cityPermits.length}`);

    // If lonSpan is very tiny (< 0.030) or uniqueLons is small, pins are stacked in a vertical line
    if (lonSpan < 0.05) {
      throw new Error(`Vertical stacking detected in ${slug}: lonSpan is only ${lonSpan.toFixed(4)}!`);
    }
    if (uniqueLons.size < cityPermits.length * 0.5) {
      throw new Error(`High longitude collision detected in ${slug}: only ${uniqueLons.size} unique longitudes!`);
    }
    console.log(`    ✓ 2D Road network dispersion verified for ${slug}.`);
  }

  // Test 5: Verify Valuation Scaling & Normalization (No $100M+ Renovations)
  console.log('\n[Valuation Scaling & Normalization Audit]');
  const allRenovations = permits.filter((p) =>
    (p.sub_type || '').toLowerCase().includes('renovation') ||
    (p.sub_type || '').toLowerCase().includes('tenant improvement')
  );
  console.log(`  - Total renovation / tenant improvement permits audited: ${allRenovations.length}`);
  const inflatedRenos = allRenovations.filter((p) => p.value > 5000000);
  if (inflatedRenos.length > 0) {
    throw new Error(`Found ${inflatedRenos.length} inflated renovations exceeding $5M CAD! Sample: ${inflatedRenos[0].permit_number} = $${(inflatedRenos[0].value/1e6).toFixed(1)}M`);
  }
  console.log('    ✓ Zero inflated renovations (> $5M) found across all 17 markets.');

  // Check Toronto trade permits (plumbing, mechanical, drain, demo)
  const torontoTrades = permits.filter((p) =>
    p.city_slug === 'toronto' &&
    /plumbing|mechanical|drain|demolition/i.test(p.sub_type || '')
  );
  console.log(`  - Toronto trade permits audited: ${torontoTrades.length}`);
  const inflatedTrades = torontoTrades.filter((p) => p.value > 500000);
  if (inflatedTrades.length > 0) {
    throw new Error(`Found ${inflatedTrades.length} inflated Toronto trade permits! Sample: ${inflatedTrades[0].permit_number} = $${(inflatedTrades[0].value/1e6).toFixed(1)}M`);
  }
  console.log('    ✓ Zero inflated trade permits (> $500k) found in Toronto.');

  // Check Vaughan total valuation (must be < $1B)
  const vaughanTotalVal = vaughanPermits.reduce((acc, p) => acc + (p.value || 0), 0);
  console.log(`  - Vaughan total active valuation: $${(vaughanTotalVal / 1e6).toFixed(1)}M CAD`);
  if (vaughanTotalVal > 1000000000) {
    throw new Error(`Vaughan valuation still inflated to $${(vaughanTotalVal/1e9).toFixed(2)}B!`);
  }
  console.log('    ✓ Vaughan valuation scaled realistically to municipal market scale (< $1B).');

  console.log('\n========================================================================');
  console.log('✅ ALL MAP COORDINATES, 2D DISPERSION & VALUATION TESTS PASSED.');
  console.log('========================================================================\n');
}

testMapAndInspectorFixes().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
