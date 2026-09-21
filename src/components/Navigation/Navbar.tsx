'use client';

import React from 'react';
import { HardHat, Compass, KanbanSquare, Bell, CreditCard, ChevronDown, Sparkles, Navigation, Layers } from 'lucide-react';
import { SubscriptionTier } from '@/types';
import { SUBSCRIPTION_TIERS } from '@/lib/trades-data';

interface NavbarProps {
  activeTab: 'map' | 'crm' | 'alerts';
  setActiveTab: (tab: 'map' | 'crm' | 'alerts') => void;
  isScoutOpen: boolean;
  setIsScoutOpen: (open: boolean) => void;
  currentTier: SubscriptionTier;
  setCurrentTier: (tier: SubscriptionTier) => void;
  openPricingModal: () => void;
  openIntegrationsModal: () => void;
  totalPermitsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isScoutOpen,
  setIsScoutOpen,
  currentTier,
  setCurrentTier,
  openPricingModal,
  openIntegrationsModal,
  totalPermitsCount
}) => {
  const tierConfig = SUBSCRIPTION_TIERS[currentTier];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Regional Hub Indicator */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('map')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  BUILD PERMIT PRO
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  BPP
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>Okanagan Valley Hub &bull; Kelowna Flagship</span>
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-1 bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <span className="font-semibold text-white">{totalPermitsCount}</span>
            <span className="text-slate-400">Active Regional Permits</span>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'map'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Permit Map & Heatmap</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('map');
              setIsScoutOpen(!isScoutOpen);
            }}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isScoutOpen
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25 ring-2 ring-amber-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-current animate-spin-slow" />
            <span>BPP Scout</span>
            <span className="text-[10px] bg-black/25 px-1 py-0.2 rounded font-mono">CORRIDOR</span>
          </button>

          <button
            onClick={() => setActiveTab('crm')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'crm'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <KanbanSquare className="w-3.5 h-3.5" />
            <span>Mini-CRM</span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'alerts'
                ? 'bg-brand-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>6 AM Alerts</span>
          </button>
        </nav>

        {/* Right side: Subscription Tier & Switcher */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Cloud Integrations Status Button */}
          <button
            onClick={openIntegrationsModal}
            title="Inspect Cloud & API Connections (Supabase, Gemini, Stripe, Resend)"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span className="hidden md:inline">API Status</span>
          </button>

          {/* Quick Demo Tier Switcher */}
          <div className="hidden sm:flex items-center bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1 text-xs">
            <span className="text-[11px] text-slate-400 mr-1.5">Role:</span>
            <select
              value={currentTier}
              onChange={(e) => setCurrentTier(e.target.value as SubscriptionTier)}
              className="bg-transparent text-amber-300 font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="solo" className="bg-slate-900 text-white">Solo ($129/mo)</option>
              <option value="pro_scout" className="bg-slate-900 text-white">Pro / Scout ($199/mo)</option>
              <option value="supplier" className="bg-slate-900 text-white">Supplier ($499/mo)</option>
            </select>
          </div>

          {/* Pricing / Subscription Button */}
          <button
            onClick={openPricingModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{tierConfig.name}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
