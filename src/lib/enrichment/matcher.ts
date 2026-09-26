import verifiedBuildersRaw from '@/data/verified-builders.json';
import { Permit, VerifiedBuilder } from '@/types';

export const VERIFIED_BUILDERS: VerifiedBuilder[] = verifiedBuildersRaw as VerifiedBuilder[];

/**
 * Stopwords stripped before comparing contractor brands.
 * Includes corporate suffixes, legal entities, categories, and geographic markers.
 */
export const STOPWORDS = [
  'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation', 'llc', 'llp', 'co', 'company',
  'contracting', 'construction', 'builders', 'builder', 'building',
  'homes', 'home', 'developments', 'development', 'enterprises',
  'projects', 'services', 'group', 'design', 'custom', 'holdings',
  'lp', 'jv', 'the', 'management', 'residential', 'commercial', 'industrial',
  'engineering', 'properties', 'communities', 'calgary', 'alberta', 'ab', 'kelowna', 'bc',
  'and', 'infrastructure', 'living', 'multi', 'built'
];

/**
 * Extracts the core distinctive brand name by removing all generic corporate stopwords,
 * location names, legal identifiers, and standalone numbers.
 */
export function getCoreName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.includes(word) && !/^\d+$/.test(word))
    .join(' ')
    .trim();
}

/**
 * Normalizes contractor name string
 */
export function normalizeContractorName(raw?: string | null): string {
  return getCoreName(raw);
}

/**
 * Computes trigram set for string (matches PostgreSQL pg_trgm behavior)
 */
export function getTrigrams(str: string): Set<string> {
  const padded = `  ${str} `;
  const trigrams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Computes Jaccard similarity score between two strings using character trigrams
 */
export function calculateTrigramSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  const t1 = getTrigrams(s1);
  const t2 = getTrigrams(s2);
  if (t1.size === 0 || t2.size === 0) return 0;

  let intersection = 0;
  for (const tri of t1) {
    if (t2.has(tri)) intersection++;
  }

  const union = t1.size + t2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export interface MatchBuilderResult {
  builder: VerifiedBuilder | null;
  similarity: number;
  isVerified: boolean;
  unverifiedLabel?: string;
}

export interface MatchBuilderOptions {
  city?: string;
  province?: string;
  minSimilarity?: number;
}

/**
 * Helper to determine canonical city jurisdiction ('calgary' or 'kelowna')
 */
export function getPermitCity(permit: {
  city?: string;
  city_region?: string;
  city_slug?: string;
  address?: string;
}): string {
  if (permit.city_slug) return permit.city_slug.toLowerCase().trim();
  const c = (permit.city || permit.city_region || '').toLowerCase().trim();
  if (c) return c;
  const addr = (permit.address || '').toLowerCase();
  if (addr.includes('calgary') || addr.includes(', ab') || addr.includes(' ab ')) {
    return 'calgary';
  }
  return 'kelowna';
}

/**
 * Strict Territory Builder Matcher:
 * - ONLY searches builders where builder.city.toLowerCase() === permit.city.toLowerCase().
 * - Calgary permits must ONLY match Calgary builders; Kelowna permits must ONLY match Kelowna builders.
 * - If the core name match is below 90% (e.g. SOULEAU CONTRACTING), sets verified_builder to null
 *   and marks as unverified "Standard Permittee (<City>)".
 */
export function matchPermitBuilder(
  contractorRaw?: string | null,
  options?: MatchBuilderOptions,
  buildersList?: VerifiedBuilder[]
): MatchBuilderResult {
  const minThreshold = options?.minSimilarity ?? 0.90;
  const targetCity = (options?.city || 'kelowna').toLowerCase().trim();
  const unverifiedLabel = `Standard Permittee (${targetCity.charAt(0).toUpperCase() + targetCity.slice(1)})`;

  if (!contractorRaw || typeof contractorRaw !== 'string') {
    return { builder: null, similarity: 0, isVerified: false, unverifiedLabel };
  }

  const trimmed = contractorRaw.trim();
  const lower = trimmed.toLowerCase();

  // Exclude private applicants, owner-builders, and empty strings
  if (
    !trimmed ||
    lower.includes('private') ||
    lower === 'owner' ||
    lower === 'owner / builder' ||
    lower === 'applicant' ||
    lower === 'applicant on file' ||
    lower === 'unknown'
  ) {
    return { builder: null, similarity: 0, isVerified: false, unverifiedLabel };
  }

  const permitCore = getCoreName(trimmed);
  if (!permitCore || permitCore.length < 2) {
    return { builder: null, similarity: 0, isVerified: false, unverifiedLabel };
  }

  const allBuilders = buildersList || VERIFIED_BUILDERS;

  // STRICT TERRITORY FILTER:
  // ONLY search builders where builder.city.toLowerCase() === permit.city.toLowerCase()
  const candidateBuilders = allBuilders.filter((builder) => {
    const bCity = (builder.city || '').toLowerCase().trim();
    return bCity === targetCity;
  });

  let bestBuilder: VerifiedBuilder | null = null;
  let highestSimilarity = 0;

  for (const builder of candidateBuilders) {
    const builderCore = getCoreName(builder.company_name);
    if (!builderCore || builderCore.length < 2) continue;

    // Exact match on core distinct brand name
    if (permitCore === builderCore) {
      return {
        builder: { ...builder, similarity_score: 1.0 },
        similarity: 1.0,
        isVerified: true
      };
    }

    // Fuzzy score strictly on core brand name
    const similarity = calculateTrigramSimilarity(permitCore, builderCore);

    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestBuilder = builder;
    }
  }

  // Strict Threshold: Only match if core name match is strictly >= 90% (0.90)
  if (highestSimilarity >= minThreshold && bestBuilder) {
    return {
      builder: { ...bestBuilder, similarity_score: Math.round(highestSimilarity * 100) / 100 },
      similarity: highestSimilarity,
      isVerified: true
    };
  }

  // If below 90% (e.g. SOULEAU CONTRACTING), set verified_builder to null
  return {
    builder: null,
    similarity: highestSimilarity,
    isVerified: false,
    unverifiedLabel
  };
}

