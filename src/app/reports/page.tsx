'use client';

import React, { useMemo } from 'react';
import { ReportsRepository } from '@/lib/reports-repo';
import {
  BarChart3,
  Download,
  TrendingUp,
  Building2,
  PieChart,
  HardHat,
  DollarSign,
  FileSpreadsheet,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function ReportsPage() {
  const metrics = useMemo(() => ReportsRepository.getExecutiveMetrics(), []);
  const monthlyTrends = useMemo(() => ReportsRepository.getMonthlyTrends(), []);
  const tradeBreakdown = useMemo(() => ReportsRepository.getSubtradeValuationBreakdown(), []);
  const municipalityBreakdown = useMemo(() => ReportsRepository.getMunicipalityBreakdown(), []);
  const contractorLeaderboard = useMemo(() => ReportsRepository.getTopContractorsLeaderboard(), []);

  const formattedTotalVal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(metrics.totalValuation);

  const formattedAvgVal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(metrics.avgValuation);

  const handleExportCSV = () => {
    ReportsRepository.exportExecutiveCSV();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Title & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Executive Market Intelligence & Reports
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Construction valuation metrics, contractor leaderboards, and subtrade pipeline analytics.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Executive Report (CSV)</span>
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Regional Pipeline
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formattedTotalVal}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Okanagan Flagship Hub</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Active Permits Tracked
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {metrics.totalPermits}
            </span>
            <span className="text-xs font-bold text-emerald-500 flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +14% MoM
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Municipal datasets synchronized</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Average Project Scale
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {formattedAvgVal}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Commercial / Industrial average</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Commercial Concentration
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {metrics.commercialRatio}%
            </span>
            <span className="text-xs font-semibold text-slate-400">of volume</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">High-density commercial growth</p>
        </div>
      </div>

      {/* Grid: Volume Trends Chart & Subtrade Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Volume & Valuation Trends Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Monthly Permit Volume & Dollar Growth (2026)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">Okanagan Commercial Surge</span>
          </div>

          {/* Clean Bar Visualization */}
          <div className="h-64 flex items-end justify-between space-x-4 pt-8">
            {monthlyTrends.map((t) => {
              const maxVal = 200;
              const heightPercent = Math.round((t.valuationMillions / maxVal) * 100);

              return (
                <div key={t.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <span className="text-[11px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${t.valuationMillions}M
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[48px] bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl transition-all group-hover:from-blue-500 group-hover:to-indigo-400 shadow-sm"
                  />
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-2">
                    {t.month.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {t.count} permits
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subtrade Pipeline Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <PieChart className="w-5 h-5 text-emerald-600" />
              <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Valuation by Subtrade
              </h2>
            </div>

            <div className="space-y-3">
              {tradeBreakdown.slice(0, 6).map((trade) => {
                const formattedTradeVal = new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: 'CAD',
                  maximumFractionDigits: 0
                }).format(trade.totalValuation);

                return (
                  <div key={trade.tradeKey} className="text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{trade.tradeName}</span>
                      <span className="font-mono text-slate-500">{formattedTradeVal}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(trade.percentage * 1.5, 100)}%`, backgroundColor: trade.color }}
                        className="h-full rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
            Classified across active Kelowna building permits
          </div>
        </div>
      </div>

      {/* Bottom Row: Top General Contractors Leaderboard & Municipality Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Active Contractors Leaderboard */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-2">
              <HardHat className="w-5 h-5 text-amber-500" />
              <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Top Active General Contractors Leaderboard
              </h2>
            </div>
            <span className="text-xs text-slate-400">By aggregate tender valuation</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="pb-3">Rank</th>
                  <th className="pb-3">General Contractor</th>
                  <th className="pb-3">Projects</th>
                  <th className="pb-3">Total Tender Valuation</th>
                  <th className="pb-3">Key Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {contractorLeaderboard.map((item, idx) => {
                  const valStr = new Intl.NumberFormat('en-CA', {
                    style: 'currency',
                    currency: 'CAD',
                    maximumFractionDigits: 0
                  }).format(item.totalValuation);

                  return (
                    <tr key={item.contractor} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="py-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                      <td className="py-3 font-bold text-slate-900 dark:text-white">{item.contractor}</td>
                      <td className="py-3 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {item.activeProjects} active
                      </td>
                      <td className="py-3 font-black text-emerald-600 dark:text-emerald-400">{valStr}</td>
                      <td className="py-3 text-slate-500">
                        {item.primaryTrades.join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Municipality Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center space-x-2 mb-5">
            <Building2 className="w-5 h-5 text-blue-500" />
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Regional Hub Distribution
            </h2>
          </div>

          <div className="space-y-4">
            {municipalityBreakdown.map((m) => {
              const valFormatted = new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                maximumFractionDigits: 0
              }).format(m.totalValuation);

              return (
                <div
                  key={m.municipality}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">{m.municipality}</h3>
                    <span className="text-slate-400 text-[11px]">{m.permitCount} commercial permits</span>
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{valFormatted}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
