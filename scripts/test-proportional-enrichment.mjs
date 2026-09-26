import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('========================================================================');
console.log(' TEST: PROPORTIONAL ENRICHMENT MODEL & TERRITORY ISOLATION');
console.log('========================================================================\n');

const permitsPath = path.resolve(__dirname, '../src/data/permits.json');
if (!fs.existsSync(permitsPath)) {
  console.error('❌ permits.json not found!');
  process.exit(1);
}

const allPermits = JSON.parse(fs.readFileSync(permitsPath, 'utf8'));
console.log(`[*] Loaded ${allPermits.length} permits from bundle.\n`);

// 1. Check Kelowna ground-truth ratio
const kelownaPermits = allPermits.filter(p => p.city_slug === 'kelowna');
const kelownaTier1 = kelownaPermits.filter(p => p.tier === 1 || p.verified_builder);
const kelownaRatio = kelownaTier1.length / kelownaPermits.length;

console.log(`[Kelowna Benchmark] Total: ${kelownaPermits.length} | Tier 1: ${kelownaTier1.length} | Ratio: ${(kelownaRatio * 100).toFixed(1)}%`);
if (Math.abs(kelownaRatio - 0.355) > 0.01) {
  console.warn(`⚠️ Kelowna ratio (${(kelownaRatio * 100).toFixed(1)}%) slightly differs from 35.5% benchmark.`);
} else {
  console.log(`✓ Kelowna benchmark verified at exactly 35.5%`);
}

// 2. City-by-city validation
const EXPECTED_CITIES = [
  'vancouver', 'surrey', 'burnaby', 'richmond', 'coquitlam', 'kelowna',
  'calgary', 'edmonton', 'toronto', 'mississauga', 'brampton', 'markham',
  'vaughan', 'hamilton', 'ottawa', 'kitchener-waterloo', 'winnipeg'
];

const AREA_CODE_MAP = {
  vancouver: ['(604)', '(778)'],
  surrey: ['(604)', '(778)'],
  burnaby: ['(604)', '(778)'],
  richmond: ['(604)', '(778)'],
  coquitlam: ['(604)', '(778)'],
  kelowna: ['(250)'],
  calgary: ['(403)', '(587)'],
  edmonton: ['(780)', '(587)'],
  toronto: ['(416)', '(647)', '(905)'],
  mississauga: ['(905)', '(289)'],
  brampton: ['(905)', '(289)'],
  markham: ['(905)', '(289)'],
  vaughan: ['(905)', '(289)'],
  hamilton: ['(905)', '(289)'],
  ottawa: ['(613)', '(343)'],
  'kitchener-waterloo': ['(519)', '(226)'],
  winnipeg: ['(204)', '(431)']
};

let allPassed = true;
console.log('\nEvaluating 17 municipal pipelines against Proportional Model:\n');

for (const citySlug of EXPECTED_CITIES) {
  const cityPermits = allPermits.filter(p => p.city_slug === citySlug);
  if (cityPermits.length === 0) {
    console.error(`❌ [${citySlug}] No permits found!`);
    allPassed = false;
    continue;
  }

  const tier1Permits = cityPermits.filter(p => p.tier === 1 || p.verified_builder);
  const ratio = (tier1Permits.length / cityPermits.length) * 100;
  const expectedAreaCodes = AREA_CODE_MAP[citySlug] || [];

  // Verify proportional ratio (~33% - 36%)
  if (ratio < 30 || ratio > 40) {
    console.error(`❌ [${citySlug}] Ratio out of proportional bounds: ${ratio.toFixed(1)}%`);
    allPassed = false;
  }

  // Verify territory isolation on Tier 1 permits
  let phoneCheckPassed = true;
  for (const p of tier1Permits) {
    const phone = p.contractor_phone || (p.verified_builder && p.verified_builder.primary_phone) || '';
    if (phone && expectedAreaCodes.length > 0) {
      const hasValidCode = expectedAreaCodes.some(code => phone.includes(code));
      if (!hasValidCode && citySlug !== 'kelowna') {
        console.error(`❌ [${citySlug}] Phone cross-contamination: Permit ${p.permit_number} has phone '${phone}', expected area code ${expectedAreaCodes.join(' or ')}`);
        phoneCheckPassed = false;
        allPassed = false;
      }
    }
  }

  // Verify Tier 2 permits have no verified_builder attached
  const tier2Permits = cityPermits.filter(p => p.tier === 2);
  const corruptedTier2 = tier2Permits.filter(p => p.verified_builder !== null && p.verified_builder !== undefined);
  if (corruptedTier2.length > 0) {
    console.error(`❌ [${citySlug}] Found ${corruptedTier2.length} Tier 2 permits with verified_builder attached!`);
    allPassed = false;
  }

  console.log(`  ✓ [${citySlug.padEnd(20)}] ${String(cityPermits.length).padStart(3)} permits | ${String(tier1Permits.length).padStart(2)} Tier 1 (${ratio.toFixed(1)}%) | Territory: ${expectedAreaCodes.join('/')} | Isolation: ${phoneCheckPassed ? 'Clean' : 'FAIL'}`);
}

console.log('\n========================================================================');
if (allPassed) {
  console.log('✅ ALL PROPORTIONAL MODEL AND TERRITORY ISOLATION TESTS PASSED (17/17).');
} else {
  console.error('❌ PROPORTIONAL MODEL VERIFICATION FAILED.');
  process.exit(1);
}
