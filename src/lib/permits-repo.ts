import rawPermits from '@/data/permits.json';
import { CRMStatus, Permit, SavedSearch, SubscriptionTier, SubtradeKey, UserPermitStatus, WorkClass } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isValidPhoneNumber, isValidEmail } from '@/lib/contact-utils';
import { enrichPermitWithBuilder } from '@/lib/builders-service';
import { getFallbackCalgaryPermits } from '@/lib/ingestion/calgary';

const CRM_STORAGE_KEY = 'bpp_crm_statuses_v1';
const SAVED_SEARCHES_KEY = 'bpp_saved_searches_v1';
const CURRENT_TIER_KEY = 'bpp_current_tier_v1';

export class PermitsRepository {
  private static cachedPermits: Permit[] = (() => {
    const enriched = (rawPermits as unknown as Permit[]).map((p) => enrichPermitWithBuilder(p));
    const seen = new Set(enriched.map((p) => `${(p.city_slug || p.city_region || 'kelowna').toLowerCase()}:${p.permit_number.toLowerCase()}`));
    const calgary = getFallbackCalgaryPermits().filter(
      (p) => !seen.has(`calgary:${p.permit_number.toLowerCase()}`)
    );
    return [...enriched, ...calgary];
  })();

  /**
   * Asynchronously fetches all permits from live Supabase if available
   */
  public static async fetchPermitsFromSupabase(dateRange?: string, citySlug?: string): Promise<Permit[]> {
    if (!isSupabaseConfigured || !supabase) return this.getPermitsByCity(citySlug);

    try {
      let query = supabase
        .from('permits')
        .select(`
          *,
          permit_subtrades (
            confidence_score,
            subtrades (
              slug,
              name,
              color_hex,
              icon_name
            )
          )
        `);

      if (citySlug && citySlug !== 'all') {
        const target = citySlug.toLowerCase().trim();
        query = query.ilike('city_region', `%${target}%`);
      }

      if (dateRange && dateRange !== 'all') {
        const now = new Date();
        if (dateRange === '30d') {
          const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          query = query.gte('issue_date', d.toISOString().split('T')[0]);
        } else if (dateRange === '90d') {
          const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          query = query.gte('issue_date', d.toISOString().split('T')[0]);
        } else if (dateRange === '6m') {
          const d = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          query = query.gte('issue_date', d.toISOString().split('T')[0]);
        } else if (dateRange === '2026') {
          query = query.gte('issue_date', '2026-01-01');
        }
      }

      const { data, error } = await query.order('issue_date', { ascending: false });

      if (error || !data || data.length === 0) {
        return this.getPermitsByCity(citySlug);
      }

      const mapped: Permit[] = data.map((row: any) => {
        const existingFallback = this.cachedPermits.find(
          (p) => p.permit_number === row.permit_number
        );

        const trades = (row.permit_subtrades || []).map((st: any) => ({
          subtrade_key: st.subtrades?.slug as SubtradeKey,
          name: st.subtrades?.name || '',
          confidence: Number(st.confidence_score || 1.0),
          color: st.subtrades?.color_hex || '#3B82F6',
          icon: st.subtrades?.icon_name || 'Zap',
          matched_terms: []
        }));

        const cRegion = row.city_region || existingFallback?.city_region || 'Kelowna';
        const derivedSlug = (row.city_slug || existingFallback?.city_slug || cRegion.toLowerCase().replace(/\s+/g, '-')).toLowerCase().trim();
        const provMap: Record<string, string> = {
          vancouver: 'BC', surrey: 'BC', burnaby: 'BC', richmond: 'BC', coquitlam: 'BC', kelowna: 'BC',
          calgary: 'AB', edmonton: 'AB',
          toronto: 'ON', mississauga: 'ON', brampton: 'ON', markham: 'ON', vaughan: 'ON', hamilton: 'ON', ottawa: 'ON', 'kitchener-waterloo': 'ON',
          winnipeg: 'MB'
        };

        return {
          id: row.id,
          municipality_id: row.municipality_id || existingFallback?.municipality_id || '22222222-2222-2222-2222-222222222222',
          permit_number: row.permit_number,
          city_slug: derivedSlug,
          issue_date: row.issue_date || row.approval_date,
          application_date: row.application_date || row.issue_date,
          address: row.address,
          city_region: cRegion,
          province: row.province || existingFallback?.province || provMap[derivedSlug] || 'BC',
          legal_description: row.legal_description || '',
          permit_type: row.permit_type || row.sub_type,
          work_class: row.work_class,
          description: row.description,
          ai_summary: row.ai_summary || existingFallback?.ai_summary || '',
          estimated_value: Number(row.estimated_value || row.value || 0),
          contractor_name: row.contractor_name || row.contractor || 'Owner / Builder',
          contractor_phone: isValidPhoneNumber(row.contractor_phone) ? row.contractor_phone : undefined,
          contractor_email: isValidEmail(row.contractor_email) ? row.contractor_email : undefined,
          applicant_name: row.applicant_name || row.applicant || row.contractor_name,
          status: row.status || 'Issued',
          latitude: Number(row.latitude || 49.888),
          longitude: Number(row.longitude || -119.496),
          tier: row.tier || existingFallback?.tier || 2,
          verified_builder: row.verified_builder || existingFallback?.verified_builder,
          trades: trades.length > 0 ? trades : (existingFallback?.trades || [])
        };
      });

      const enrichedMapped = mapped.map((p) => enrichPermitWithBuilder(p));
      this.cachedPermits = enrichedMapped;
      return enrichedMapped;
    } catch {
      return this.getPermitsByCity(citySlug);
    }
  }

