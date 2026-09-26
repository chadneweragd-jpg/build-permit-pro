import fs from 'fs';

const permits = JSON.parse(fs.readFileSync('src/data/permits.json', 'utf8'));
console.log(`Total permits: ${permits.length}`);

// 1. Audit high valuations
const over50M = permits.filter(p => p.value >= 50000000);
console.log(`\nPermits with value >= $50M: ${over50M.length}`);
for (const p of over50M.slice(0, 10)) {
  console.log(`  [${p.city_slug}] ${p.permit_number}: $${(p.value/1e6).toFixed(1)}M | ${p.sub_type} | ${p.address}`);
}

const over10Mrenos = permits.filter(p => (p.sub_type || '').toLowerCase().includes('renovation') && p.value >= 10000000);
console.log(`\nRenovations with value >= $10M: ${over10Mrenos.length}`);
for (const p of over10Mrenos.slice(0, 10)) {
  console.log(`  [${p.city_slug}] ${p.permit_number}: $${(p.value/1e6).toFixed(1)}M | ${p.sub_type} | ${p.address}`);
}

// 2. Audit coordinates dispersion for each city
console.log('\n--- Coordinate Dispersion Audit ---');
const cityMap = new Map();
for (const p of permits) {
  if (!cityMap.has(p.city_slug)) cityMap.set(p.city_slug, []);
  cityMap.get(p.city_slug).push(p);
}

for (const [slug, list] of cityMap.entries()) {
  const lats = list.map(p => p.latitude).filter(n => typeof n === 'number' && !isNaN(n));
  const lons = list.map(p => p.longitude).filter(n => typeof n === 'number' && !isNaN(n));
  
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const dLat = maxLat - minLat;
  const dLon = maxLon - minLon;

  // Check for vertical line symptom: very small dLon compared to dLat, or high duplicate count
  const uniqueLons = new Set(lons.map(n => n.toFixed(4)));
  const uniqueLats = new Set(lats.map(n => n.toFixed(4)));

  console.log(`${slug.padEnd(20)}: ${list.length} permits | Lat span: ${dLat.toFixed(4)} (${uniqueLats.size} unq) | Lon span: ${dLon.toFixed(4)} (${uniqueLons.size} unq)`);
}

// 3. Inspect Vaughan and Toronto specifically
console.log('\nVaughan sample coordinates:');
const vaughan = cityMap.get('vaughan') || [];
for (const p of vaughan.slice(0, 15)) {
  console.log(`  ${p.permit_number} | ${p.address.padEnd(45)} | lat: ${p.latitude}, lon: ${p.longitude} | $${(p.value/1e6).toFixed(2)}M`);
}

console.log('\nToronto sample coordinates:');
const toronto = cityMap.get('toronto') || [];
for (const p of toronto.slice(0, 15)) {
  console.log(`  ${p.permit_number} | ${p.address.padEnd(45)} | lat: ${p.latitude}, lon: ${p.longitude} | $${(p.value/1e6).toFixed(2)}M`);
}
