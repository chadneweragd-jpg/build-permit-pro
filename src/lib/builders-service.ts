import { Permit, VerifiedBuilder } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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

/**
 * AUDIT FIX (2026-10-03): the builder match list used to be ONLY the static JSON bundled
 * into the app at build time (VERIFIED_BUILDERS) -- adding a newly-verified builder meant
 * editing a file and redeploying the whole site. There is now a live `builders_directory`
 * table in Supabase (see supabase/migrations/20261003_builders_directory_live.sql) that can
 * be added to at any time with no redeploy. This fetches that live table and uses it as the
 * match list whenever it's reachable, so every dashboard load and every cron ingestion run
 * checks the CURRENT state of the builder directory -- enrichment quality improves
 * immediately as the directory grows.
 *
 * Falls back to the static bundled list (VERIFIED_BUILDERS) only if Supabase is not
 * configured or the query fails, so matching never breaks entirely if the database is
 * briefly unreachable.
 */
export async function getLiveBuilders(citySlug?: string): Promise<VerifiedBuilder[]> {
  if (!isSupabaseConfigured || !supabase) return VERIFIED_BUILDERS;

  try {
    let query = supabase
      .from('builders_directory')
      .select('id, company_name, normalized_name, category, association, city, province, primary_phone, email, website, physical_address, key_principal');

    if (citySlug) {
      query = query.ilike('city', citySlug);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return VERIFIED_BUILDERS;

    return data.map((row: any) => ({
      id: row.id,
      company_name: row.company_name,
      normalized_name: row.normalized_name,
      category: row.category || undefined,
      association: row.association || undefined,
      city: row.city || undefined,
      province: row.province || undefined,
      primary_phone: row.primary_phone || undefined,
      email: row.email || undefined,
      website: row.website || undefined,
      physical_address: row.physical_address || undefined,
      key_principal: row.key_principal || undefined
    })) as VerifiedBuilder[];
  } catch {
    return VERIFIED_BUILDERS;
  }
}

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
