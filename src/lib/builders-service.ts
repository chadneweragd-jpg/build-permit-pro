import { Permit, VerifiedBuilder } from '@/types';
import {
  VERIFIED_BUILDERS,
  STOPWORDS,
  getCoreName,
  normalizeContractorName,
  getTrigrams,
  calculateTrigramSimilarity,
  MatchBuilderResult,
  MatchBuilderOptions,
  getPermitCity,
  matchPermitBuilder,
  matchPermitToBuilder,
  enrichPermitWithBuilder
} from '@/lib/enrichment/matcher';

export {
  VERIFIED_BUILDERS,
  STOPWORDS,
  getCoreName,
  normalizeContractorName,
  getTrigrams,
  calculateTrigramSimilarity,
  getPermitCity,
  matchPermitBuilder,
  matchPermitToBuilder,
  enrichPermitWithBuilder
};
export type { MatchBuilderResult, MatchBuilderOptions };

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