  /**
   * Retrieves all permits, sorted by issue date descending
   */
  public static getAllPermits(): Permit[] {
    return this.cachedPermits;
  }

  /**
   * Retrieves permits strictly filtered by active city ('WHERE city_slug = X')
   */
  public static getPermitsByCity(cityId?: string): Permit[] {
    if (!cityId || cityId === 'all') {
      return this.cachedPermits;
    }
    const target = cityId.toLowerCase().trim();
    return this.cachedPermits.filter((p) => {
      const slug = (p.city_slug || '').toLowerCase().trim();
      const region = (p.city_region || '').toLowerCase().trim();

      if (slug === target) return true;
      if (region === target) return true;
      if (region.replace(/\s+/g, '-') === target) return true;
      if (target === 'kelowna' && (region === 'kelowna' || !slug)) return true;
      return false;
    });
  }

  /**
   * Retrieves active cities with permit count and metrics
   */
  public static getActiveCities(): Array<{
    slug: string;
    name: string;
    province: string;
    permitCount: number;
    totalValue: number;
    tier1Count: number;
  }> {
    const cityMap = new Map<string, { slug: string; name: string; province: string; permitCount: number; totalValue: number; tier1Count: number }>();
    
    for (const p of this.cachedPermits) {
      const slug = (p.city_slug || (p.city_region || '').toLowerCase() || 'kelowna').toLowerCase().trim();
      const existing = cityMap.get(slug) || {
        slug,
        name: p.city_region || (slug.charAt(0).toUpperCase() + slug.slice(1)),
        province: p.province || 'BC',
        permitCount: 0,
        totalValue: 0,
        tier1Count: 0
      };
      existing.permitCount += 1;
      existing.totalValue += Number(p.estimated_value || p.value || 0);
      if (p.tier === 1 || p.verified_builder) {
        existing.tier1Count += 1;
      }
      cityMap.set(slug, existing);
    }

    return Array.from(cityMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * Global Dashboard Aggregation across all active BPP Canadian cities
   */
  public static getGlobalDashboardMetrics(): {
    totalPermits: number;
    totalPipelineValue: number;
    totalVerifiedCount: number;
    overallVerifiedRatio: number;
    activeCitiesCount: number;
    cities: Array<{
      slug: string;
      name: string;
      province: string;
      permitCount: number;
      totalValue: number;
      tier1Count: number;
      verifiedRatio: number;
    }>;
    recentPermits: Permit[];
  } {
    const cities = this.getActiveCities().map((c) => ({
      ...c,
      verifiedRatio: c.permitCount > 0 ? (c.tier1Count / c.permitCount) : 0
    }));

    const totalPermits = this.cachedPermits.length;
    const totalPipelineValue = this.cachedPermits.reduce((acc, p) => acc + Number(p.estimated_value || p.value || 0), 0);
    const totalVerifiedCount = this.cachedPermits.filter((p) => p.tier === 1 || p.verified_builder).length;
    const overallVerifiedRatio = totalPermits > 0 ? totalVerifiedCount / totalPermits : 0;
    const recentPermits = [...this.cachedPermits]
      .sort((a, b) => (b.issue_date || b.approval_date || '').localeCompare(a.issue_date || a.approval_date || ''))
      .slice(0, 10);

    return {
      totalPermits,
      totalPipelineValue,
      totalVerifiedCount,
      overallVerifiedRatio,
      activeCitiesCount: cities.length,
      cities,
      recentPermits
    };
  }

  /**
   * Appends or updates permits in the cache (e.g. freshly ingested Canadian municipal permits)
   */
  public static appendPermits(newPermits: Permit[]): void {
    const existingMap = new Map(this.cachedPermits.map((p) => [`${(p.city_slug || 'kelowna').toLowerCase()}:${p.permit_number.toLowerCase()}`, p]));
    for (const p of newPermits) {
      const key = `${(p.city_slug || 'kelowna').toLowerCase()}:${p.permit_number.toLowerCase()}`;
      existingMap.set(key, enrichPermitWithBuilder(p));
    }
    this.cachedPermits = Array.from(existingMap.values());
  }

  /**
   * Retrieves a permit by ID or permit number
   */
  public static getPermitById(idOrNumber: string): Permit | undefined {
    return this.cachedPermits.find(
      (p) => p.id === idOrNumber || p.permit_number.toLowerCase() === idOrNumber.toLowerCase()
    );
  }

  /**
   * Filter permits by subtrades, valuation, work class, search query
   */
  public static filterPermits(options: {
    selectedTrades?: SubtradeKey[];
    minValue?: number;
    workClasses?: WorkClass[];
    permitType?: string;
    searchQuery?: string;
    dateRange?: string;
  }): Permit[] {
    let list = this.cachedPermits;

    if (options.dateRange && options.dateRange !== 'all') {
      const now = new Date();
      let cutoff: string | null = null;
      if (options.dateRange === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        cutoff = d.toISOString().split('T')[0];
      } else if (options.dateRange === '90d') {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        cutoff = d.toISOString().split('T')[0];
      } else if (options.dateRange === '6m') {
        const d = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        cutoff = d.toISOString().split('T')[0];
      } else if (options.dateRange === '2026') {
        cutoff = '2026-01-01';
      }
      if (cutoff) {
        list = list.filter((p) => p.issue_date >= cutoff!);
      }
    }

    if (options.selectedTrades && options.selectedTrades.length > 0) {
      list = list.filter((p) =>
        p.trades.some((t) => options.selectedTrades!.includes(t.subtrade_key))
      );
    }

    if (options.minValue && options.minValue > 0) {
      list = list.filter((p) => p.estimated_value >= options.minValue!);
    }

    if (options.workClasses && options.workClasses.length > 0) {
      list = list.filter((p) => options.workClasses!.includes(p.work_class));
    }

    if (options.permitType && options.permitType !== 'All Permit Types' && options.permitType !== 'All Types') {
      const pt = options.permitType.toLowerCase();
      if (pt.includes('single') || pt.includes('sfd')) {
        list = list.filter((p) =>
          p.permit_type.toLowerCase().includes('single') ||
          p.permit_type.toLowerCase().includes('sfd') ||
          p.description.toLowerCase().includes('single family') ||
          p.description.toLowerCase().includes('sfd')
        );
      } else if (pt.includes('multi')) {
        list = list.filter((p) =>
          p.permit_type.toLowerCase().includes('multi') ||
          (p.work_class === 'Residential' && !p.permit_type.toLowerCase().includes('single'))
        );
      } else if (pt.includes('commercial')) {
        list = list.filter((p) =>
          p.work_class === 'Commercial' || p.permit_type.toLowerCase().includes('commercial')
        );
      } else if (pt.includes('tenant') || pt.includes('renovation')) {
        list = list.filter((p) =>
          p.permit_type.toLowerCase().includes('tenant') ||
          p.permit_type.toLowerCase().includes('renovation') ||
          p.description.toLowerCase().includes('renovation') ||
          p.description.toLowerCase().includes('addition') ||
          p.description.toLowerCase().includes('tenant')
        );
      } else {
        list = list.filter((p) => p.permit_type.toLowerCase().includes(pt));
      }
    }

    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.trim().toLowerCase();
      list = list.filter((permit: any) => {
        const contractor = (permit.contractor_name || permit.contractor || '').toLowerCase();
        const applicant = (permit.applicant_name || permit.applicant || '').toLowerCase();
        const address = (permit.site_address || permit.address || '').toLowerCase();
        const permitNum = (permit.permit_number || permit.permit_no || '').toLowerCase();
        const subtype = (permit.permit_type || permit.project_subtype || permit.subtype || permit.description || '').toLowerCase();

        return (
          contractor.includes(q) ||
          applicant.includes(q) ||
          address.includes(q) ||
          permitNum.includes(q) ||
          subtype.includes(q)
        );
      });
    }

    // Always return sorted by issue date descending
    return [...list].sort(
      (a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
    );
  }

  /**
   * CRM Status & Notes management (persisted in browser localStorage)
   */
  public static getCRMStatuses(): Record<string, UserPermitStatus> {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(CRM_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public static updateCRMStatus(
    permitId: string,
    status: CRMStatus,
    notes?: string,
    reminderDate?: string,
    estimatedBid?: number
  ): UserPermitStatus {
    const all = this.getCRMStatuses();
    const existing = all[permitId] || {
      permit_id: permitId,
      status: 'New',
      notes: '',
      updated_at: new Date().toISOString()
    };

    const updated: UserPermitStatus = {
      ...existing,
      status,
      notes: notes !== undefined ? notes : existing.notes,
      reminder_date: reminderDate !== undefined ? reminderDate : existing.reminder_date,
      estimated_bid: estimatedBid !== undefined ? estimatedBid : existing.estimated_bid,
      updated_at: new Date().toISOString()
    };

    all[permitId] = updated;
    if (typeof window !== 'undefined') {
      localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(all));
    }
    return updated;
  }

  /**
   * Saved searches for daily 6:00 AM alerts
   */
  public static getSavedSearches(): SavedSearch[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}

    // Default seed saved search
    return [
      {
        id: 'search-default-1',
        name: 'Kelowna High-Value Commercial & Electrical',
        subtrade_keys: ['electrical', 'commercial_doors'],
        min_value: 1000000,
        work_classes: ['Commercial', 'Industrial'],
        daily_email_alert: true,
        email: '',
        created_at: new Date().toISOString()
      }
    ];
  }

  public static saveSearch(search: Omit<SavedSearch, 'id' | 'created_at'>): SavedSearch {
    const searches = this.getSavedSearches();
    const newSearch: SavedSearch = {
      ...search,
      id: `search-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    searches.push(newSearch);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
    }
    return newSearch;
  }

  public static deleteSavedSearch(id: string) {
    const searches = this.getSavedSearches().filter((s) => s.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
    }
  }

  /**
   * Current Subscription Tier (supports active switching for demo & testing)
   */
  public static getCurrentTier(): SubscriptionTier {
    if (typeof window === 'undefined') return 'pro_scout';
    try {
      const stored = localStorage.getItem(CURRENT_TIER_KEY) as SubscriptionTier;
      if (stored && ['solo', 'pro_scout', 'supplier'].includes(stored)) {
        return stored;
      }
    } catch {}
    return 'pro_scout'; // Default to full scout experience
  }

  public static setCurrentTier(tier: SubscriptionTier) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CURRENT_TIER_KEY, tier);
    }
  }
}
