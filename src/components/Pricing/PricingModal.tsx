'use client';

import React, { useState } from 'react';
import { SubscriptionTier } from '@/types';
import { SUBSCRIPTION_TIERS } from '@/lib/trades-data';
import { PermitsRepository } from '@/lib/permits-repo';
import {
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Zap,
  Building2,
  Users,
  Compass,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  onTierChanged: (tier: SubscriptionTier) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onTierChanged
}) => {
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTier = async (tier: SubscriptionTier) => {
    setLoadingTier(tier);
    setNotice(null);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, hubId: 'okanagan-valley' })
      });
      const data = await res.json();

      if (data.url && !data.mock) {
        window.location.href = data.url;
        return;
      }

      // Simulated activation for instant sandbox demo
      PermitsRepository.setCurrentTier(tier);
      onTierChanged(tier);
      setNotice(`Activated subscription: ${SUBSCRIPTION_TIERS[tier].name}`);
      setTimeout(() => {
        setNotice(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Checkout error:', err);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 text-center relative border-b border-slate-800">
          <button
            onClick={onClose}
            aria-label="Close pricing dialog"
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 inline-block mb-2">
            REGIONAL HUB MONETIZATION
          </span>
          <h2 id="pricing-modal-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            The Okanagan Valley Commercial Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto mt-2">
            Full coverage of Kelowna, West Kelowna, Lake Country, Vernon, and Penticton municipal building permits.
          </p>

          {notice && (
            <div className="mt-3 inline-block bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-4 py-1.5 rounded-full">
              {notice}
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="p-6 sm:p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 flex-1">
          {/* Tier 1: Regional Solo */}
          <div
            className={`bg-white rounded-2xl p-6 border transition-all flex flex-col justify-between ${
              currentTier === 'solo'
                ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-lg'
                : 'border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Tier 1
                </span>
                {currentTier === 'solo' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                    CURRENT PLAN
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-900">Regional Solo</h3>
              <p className="text-xs text-slate-500 mt-1">
                For independent trade contractors focusing on 1 primary trade in 1 regional hub.
              </p>

              <div className="mt-4 mb-6">
                <span className="text-3xl font-black text-slate-900">$129</span>
                <span className="text-xs text-slate-500 font-semibold ml-1">CAD / month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1 Regional Hub (Okanagan Valley)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1 Unlocked Subtrade Filter</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Interactive Map & Clustered Pins</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Mini-CRM Pipeline (1 Seat)</span>
                </li>
                <li className="flex items-center space-x-2 text-slate-400">
                  <X className="w-4 h-4 text-slate-300 shrink-0" />
                  <span>BPP Scout Route Corridor Slider</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectTier('solo')}
              disabled={currentTier === 'solo' || loadingTier === 'solo'}
              className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
                currentTier === 'solo'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'
              }`}
            >
              {currentTier === 'solo' ? 'Current Plan' : 'Select Regional Solo'}
            </button>
          </div>

          {/* Tier 2: Regional Pro / Scout */}
          <div
            className={`bg-white rounded-2xl p-6 border-2 transition-all flex flex-col justify-between relative shadow-xl ${
              currentTier === 'pro_scout'
                ? 'border-amber-500 ring-2 ring-amber-500/40'
                : 'border-amber-400/80 hover:border-amber-500'
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
              MOST POPULAR FOR TRADE CONTRACTORS
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 mt-1">
                <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider">
                  Tier 2 &bull; Flagship
                </span>
                {currentTier === 'pro_scout' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono">
                    CURRENT PLAN
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-900 flex items-center space-x-1.5">
                <span>Regional Pro / Scout</span>
                <Compass className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Full corridor lead finder, all 8 subtrades unlocked, and multi-user team seats.
              </p>

              <div className="mt-4 mb-6">
                <span className="text-3xl font-black text-slate-900">$199</span>
                <span className="text-xs text-slate-500 font-semibold ml-1">CAD / month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center space-x-2 font-bold text-slate-900">
                  <Check className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>BPP Scout Corridor Slider (2k, 3k, 5k, 10k)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All 8 Subtrades Unlocked</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Construction Activity Heatmap Layer</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Daily 6:00 AM Automated Email Digests</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>3 Estimator / Project Manager Seats</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectTier('pro_scout')}
              disabled={currentTier === 'pro_scout' || loadingTier === 'pro_scout'}
              className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
                currentTier === 'pro_scout'
                  ? 'bg-amber-100 text-amber-900 cursor-default font-mono'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md ring-1 ring-amber-400'
              }`}
            >
              {currentTier === 'pro_scout' ? 'Active Plan' : 'Select Pro / Scout ($199)'}
            </button>
          </div>

          {/* Tier 3: Provincial Supplier */}
          <div
            className={`bg-white rounded-2xl p-6 border transition-all flex flex-col justify-between ${
              currentTier === 'supplier'
                ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-lg'
                : 'border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Tier 3 &bull; Enterprise
                </span>
                {currentTier === 'supplier' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                    CURRENT PLAN
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-900">Provincial Supplier</h3>
              <p className="text-xs text-slate-500 mt-1">
                For building material distributors, equipment dealers, and enterprise trade estimators.
              </p>

              <div className="mt-4 mb-6">
                <span className="text-3xl font-black text-slate-900">$499</span>
                <span className="text-xs text-slate-500 font-semibold ml-1">CAD / month</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center space-x-2 font-bold text-slate-900">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All Regional Hubs in Province (BC)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Unlimited Team & Sales Rep Seats</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>CRM Webhook Integrations (Zapier, HubSpot)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bulk CSV & ArcGIS Ingestion Stream</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSelectTier('supplier')}
              disabled={currentTier === 'supplier' || loadingTier === 'supplier'}
              className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs transition-all ${
                currentTier === 'supplier'
                  ? 'bg-slate-100 text-slate-400 cursor-default'
                  : 'bg-brand-600 hover:bg-brand-500 text-white shadow-md'
              }`}
            >
              {currentTier === 'supplier' ? 'Current Plan' : 'Select Supplier ($499)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
