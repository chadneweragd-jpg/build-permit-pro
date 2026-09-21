'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { PermitsRepository } from '@/lib/permits-repo';
import { RoutesRepository } from '@/lib/routes-repo';
import {
  LayoutGrid,
  Route,
  Search,
  BarChart3,
  TrendingUp,
  HardHat,
  Compass,
  ArrowRight,
  DollarSign,
  Building,
  Plus,
  Calendar,
  ExternalLink
} from 'lucide-react';

export default function DashboardPage() {
  const allPermits = useMemo(() => PermitsRepository.getAllPermits(), []);
  const savedRoutes = useMemo(() => RoutesRepository.getSavedRoutes(), []);

  const totalValuation = useMemo(() => {
    return allPermits.reduce((acc, p) => acc + (p.estimated_value || 0), 0);
  }, [allPermits]);

  const formattedTotalVal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(totalValuation);

  // Top 5 highest value active commercial permits
  const highValuePermits = useMemo(() => {
    return [...allPermits].sort((a, b) => b.estimated_value - a.estimated_value).slice(0, 5);
  }, [allPermits]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              Commercial Intelligence Hub
            </span>
            <span className="text-[10px] font-bold text-slate-400">&bull;</span>
            <span className="text-[10px] font-bold text-emerald-500">Okanagan Flagship Live</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Executive Contractor Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time municipal building permit pipeline across Kelowna, West Kelowna, and regional hubs.
          </p>
        </div>

        {/* Quick Route & Search Triggers */}
        <div className="flex items-center space-x-3">
          <Link
            href="/search"
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-blue-500" />
            <span>Map Explorer</span>
          </Link>

          <Link
            href="/routes/builder"
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all"
          >
            <Compass className="w-4 h-4 text-amber-300 animate-spin-slow" />
            <span>Launch BPP Scout</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Monitored Pipeline
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formattedTotalVal}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">31 Active Okanagan Permits</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Active Scout Routes
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {savedRoutes.length} Itineraries
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Corridor buffering enabled</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Highest Demand Subtrades
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-black text-slate-900 dark:text-white">
              Electrical & HVAC
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">28 commercial scopes</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Subscription Status
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-black text-amber-500">
              Pro Scout Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Okanagan Valley Hub</p>
        </div>
      </div>

      {/* Grid: High-Value Projects Leaderboard & Quick Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High-Value Permits */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-blue-600" />
              <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Top Commercial & Industrial Opportunities
              </h2>
            </div>
            <Link href="/search" className="text-xs font-bold text-blue-600 hover:underline">
              View All In Map &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {highValuePermits.map((permit) => {
              const valFormatted = new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                maximumFractionDigits: 0
              }).format(permit.estimated_value);

              return (
                <div
                  key={permit.id}
                  className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/70 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
                        {permit.permit_number}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {permit.city_region || 'Kelowna'} &bull; {permit.work_class}
                      </span>
                    </div>

                    <h3 className="font-bold text-xs text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {permit.address}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {permit.ai_summary}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {permit.trades.slice(0, 3).map((t) => (
                        <span
                          key={t.subtrade_key}
                          style={{ color: t.color, backgroundColor: `${t.color}15` }}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0">
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {valFormatted}
                    </span>
                    <Link
                      href={`/search?permit=${permit.permit_number}`}
                      className="mt-1 text-[11px] font-bold text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Routes & BPP Scout */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Route className="w-5 h-5 text-amber-500" />
                <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Active Routes Hub
                </h2>
              </div>
              <Link href="/routes" className="text-xs font-bold text-blue-600 hover:underline">
                Manage
              </Link>
            </div>

            <div className="space-y-3">
              {savedRoutes.map((route) => (
                <Link
                  key={route.id}
                  href={`/routes/builder?id=${route.id}`}
                  className="block p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white">{route.title}</h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      {route.corridor_buffer_km} km Buffer
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {route.origin_address.split(',')[0]} &rarr; {route.destination_address.split(',')[0]}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400">
                    <span>{route.stops.length} Stops</span>
                    <span>{route.total_distance_km} km</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/routes/builder"
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Scout Route</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
