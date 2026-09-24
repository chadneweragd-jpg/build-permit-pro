import verifiedBuildersRaw from '@/data/verified-builders.json';
import { Permit, VerifiedBuilder } from '@/types';

export const VERIFIED_BUILDERS: VerifiedBuilder[] = verifiedBuildersRaw as VerifiedBuilder[];

/**
 * Normalizes contractor name string:
 * - Lowercase
 * - Removes non-alphanumeric characters
 * - Strips common corporate suffixes
 * - Collapses whitespace
 */
export function normalizeContractorName(raw?: string | null): string {
  if (!raw) return '';
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  const stripped = cleaned.replace(/\b(ltd|limited|inc|incorporated|corp|corporation|group|llp|holdings|enterprises)\b/g, '');
  return stripped.trim().replace(/\s+/g, ' ');
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
 * Enforces strict city/province isolation and high threshold (>= 0.85).
 */
export function matchPermitBuilder(
  contractorRaw?: string | null,
  options?: MatchBuilderOptions
): MatchBuilderResult {
  const minThreshold = options?.minSimilarity ?? 0.85;

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
    lower === 'unknown'
  ) {
    return { builder: null, similarity: 0, isVerified: false };
  }

  const normalizedInput = normalizeContractorName(trimmed);
  const rawClean = lower.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  const permitCity = options?.city?.toLowerCase()?.trim();

  let bestBuilder: VerifiedBuilder | null = null;
  let highestSimilarity = 0;

  for (const builder of VERIFIED_BUILDERS) {
    // City & Province Isolation:
    // If permit specifies Calgary (AB), NEVER match a Kelowna / BC builder
    if (permitCity) {
      const bCity = (builder.city || 'Kelowna').toLowerCase().trim();
      const bProv = (builder.province || 'BC').toUpperCase().trim();

      if (permitCity === 'calgary' && bProv !== 'AB' && bCity !== 'calgary') {
        continue;
      }
      if (permitCity !== 'calgary' && (bCity === 'calgary' || bProv === 'AB')) {
        continue;
      }
    }

    // 1. Direct normalized equality
    if (builder.normalized_name === normalizedInput) {
      return {
        builder: { ...builder, similarity_score: 1.0 },
        similarity: 1.0,
        isVerified: true
      };
    }

    // 2. Trigram similarity against normalized name and company name
    const simNorm = calculateTrigramSimilarity(builder.normalized_name, normalizedInput);
    const simClean = calculateTrigramSimilarity(
      builder.company_name.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(),
      rawClean
    );
    const score = Math.max(simNorm, simClean);

    if (score > highestSimilarity) {
      highestSimilarity = score;
      bestBuilder = builder;
    }
  }

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
  const city = permit.city_region || (permit.address?.toLowerCase().includes('calgary') ? 'Calgary' : 'Kelowna');
  const province = city.toLowerCase() === 'calgary' ? 'AB' : 'BC';

  const match = matchPermitBuilder(permit.contractor_name, {
    city,
    province,
    minSimilarity: 0.85
  });

  if (match.isVerified && match.builder) {
    // Ensure we NEVER attach a Kelowna phone (250) or Kelowna address to a Calgary permit
    if (city.toLowerCase() === 'calgary' && match.builder.primary_phone?.includes('(250)')) {
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

  // Under 0.85 threshold or different city: keep original raw contractor and null out any contaminated contacts
  const cleanPhone = city.toLowerCase() === 'calgary' && permit.contractor_phone?.includes('(250)') 
    ? undefined 
    : permit.contractor_phone;
  const cleanEmail = city.toLowerCase() === 'calgary' && (permit.contractor_email?.includes('bc.ca') || permit.contractor_email?.includes('kelowna'))
    ? undefined
    : permit.contractor_email;

  return {
    ...permit,
    tier: 2,
    verified_builder: null,
    contractor_name: permit.contractor_name,
    contractor_phone: cleanPhone,
    contractor_email: cleanEmail
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
