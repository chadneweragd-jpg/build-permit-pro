'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PermitsRepository } from '@/lib/permits-repo';
import { RoutesRepository } from '@/lib/routes-repo';
import {
  Building2,
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
  ExternalLink,
  MapPin,
  ShieldCheck,
  Globe2,
  Layers
} from 'lucide-react';

export default function DashboardPage() {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  
  const globalMetrics = useMemo(() => PermitsRepository.getGlobalDashboardMetrics(), []);
  const activeCities = useMemo(() => PermitsRepository.getActiveCities(), []);
  const savedRoutes = useMemo(() => RoutesRepository.getSavedRoutes(), []);

  // Filter permits if a specific city is selected
  const displayPermits = useMemo(() => {
    return PermitsRepository.getPermitsByCity(selectedCity);
  }, [selectedCity]);

  const currentPipelineValue = useMemo(() => {
    return displayPermits.reduce((acc, p) => acc + (p.estimated_value || p.value || 0), 0);
  }, [displayPermits]);

  const formattedTotalVal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(currentPipelineValue);

  const currentTier1Count = useMemo(() => {
    return displayPermits.filter((p) => p.tier === 1 || p.verified_builder).length;
  }, [displayPermits]);

  const tier1Ratio = displayPermits.length > 0
    ? ((currentTier1Count / displayPermits.length) * 100).toFixed(1)
    : '0.0';

  // Top 5 highest value commercial permits for the selected scope
  const highValuePermits = useMemo(() => {
    return [...displayPermits]
      .sort((a, b) => (b.estimated_value || b.value || 0) - (a.estimated_value || a.value || 0))
      .slice(0, 5);
  }, [displayPermits]);

  const selectedCityName = useMemo(() => {
    if (selectedCity === 'all') return 'National Multi-City Pipeline';
    const c = activeCities.find((city) => city.slug === selectedCity);
    return c ? `${c.name} (${c.province})` : selectedCity.toUpperCase();
  }, [selectedCity, activeCities]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Globe2 className="w-3 h-3" />
              Pan-Canadian Commercial Intelligence Hub
            </span>
            <span className="text-[10px] font-bold text-slate-400">&bull;</span>
            <span className="text-[10px] font-bold text-emerald-500">17 Municipal Feeds Synchronized</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Executive Contractor Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated municipal building permit pipeline across 17 major Canadian commercial hubs (Socrata &bull; CKAN &bull; ArcGIS).
          </p>
        </div>

        {/* City Filter & Explorer Triggers */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Market Selector */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">🇨🇦 All Canadian Markets (National View)</option>
              {activeCities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}, {c.province} ({c.permitCount} permits)
                </option>
              ))}
            </select>
          </div>

          <Link
            href={selectedCity === 'all' ? '/search' : `/search?city=${selectedCity}`}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-blue-500" />
            <span>Map View</span>
          </Link>

          <Link
            href="/routes/builder"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all"
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
            {selectedCity === 'all' ? 'National Pipeline Value' : `${selectedCityName} Pipeline`}
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formattedTotalVal}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {displayPermits.length} Active Monitored Permits
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Verified Contractor Coverage
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {tier1Ratio}%
            </span>
            <span className="text-xs font-bold text-slate-400">
              ({currentTier1Count} Tier 1)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Proportional to Kelowna 35.5% Benchmark
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Active Canadian Markets
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              17 Municipalities
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            BC, AB, ON, MB (English-speaking)
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Daily Ingestion Engine
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-black text-emerald-500 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Midnight Sync Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Idempotent upsert &bull; Zero duplicates
          </p>
        </div>
      </div>

      {/* Canadian Markets Overview Grid */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Canadian Municipal Feeds & Regional Coverage
            </h2>
          </div>
          <Link
            href="/permits"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
          >
            <span>View All In Database</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {activeCities.map((city) => {
            const isSelected = selectedCity === city.slug;
            return (
              <button
                key={city.slug}
                onClick={() => setSelectedCity(isSelected ? 'all' : city.slug)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {city.name}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                    {city.province}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    ${(city.totalValue / 1e6).toFixed(1)}M
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {city.permitCount} p.
                  </span>
                </div>
                <div className="mt-1 text-[9px] text-slate-400">
                  {city.tier1Count} Tier 1 ({((city.tier1Count / city.permitCount) * 100).toFixed(0)}%)
                </div>
              </button>
            );
          })}
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
                Top Commercial & Industrial Opportunities ({selectedCityName})
              </h2>
            </div>
            <Link
              href={selectedCity === 'all' ? '/permits' : `/permits?city=${selectedCity}`}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View Full City Pipeline &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {highValuePermits.map((permit) => {
              const valFormatted = new Intl.NumberFormat('en-CA', {
                style: 'currency',
                currency: 'CAD',
                maximumFractionDigits: 0
              }).format(permit.estimated_value || permit.value || 0);

              const cityLabel = permit.city_region || (permit.city_slug ? permit.city_slug.toUpperCase() : 'Kelowna');

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
                        {cityLabel} ({permit.province || 'CA'}) &bull; {permit.work_class}
                      </span>
                      {permit.tier === 1 && (
                        <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 rounded">
                          ✓ Verified Builder
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-xs text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {permit.address}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {permit.ai_summary || permit.description}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Contractor: {permit.contractor_name || permit.contractor || 'Not Listed'}
                      </span>
                    </div>

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
                      <span>Explore Map</span>
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
              {savedRoutes.slice(0, 3).map((route) => (
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
