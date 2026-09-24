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
  private static cachedPermits: Permit[] = [
    ...(rawPermits as unknown as Permit[]).map((p) => enrichPermitWithBuilder(p)),
    ...getFallbackCalgaryPermits()
  ];

  /**
   * Asynchronously fetches all permits from live Supabase if available
   */
  public static async fetchPermitsFromSupabase(dateRange?: string): Promise<Permit[]> {
    if (!isSupabaseConfigured || !supabase) return this.cachedPermits;

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
        return this.cachedPermits;
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

        return {
          id: row.id,
          municipality_id: row.municipality_id || existingFallback?.municipality_id || '22222222-2222-2222-2222-222222222222',
          permit_number: row.permit_number,
          issue_date: row.issue_date,
          application_date: row.application_date || row.issue_date,
          address: row.address,
          city_region: row.city_region || 'Kelowna',
          legal_description: row.legal_description || '',
          permit_type: row.permit_type,
          work_class: row.work_class,
          description: row.description,
          ai_summary: row.ai_summary || existingFallback?.ai_summary || '',
          estimated_value: Number(row.estimated_value || 0),
          contractor_name: row.contractor_name || 'Owner / Builder',
          contractor_phone: isValidPhoneNumber(row.contractor_phone) ? row.contractor_phone : undefined,
          contractor_email: isValidEmail(row.contractor_email) ? row.contractor_email : undefined,
          applicant_name: row.applicant_name || row.contractor_name,
          status: row.status || 'Issued',
          latitude: Number(row.latitude || 49.888),
          longitude: Number(row.longitude || -119.496),
          trades: trades.length > 0 ? trades : (existingFallback?.trades || [])
        };
      });

      const enrichedMapped = mapped.map((p) => enrichPermitWithBuilder(p));
      this.cachedPermits = enrichedMapped;
      return enrichedMapped;
    } catch {
      return this.cachedPermits;
    }
  }

  /**
   * Retrieves all permits, sorted by issue date descending
   */
  public static getAllPermits(): Permit[] {
    return this.cachedPermits;
  }

  /**
   * Retrieves permits filtered by active city ('kelowna', 'calgary', or undefined)
   */
  public static getPermitsByCity(cityId?: string): Permit[] {
    if (!cityId || cityId === 'all') {
      return this.cachedPermits;
    }
    const target = cityId.toLowerCase();
    if (target === 'calgary') {
      return this.cachedPermits.filter(
        (p) => (p.city_region || '').toLowerCase() === 'calgary' || p.address.toLowerCase().includes('calgary')
      );
    }
    if (target === 'kelowna') {
      return this.cachedPermits.filter(
        (p) => (p.city_region || '').toLowerCase() !== 'calgary' && !p.address.toLowerCase().includes('calgary')
      );
    }
    return this.cachedPermits;
  }

  /**
   * Appends or updates permits in the cache (e.g. freshly ingested Calgary Socrata permits)
   */
  public static appendPermits(newPermits: Permit[]): void {
    const existingIds = new Set(this.cachedPermits.map((p) => p.id));
    const toAdd = newPermits.filter((p) => !existingIds.has(p.id));
    this.cachedPermits = [...this.cachedPermits, ...toAdd];
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
