'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
  Plus,
  ExternalLink,
  MapPin,
  CheckCircle,
  Star
} from 'lucide-react';

export default function PermitsListPage() {
  const allPermits = useMemo(() => PermitsRepository.getAllPermits(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [selectedWorkClass, setSelectedWorkClass] = useState<string>('all');
  const [sortField, setSortField] = useState<'value' | 'date'>('value');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return allPermits.filter((p) => {
      const matchesQuery =
        !searchQuery.trim() ||
        p.permit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.contractor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTrade =
        selectedTrade === 'all' || p.trades.some((t) => t.subtrade_key === selectedTrade);

      const matchesClass = selectedWorkClass === 'all' || p.work_class === selectedWorkClass;

      return matchesQuery && matchesTrade && matchesClass;
    }).sort((a, b) => {
      if (sortField === 'value') return (b.estimated_value || 0) - (a.estimated_value || 0);
      return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
    });
  }, [allPermits, searchQuery, selectedTrade, selectedWorkClass, sortField]);

  const handleAddToRoute = (permit: Permit) => {
    const res = RoutesRepository.addStopToActiveRoute(permit);
    setToastMsg(`Added ${permit.permit_number} to "${res.routeTitle}"`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleExportCSV = () => {
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

    const rows = filtered.map((p) => [
      `"${p.permit_number}"`,
      `"${p.issue_date}"`,
      `"${p.address.replace(/"/g, '""')}"`,
      `"${p.city_region || 'Kelowna'}"`,
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
    link.setAttribute('download', `BPP_Filtered_Permits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
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
            Browse, filter, and export all active municipal building permits across the Okanagan Hub.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export Filtered CSV ({filtered.length})</span>
        </button>
      </div>

      {toastMsg && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 animate-in fade-in shadow-md">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search permits by number, address, contractor..."
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
