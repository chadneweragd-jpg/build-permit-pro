import { CRMDeal, DealStage, Permit } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { AuthService } from './auth-service';

const CRM_DEALS_STORAGE_KEY = 'bpp_crm_deals_v1';

export const DEAL_STAGES: {
  key: DealStage;
  label: string;
  shortLabel: string;
  color: string;
  bgLight: string;
  borderLight: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    key: 'watched',
    label: 'Watched / Leads',
    shortLabel: 'Leads',
    color: 'slate',
    bgLight: 'bg-slate-100 dark:bg-slate-800/60',
    borderLight: 'border-slate-300 dark:border-slate-700',
    badgeBg: 'bg-slate-200 dark:bg-slate-700',
    badgeText: 'text-slate-800 dark:text-slate-200'
  },
  {
    key: 'visited',
    label: 'Site Visited',
    shortLabel: 'Visited',
    color: 'blue',
    bgLight: 'bg-blue-50/70 dark:bg-blue-950/30',
    borderLight: 'border-blue-200 dark:border-blue-900',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/50',
    badgeText: 'text-blue-700 dark:text-blue-300'
  },
  {
    key: 'estimating',
    label: 'In Estimating',
    shortLabel: 'Estimating',
    color: 'amber',
    bgLight: 'bg-amber-50/70 dark:bg-amber-950/30',
    borderLight: 'border-amber-200 dark:border-amber-900',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    badgeText: 'text-amber-800 dark:text-amber-300'
  },
  {
    key: 'quoted',
    label: 'Quote Sent',
    shortLabel: 'Quoted',
    color: 'purple',
    bgLight: 'bg-purple-50/70 dark:bg-purple-950/30',
    borderLight: 'border-purple-200 dark:border-purple-900',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/50',
    badgeText: 'text-purple-700 dark:text-purple-300'
  },
  {
    key: 'won',
    label: 'Won / Booked',
    shortLabel: 'Won',
    color: 'emerald',
    bgLight: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    borderLight: 'border-emerald-200 dark:border-emerald-900',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    badgeText: 'text-emerald-700 dark:text-emerald-300'
  }
];

