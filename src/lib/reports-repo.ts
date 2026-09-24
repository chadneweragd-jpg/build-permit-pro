import { Permit, SubtradeKey } from '@/types';
import { SUBTRADES_CATALOG } from './trades-data';
import { PermitsRepository } from './permits-repo';
import { getSelectedCityId, SUPPORTED_CITIES } from './cities';

export interface VolumeTrendPoint {
  month: string;
  count: number;
  valuationMillions: number;
}

export interface TradeValuationSummary {
  tradeKey: SubtradeKey;
  tradeName: string;
  color: string;
  totalValuation: number;
  permitCount: number;
  percentage: number;
}

export interface MunicipalityBreakdown {
  municipality: string;
  totalValuation: number;
  permitCount: number;
}

export interface ContractorLeaderboardItem {
  contractor: string;
  activeProjects: number;
  totalValuation: number;
  primaryTrades: string[];
}

export class ReportsRepository {
  /**
   * Retrieves permits strictly filtered by active city ('kelowna', 'calgary', or custom)
   */
  public static getPermits(cityId?: string): Permit[] {
    const city = cityId || getSelectedCityId();
    return PermitsRepository.getPermitsByCity(city);
  }

  public static getExecutiveMetrics(cityId?: string) {
    const permits = this.getPermits(cityId);
    const totalPermits = permits.length;
    const totalValuation = permits.reduce((acc, p) => acc + (p.estimated_value || 0), 0);
    const avgValuation = totalPermits > 0 ? totalValuation / totalPermits : 0;
    const commercialCount = permits.filter(
      (p) => p.work_class === 'Commercial' || p.work_class === 'Industrial'
    ).length;
    const commercialRatio = totalPermits > 0 ? Math.round((commercialCount / totalPermits) * 100) : 0;

    return {
      totalPermits,
      totalValuation,
      avgValuation,
      commercialRatio
    };
  }

  public static getMonthlyTrends(cityId?: string): VolumeTrendPoint[] {
    const permits = this.getPermits(cityId);

    // Group permits by YYYY-MM
    const map = new Map<string, { count: number; val: number }>();
    for (const p of permits) {
      if (!p.issue_date) continue;
      const ym = p.issue_date.substring(0, 7);
      if (!map.has(ym)) {
        map.set(ym, { count: 0, val: 0 });
      }
      const cur = map.get(ym)!;
      cur.count += 1;
      cur.val += p.estimated_value || 0;
    }

    const monthFormatter = (ym: string) => {
      const [year, month] = ym.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    if (map.size > 0) {
      const sortedKeys = Array.from(map.keys()).sort();
      const displayKeys = sortedKeys.slice(-6);
      return displayKeys.map((ym) => {
        const d = map.get(ym)!;
        return {
          month: monthFormatter(ym),
          count: d.count,
          valuationMillions: Math.max(0.1, Math.round((d.val / 1000000) * 10) / 10)
        };
      });
    }

    return [
      { month: 'Apr 2026', count: 0, valuationMillions: 0 },
      { month: 'May 2026', count: 0, valuationMillions: 0 },
      { month: 'Jun 2026', count: 0, valuationMillions: 0 },
      { month: 'Jul 2026', count: 0, valuationMillions: 0 },
      { month: 'Aug 2026', count: 0, valuationMillions: 0 },
      { month: 'Sep 2026', count: 0, valuationMillions: 0 }
    ];
  }

  public static getSubtradeValuationBreakdown(cityId?: string): TradeValuationSummary[] {
    const permits = this.getPermits(cityId);
    const tradeMap: Record<string, { totalValuation: number; count: number }> = {};
    let overallValuation = 0;

    for (const permit of permits) {
      const val = permit.estimated_value || 0;
      overallValuation += val;

      for (const trade of permit.trades) {
        if (!tradeMap[trade.subtrade_key]) {
          tradeMap[trade.subtrade_key] = { totalValuation: 0, count: 0 };
        }
        tradeMap[trade.subtrade_key].totalValuation += val;
        tradeMap[trade.subtrade_key].count += 1;
      }
    }

    const summaries: TradeValuationSummary[] = Object.entries(SUBTRADES_CATALOG).map(([key, def]) => {
      const data = tradeMap[key] || { totalValuation: 0, count: 0 };
      const percentage = overallValuation > 0 ? Math.round((data.totalValuation / overallValuation) * 100) : 0;

      return {
        tradeKey: key as SubtradeKey,
        tradeName: def.name,
        color: def.color,
        totalValuation: data.totalValuation,
        permitCount: data.count,
        percentage
      };
    });

    return summaries.sort((a, b) => b.totalValuation - a.totalValuation);
  }

  public static getMunicipalityBreakdown(cityId?: string): MunicipalityBreakdown[] {
    const permits = this.getPermits(cityId);
    const targetCity = SUPPORTED_CITIES[cityId || getSelectedCityId()] || SUPPORTED_CITIES.kelowna;
    const muniMap: Record<string, { val: number; count: number }> = {};

    for (const permit of permits) {
      const muni = permit.city_region || targetCity.name;
      if (!muniMap[muni]) {
        muniMap[muni] = { val: 0, count: 0 };
      }
      muniMap[muni].val += permit.estimated_value || 0;
      muniMap[muni].count += 1;
    }

    return Object.entries(muniMap)
      .map(([municipality, data]) => ({
        municipality,
        totalValuation: data.val,
        permitCount: data.count
      }))
      .sort((a, b) => b.totalValuation - a.totalValuation);
  }

  public static getTopContractorsLeaderboard(cityId?: string): ContractorLeaderboardItem[] {
    const permits = this.getPermits(cityId);
    const map: Record<string, { count: number; val: number; trades: Set<string> }> = {};

    for (const permit of permits) {
      const name = (permit.contractor_name || '').trim();
      const lower = name.toLowerCase();
      if (
        !name ||
        lower === 'owner / builder' ||
        lower === 'applicant on file' ||
        lower === 'unknown' ||
        lower === 'private'
      ) {
        continue;
      }
      if (!map[name]) {
        map[name] = { count: 0, val: 0, trades: new Set() };
      }
      map[name].count += 1;
      map[name].val += permit.estimated_value || 0;
      permit.trades.forEach((t) => map[name].trades.add(t.name));
    }

    return Object.entries(map)
      .map(([contractor, data]) => ({
        contractor,
        activeProjects: data.count,
        totalValuation: data.val,
        primaryTrades: Array.from(data.trades).slice(0, 3)
      }))
      .sort((a, b) => b.totalValuation - a.totalValuation)
      .slice(0, 10);
  }

  public static exportExecutiveCSV(cityId?: string) {
    const permits = this.getPermits(cityId);
    const targetCity = SUPPORTED_CITIES[cityId || getSelectedCityId()] || SUPPORTED_CITIES.kelowna;

    const headers = [
      'Permit Number',
      'Issue Date',
      'Address',
      'City / Region',
      'Work Class',
      'Permit Type',
      'Estimated Value CAD',
      'General Contractor',
      'Primary Subtrades',
      'Estimator AI Flash Summary'
    ];

    const rows = permits.map((p) => [
      `"${p.permit_number}"`,
      `"${p.issue_date}"`,
      `"${p.address.replace(/"/g, '""')}"`,
      `"${p.city_region}"`,
      `"${p.work_class}"`,
      `"${p.permit_type}"`,
      p.estimated_value,
      `"${(p.contractor_name || '').replace(/"/g, '""')}"`,
      `"${p.trades.map((t) => t.name).join('; ')}"`,
      `"${(p.ai_summary || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `BPP_${targetCity.name}_Executive_Market_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
