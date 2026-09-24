import verifiedBuildersRaw from '@/data/verified-builders.json';
import { Permit, VerifiedBuilder } from '@/types';

export const VERIFIED_BUILDERS: VerifiedBuilder[] = verifiedBuildersRaw as VerifiedBuilder[];

/**
 * Common corporate stopwords stripped before comparing contractor brands
 */
export const STOPWORDS = [
  'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation', 'llc', 'llp',
  'contracting', 'construction', 'builders', 'builder', 'building',
  'homes', 'home', 'developments', 'development', 'enterprises',
  'projects', 'services', 'group', 'design', 'custom', 'holdings'
];

/**
 * Extracts the core distinctive brand name by removing all generic corporate stopwords
 */
export function getCoreName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOPWORDS.includes(word))
    .join(' ')
    .trim();
}

/**
 * Normalizes contractor name string:
 * - Lowercase
 * - Removes non-alphanumeric characters
 * - Strips common corporate suffixes
 * - Collapses whitespace
 */
export function normalizeContractorName(raw?: string | null): string {
  return getCoreName(raw);
}

/**
 * Computes trigram set for string (matches PostgreSQL pg_trgm behavior)
 */
function getTrigrams(str: string): Set<string> {
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
}

export interface MatchBuilderOptions {
  city?: string;
  province?: string;
  minSimilarity?: number;
}

/**
 * Fuzzy matches an incoming permit contractor string against curated verified builders.
 * Enforces strict corporate stopword stripping, core name comparison, city/province isolation,
 * and high similarity threshold (>= 0.90).
 */
export function matchPermitBuilder(
  contractorRaw?: string | null,
  options?: MatchBuilderOptions
): MatchBuilderResult {
  const minThreshold = options?.minSimilarity ?? 0.90;

  if (!contractorRaw || typeof contractorRaw !== 'string') {
    return { builder: null, similarity: 0, isVerified: false };
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
    return { builder: null, similarity: 0, isVerified: false };
  }

  const permitCore = getCoreName(trimmed);
  if (!permitCore || permitCore.length < 3) {
    return { builder: null, similarity: 0, isVerified: false };
  }

  const permitCity = options?.city?.toLowerCase()?.trim();
  const permitProvince = options?.province?.toUpperCase()?.trim();

  // Known national commercial GCs that legitimately operate across BC and Alberta
  const NATIONAL_GCS = ['ledcor', 'graham', 'pcl', 'chandos', 'canam', 'ellisdon', 'bird'];

  let bestBuilder: VerifiedBuilder | null = null;
  let highestSimilarity = 0;

  for (const builder of VERIFIED_BUILDERS) {
    const builderCore = getCoreName(builder.company_name);
    if (!builderCore || builderCore.length < 3) continue;

    const bCity = (builder.city || 'Kelowna').toLowerCase().trim();
    const bProv = (builder.province || 'BC').toUpperCase().trim();

    const isNational = NATIONAL_GCS.some(
      (gc) => builderCore.includes(gc) || permitCore.includes(gc)
    );

    // Rule 1: Geographical sanity check (unless verified national GC)
    if (!isNational && permitCity) {
      const sameCity = bCity === permitCity;
      const sameProvince = permitProvince
        ? bProv === permitProvince
        : permitCity === 'calgary'
        ? bProv === 'AB'
        : bProv === 'BC';

      if (!sameCity && !sameProvince) {
        continue;
      }
      if (permitCity === 'calgary' && bProv !== 'AB' && bCity !== 'calgary') {
        continue;
      }
      if (permitCity !== 'calgary' && (bCity === 'calgary' || bProv === 'AB')) {
        continue;
      }
    }

    // Rule 2: Core name comparison
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

  // Only match if fuzzy similarity strictly >= minThreshold (default 0.90)
  if (highestSimilarity >= minThreshold && bestBuilder) {
    return {
      builder: { ...bestBuilder, similarity_score: Math.round(highestSimilarity * 100) / 100 },
      similarity: highestSimilarity,
      isVerified: true
    };
  }

  return { builder: null, similarity: highestSimilarity, isVerified: false };
}

/**
 * Enriches a Permit record with Tier 1 (Verified Builder) or Tier 2 (Standard Permittee) details.
 * Strictly isolates Calgary vs Kelowna data to avoid cross-city builder contamination.
 */
export function enrichPermitWithBuilder(permit: Permit): Permit {
  const isCalgary =
    permit.city_region?.toLowerCase() === 'calgary' ||
    permit.address?.toLowerCase().includes('calgary') ||
    permit.address?.toLowerCase().includes(' ab');

  const city = isCalgary ? 'Calgary' : permit.city_region || 'Kelowna';
  const province = isCalgary ? 'AB' : 'BC';

  const match = matchPermitBuilder(permit.contractor_name, {
    city,
    province,
    minSimilarity: 0.90
  });

  if (match.isVerified && match.builder) {
    const permitCore = getCoreName(permit.contractor_name || '');
    const builderCore = getCoreName(match.builder.company_name || '');

    // Final sanity check: core names must match or have >= 0.90 similarity
    if (permitCore && builderCore && (permitCore === builderCore || match.similarity >= 0.90)) {
      // Ensure we NEVER attach a Kelowna phone (250) or BC address to a Calgary permit
      if (isCalgary && (match.builder.primary_phone?.includes('(250)') || match.builder.province === 'BC')) {
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

  // If unverified, keep original raw contractor name and strip any cross-city contact leakage
  return {
    ...permit,
    tier: 2,
    verified_builder: null,
    contractor_name: permit.contractor_name,
    contractor_phone: undefined,
    contractor_email: undefined
  };
}

export interface UnmatchedContractorSummary {
  contractor_name: string;
  permit_count: number;
  total_permitted_value: number;
  latest_permit_date: string;
}

/**
 * Evaluates the Contractor Discovery Queue for unmatched contractors
 * Matches v_unmatched_active_contractors view logic
 */
export function getUnmatchedActiveContractors(permits: Permit[]): UnmatchedContractorSummary[] {
  const map = new Map<string, { count: number; totalValue: number; latestDate: string }>();

  for (const p of permits) {
    const enriched = enrichPermitWithBuilder(p);
    if (enriched.tier === 1) continue;

    const name = (p.contractor_name || '').trim();
    if (!name || name.toLowerCase().includes('private')) continue;

    const existing = map.get(name) || { count: 0, totalValue: 0, latestDate: p.issue_date };
    existing.count += 1;
    existing.totalValue += Number(p.estimated_value || 0);
    if (p.issue_date > existing.latestDate) {
      existing.latestDate = p.issue_date;
    }
    map.set(name, existing);
  }

  const results: UnmatchedContractorSummary[] = [];
  map.forEach((data, name) => {
    if (data.count >= 2 || data.totalValue >= 150000) {
      results.push({
        contractor_name: name,
        permit_count: data.count,
        total_permitted_value: data.totalValue,
        latest_permit_date: data.latestDate
      });
    }
  });

  results.sort((a, b) => b.total_permitted_value - a.total_permitted_value);
  return results;
}
