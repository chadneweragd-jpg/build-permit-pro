'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MileageRepository } from '@/lib/mileage-repo';
import { TripLeg, TripType, PurposeTag } from '@/types';
import {
  FileText,
  Download,
  Plus,
  ArrowLeft,
  Navigation,
  CheckCircle2,
  Trash2,
  Calendar,
  DollarSign,
  Car,
  Briefcase,
  Layers,
  MapPin,
  Clock,
  Filter,
  X
} from 'lucide-react';

const PURPOSE_TAGS: PurposeTag[] = [
  'Sales Call',
  'Site Measure',
  'Installer Check',
  'Delivery',
  'Office',
  'Personal'
];

export default function MileagePage() {
  const [legs, setLegs] = useState<TripLeg[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPurpose, setFilterPurpose] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Manual Trip Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [manualOrigin, setManualOrigin] = useState('');
  const [manualDest, setManualDest] = useState('');
  const [manualDistKm, setManualDistKm] = useState<string>('');
  const [manualDuration, setManualDuration] = useState<string>('');
  const [manualTripType, setManualTripType] = useState<TripType>('business');
  const [manualPurpose, setManualPurpose] = useState<PurposeTag>('Sales Call');
  const [manualNotes, setManualNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await MileageRepository.fetchAllLegs();
      setLegs(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = MileageRepository.getStats(legs);

  // Filtered list
  const filteredLegs = legs.filter((l) => {
    if (filterType !== 'all' && l.trip_type !== filterType) return false;
    if (filterPurpose !== 'all' && l.purpose_tag !== filterPurpose) return false;
    return true;
  });

  // Handler: Export CSV
  const handleExportCSV = () => {
    const csvContent = MileageRepository.generateCRAExportCSV(filteredLegs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cra_mileage_logbook_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler: Delete Leg
  const handleDeleteLeg = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip log?')) return;
    await MileageRepository.deleteTripLeg(id);
    loadData();
  };

  // Handler: Manual Log Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrigin || !manualDest || !manualDistKm) return;
    setIsSubmitting(true);

    try {
      await MileageRepository.logTripLeg({
        origin_address: manualOrigin,
        destination_address: manualDest,
        distance_km: parseFloat(manualDistKm),
        duration_min: parseInt(manualDuration || '15', 10),
        trip_type: manualTripType,
        purpose_tag: manualPurpose,
        notes: manualNotes || 'Manual driver log'
      });

      setIsModalOpen(false);
      setManualOrigin('');
      setManualDest('');
      setManualDistKm('');
      setManualDuration('');
      setManualNotes('');
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Sub-Header Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <Link
            href="/routes"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                CRA Mileage Logbook
              </h1>
              <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                Official CRA Automobile Log
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Canada Revenue Agency compliant automobile expense tracking ($0.70/km first 5,000 km, $0.64/km thereafter)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log Manual Trip</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CRA Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Mileage</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                <Car className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats.totalBusinessKm}
              </span>
              <span className="text-xs font-bold text-slate-400">km ({stats.businessPercentage}% biz)</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Qualified commercial trips</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                CRA Tax Allowance
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ${stats.totalDeductibleCad.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-slate-400">CAD</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Deductible vehicle expense</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Personal Mileage</span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <Navigation className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats.totalPersonalKm}
              </span>
              <span className="text-xs font-bold text-slate-400">km non-deductible</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Personal commute & errands</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logged Legs</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats.totalTrips}
              </span>
              <span className="text-xs font-bold text-slate-400">trips recorded</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Auto-synced from Drive Mode</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-700 dark:text-slate-300">Filters:</span>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Trip Types</option>
              <option value="business">Business Only</option>
              <option value="personal">Personal Only</option>
            </select>

            {/* Purpose Filter */}
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-semibold text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="all">All Purpose Tags</option>
              {PURPOSE_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredLegs.length}</span> trips
          </div>
        </div>

        {/* Itemized CRA Logbook Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Purpose Tag</th>
                  <th className="py-3.5 px-4">Origin & Destination</th>
                  <th className="py-3.5 px-4">Distance</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">CRA Deduction</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredLegs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No trip legs found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLegs.map((leg) => {
                    const isBusiness = leg.trip_type === 'business';
                    const dateFormatted = new Date(leg.recorded_at).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return (
                      <tr key={leg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {dateFormatted}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                              isBusiness
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {leg.trip_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                            {leg.purpose_tag}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="space-y-0.5">
                            <div className="text-[11px] text-slate-500 truncate">
                              <span className="font-bold text-slate-400">From:</span> {leg.origin_address}
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              <span className="font-bold text-slate-400">To:</span> {leg.destination_address}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-extrabold whitespace-nowrap">
                          {leg.distance_km.toFixed(1)} km
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {leg.duration_min} min
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isBusiness ? (
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                              ${(leg.deductible_cad ?? (leg.distance_km * 0.70)).toFixed(2)} CAD
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {leg.notes || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteLeg(leg.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Trip Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Log Commercial Trip</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Origin Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1250 Ellis Street, Kelowna, BC"
                  value={manualOrigin}
                  onChange={(e) => setManualOrigin(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Destination Address (Job Site)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1405 St Paul Street, Kelowna, BC"
                  value={manualDest}
                  onChange={(e) => setManualDest(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 6.4"
                    value={manualDistKm}
                    onChange={(e) => setManualDistKm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Duration (min)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Trip Type</label>
                  <select
                    value={manualTripType}
                    onChange={(e) => setManualTripType(e.target.value as TripType)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="business">Business (Tax Deductible)</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Purpose Tag</label>
                  <select
                    value={manualPurpose}
                    onChange={(e) => setManualPurpose(e.target.value as PurposeTag)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                  >
                    {PURPOSE_TAGS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Notes / Purpose Details</label>
                <input
                  type="text"
                  placeholder="e.g. Installer meeting with mechanical sub"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Logging Trip...' : 'Save to CRA Logbook'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
