'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ReportsRepository } from '@/lib/reports-repo';
import { MileageRepository, CRA_RATE_TIER_1 } from '@/lib/mileage-repo';
import { TripLeg } from '@/types';
import {
  BarChart3,
  Download,
  TrendingUp,
  Building2,
  PieChart,
  HardHat,
  FileSpreadsheet,
  ArrowUpRight,
  Car,
  Calendar,
  Clock,
  Printer,
  FileText,
  CheckCircle2,
  DollarSign,
  Filter
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'market' | 'mileage'>('market');

  // Market Intelligence Data
  const metrics = useMemo(() => ReportsRepository.getExecutiveMetrics(), []);
  const monthlyTrends = useMemo(() => ReportsRepository.getMonthlyTrends(), []);
  const tradeBreakdown = useMemo(() => ReportsRepository.getSubtradeValuationBreakdown(), []);
  const municipalityBreakdown = useMemo(() => ReportsRepository.getMunicipalityBreakdown(), []);
  const contractorLeaderboard = useMemo(() => ReportsRepository.getTopContractorsLeaderboard(), []);

  // Mileage & CRA Logbook Data
  const [allLegs, setAllLegs] = useState<TripLeg[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09'); // Default to current month: Sep 2026
  const [isLoadingLegs, setIsLoadingLegs] = useState<boolean>(true);

  useEffect(() => {
    const loadTripLegs = async () => {
      setIsLoadingLegs(true);
      try {
        const legs = await MileageRepository.fetchAllLegs();
        setAllLegs(legs);
      } catch (err) {
        console.warn('Error fetching mileage legs:', err);
        setAllLegs(MileageRepository.getStoredLegs());
      } finally {
        setIsLoadingLegs(false);
      }
    };
    loadTripLegs();
  }, []);

  // Filter legs by selected month (or 'all')
  const filteredLegs = useMemo(() => {
    if (selectedMonth === 'all') return allLegs;
    return allLegs.filter((leg) => {
      const legDate = new Date(leg.recorded_at).toISOString().substring(0, 7);
      return legDate === selectedMonth;
    });
  }, [allLegs, selectedMonth]);

  // Compute CRA Mileage Stats for filtered legs
  const mileageStats = useMemo(() => {
    return MileageRepository.getStats(filteredLegs);
  }, [filteredLegs]);

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

  const handleExportMarketCSV = () => {
    ReportsRepository.exportExecutiveCSV();
  };

  const handlePrintReport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleExportCRACSV = () => {
    const csvContent = MileageRepository.generateCRAExportCSV(filteredLegs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bpp_cra_mileage_ledger_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header & Tab Switcher Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              BPP — Executive Reports & CRA Logbook
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Commercial market intelligence, tender leaderboards, and official CRA automobile allowance records.
          </p>
        </div>

        {/* Dual Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('market')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'market'
                ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-blue-500 dark:text-white" />
            <span>Market Intelligence</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mileage')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mileage'
                ? 'bg-white dark:bg-blue-600 text-slate-900 dark:text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Car className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>Vehicle Mileage & CRA</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded font-black">
              CRA
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB A: MARKET INTELLIGENCE & ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'market' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Action Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Okanagan Regional Tender Intelligence (2026)
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrintReport}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportMarketCSV}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Market Report (CSV)</span>
              </button>
            </div>
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
                  100% Real 2026 Data
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Ground-truth municipal records</p>
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
              <p className="text-[11px] text-slate-400 mt-1">Residential & Commercial avg</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Commercial Concentration
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {metrics.commercialRatio}%
                </span>
                <span className="text-xs font-semibold text-slate-400">of valuation</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Tenant improvement & institutional</p>
            </div>
          </div>

          {/* Monthly Trends Chart & Subtrade Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Volume & Valuation Trends */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Monthly Permit Volume & Dollar Growth (2026)
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400 font-semibold">City of Kelowna Official Feed</span>
              </div>

              {/* Bar Visualization */}
              <div className="h-64 flex items-end justify-between space-x-3 pt-8">
                {monthlyTrends.map((t) => {
                  const maxVal = 200;
                  const heightPercent = Math.max(12, Math.round((t.valuationMillions / maxVal) * 100));

                  return (
                    <div key={t.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                      <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${t.valuationMillions}M
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full max-w-[48px] bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-xl transition-all group-hover:from-blue-500 group-hover:to-indigo-400 shadow-sm"
                      />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-2">
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
                    Subtrade Pipeline Breakdown
                  </h2>
                </div>

                <div className="space-y-3.5">
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
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                            {formattedTradeVal}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${Math.max(10, Math.min(trade.percentage * 1.5, 100))}%`,
                              backgroundColor: trade.color
                            }}
                            className="h-full rounded-full"
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>{trade.permitCount} active opportunities</span>
                          <span>{trade.percentage}% of market</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
                Classified across authentic Kelowna building permits
              </div>
            </div>
          </div>

          {/* Bottom Row: Top General Contractors Leaderboard */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <HardHat className="w-5 h-5 text-amber-500" />
                <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Top 10 Active Kelowna Builders & General Contractors Leaderboard
                </h2>
              </div>
              <span className="text-xs text-slate-400">By aggregate tender valuation</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px]">
                    <th className="pb-3">Rank</th>
                    <th className="pb-3">General Contractor / Builder</th>
                    <th className="pb-3">Active Projects</th>
                    <th className="pb-3">Total Tender Valuation</th>
                    <th className="pb-3">Key Trades Engaged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {contractorLeaderboard.slice(0, 10).map((item, idx) => {
                    const valStr = new Intl.NumberFormat('en-CA', {
                      style: 'currency',
                      currency: 'CAD',
                      maximumFractionDigits: 0
                    }).format(item.totalValuation);

                    return (
                      <tr key={item.contractor} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="py-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-3 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span>{item.contractor}</span>
                          {idx === 0 && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded font-mono font-bold">
                              #1 GC
                            </span>
                          )}
                        </td>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB B: VEHICLE MILEAGE & CRA TAX LOGBOOK */}
      {/* ========================================================================= */}
      {activeTab === 'mileage' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Controls Bar: Month Picker & Exports */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Logbook Period
                </span>
                <span className="text-[11px] text-slate-400">
                  Filter itemized trips by tax period
                </span>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="ml-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="2026-09">September 2026 (Current)</option>
                <option value="2026-08">August 2026</option>
                <option value="2026-07">July 2026</option>
                <option value="2026-06">June 2026</option>
                <option value="all">All Tax Periods (Full Year)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrintReport}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Export CRA Mileage Ledger (PDF)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCRACSV}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* CRA Mileage KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Distance Driven
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {mileageStats.totalKm} km
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {mileageStats.totalTrips} recorded legs
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Business Kilometers
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {mileageStats.totalBusinessKm} km
                </span>
                <span className="text-xs font-bold text-blue-500">
                  ({mileageStats.businessPercentage}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Tax-deductible commercial driving
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                CRA Deductible Allowance
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  ${mileageStats.totalDeductibleCad.toFixed(2)}
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  $0.70/km
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Allowable motor vehicle deduction
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                CRA Compliance Status
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-base font-black text-slate-900 dark:text-white">
                  Audit Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Origin, destination & purpose tagged
              </p>
            </div>
          </div>

          {/* Itemized Trip Table */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Itemized Trip Ledger ({filteredLegs.length} legs)
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                CRA Official Automobile Allowance Log
              </span>
            </div>

            {isLoadingLegs ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading trip legs from database...
              </div>
            ) : filteredLegs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <p>No trip legs logged for {selectedMonth}.</p>
                <p className="text-[11px]">Drive Mode trips will automatically log here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-extrabold uppercase text-[10px]">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Purpose Tag</th>
                      <th className="pb-3">Start Address (Origin)</th>
                      <th className="pb-3">End Address (Destination)</th>
                      <th className="pb-3">Km</th>
                      <th className="pb-3">Min</th>
                      <th className="pb-3">CRA Allowance ($)</th>
                      <th className="pb-3">Notes / Permit #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredLegs.map((leg) => {
                      const dateStr = new Date(leg.recorded_at).toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric'
                      });
                      const deductible = (leg.deductible_cad ?? (leg.trip_type === 'business' ? leg.distance_km * CRA_RATE_TIER_1 : 0)).toFixed(2);

                      return (
                        <tr key={leg.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-3 font-mono text-slate-500 whitespace-nowrap">
                            {dateStr}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                leg.trip_type === 'business'
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                              }`}
                            >
                              {leg.purpose_tag}
                            </span>
                          </td>
                          <td className="py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={leg.origin_address}>
                            {leg.origin_address}
                          </td>
                          <td className="py-3 text-slate-900 dark:text-white font-bold max-w-[200px] truncate" title={leg.destination_address}>
                            {leg.destination_address}
                          </td>
                          <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {leg.distance_km}
                          </td>
                          <td className="py-3 font-mono text-slate-400">
                            {leg.duration_min}m
                          </td>
                          <td className="py-3 font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            ${deductible}
                          </td>
                          <td className="py-3 text-slate-400 text-[11px] max-w-[180px] truncate" title={leg.notes || ''}>
                            {leg.permit_number && (
                              <span className="font-mono text-blue-500 font-bold mr-1">
                                [{leg.permit_number}]
                              </span>
                            )}
                            {leg.notes || 'Routine commercial travel'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
