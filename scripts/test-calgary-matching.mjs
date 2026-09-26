import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log(' STRICT TERRITORY MATCHING & CALGARY ACTIVATION TEST');
console.log('====================================================\n');

// Load verified-builders.json directly
const dataPath = path.resolve(__dirname, '../src/data/verified-builders.json');
const VERIFIED_BUILDERS = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const STOPWORDS = [
  'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation', 'llc', 'llp', 'co', 'company',
  'contracting', 'construction', 'builders', 'builder', 'building',
  'homes', 'home', 'developments', 'development', 'enterprises',
  'projects', 'services', 'group', 'design', 'custom', 'holdings',
  'lp', 'jv', 'the', 'management', 'residential', 'commercial', 'industrial',
  'engineering', 'properties', 'communities', 'calgary', 'alberta', 'ab', 'kelowna', 'bc',
  'and', 'infrastructure', 'living', 'multi', 'built'
];

function getCoreName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.includes(word) && !/^\d+$/.test(word))
    .join(' ')
    .trim();
}

function calculateTrigramSimilarity(str1, str2) {
  const s1 = (str1 || '').trim().toLowerCase();
  const s2 = (str2 || '').trim().toLowerCase();

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    if (minLen / maxLen >= 0.85) return 0.95;
    if (minLen / maxLen >= 0.70) return 0.90;
  }

  function getTrigrams(str) {
    const padded = `  ${str} `;
    const trigrams = new Set();
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  }

  const set1 = getTrigrams(s1);
  const set2 = getTrigrams(s2);

  let intersection = 0;
  for (const t of set1) {
    if (set2.has(t)) intersection++;
  }

  const total = set1.size + set2.size;
  if (total === 0) return 0;
  return (2.0 * intersection) / total;
}

function matchPermitBuilder(contractorRaw, options = {}) {
  const targetCity = (options.city || '').toLowerCase().trim();
  const minSimilarity = options.minSimilarity ?? 0.90;
  const isCalgary = targetCity === 'calgary';
  const unverifiedLabel = isCalgary ? 'Standard Permittee (Calgary)' : 'Standard Permittee (Kelowna)';

  if (!contractorRaw || typeof contractorRaw !== 'string') {
    return { builder: null, similarity: 0, isVerified: false, unverifiedLabel };
  }

  const trimmed = contractorRaw.trim();
  const permitCore = getCoreName(trimmed);
  if (!permitCore || permitCore.length < 2) {
    return { builder: null, similarity: 0, isVerified: false, unverifiedLabel };
  }

  // STRICT TERRITORY FILTER:
  const candidateBuilders = VERIFIED_BUILDERS.filter((builder) => {
    const bCity = (builder.city || '').toLowerCase().trim();
    return bCity === targetCity;
  });

  let bestBuilder = null;
  let highestSimilarity = 0;

  for (const builder of candidateBuilders) {
    const builderCore = getCoreName(builder.company_name);
    if (!builderCore || builderCore.length < 2) continue;

    if (permitCore === builderCore) {
      return {
        builder: { ...builder, similarity_score: 1.0 },
        similarity: 1.0,
        isVerified: true
      };
    }

    const similarity = calculateTrigramSimilarity(permitCore, builderCore);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestBuilder = builder;
    }
  }

  if (bestBuilder && highestSimilarity >= minSimilarity) {
    return {
      builder: { ...bestBuilder, similarity_score: highestSimilarity },
      similarity: highestSimilarity,
      isVerified: true
    };
  }

  return {
    builder: null,
    similarity: highestSimilarity,
    isVerified: false,
    unverifiedLabel
  };
}

// 1. Target Calgary Builders Check
const targetBuilders = [
  'TRUMAN HOMES 1995',
  'JAYMAN BUILT',
  'MORRISON HOMES (CALGARY)',
  'SHANE HOMES',
  'CEDARGLEN GROUP (THE)',
  'BROOKFIELD RESIDENTIAL (ALBERTA)',
  'PCL CONSTRUCTION MANAGEMENT',
  'LEDCOR CONSTRUCTION',
  'CANA CONSTRUCTION',
  'GRAHAM CONSTRUCTION AND ENGINEERING LP'
];

