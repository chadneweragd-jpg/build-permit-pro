import { TripLeg, TripType, PurposeTag } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { AuthService } from './auth-service';

const MILEAGE_STORAGE_KEY = 'bpp_trip_legs_v1';

// Official Canada Revenue Agency (CRA) Automobile Allowance Rates (BC & Provinces)
// $0.70 / km for the first 5,000 business km, $0.64 / km thereafter
export const CRA_RATE_TIER_1 = 0.70;
export const CRA_RATE_TIER_2 = 0.64;
export const CRA_TIER_1_THRESHOLD = 5000;

export function calculateCRADeduction(distanceKm: number, priorBusinessKmThisYear: number = 0): number {
  if (distanceKm <= 0) return 0;

  const currentTotal = priorBusinessKmThisYear + distanceKm;
  if (currentTotal <= CRA_TIER_1_THRESHOLD) {
    return Number((distanceKm * CRA_RATE_TIER_1).toFixed(2));
  } else if (priorBusinessKmThisYear >= CRA_TIER_1_THRESHOLD) {
    return Number((distanceKm * CRA_RATE_TIER_2).toFixed(2));
  } else {
    // Crosses threshold
    const tier1Portion = CRA_TIER_1_THRESHOLD - priorBusinessKmThisYear;
    const tier2Portion = distanceKm - tier1Portion;
    return Number(((tier1Portion * CRA_RATE_TIER_1) + (tier2Portion * CRA_RATE_TIER_2)).toFixed(2));
  }
}

export const INITIAL_TRIP_LEGS: TripLeg[] = [
  {
    id: 'leg-101',
    leg_number: 1,
    origin_address: 'Queensway Transit Depot, Kelowna, BC',
    destination_address: '1250 Ellis Street, Kelowna, BC',
    distance_km: 2.1,
    duration_min: 6,
    trip_type: 'business',
    purpose_tag: 'Sales Call',
    permit_number: 'BP010011',
    notes: 'Met with Ledcor estimator regarding electrical distribution scope.',
    deductible_cad: 1.47,
    recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  },
  {
    id: 'leg-102',
    leg_number: 2,
    origin_address: '1250 Ellis Street, Kelowna, BC',
    destination_address: '1405 St Paul Street, Kelowna, BC',
    distance_km: 1.8,
    duration_min: 5,
    trip_type: 'business',
    purpose_tag: 'Site Measure',
    permit_number: 'BP2026-00280',
    notes: 'Rough-in measurement for HVAC chase on 4th floor.',
    deductible_cad: 1.26,
    recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 45).toISOString()
  },
  {
    id: 'leg-103',
    leg_number: 3,
    origin_address: '1405 St Paul Street, Kelowna, BC',
    destination_address: '5230 Chute Lake Road, Kelowna, BC',
    distance_km: 11.4,
    duration_min: 18,
    trip_type: 'business',
    purpose_tag: 'Installer Check',
    permit_number: 'BP2026-00405',
    notes: 'Kettle Valley custom home electrical panel pre-inspection.',
    deductible_cad: 7.98,
    recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: 'leg-104',
    leg_number: 4,
    origin_address: '5230 Chute Lake Road, Kelowna, BC',
    destination_address: 'Bartle & Gibson Supplies, 1850 Kirschner Rd, Kelowna, BC',
    distance_km: 8.7,
    duration_min: 15,
    trip_type: 'business',
    purpose_tag: 'Delivery',
    notes: 'Picked up 200A main disconnect and conduit fittings.',
    deductible_cad: 6.09,
    recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
  },
  {
    id: 'leg-105',
    leg_number: 5,
    origin_address: '1850 Kirschner Rd, Kelowna, BC',
    destination_address: 'Personal Residence, Kelowna, BC',
    distance_km: 4.2,
    duration_min: 9,
    trip_type: 'personal',
    purpose_tag: 'Personal',
    notes: 'End of shift commute home.',
    deductible_cad: 0.00,
    recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1 + 1000 * 60 * 30).toISOString()
  }
];

export class MileageRepository {
  private static cachedLegs: TripLeg[] | null = null;

