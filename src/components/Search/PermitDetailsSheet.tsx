'use client';

import React, { useState, useEffect } from 'react';
import { Permit, DealStage } from '@/types';
import { RoutesRepository } from '@/lib/routes-repo';
import { CRMRepository } from '@/lib/crm-repo';
import { launchNativeNavigation } from '@/lib/spatial';
import Link from 'next/link';
import {
  X,
  Plus,
  Phone,
  Mail,
  Building,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  CheckCircle,
  HardHat,
  ChevronRight,
  Compass,
  Kanban,
  ShieldAlert,
  Send,
  ExternalLink
} from 'lucide-react';
import { isValidPhoneNumber, isValidEmail, formatPhoneNumber } from '@/lib/contact-utils';

interface PermitDetailsSheetProps {
  permit: Permit | null;
  onClose: () => void;
  onAddToRouteSuccess?: (routeTitle: string) => void;
}

export const PermitDetailsSheet: React.FC<PermitDetailsSheetProps> = ({
  permit,
  onClose,
  onAddToRouteSuccess
}) => {
  const [showContact, setShowContact] = useState(false);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [isPipelinePopupOpen, setIsPipelinePopupOpen] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<DealStage>('watched');
  const [pipelineQuote, setPipelineQuote] = useState('');
  const [pipelineNotes, setPipelineNotes] = useState('');
  const [pipelineToast, setPipelineToast] = useState<string | null>(null);

  const hasValidPhone = isValidPhoneNumber(permit?.contractor_phone);
  const hasValidEmail = isValidEmail(permit?.contractor_email);

  useEffect(() => {
    if (permit) {
      document.body.setAttribute('data-permit-drawer-open', 'true');
      window.dispatchEvent(
        new CustomEvent('bpp:permit-drawer', { detail: { isOpen: true, permitId: permit.id } })
      );
    }
    return () => {
      document.body.removeAttribute('data-permit-drawer-open');
      window.dispatchEvent(
        new CustomEvent('bpp:permit-drawer', { detail: { isOpen: false } })
      );
    };
  }, [permit]);

  if (!permit) return null;
  const formattedVal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(permit.estimated_value);

  const handleAddToRoute = () => {
    const res = RoutesRepository.addStopToActiveRoute(permit);
    if (res.success) {
      setAddedToast(`Added stop to "${res.routeTitle}"`);
      if (onAddToRouteSuccess) onAddToRouteSuccess(res.routeTitle);
      setTimeout(() => setAddedToast(null), 3000);
    }
  };

  const handleAddToPipeline = async () => {
    if (!permit) return;
    await CRMRepository.createDealFromPermit(
      permit,
      pipelineStage,
      parseFloat(pipelineQuote) || 0,
      pipelineNotes || `Added from Permit Details on ${new Date().toLocaleDateString()}`
    );
    setIsPipelinePopupOpen(false);
    setPipelineToast(`Added ${permit.address} to Pipeline (${pipelineStage})`);
    setTimeout(() => setPipelineToast(null), 4000);
  };

  return (
    <aside
      aria-label="Permit Details"
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-40 flex flex-col h-full animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50 dark:bg-slate-950/60 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-black bg-slate-900 text-white dark:bg-blue-600 px-2 py-0.5 rounded">
              {permit.permit_number}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {permit.city_region || 'Kelowna'}, BC
            </span>
          </div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5 leading-snug">
            {permit.address}
          </h2>
        </div>

        <button
          onClick={onClose}
          aria-label="Close sheet"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Action Buttons Bar with Safe Area Padding */}
      <div className="pb-6 px-4 pt-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2.5 text-xs font-bold shrink-0">
        {/* Prominent Action Button Row: [Open in Maps], [+ Add To Route], [Contact] */}
        <div className="grid grid-cols-3 gap-2">
          {/* Open in Maps */}
          <button
            type="button"
            onClick={() => {
              launchNativeNavigation('Current Location', permit.address);
            }}
            className="py-3 px-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all text-center font-black active:scale-95 shadow-sm"
            title="Open in Apple or Google Maps"
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">Open in Maps</span>
          </button>

          {/* + Add To Route */}
          <button
            type="button"
            onClick={handleAddToRoute}
            className="py-3 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all text-center font-black shadow-md shadow-blue-600/30 active:scale-95"
            title="Add to active route"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">+ Add To Route</span>
          </button>

          {/* Call GC or Contact Details Toggle */}
          {hasValidPhone ? (
            <a
              href={`tel:${permit.contractor_phone?.replace(/\D/g, '')}`}
              className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all text-center font-black active:scale-95 shadow-md shadow-emerald-600/30"
              title={`Call ${permit.contractor_name || 'Contractor'}`}
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span className="truncate">Call GC</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={() => setShowContact(!showContact)}
              className={`py-3 px-2 rounded-xl border flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all text-center font-bold active:scale-95 ${
                showContact
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
              }`}
              title="Toggle Contractor Contact Info"
            >
              <Building className="w-4 h-4 shrink-0" />
              <span className="truncate">Contacts</span>
            </button>
          )}
        </div>

        {/* Secondary: BPP Scout Drive Mode & Pipeline */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/routes/builder?destination=${permit.id}`}
            className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center justify-center space-x-1.5 transition-all text-center font-bold"
          >
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            <span>Drive Mode</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setPipelineQuote(Math.round(permit.estimated_value * 0.15).toString());
              setIsPipelinePopupOpen(true);
            }}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center space-x-1.5 transition-all font-black shadow-sm"
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>+ Pipeline</span>
          </button>
        </div>
      </div>

      {addedToast && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>{addedToast}</span>
        </div>
      )}

      {pipelineToast && (
        <div className="bg-purple-600 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-purple-200" />
            <span>{pipelineToast}</span>
          </div>
          <Link href="/pipeline" className="underline hover:text-purple-200 text-[11px] font-bold">
            View Pipeline &rarr;
          </Link>
        </div>
      )}

      {/* Contact Details Card (when Contact button clicked) */}
      {showContact && (
        <div className="p-4 bg-amber-50/90 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 text-xs animate-in fade-in space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-amber-900 dark:text-amber-300">
              <Building className="w-4 h-4" />
              <span>Contractor & Builder Contacts</span>
            </div>
            {!hasValidPhone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60">
                <ShieldAlert className="w-3 h-3 text-amber-700 dark:text-amber-300" />
                Public Record — No Direct Phone Listed
              </span>
            )}
          </div>

          <div className="space-y-2 text-slate-700 dark:text-slate-300">
            <p>
              Company: <strong className="text-slate-900 dark:text-white">{permit.contractor_name || 'Owner / Builder'}</strong>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Applicant: {permit.applicant_name || 'Public Record Applicant'}
            </p>

            {hasValidPhone && (
              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200 dark:border-amber-800/40">
                <div className="flex items-center space-x-2 font-mono font-bold text-slate-900 dark:text-white">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{formatPhoneNumber(permit.contractor_phone)}</span>
                </div>
                <a
                  href={`tel:${permit.contractor_phone?.replace(/\D/g, '')}`}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center space-x-1.5 shadow-sm"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call GC</span>
                </a>
              </div>
            )}

            {hasValidEmail && (
              <div className="flex items-center justify-between pt-1.5 border-t border-amber-200 dark:border-amber-800/40">
                <div className="flex items-center space-x-2 truncate mr-2 font-medium">
                  <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{permit.contractor_email}</span>
                </div>
                <a
                  href={`mailto:${permit.contractor_email}?subject=${encodeURIComponent(`Tender Inquiry: Permit ${permit.permit_number} - ${permit.address}`)}`}
                  className="shrink-0 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center space-x-1.5 shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>Send Tender</span>
                </a>
              </div>
            )}

            {!hasValidPhone && !hasValidEmail && (
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800/40 flex flex-wrap gap-2">
                <Link
                  href={`/routes/builder?destination=${permit.id}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all text-center"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Scout Jobsite</span>
                </Link>
                <a
                  href="https://www.kelowna.ca/homes-building/building-permits-inspections/approved-building-permits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center space-x-1.5 border border-amber-300 dark:border-amber-800/60 shadow-xs transition-all text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Municipal Record</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Valuation & Issue Date Metric Bar */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700/80">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Estimated Value
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formattedVal}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700/80">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              Issue Date
            </span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">
              {permit.issue_date}
            </span>
          </div>
        </div>

        {/* AI Trade Enhancement & Estimator Flash Summary */}
        <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-emerald-50/80 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-emerald-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4.5">
          <div className="flex items-center space-x-2 text-blue-900 dark:text-blue-300 font-extrabold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Estimator Flash Summary</span>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {permit.ai_summary}
          </p>

          {/* Color-Coded Subtrade Badges */}
          <div className="mt-3.5 pt-3 border-t border-blue-200/80 dark:border-blue-800/60">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Subtrade Opportunities Identified:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {permit.trades.map((trade) => (
                <span
                  key={trade.subtrade_key}
                  style={{
                    backgroundColor: `${trade.color}20`,
                    color: trade.color,
                    borderColor: `${trade.color}50`
                  }}
                  className="text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center space-x-1"
                >
                  <span>{trade.name}</span>
                  <span className="opacity-70 font-mono">({Math.round(trade.confidence * 100)}%)</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-medium">Permit Type</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{permit.permit_type}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-medium">Work Class</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{permit.work_class}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 font-medium">City / Region</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{permit.city_region || 'Kelowna'}</span>
          </div>

          {permit.legal_description && (
            <div className="py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 font-medium block mb-0.5">Legal Description</span>
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{permit.legal_description}</span>
            </div>
          )}

          <div className="py-2">
            <span className="text-slate-400 font-medium block mb-1.5">Municipal Scope Description</span>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              {permit.description}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Pipeline Popup Modal */}
      {isPipelinePopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Kanban className="w-4 h-4 text-purple-400" />
                <h3 className="font-extrabold text-xs text-white">Add Permit to Quotes Pipeline</h3>
              </div>
              <button
                onClick={() => setIsPipelinePopupOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Site</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{permit.address}</p>
                <p className="text-[11px] text-slate-500">{permit.permit_number} &bull; ${(permit.estimated_value / 1000).toFixed(0)}k CAD</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400">General Contractor</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{permit.contractor_name || 'General Contractor'}</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400">Primary Trade</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{permit.trades?.[0]?.name || 'Commercial Scope'}</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Pipeline Stage
                </label>
                <select
                  value={pipelineStage}
                  onChange={(e) => setPipelineStage(e.target.value as DealStage)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="watched">Watched / Leads</option>
                  <option value="visited">Site Visited</option>
                  <option value="estimating">In Estimating</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Quote Amount ($ CAD)
                </label>
                <input
                  type="number"
                  value={pipelineQuote}
                  onChange={(e) => setPipelineQuote(e.target.value)}
                  placeholder="e.g. 85000"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Scope Notes (Optional)
                </label>
                <input
                  type="text"
                  value={pipelineNotes}
                  onChange={(e) => setPipelineNotes(e.target.value)}
                  placeholder="e.g. Needs pricing by next Friday"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPipelinePopupOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddToPipeline}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20"
                >
                  Save to Pipeline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
