'use client';

import React, { useState, useEffect } from 'react';
import { SavedSearch, SubtradeKey, WorkClass } from '@/types';
import { PermitsRepository } from '@/lib/permits-repo';
import { SUBTRADES_CATALOG } from '@/lib/trades-data';
import {
  Bell,
  Mail,
  Plus,
  Trash2,
  Send,
  Eye,
  CheckCircle,
  Clock,
  Sparkles,
  Sliders,
  DollarSign,
  X
} from 'lucide-react';

export const AlertsManager: React.FC = () => {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchName, setSearchName] = useState('');
  const [email, setEmail] = useState('estimator@okanagan-contractor.ca');
  const [selectedTrades, setSelectedTrades] = useState<SubtradeKey[]>(['electrical', 'commercial_doors']);
  const [minValue, setMinValue] = useState<number>(1000000);
  const [dailyEmail, setDailyEmail] = useState<boolean>(true);

  // Email Digest Preview State
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const loadSearches = () => {
    setSavedSearches(PermitsRepository.getSavedSearches());
  };

  useEffect(() => {
    loadSearches();
  }, []);

  const handleCreateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;

    PermitsRepository.saveSearch({
      name: searchName.trim(),
      subtrade_keys: selectedTrades,
      min_value: minValue,
      work_classes: ['Commercial', 'Industrial'],
      daily_email_alert: dailyEmail,
      email: email.trim()
    });

    setSearchName('');
    loadSearches();
  };

  const handleDelete = (id: string) => {
    PermitsRepository.deleteSavedSearch(id);
    loadSearches();
  };

  const handleTriggerDigestPreview = async (search: SavedSearch) => {
    setIsLoadingPreview(true);
    setDispatchStatus(null);
    try {
      const res = await fetch('/api/alerts/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: search.email,
          savedSearchName: search.name,
          subtrades: search.subtrade_keys,
          minValue: search.min_value
        })
      });
      const data = await res.json();
      if (data.htmlPreview) {
        setPreviewHtml(data.htmlPreview);
        setDispatchStatus(`Generated 6:00 AM digest for ${data.recipient} (${data.permitCount} matching permits)`);
      }
    } catch (err) {
      console.error('Failed to preview digest:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 p-6 overflow-y-auto max-w-6xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-emerald-700 flex items-center justify-center text-white shadow-md">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Automated 6:00 AM Lead Alerts & Saved Filters
            </h2>
            <p className="text-xs text-slate-500">
              Receive a curated morning dispatch of new permits matching your exact trade parameters.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Create New Saved Alert */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
            <Plus className="w-4 h-4 text-brand-600" />
            <span>Create Saved Search Alert</span>
          </h3>

          <form onSubmit={handleCreateSearch} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Filter Name:</label>
              <input
                type="text"
                required
                placeholder="e.g. Major Commercial HVAC & Glazing"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Recipient Email:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Minimum Valuation: ${new Intl.NumberFormat('en-CA').format(minValue)}
              </label>
              <input
                type="range"
                min="0"
                max="10000000"
                step="250000"
                value={minValue}
                onChange={(e) => setMinValue(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Trade Scopes:</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {Object.values(SUBTRADES_CATALOG).map((t) => {
                  const isChecked = selectedTrades.includes(t.key);
                  return (
                    <button
                      type="button"
                      key={t.key}
                      onClick={() => {
                        if (isChecked) setSelectedTrades(selectedTrades.filter((k) => k !== t.key));
                        else setSelectedTrades([...selectedTrades, t.key]);
                      }}
                      style={{
                        backgroundColor: isChecked ? `${t.color}15` : '#f8fafc',
                        borderColor: isChecked ? t.color : '#e2e8f0',
                        color: isChecked ? t.color : '#475569'
                      }}
                      className="p-1.5 rounded-lg border text-[11px] font-bold text-left truncate transition-all"
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <input
                type="checkbox"
                id="dailyAlertCheck"
                checked={dailyEmail}
                onChange={(e) => setDailyEmail(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="dailyAlertCheck" className="font-semibold text-slate-700">
                Dispatch Daily 6:00 AM Email Digest
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Save Alert Schedule</span>
            </button>
          </form>
        </div>

        {/* Right Column: Existing Saved Searches & Trigger Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <h3 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center space-x-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>Active Scheduled Morning Digests ({savedSearches.length})</span>
            </h3>

            <div className="space-y-3">
              {savedSearches.map((search) => (
                <div
                  key={search.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900">{search.name}</h4>
                      {search.daily_email_alert && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>6:00 AM ACTIVE</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Recipient: <strong>{search.email}</strong> &bull; Min: $
                      {new Intl.NumberFormat('en-CA').format(search.min_value)}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {search.subtrade_keys.map((k) => {
                        const def = SUBTRADES_CATALOG[k];
                        return (
                          <span
                            key={k}
                            style={{ color: def?.color || '#475569', backgroundColor: `${def?.color || '#475569'}15` }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded"
                          >
                            {def?.name || k}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleTriggerDigestPreview(search)}
                      disabled={isLoadingPreview}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Preview 6 AM Email</span>
                    </button>

                    <button
                      onClick={() => handleDelete(search.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Delete Saved Filter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Email Digest Preview Modal */}
      {previewHtml && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="digest-preview-title"
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPreviewHtml(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-brand-400" />
                <h3 id="digest-preview-title" className="font-bold text-sm text-white">
                  6:00 AM Automated Digest Preview (Interactive HTML)
                </h3>
              </div>
              <button
                onClick={() => setPreviewHtml(null)}
                aria-label="Close preview"
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {dispatchStatus && (
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center space-x-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{dispatchStatus}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <iframe
                title="Email Digest Preview Frame"
                srcDoc={previewHtml}
                className="w-full h-[600px] rounded-xl border border-slate-300 bg-white shadow-inner"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