console.log('--- 1. Testing Core Name Matching For Target Calgary Builders ---');
let allTargetsMatched = true;

for (const name of targetBuilders) {
  const result = matchPermitBuilder(name, { city: 'Calgary', minSimilarity: 0.90 });
  if (result.isVerified && result.builder) {
    console.log(`✓ "${name}" -> MATCHED: "${result.builder.company_name}" (${result.similarity.toFixed(2)})`);
    console.log(`   Phone: ${result.builder.primary_phone} | Email: ${result.builder.email} | Address: ${result.builder.physical_address} | Principal: ${result.builder.key_principal}`);
    
    // Verify (403) or (587) phone
    const hasCalgaryPhone = result.builder.primary_phone?.includes('(403)') || result.builder.primary_phone?.includes('(587)');
    if (!hasCalgaryPhone) {
      console.error(`✗ FAIL: Builder phone is not (403)/(587): ${result.builder.primary_phone}`);
      allTargetsMatched = false;
    }
  } else {
    console.error(`✗ FAIL: "${name}" was NOT matched! (sim: ${result.similarity})`);
    allTargetsMatched = false;
  }
}

// 2. Unverified Below 90% Threshold (e.g. SOULEAU CONTRACTING)
console.log('\n--- 2. Testing Below 90% Threshold (SOULEAU CONTRACTING) ---');
const souleauResult = matchPermitBuilder('SOULEAU CONTRACTING', { city: 'Calgary', minSimilarity: 0.90 });
console.log(`"SOULEAU CONTRACTING" -> isVerified: ${souleauResult.isVerified}, builder: ${souleauResult.builder}, label: "${souleauResult.unverifiedLabel}"`);

let souleauPassed = false;
if (!souleauResult.isVerified && souleauResult.builder === null && souleauResult.unverifiedLabel === 'Standard Permittee (Calgary)') {
  console.log('✓ SOULEAU CONTRACTING correctly set to null verified_builder and labeled "Standard Permittee (Calgary)"!');
  souleauPassed = true;
} else {
  console.error('✗ FAIL: SOULEAU CONTRACTING did not behave as expected:', souleauResult);
}

// 3. Strict Territory Isolation (Calgary permits vs Kelowna builders, Kelowna permits vs Calgary builders)
console.log('\n--- 3. Testing Strict Territory Isolation ---');
const crossCityTest1 = matchPermitBuilder('AuthenTech Homes Ltd.', { city: 'Calgary', minSimilarity: 0.90 });
console.log(`Okanagan builder on Calgary permit -> isVerified: ${crossCityTest1.isVerified}, builder: ${crossCityTest1.builder?.company_name}`);

const crossCityTest2 = matchPermitBuilder('Truman Homes', { city: 'Kelowna', minSimilarity: 0.90 });
console.log(`Calgary builder on Kelowna permit -> isVerified: ${crossCityTest2.isVerified}, builder: ${crossCityTest2.builder?.company_name}`);

let isolationPassed = false;
if (!crossCityTest1.isVerified && !crossCityTest2.isVerified) {
  console.log('✓ ZERO cross-city territory leakage! Calgary only matches Calgary; Kelowna only matches Kelowna.');
  isolationPassed = true;
} else {
  console.error('✗ FAIL: Territory isolation breached!');
}

console.log('\n====================================================');
if (allTargetsMatched && souleauPassed && isolationPassed) {
  console.log(' ALL VERIFICATION CHECKS PASSED SUCCESSFULLY (100%)');
} else {
  console.error(' SOME VERIFICATION CHECKS FAILED');
  process.exit(1);
}
console.log('====================================================');