/**
 * Matches an incoming permit object against verified builders with strict territory isolation
 */
export function matchPermitToBuilder(
  permit: {
    contractor_name?: string;
    city?: string;
    city_region?: string;
    city_slug?: string;
    address?: string;
  },
  buildersList?: VerifiedBuilder[]
): MatchBuilderResult {
  const city = getPermitCity(permit);
  return matchPermitBuilder(
    permit.contractor_name,
    { city, minSimilarity: 0.90 },
    buildersList
  );
}

/**
 * Enriches a Permit record with Tier 1 (Verified Builder) or Tier 2 (Standard Permittee) details.
 * Strictly isolates city data to avoid cross-city builder contamination.
 */
export function enrichPermitWithBuilder(
  permit: Permit,
  buildersList?: VerifiedBuilder[]
): Permit {
  // If permit already has a verified_builder assigned:
  if (permit.verified_builder && permit.tier === 1) {
    return permit;
  }

  const city = getPermitCity(permit);

  const match = matchPermitBuilder(
    permit.contractor_name,
    {
      city,
      minSimilarity: 0.90
    },
    buildersList
  );

  if (match.isVerified && match.builder) {
    const permitCore = getCoreName(permit.contractor_name || '');
    const builderCore = getCoreName(match.builder.company_name || '');

    // Final sanity check: core names must match or have >= 0.90 similarity
    if (permitCore && builderCore && (permitCore === builderCore || match.similarity >= 0.90)) {
      const bCity = (match.builder.city || '').toLowerCase().trim();
      // Ensure cross-city territory isolation
      if (bCity && city && bCity !== city) {
        return {
          ...permit,
          tier: 2,
          verified_builder: null,
          contractor_phone: undefined,
          contractor_email: undefined
        };
      }

      return {
        ...permit,
        tier: 1,
        verified_builder: match.builder,
        contractor_phone: permit.contractor_phone || match.builder.primary_phone,
        contractor_email: permit.contractor_email || match.builder.email
      };
    }
  }

  // If match is below 90% or unverified, keep permit's contractor_name
  return {
    ...permit,
    tier: 2,
    verified_builder: null,
    contractor_name: permit.contractor_name,
    contractor_phone: permit.contractor_phone,
    contractor_email: permit.contractor_email
  };
}
