'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PermitsRepository } from '@/lib/permits-repo';
import { RoutesRepository } from '@/lib/routes-repo';
import { Permit, SubtradeKey, WorkClass } from '@/types';
import { SUBTRADES_CATALOG } from '@/lib/trades-data';
import { PermitTable } from '@/components/Permits/PermitTable';
import {
  FileText,
  Search,
  Download,
  Filter,
  ArrowUpDown,
  Building2,
  CheckCircle,
  MapPin,
  ShieldCheck
} from 'lucide-react';

function PermitsListContent() {
  const searchParams = useSearchParams();
  const initialCity = searchParams.get('city') || 'all';

  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [selectedWorkClass, setSelectedWorkClass] = useState<string>('all');
  const [sortField, setSortField] = useState<'value' | 'date'>('value');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeCities = useMemo(() => PermitsRepository.getActiveCities(), []);

  // Strict City Data Siloing: Filter strictly by selected city slug or all
  const cityPermits = useMemo(() => {
    return PermitsRepository.getPermitsByCity(selectedCity);
  }, [selectedCity]);

  const filtered = useMemo(() => {
    return cityPermits.filter((p) => {
      const matchesQuery =
        !searchQuery.trim() ||
        p.permit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.contractor_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTrade =
        selectedTrade === 'all' || p.trades.some((t) => t.subtrade_key === selectedTrade);

      const matchesClass = selectedWorkClass === 'all' || p.work_class === selectedWorkClass;

      return matchesQuery && matchesTrade && matchesClass;
    }).sort((a, b) => {
      if (sortField === 'value') return (b.estimated_value || b.value || 0) - (a.estimated_value || a.value || 0);
      const dateA = a.issue_date || a.approval_date || '';
      const dateB = b.issue_date || b.approval_date || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [cityPermits, searchQuery, selectedTrade, selectedWorkClass, sortField]);

  const totalMarketValuation = useMemo(() => {
    return filtered.reduce((sum, p) => sum + (p.estimated_value || p.value || 0), 0);
  }, [filtered]);

  const totalTier1Count = useMemo(() => {
    return filtered.filter((p) => p.tier === 1 || p.verified_builder).length;
  }, [filtered]);

  const handleAddToRoute = (permit: Permit) => {
    const res = RoutesRepository.addStopToActiveRoute(permit);
    setToastMsg(`Added ${permit.permit_number} to "${res.routeTitle}"`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      'Permit Number',
      'City Slug',
      'Issue Date',
      'Address',
      'City / Region',
      'Province',
      'Work Class',
      'Permit Type',
      'Estimated Value CAD',
      'General Contractor',
      'Builder Tier',
      'Primary Subtrades',
      'Estimator AI Flash Summary'
    ];

    const rows = filtered.map((p) => [
      `"${p.permit_number}"`,
      `"${p.city_slug || 'kelowna'}"`,
      `"${p.issue_date || p.approval_date}"`,
      `"${p.address.replace(/"/g, '""')}"`,
      `"${p.city_region || 'Kelowna'}"`,
      `"${p.province || 'BC'}"`,
      `"${p.work_class}"`,
      `"${p.permit_type || p.sub_type}"`,
      p.estimated_value || p.value || 0,
      `"${(p.contractor_name || p.contractor || '').replace(/"/g, '""')}"`,
      p.tier === 1 ? 'Tier 1 (Verified Builder)' : 'Tier 2 (Standard Permittee)',
      `"${p.trades.map((t) => t.name).join('; ')}"`,
      `"${(p.ai_summary || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BPP_${selectedCity.toUpperCase()}_Permits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedCityInfo = activeCities.find((c) => c.slug === selectedCity);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Master Permits Database
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse, filter, and export municipal building permits across Canada with strict municipal siloing.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Filtered CSV ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* Market Scope / City Silo Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-white/10 text-blue-300">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                Active Municipality Silo
              </span>
              <span className="text-[10px] text-slate-400">&bull;</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Strict WHERE city_slug Enforced</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              {selectedCity === 'all' ? 'All Canadian Markets (17 Municipalities)' : `${selectedCityInfo?.name || selectedCity.toUpperCase()} (${selectedCityInfo?.province || 'CA'})`}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-xs border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-6">
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Pipeline Value</span>
            <span className="text-base font-black text-emerald-400">
              ${(totalMarketValuation / 1e6).toFixed(1)}M CAD
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Permits</span>
            <span className="text-base font-black text-white">{filtered.length}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase">Verified Tier 1</span>
            <span className="text-base font-black text-blue-400">
              {totalTier1Count} ({filtered.length > 0 ? ((totalTier1Count / filtered.length) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 animate-in fade-in shadow-md">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px] flex-wrap gap-y-2">
          {/* Strict City Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-bold focus:outline-none text-xs"
            >
              <option value="all">🇨🇦 All Canadian Cities ({activeCities.reduce((sum, c) => sum + c.permitCount, 0)})</option>
              {activeCities.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name} ({city.province}) &bull; {city.permitCount} permits
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by permit #, address, contractor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedTrade}
            onChange={(e) => setSelectedTrade(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="all">All Subtrades</option>
            {Object.values(SUBTRADES_CATALOG).map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={selectedWorkClass}
            onChange={(e) => setSelectedWorkClass(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
          >
            <option value="all">All Work Classes</option>
            <option value="Commercial">Commercial</option>
            <option value="Industrial">Industrial</option>
            <option value="Residential">Residential</option>
            <option value="Institutional">Institutional</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 text-slate-500">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <button
            onClick={() => setSortField(sortField === 'value' ? 'date' : 'value')}
            className="font-bold text-slate-700 dark:text-slate-300 hover:underline"
          >
            Sort: {sortField === 'value' ? 'Highest Value' : 'Newest Date'}
          </button>
        </div>
      </div>

      {/* Table Component */}
      <PermitTable permits={filtered} onAddToRoute={handleAddToRoute} />
    </div>
  );
}

export default function PermitsListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading permits repository...</div>}>
      <PermitsListContent />
    </Suspense>
  );
}
