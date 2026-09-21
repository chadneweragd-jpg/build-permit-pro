import rawPermits from '@/data/permits.json';
import { Permit, SubtradeKey } from '@/types';
import { SUBTRADES_CATALOG } from './trades-data';

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
  private static permits: Permit[] = rawPermits as unknown as Permit[];

  public static getExecutiveMetrics() {
    const totalPermits = this.permits.length;
    const totalValuation = this.permits.reduce((acc, p) => acc + (p.estimated_value || 0), 0);
    const avgValuation = totalPermits > 0 ? totalValuation / totalPermits : 0;
    const commercialCount = this.permits.filter((p) => p.work_class === 'Commercial' || p.work_class === 'Industrial').length;
    const commercialRatio = Math.round((commercialCount / totalPermits) * 100);

    return {
      totalPermits,
      totalValuation,
      avgValuation,
      commercialRatio
    };
  }

  public static getMonthlyTrends(): VolumeTrendPoint[] {
    const monthMap: Record<string, { count: number; val: number }> = {
      'Apr 2026': { count: 8, val: 24.5 },
      'May 2026': { count: 12, val: 38.2 },
      'Jun 2026': { count: 19, val: 62.0 },
      'Jul 2026': { count: 24, val: 84.5 },
      'Aug 2026': { count: 32, val: 124.0 },
      'Sep 2026': { count: 41, val: 182.5 }
    };

    return Object.entries(monthMap).map(([month, data]) => ({
      month,
      count: data.count,
      valuationMillions: data.val
    }));
  }

  public static getSubtradeValuationBreakdown(): TradeValuationSummary[] {
    const tradeMap: Record<string, { totalValuation: number; count: number }> = {};
    let overallValuation = 0;

    for (const permit of this.permits) {
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

  public static getMunicipalityBreakdown(): MunicipalityBreakdown[] {
    const muniMap: Record<string, { val: number; count: number }> = {};

    for (const permit of this.permits) {
      const muni = permit.city_region || 'Kelowna';
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

  public static getTopContractorsLeaderboard(): ContractorLeaderboardItem[] {
    const map: Record<string, { count: number; val: number; trades: Set<string> }> = {};

    for (const permit of this.permits) {
      const name = permit.contractor_name || 'General Contractor On File';
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

  public static exportExecutiveCSV() {
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

    const rows = this.permits.map((p) => [
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BPP_Executive_Market_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