  public static getStoredLegs(targetUserId?: string): TripLeg[] {
    const activeId = targetUserId || (typeof window !== 'undefined' ? AuthService.getActiveUserId() : undefined);
    if (this.cachedLegs && !activeId) return this.cachedLegs;

    if (typeof window === 'undefined') {
      return INITIAL_TRIP_LEGS;
    }

    try {
      const stored = localStorage.getItem(MILEAGE_STORAGE_KEY);
      if (stored) {
        const list: TripLeg[] = JSON.parse(stored);
        this.cachedLegs = list;
        if (!activeId) return list;
        return list.filter(l => !l.user_id || l.user_id === activeId);
      }
      localStorage.setItem(MILEAGE_STORAGE_KEY, JSON.stringify(INITIAL_TRIP_LEGS));
      this.cachedLegs = [...INITIAL_TRIP_LEGS];
      return this.cachedLegs;
    } catch {
      return INITIAL_TRIP_LEGS;
    }
  }

  public static async fetchAllLegs(): Promise<TripLeg[]> {
    const local = this.getStoredLegs();

    if (!isSupabaseConfigured || !supabase) {
      return local;
    }

    try {
      const { data, error } = await supabase
        .from('trip_legs')
        .select('*')
        .order('recorded_at', { ascending: false });

      if (error) {
        // Table might not be migrated yet in Supabase schema cache
        return local;
      }

      if (data && data.length > 0) {
        const mapped: TripLeg[] = data.map((row: any) => ({
          id: row.id,
          user_id: row.user_id,
          route_id: row.route_id,
          permit_id: row.permit_id,
          permit_number: row.notes?.match(/\[BP[^\]]+\]/)?.[0]?.replace(/[\[\]]/g, '') || undefined,
          leg_number: row.leg_number || 1,
          origin_address: row.origin_address,
          destination_address: row.destination_address,
          distance_km: Number(row.distance_km || 0),
          duration_min: row.duration_min || 0,
          trip_type: row.trip_type as TripType,
          purpose_tag: row.purpose_tag as PurposeTag,
          notes: row.notes,
          deductible_cad: row.trip_type === 'business' ? calculateCRADeduction(Number(row.distance_km || 0)) : 0,
          recorded_at: row.recorded_at || row.created_at
        }));

        this.cachedLegs = mapped;
        if (typeof window !== 'undefined') {
          localStorage.setItem(MILEAGE_STORAGE_KEY, JSON.stringify(mapped));
        }
        return mapped;
      }
    } catch {
      // Fallback safely to local
    }

