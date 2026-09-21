'use client';

import React, { useState, useEffect } from 'react';
import { PermitsRepository } from '@/lib/permits-repo';
import { SubscriptionTier } from '@/types';
import { SUBSCRIPTION_TIERS, REGIONS_CATALOG } from '@/lib/trades-data';
import {
  Settings as SettingsIcon,
  User,
  Building,
  ShieldCheck,
  CreditCard,
  Database,
  Sparkles,
  Mail,
  Check,
  CheckCircle,
  ExternalLink,
  Lock,
  Volume2,
  Play
} from 'lucide-react';
import { getAvailableVoices, testVoice, saveSelectedVoice, VOICE_STORAGE_KEY, VoiceOption } from '@/lib/voice-utils';

export default function SettingsPage() {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('pro_scout');
  const [selectedHub, setSelectedHub] = useState('okanagan-valley');
  const [fullName, setFullName] = useState('Dave Estimator');
  const [companyName, setCompanyName] = useState('Okanagan Builders Ltd');
  const [phone, setPhone] = useState('(250) 860-3100');
  const [saveToast, setSaveToast] = useState(false);

  // In-Cab Voice Settings State
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  useEffect(() => {
    setCurrentTier(PermitsRepository.getCurrentTier());

    // Load available browser voices
    const updateVoices = () => {
      const available = getAvailableVoices();
      setVoices(available);
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(VOICE_STORAGE_KEY) : null;
      if (saved && available.some((v) => v.name === saved)) {
        setSelectedVoice(saved);
      } else if (available.length > 0) {
        setSelectedVoice(available[0].name);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoice(voiceName);
    saveSelectedVoice(voiceName);
  };

  const handleTestVoice = () => {
    setIsTestingVoice(true);
    testVoice(selectedVoice);
    setTimeout(() => setIsTestingVoice(false), 2200);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleTierSwitch = async (tier: SubscriptionTier) => {
    PermitsRepository.setCurrentTier(tier);
    setCurrentTier(tier);

    try {
      await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, hubId: selectedHub })
      });
    } catch (e) {}
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Title */}
      <div>
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Account & System Settings
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage contractor profile, regional hub assignment, and cloud subscription tiers.
        </p>
      </div>

      {saveToast && (
        <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-md">
          <CheckCircle className="w-4 h-4" />
          <span>Profile and settings saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card & Hub Selector */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>Contractor Estimator Profile</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company / Subtrade</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Direct Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Regional Hub</label>
                <select
                  value={selectedHub}
                  onChange={(e) => setSelectedHub(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {REGIONS_CATALOG.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name} ({r.province})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              Save Profile Changes
            </button>
          </form>

          {/* In-Cab Navigation Voice Settings */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span>In-Cab Navigation Voice Guidance</span>
              </h2>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                {voices.length} Voices Detected
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your preferred voice for two-phase turn announcements and stop arrivals during commercial driving routes.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <select
                  value={selectedVoice}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {voices.length === 0 ? (
                    <option value="">Detecting browser voices...</option>
                  ) : (
                    voices.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {v.isNatural ? '★ (Natural/HD)' : ''} ({v.lang})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <button
                type="button"
                onClick={handleTestVoice}
                disabled={isTestingVoice || !selectedVoice}
                className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm shrink-0 ${
                  isTestingVoice
                    ? 'bg-emerald-600 text-white animate-pulse'
                    : 'bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isTestingVoice ? 'Speaking...' : 'Test Voice'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Preferences automatically save to local storage and sync with In-App Drive Mode.</span>
            </div>
          </div>

          {/* Cloud Integrations Status */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h2 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Cloud Engine & API Integrations</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">PostGIS Spatial Engine</span>
                    <span className="text-[10px] text-slate-400">Turf.js & PostGIS DDL Ready</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Google Gemini 2.5 Flash</span>
                    <span className="text-[10px] text-slate-400">Estimator Flash AI Engine</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                  READY
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Stripe Subscriptions</span>
                    <span className="text-[10px] text-slate-400">Okanagan Hub Recurring Billing</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  SANDBOX
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Mail className="w-4 h-4 text-purple-500" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Resend Transactional</span>
                    <span className="text-[10px] text-slate-400">6:00 AM Daily Permit Alerts</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                  PREVIEW
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plan Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Active Package</span>
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                THE OKANAGAN HUB
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {SUBSCRIPTION_TIERS[currentTier].name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {SUBSCRIPTION_TIERS[currentTier].description}
            </p>

            <div className="mt-4 mb-6">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ${SUBSCRIPTION_TIERS[currentTier].priceCAD}
              </span>
              <span className="text-xs text-slate-400 font-semibold ml-1">CAD / mo</span>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">Switch Sandbox Tier:</span>
              <div className="grid grid-cols-3 gap-1.5 font-bold">
                {(['solo', 'pro_scout', 'supplier'] as SubscriptionTier[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTierSwitch(t)}
                    className={`py-1.5 rounded-lg border transition-all text-center ${
                      currentTier === t
                        ? 'bg-blue-600 text-white border-blue-600 shadow'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {t === 'solo' ? 'Solo' : t === 'pro_scout' ? 'Pro' : 'Supplier'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Stripe Customer ID: <strong>cus_okanagan_pro</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
