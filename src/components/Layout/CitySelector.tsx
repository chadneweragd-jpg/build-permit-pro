'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SUPPORTED_CITIES, CityConfig, getSelectedCityId, setSelectedCityId } from '@/lib/cities';
import { AuthService, UserProfile, isCityAllowed } from '@/lib/auth-service';
import { MapPin, ChevronDown, Check, Lock, X } from 'lucide-react';

export const CitySelector: React.FC = () => {
  const [selectedCityId, setCityId] = useState<string>('kelowna');
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(AuthService.getActiveUserSync());
  const [unlockCity, setUnlockCity] = useState<CityConfig | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<'solo' | 'supplier' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // AUDIT FIX (2026-10-02): these previously just called alert(...) and closed the modal --
  // no plan was actually added, no Stripe session was created. This now calls the real
  // /api/stripe/checkout route (src/app/api/stripe/checkout/route.ts), which creates a live
  // Stripe Checkout session when STRIPE_SECRET_KEY is configured, or returns a clearly-labeled
  // simulated session when it isn't (local dev / demo).
  const startCheckout = async (tier: 'solo' | 'supplier', hub: CityConfig | null) => {
    setIsCheckingOut(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          hubId: hub?.id,
          userId: AuthService.getActiveUserId(),
          returnUrl: window.location.href
        })
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout session did not return a URL:', data);
      }
    } catch (err) {
      console.error('Failed to start checkout session:', err);
    } finally {
      setIsCheckingOut(null);
      setUnlockCity(null);
    }
  };

  useEffect(() => {
    setCityId(getSelectedCityId());

    const handleCityChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ cityId: string }>;
      if (customEvent.detail?.cityId) {
        setCityId(customEvent.detail.cityId);
      }
    };

    const syncUser = async () => {
      const u = await AuthService.getCurrentUser();
      setCurrentUser(u);
    };
    syncUser();

    const handleUserChange = () => {
      syncUser();
    };

    window.addEventListener('bpp:city-change', handleCityChange);
    window.addEventListener('bpp_user_changed', handleUserChange);
    return () => {
      window.removeEventListener('bpp:city-change', handleCityChange);
      window.removeEventListener('bpp_user_changed', handleUserChange);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCity = SUPPORTED_CITIES[selectedCityId] || SUPPORTED_CITIES.kelowna;

  const handleSelect = (cityId: string) => {
    setSelectedCityId(cityId);
    setCityId(cityId);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-xs group"
          title="Switch Metro Region"
          aria-label="Select active city or metro market"
        >
          <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="font-extrabold">{currentCity.name}</span>
          <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
            {currentCity.province}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400 opacity-80" />
        </button>

        {isOpen && (
          <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-60 max-h-[80vh] sm:max-h-[400px] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs z-50 animate-in fade-in slide-in-from-top-2">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 mb-1 z-10 backdrop-blur-sm">
              Active Construction Market
            </div>

            {Object.values(SUPPORTED_CITIES).map((city: CityConfig) => {
              const isSelected = city.id === selectedCityId;
              const allowed = isCityAllowed(city.id, currentUser);

              if (!allowed) {
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => {
                      setUnlockCity(city);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-amber-500/10 dark:hover:bg-amber-900/20 transition-colors opacity-75 group/locked cursor-pointer"
                    title={`Unlock ${city.name} territory`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <Lock className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 group-hover/locked:text-amber-600 dark:group-hover/locked:text-amber-400">
                          🔒 {city.name}, {city.province} (Locked)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 pl-4">
                        {city.tagline}
                      </div>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-slate-400 group-hover/locked:text-amber-500 shrink-0 ml-2" />
                  </button>
                );
              }

              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => handleSelect(city.id)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors ${
                    isSelected ? 'bg-blue-50/70 dark:bg-blue-900/20 font-bold' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {city.name}, {city.province}
                      </span>
                      {isSelected ? (
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-extrabold px-1.5 py-0.2 rounded-full border border-emerald-300/60">
                          ✓ Active
                        </span>
                      ) : (
                        <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded-full">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {city.tagline}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Paywalled City Unlock Modal */}
      {unlockCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 overflow-hidden">
            <button
              onClick={() => setUnlockCity(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Unlock {unlockCity.name} Metro Construction Intelligence
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {unlockCity.label} &bull; {unlockCity.tagline}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 mb-5 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-3">
              <p className="font-semibold text-slate-900 dark:text-white text-sm leading-snug">
                Gain instant access to <span className="text-emerald-600 dark:text-emerald-400 font-black">$2.6B+</span> in active building permits, verified contractor dossiers, and route intelligence across {unlockCity.name}.
              </p>
              <ul className="space-y-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-500 font-bold">&check;</span>
                  <span>Live 2026 commercial & residential permit pipeline for {unlockCity.name}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-500 font-bold">&check;</span>
                  <span>Direct estimator phone, email, and principal contact dossiers</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-500 font-bold">&check;</span>
                  <span>GPS corridor jobsite routing & CRA audit logbook tracking</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                disabled={isCheckingOut !== null}
                onClick={() => startCheckout('solo', unlockCity)}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 transition-all text-center cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-wait"
              >
                {isCheckingOut === 'solo' ? 'Starting Checkout…' : `Add ${unlockCity.name} to Plan ($129/mo)`}
              </button>
              <button
                type="button"
                disabled={isCheckingOut !== null}
                onClick={() => startCheckout('supplier', unlockCity)}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all text-center cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-wait"
              >
                {isCheckingOut === 'supplier' ? 'Starting Checkout…' : 'Upgrade to Provincial Enterprise ($499/mo)'}
              </button>
            </div>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setUnlockCity(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                No thanks, stay on current territory
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CitySelector;