    return local;
  }

  public static async logTripLeg(entry: {
    user_id?: string;
    origin_address: string;
    destination_address: string;
    distance_km: number;
    duration_min: number;
    trip_type: TripType;
    purpose_tag: PurposeTag;
    permit_id?: string;
    permit_number?: string;
    route_id?: string;
    leg_number?: number;
    notes?: string;
    recorded_at?: string;
  }): Promise<TripLeg> {
    const local = this.getStoredLegs();

    // Calculate Prior Business Km this year for accurate tiered rate
    const currentYear = new Date().getFullYear();
    const priorBusinessKm = local
      .filter(l => l.trip_type === 'business' && new Date(l.recorded_at).getFullYear() === currentYear)
      .reduce((sum, l) => sum + l.distance_km, 0);

    const deductible = entry.trip_type === 'business'
      ? calculateCRADeduction(entry.distance_km, priorBusinessKm)
      : 0;

    const newLeg: TripLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: entry.user_id || AuthService.getActiveUserId(),
      origin_address: entry.origin_address,
      destination_address: entry.destination_address,
      distance_km: Number(entry.distance_km.toFixed(2)),
      duration_min: Math.round(entry.duration_min),
      trip_type: entry.trip_type,
      purpose_tag: entry.purpose_tag,
      permit_id: entry.permit_id,
      permit_number: entry.permit_number,
      route_id: entry.route_id,
      leg_number: entry.leg_number || local.length + 1,
      notes: entry.notes || (entry.permit_number ? `Visited job site [${entry.permit_number}]` : undefined),
      deductible_cad: deductible,
      recorded_at: entry.recorded_at || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    local.unshift(newLeg);
    this.cachedLegs = local;

    if (typeof window !== 'undefined') {
      localStorage.setItem(MILEAGE_STORAGE_KEY, JSON.stringify(local));
    }

    // Attempt cloud sync if Supabase is active
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('trip_legs').insert({
          id: newLeg.id.startsWith('leg-') ? undefined : newLeg.id,
          user_id: newLeg.user_id,
          origin_address: newLeg.origin_address,
          destination_address: newLeg.destination_address,
          distance_km: newLeg.distance_km,
          duration_min: newLeg.duration_min,
          trip_type: newLeg.trip_type,
          purpose_tag: newLeg.purpose_tag,
          notes: newLeg.notes,
          recorded_at: newLeg.recorded_at
        });
      } catch (err) {
        console.warn('Could not sync leg to Supabase:', err);
      }
    }

    return newLeg;
  }

  public static async deleteTripLeg(id: string): Promise<boolean> {
    const local = this.getStoredLegs().filter(l => l.id !== id);
    this.cachedLegs = local;

    if (typeof window !== 'undefined') {
      localStorage.setItem(MILEAGE_STORAGE_KEY, JSON.stringify(local));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('trip_legs').delete().eq('id', id);
      } catch {}
    }

    return true;
  }

  public static getStats(legs?: TripLeg[]) {
    const list = legs || this.getStoredLegs();
    let totalBusinessKm = 0;
    let totalPersonalKm = 0;
    let totalDeductibleCad = 0;

    const purposeBreakdown: Record<string, number> = {
      'Sales Call / Inbound Inquiry': 0,
      'Site Measure / Pre-Walk': 0,
      'Warranty / Service Check': 0,
      'Installer / Crew Checkup': 0,
      'Office / Base': 0,
      'Personal / Lunch': 0,
      'Sales Call': 0,
      'Site Measure': 0,
      'Installer Check': 0,
      'Delivery': 0,
      'Office': 0,
      'Personal': 0
    };

    for (const leg of list) {
      if (leg.trip_type === 'business') {
        totalBusinessKm += leg.distance_km;
        totalDeductibleCad += (leg.deductible_cad ?? calculateCRADeduction(leg.distance_km));
      } else {
        totalPersonalKm += leg.distance_km;
      }

      if (purposeBreakdown[leg.purpose_tag] !== undefined) {
        purposeBreakdown[leg.purpose_tag] += leg.distance_km;
      } else {
        purposeBreakdown[leg.purpose_tag] = leg.distance_km;
      }
    }

    return {
      totalTrips: list.length,
      totalKm: Number((totalBusinessKm + totalPersonalKm).toFixed(2)),
      totalBusinessKm: Number(totalBusinessKm.toFixed(2)),
      totalPersonalKm: Number(totalPersonalKm.toFixed(2)),
      totalDeductibleCad: Number(totalDeductibleCad.toFixed(2)),
      businessPercentage: (totalBusinessKm + totalPersonalKm) > 0
        ? Math.round((totalBusinessKm / (totalBusinessKm + totalPersonalKm)) * 100)
        : 100,
      purposeBreakdown
    };
  }

  public static generateCRAExportCSV(legs?: TripLeg[]): string {
    const list = legs || this.getStoredLegs();
    const headers = [
      'Date',
      'Trip Type',
      'Purpose Tag',
      'Origin Address',
      'Destination Address',
      'Distance (km)',
      'Duration (min)',
      'Permit Reference',
      'CRA Rate ($/km)',
      'Allowable Deduction ($ CAD)',
      'Driver Notes'
    ];

    const rows = list.map(l => {
      const date = new Date(l.recorded_at).toLocaleDateString('en-CA');
      const rate = l.trip_type === 'business' ? CRA_RATE_TIER_1.toFixed(2) : '0.00';
      const deductible = (l.deductible_cad ?? (l.trip_type === 'business' ? l.distance_km * CRA_RATE_TIER_1 : 0)).toFixed(2);
      
      return [
        `"${date}"`,
        `"${l.trip_type}"`,
        `"${l.purpose_tag}"`,
        `"${l.origin_address.replace(/"/g, '""')}"`,
        `"${l.destination_address.replace(/"/g, '""')}"`,
        l.distance_km.toFixed(2),
        l.duration_min,
        `"${l.permit_number || ''}"`,
        rate,
        deductible,
        `"${(l.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