export const INITIAL_DEALS: CRMDeal[] = [
  {
    id: 'deal-001',
    permit_number: 'BP-2026-0814',
    project_name: 'Wilden Ridge Executive SFD',
    address: '1480 Skyland Drive, Kelowna, BC',
    city_region: 'Kelowna',
    general_contractor: 'AuthenTech Homes Ltd',
    contact_name: 'Scott Tyerman',
    contact_phone: '(250) 491-7690',
    contact_email: 'estimating@authentechhomes.com',
    subtrade_category: 'Framing & Timber',
    stage: 'watched',
    quote_amount: 85000,
    follow_up_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
    notes: 'Architectural framing with exposed fir timber trusses. Plan review in progress.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
  },
  {
    id: 'deal-002',
    permit_number: 'BP2026-00280',
    project_name: 'St. Paul Commercial Tower',
    address: '1405 St Paul Street, Kelowna, BC',
    city_region: 'Kelowna',
    general_contractor: 'Ledcor Construction',
    contact_name: 'Mark Taylor (Sr PM)',
    contact_phone: '(250) 860-2211',
    contact_email: 'mtaylor@ledcor.com',
    subtrade_category: 'Glazing & Storefronts',
    stage: 'watched',
    quote_amount: 420000,
    follow_up_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().split('T')[0],
    notes: 'Ground-floor commercial curtain wall & structural glass entry vestibules.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: 'deal-003',
    permit_number: 'BP-2026-0818',
    project_name: 'Chute Lake Estate Residence',
    address: '5230 Chute Lake Road, Kelowna, BC',
    city_region: 'Kelowna',
    general_contractor: 'Dilworth Quality Homes',
    contact_name: 'Brenda Miller',
    contact_phone: '(250) 762-9999',
    contact_email: 'bmiller@dilworth.ca',
    subtrade_category: 'Electrical (200A)',
    stage: 'visited',
    quote_amount: 125000,
    follow_up_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString().split('T')[0], // Yesterday (Past due)
    notes: 'Met superintendent on-site. Trenching underway; subpanel ready for site measure.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
  },
  {
    id: 'deal-004',
    permit_number: 'BP010011',
    project_name: 'Ellis Street Commercial Hub',
    address: '1250 Ellis Street, Kelowna, BC',
    city_region: 'Kelowna',
    general_contractor: 'Ledcor Construction',
    contact_name: 'Dan Richardson (Estimating)',
    contact_phone: '(250) 860-2211',
    contact_email: 'drichardson@ledcor.com',
    subtrade_category: 'Electrical & 400A Switchgear',
    stage: 'estimating',
    quote_amount: 245000,
    follow_up_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split('T')[0],
    notes: 'Takeoff 75% complete. Awaiting electrical engineer revision on transformer tap.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: 'deal-005',
    permit_number: 'BP-2026-0815',
    project_name: 'Echo Ridge Modern Farmhouse',
    address: '240 Echo Ridge Drive, Kelowna, BC',
    city_region: 'Kelowna',
    general_contractor: 'Chatham Homes Ltd',
    contact_name: 'Chris Chatham',
    contact_phone: '(250) 862-5500',
    contact_email: 'info@chathamhomes.ca',
    subtrade_category: 'Plumbing & Mechanical/HVAC',
    stage: 'estimating',
    quote_amount: 68000,
    follow_up_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString().split('T')[0],
    notes: 'Dual-zone heat pump system & basement rough-in package.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
  },
  {
    id: 'deal-006',
    permit_number: 'BP010045',
    project_name: 'West Avenue Commercial Distribution',
    address: '550 West Avenue, Kelowna, BC',
    city_region: 'Kelowna',
    general_contractor: 'Mission Group Construction',
    contact_name: 'Tyler Jensen',
    contact_phone: '(250) 448-8810',
    contact_email: 'tjensen@missiongroup.ca',
    subtrade_category: 'Commercial Overhead Doors',
    stage: 'quoted',
    quote_amount: 115000,
    follow_up_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString().split('T')[0],
    notes: 'Submitted formal bid for 6 high-speed insulated dock doors and hydraulic levelers.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: 'deal-007',
    permit_number: 'BP-2026-0816',
    project_name: 'Hidden Lake Mews Luxury Duplex',
    address: '1120 Hidden Lake Mews, Kelowna, BC',
    city_region: 'Kelowna',
    general_contractor: 'Rykon Construction',
    contact_name: 'Greg Bird',
    contact_phone: '(250) 712-9664',
    contact_email: 'gbird@rykon.ca',
    subtrade_category: 'Roofing & Sheet Metal',
    stage: 'quoted',
    quote_amount: 58500,
    follow_up_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
    notes: 'Standing seam black metal roof package with ice & water shield.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  },
  {
    id: 'deal-008',
    permit_number: 'BP010078',
    project_name: 'Doyle Avenue Civic Plaza',
    address: '350 Doyle Avenue, Kelowna, BC',
    city_region: 'Kelowna',
    general_contractor: 'PCL Constructors Westcoast',
    contact_name: 'Kevin Zhao (Project Director)',
    contact_phone: '(604) 241-5200',
    contact_email: 'kzhao@pcl.com',
    subtrade_category: 'Drywall & Steel Stud',
    stage: 'won',
    quote_amount: 185000,
    follow_up_date: null,
    notes: 'Contract awarded! Subcontract signed. Mobilization scheduled for mid-next month.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
  }
];

export class CRMRepository {
  private static cachedDeals: CRMDeal[] = [...INITIAL_DEALS];

  /**
   * Get all deals from storage / in-memory cache
   */
  public static getDeals(targetUserId?: string): CRMDeal[] {
    const activeId = targetUserId || (typeof window !== 'undefined' ? AuthService.getActiveUserId() : undefined);
    if (typeof window === 'undefined') {
      return this.cachedDeals;
    }

    try {
      const stored = localStorage.getItem(CRM_DEALS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!activeId) return parsed;
          return parsed.filter((d: CRMDeal) => !d.user_id || d.user_id === activeId);
        }
      }
      localStorage.setItem(CRM_DEALS_STORAGE_KEY, JSON.stringify(this.cachedDeals));
      return this.cachedDeals;
    } catch {
      return this.cachedDeals;
    }
  }

  /**
   * Asynchronously fetches deals from live Supabase if connected
   */
  public static async fetchDealsFromSupabase(): Promise<CRMDeal[]> {
    if (!isSupabaseConfigured || !supabase) {
      return this.getDeals();
    }

    try {
      const { data, error } = await supabase
        .from('crm_deals')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // If table is currently empty in Supabase, seed it with INITIAL_DEALS
        if (!error && data && data.length === 0) {
          await this.syncLocalDealsToSupabase(this.getDeals());
        }
        return this.getDeals();
      }

      const mapped: CRMDeal[] = data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        permit_id: row.permit_id,
        permit_number: row.permit_number || row.project_name?.split(' ')[0] || 'BP-2026',
        project_name: row.project_name || 'Commercial Scope',
        address: row.address,
        city_region: row.city_region || 'Kelowna',
        general_contractor: row.general_contractor || 'General Contractor',
        contact_name: row.contact_name,
        contact_phone: row.contact_phone,
        contact_email: row.contact_email,
        subtrade_category: row.subtrade_category || 'General',
        stage: (row.stage as DealStage) || 'watched',
        quote_amount: Number(row.quote_amount || 0),
        bid_due_date: row.bid_due_date,
        follow_up_date: row.follow_up_date,
        lost_reason: row.lost_reason,
        notes: row.notes,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString()
      }));

      if (typeof window !== 'undefined') {
        localStorage.setItem(CRM_DEALS_STORAGE_KEY, JSON.stringify(mapped));
      }
      return mapped;
    } catch (err) {
      console.warn('Supabase crm_deals fetch error, using local storage:', err);
      return this.getDeals();
    }
  }

  /**
   * Syncs array of deals into Supabase in background
   */
  private static async syncLocalDealsToSupabase(deals: CRMDeal[]) {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      for (const d of deals) {
        await supabase.from('crm_deals').upsert(
          {
            project_name: d.project_name,
            address: d.address,
            city_region: d.city_region,
            general_contractor: d.general_contractor,
            contact_name: d.contact_name,
            contact_phone: d.contact_phone,
            contact_email: d.contact_email,
            subtrade_category: d.subtrade_category,
            stage: d.stage,
            quote_amount: d.quote_amount,
            follow_up_date: d.follow_up_date || null,
            notes: d.notes
          },
          { onConflict: 'id' }
        );
      }
    } catch {}
  }

  /**
   * Creates a new deal from a Permit
   */
  public static async createDealFromPermit(
    permit: Permit,
    stage: DealStage = 'watched',
    quoteAmount: number = 0,
    notes: string = ''
  ): Promise<CRMDeal> {
    const deals = this.getDeals();
    const primaryTrade = permit.trades?.[0]?.name || 'General Subtrade';

    const newDeal: CRMDeal = {
      id: `deal-${Date.now()}`,
      user_id: AuthService.getActiveUserId(),
      permit_id: permit.id,
      permit_number: permit.permit_number,
      project_name: permit.description ? permit.description.substring(0, 45) : `${permit.address} Scope`,
      address: permit.address,
      city_region: permit.city_region || 'Kelowna',
      general_contractor: permit.contractor_name || 'General Contractor',
      contact_name: permit.applicant_name || permit.contractor_name || 'Estimating Contact',
      contact_phone: permit.contractor_phone,
      contact_email: permit.contractor_email,
      subtrade_category: primaryTrade,
      stage,
      quote_amount: quoteAmount || (permit.estimated_value ? Math.round(permit.estimated_value * 0.15) : 0),
      follow_up_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
      notes: notes || `Lead imported from Permit #${permit.permit_number}. Estimated project value $${permit.estimated_value.toLocaleString('en-CA')}.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newDeal, ...deals];
    this.cachedDeals = [newDeal, ...this.cachedDeals];
    if (typeof window !== 'undefined') {
      localStorage.setItem(CRM_DEALS_STORAGE_KEY, JSON.stringify(updated));
    }

    // Persist to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('crm_deals').insert({
          user_id: newDeal.user_id,
          permit_id: permit.id.includes('-') && permit.id.length === 36 ? permit.id : null,
          project_name: newDeal.project_name,
          address: newDeal.address,
          city_region: newDeal.city_region,
          general_contractor: newDeal.general_contractor,
          contact_name: newDeal.contact_name,
          contact_phone: newDeal.contact_phone,
          contact_email: newDeal.contact_email,
          subtrade_category: newDeal.subtrade_category,
          stage: newDeal.stage,
          quote_amount: newDeal.quote_amount,
          follow_up_date: newDeal.follow_up_date,
          notes: newDeal.notes
        });
      } catch (err) {
        console.warn('Could not insert to Supabase, saved locally:', err);
      }
    }

    return newDeal;
  }

  /**
   * Creates a manual custom deal
   */
  public static async createManualDeal(data: {
    address: string;
    project_name?: string;
    general_contractor?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    subtrade_category?: string;
    stage?: DealStage;
    quote_amount?: number;
    notes?: string;
  }): Promise<CRMDeal> {
    const deals = this.getDeals();
    const newDeal: CRMDeal = {
      id: `deal-${Date.now()}`,
      permit_number: 'BP-CUSTOM',
      project_name: data.project_name || `${data.address} Scope`,
      address: data.address,
      city_region: 'Kelowna',
      general_contractor: data.general_contractor || 'General Contractor',
      contact_name: data.contact_name || '',
      contact_phone: data.contact_phone || '',
      contact_email: data.contact_email || '',
      subtrade_category: data.subtrade_category || 'General',
      stage: data.stage || 'watched',
      quote_amount: data.quote_amount || 0,
      follow_up_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0],
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newDeal, ...deals];
    this.cachedDeals = [newDeal, ...this.cachedDeals];
    if (typeof window !== 'undefined') {
      localStorage.setItem(CRM_DEALS_STORAGE_KEY, JSON.stringify(updated));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('crm_deals').insert({
          project_name: newDeal.project_name,
          address: newDeal.address,
          city_region: newDeal.city_region,
          general_contractor: newDeal.general_contractor,
          contact_name: newDeal.contact_name,
          contact_phone: newDeal.contact_phone,
          contact_email: newDeal.contact_email,
          subtrade_category: newDeal.subtrade_category,
          stage: newDeal.stage,
          quote_amount: newDeal.quote_amount,
          follow_up_date: newDeal.follow_up_date,
          notes: newDeal.notes
        });
      } catch (err) {
        console.warn('Could not insert to Supabase, saved locally:', err);
      }
    }

    return newDeal;
  }

  /**
   * Update deal stage
   */
  public static async updateDealStage(id: string, newStage: DealStage): Promise<CRMDeal | null> {
    const deals = this.getDeals();
    const deal = deals.find((d) => d.id === id);
    if (!deal) return null;

    deal.stage = newStage;
    deal.updated_at = new Date().toISOString();

    const cached = this.cachedDeals.find((d) => d.id === id);
    if (cached) {
      cached.stage = newStage;
      cached.updated_at = deal.updated_at;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(CRM_DEALS_STORAGE_KEY, JSON.stringify(deals));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('crm_deals')
          .update({ stage: newStage, updated_at: deal.updated_at })
          .eq('id', id);
      } catch {}
    }

    return deal;
  }

  /**
   * Update deal fields (quote amount, notes, follow up date, GC info, etc)
   */
  public static async updateDeal(id: string, updates: Partial<CRMDeal>): Promise<CRMDeal | null> {
    const deals = this.getDeals();
    const index = deals.findIndex((d) => d.id === id);
    if (index === -1) return null;

    const existing = deals[index];
    const updated: CRMDeal = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    deals[index] = updated;

    const cachedIdx = this.cachedDeals.findIndex((d) => d.id === id);
    if (cachedIdx !== -1) {
      this.cachedDeals[cachedIdx] = updated;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(CRM_DEALS_STORAGE_KEY, JSON.stringify(deals));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('crm_deals')
          .update({
            stage: updated.stage,
            quote_amount: updated.quote_amount,
            follow_up_date: updated.follow_up_date || null,
            general_contractor: updated.general_contractor,
            contact_name: updated.contact_name,
            contact_phone: updated.contact_phone,
            contact_email: updated.contact_email,
            notes: updated.notes,
            updated_at: updated.updated_at
          })
          .eq('id', id);
      } catch {}
    }

    return updated;
  }

  /**
   * Delete deal
   */
  public static async deleteDeal(id: string): Promise<boolean> {
    const deals = this.getDeals();
    const filtered = deals.filter((d) => d.id !== id);
    this.cachedDeals = this.cachedDeals.filter((d) => d.id !== id);

    if (typeof window !== 'undefined') {
      localStorage.setItem(CRM_DEALS_STORAGE_KEY, JSON.stringify(filtered));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('crm_deals').delete().eq('id', id);
      } catch {}
    }

    return true;
  }

  /**
   * Get deals grouped by stage
   */
  public static getDealsByStage(dealsList?: CRMDeal[]): Record<DealStage, CRMDeal[]> {
    const deals = dealsList || this.getDeals();
    const grouped: Record<DealStage, CRMDeal[]> = {
      watched: [],
      visited: [],
      estimating: [],
      quoted: [],
      won: []
    };

    deals.forEach((deal) => {
      const stage = (deal.stage as DealStage) || 'watched';
      if (grouped[stage]) {
        grouped[stage].push(deal);
      } else {
        grouped.watched.push(deal);
      }
    });

    // Sort each column by updated_at DESC
    (Object.keys(grouped) as DealStage[]).forEach((stage) => {
      grouped[stage].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    });

    return grouped;
  }

  /**
   * Get total metrics
   */
  public static getPipelineMetrics(dealsList?: CRMDeal[]) {
    const deals = dealsList || this.getDeals();
    const totalDeals = deals.length;
    const totalPipelineValue = deals.reduce((acc, d) => acc + (d.quote_amount || 0), 0);
    const wonDeals = deals.filter((d) => d.stage === 'won');
    const wonValue = wonDeals.reduce((acc, d) => acc + (d.quote_amount || 0), 0);

    const stageCounts: Record<DealStage, number> = {
      watched: 0,
      visited: 0,
      estimating: 0,
      quoted: 0,
      won: 0
    };

    const stageValues: Record<DealStage, number> = {
      watched: 0,
      visited: 0,
      estimating: 0,
      quoted: 0,
      won: 0
    };

    deals.forEach((d) => {
      const st = (d.stage as DealStage) || 'watched';
      if (stageCounts[st] !== undefined) {
        stageCounts[st] += 1;
        stageValues[st] += d.quote_amount || 0;
      }
    });

    return {
      totalDeals,
      totalPipelineValue,
      wonValue,
      wonCount: wonDeals.length,
      stageCounts,
      stageValues
    };
  }
}
