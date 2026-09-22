'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CRMStatus, Permit, UserPermitStatus } from '@/types';
import { PermitsRepository } from '@/lib/permits-repo';
import {
  X,
  ExternalLink,
  MapPin,
  Calendar,
  Building,
  HardHat,
  Compass,
  DollarSign,
  FileText,
  Sparkles,
  CheckCircle,
  Clock,
  Send,
  Navigation
} from 'lucide-react';

interface PermitDetailModalProps {
  permit: Permit | null;
  onClose: () => void;
  onSetAsScoutDestination?: (permit: Permit) => void;
  onCRMStatusUpdated?: () => void;
}

const CRM_STAGES: CRMStatus[] = ['New', 'Under Review', 'Site Visited', 'Quote Sent', 'Won', 'Lost'];

export const PermitDetailModal: React.FC<PermitDetailModalProps> = ({
  permit,
  onClose,
  onSetAsScoutDestination,
  onCRMStatusUpdated
}) => {
  const [crmStatus, setCrmStatus] = useState<CRMStatus>('New');
  const [notes, setNotes] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [estimatedBid, setEstimatedBid] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isAnalyzingGemini, setIsAnalyzingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<any | null>(null);

  useEffect(() => {
    setGeminiResult(null);
    if (permit) {
      const allCRM = PermitsRepository.getCRMStatuses();
      const existing = allCRM[permit.id];
      if (existing) {
        setCrmStatus(existing.status);
        setNotes(existing.notes || '');
        setReminderDate(existing.reminder_date || '');
        setEstimatedBid(existing.estimated_bid ? String(existing.estimated_bid) : '');
      } else {
        setCrmStatus('New');
        setNotes('');
        setReminderDate('');
        setEstimatedBid('');
      }
    }
  }, [permit]);

  const handleDeepGeminiAnalysis = async () => {
    if (!permit) return;
    setIsAnalyzingGemini(true);
    try {
      const res = await fetch('/api/ai/analyze-permit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permitNumber: permit.permit_number,
          address: permit.address,
          workClass: permit.work_class,
          estimatedValue: permit.estimated_value,
          description: permit.description
        })
      });
      const data = await res.json();
      if (data.analysis) {
        setGeminiResult(data.analysis);
      }
    } catch (err) {
      console.error('Deep AI analysis failed:', err);
    } finally {
      setIsAnalyzingGemini(false);
    }
  };

  if (!permit) return null;

  const formattedValuation = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(permit.estimated_value);

  const handleSaveCRM = () => {
    PermitsRepository.updateCRMStatus(
      permit.id,
      crmStatus,
      notes,
      reminderDate || undefined,
      estimatedBid ? parseFloat(estimatedBid) : undefined
    );
    setSavedSuccess(true);
    if (onCRMStatusUpdated) onCRMStatusUpdated();
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="permit-modal-title"
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden my-auto max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs font-black bg-brand-500 text-slate-950 px-2 py-0.5 rounded">
                {permit.permit_number}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {permit.work_class}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Issued: {permit.issue_date}
              </span>
            </div>
            <h2 id="permit-modal-title" className="text-xl font-extrabold text-white mt-2 leading-tight">
              {permit.address}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Estimated Value</span>
              <span className="text-xl font-black text-emerald-400">{formattedValuation}</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* AI Estimator Flash Summary */}
          <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-blue-50/80 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>AI Trade Estimator Flash Summary</span>
              </div>

              <button
                onClick={handleDeepGeminiAnalysis}
                disabled={isAnalyzingGemini}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{isAnalyzingGemini ? 'Analyzing with Gemini...' : 'Deep Gemini AI Analysis'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {geminiResult ? geminiResult.flashSummary : permit.ai_summary}
            </p>

            {/* Deep Gemini Analysis Expansion */}
            {geminiResult && (
              <div className="mt-3 pt-3 border-t border-emerald-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                    Engine: {geminiResult.source === 'gemini_api' ? 'Google Gemini 2.5 Flash' : 'High-Precision Heuristic AI'}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Estimator Scope Extracted
                  </span>
                </div>

                {geminiResult.keyEquipment && geminiResult.keyEquipment.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-800 block mb-1">Key Commercial Equipment & Materials:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {geminiResult.keyEquipment.map((eq: string, idx: number) => (
                        <span key={idx} className="bg-white/80 border border-emerald-300 text-emerald-900 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          &bull; {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {geminiResult.riskFactors && geminiResult.riskFactors.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-800 block mb-1">Commercial Bidding Risks / Lead Times:</span>
                    <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                      {geminiResult.riskFactors.map((rf: string, idx: number) => (
                        <li key={idx}>{rf}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subtrade Classifications & Confidence */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
              Identified Trade Scopes & Confidence
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {permit.trades.map((trade) => (
                <div
                  key={trade.subtrade_key}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60"
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: trade.color }}
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800">{trade.name}</span>
                      {trade.matched_terms.length > 0 && (
                        <p className="text-[10px] text-slate-500">
                          Keywords: {trade.matched_terms.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-extrabold text-slate-900">
                      {Math.round(trade.confidence * 100)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Match</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Municipal Project Description & Stakeholders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1 text-[11px]">
                Project Stakeholders
              </span>
              <div className="space-y-1.5 mt-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">General Contractor:</span>
                    {permit.tier === 1 ? (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded">
                        ✓ Verified Builder
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                        Standard Permittee
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-slate-900 mt-0.5">{permit.contractor_name || 'Not Listed'}</p>
                  {permit.verified_builder && (
                    <div className="mt-1 pt-1 border-t border-slate-200 text-[11px] space-y-0.5 text-slate-600">
                      {permit.verified_builder.key_principal && (
                        <p>Principal: <span className="font-semibold text-slate-800">{permit.verified_builder.key_principal}</span></p>
                      )}
                      {permit.verified_builder.primary_phone && (
                        <p>Phone: <a href={`tel:${permit.verified_builder.primary_phone.replace(/\D/g, '')}`} className="text-blue-600 hover:underline font-mono">{permit.verified_builder.primary_phone}</a></p>
                      )}
                      {permit.verified_builder.email && (
                        <p>
                          Email:{' '}
                          <a
                            href={`mailto:${permit.verified_builder.email}?subject=${encodeURIComponent(
                              `Subtrade Bid Inquiry: Permit ${permit.permit_number} (${permit.address})`
                            )}&body=${encodeURIComponent(
                              `Hi ${permit.verified_builder.key_principal || 'Estimating Team'},\n\n` +
                              `I saw the recently approved permit ${permit.permit_number} for ${permit.address} ` +
                              `(${permit.permit_type}, estimated value: $${Number(permit.estimated_value || 0).toLocaleString()}).\n\n` +
                              `We are an Okanagan contractor specializing in subtrade services and would like to review the project scope and submit a tender for this job.\n\n` +
                              `Could you please let us know the best contact or share the plans when available?\n\n` +
                              `Thank you,\n`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {permit.verified_builder.email}
                          </a>
                        </p>
                      )}
                      {permit.verified_builder.website && (
                        <p>
                          <a
                            href={permit.verified_builder.website.startsWith('http') ? permit.verified_builder.website : `https://${permit.verified_builder.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:underline font-medium"
                          >
                            ↗ Official Website
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-slate-400">Applicant / Owner:</span>
                  <p className="font-bold text-slate-900">{permit.applicant_name || 'Not Listed'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Permit Type:</span>
                  <p className="font-semibold text-slate-700">{permit.permit_type}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1 text-[11px]">
                Raw Municipal Description
              </span>
              <p className="text-slate-700 leading-relaxed mt-2 text-xs font-mono">
                {permit.description}
              </p>
            </div>
          </div>

          {/* Mini-CRM Workspace Box */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-brand-400" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">
                  Contractor CRM & Private Notes
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Private to your account</span>
            </div>

            {/* Stage Selector */}
            <div className="mb-3">
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                Lead Pipeline Stage:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {CRM_STAGES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setCrmStatus(st)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                      crmStatus === st
                        ? 'bg-brand-500 text-slate-950 shadow-md ring-2 ring-brand-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Bid & Reminder fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Estimated Trade Quote ($ CAD):
                </label>
                <input
                  type="number"
                  placeholder="e.g. 75000"
                  value={estimatedBid}
                  onChange={(e) => setEstimatedBid(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Follow-up Reminder Date:
                </label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Notes Textarea */}
            <div className="mb-3">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Internal Estimator Job Notes:
              </label>
              <textarea
                rows={2}
                placeholder="Called superintendent Dave. Tender closes Oct 15. Specs require 600V disconnect and fire alarm subpanel..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>CRM Status & Notes Saved!</span>
                </span>
              ) : (
                <span />
              )}
              <button
                onClick={handleSaveCRM}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
              >
                <span>Save CRM Update</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {onSetAsScoutDestination && (
            <button
              onClick={() => {
                onSetAsScoutDestination(permit);
                onClose();
              }}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Compass className="w-4 h-4" />
              <span>Set as BPP Scout Destination</span>
            </button>
          )}

          <div className="flex items-center space-x-2">
            <Link
              href={`/search?permitId=${permit.id}`}
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>View on Map</span>
            </Link>

            <Link
              href={`/routes/builder?destination=${permit.id}`}
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center space-x-1.5 shadow-md shadow-blue-600/30 transition-all"
            >
              <Compass className="w-4 h-4 text-white" />
              <span>BPP Scout Drive Mode</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
