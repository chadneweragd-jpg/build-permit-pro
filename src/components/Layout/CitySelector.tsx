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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
                          {city.name}, {city.province}
                        </span>
                        <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-1.5 py-0.2 rounded">
                          Locked
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
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
                        {city.label}
                      </span>
                      {city.id === 'calgary' && (
                        <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-extrabold px-1.5 py-0.2 rounded-full border border-amber-300/40">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {city.tagline}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Paywalled City Unlock Modal */}
      {unlockCity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
            <button
              onClick={() => setUnlockCity(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Unlock {unlockCity.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unlockCity.label} &bull; {unlockCity.tagline}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 mb-5 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">
                Add this territory to your subscription for <span className="text-blue-600 dark:text-blue-400 font-bold">$129/mo</span> or upgrade to Regional Pro:
              </p>
              <ul className="space-y-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-500 font-bold">&check;</span>
                  <span>Live 2026 permit pipeline for {unlockCity.name}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-500 font-bold">&check;</span>
                  <span>Full contractor contact dossiers & subtrade intelligence</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-emerald-500 font-bold">&check;</span>
                  <span>Optimized jobsite routes & CRA audit-ready mileage tracking</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  alert(`Territory expansion request for ${unlockCity.name} has been initiated! Our billing desk will activate your regional seat.`);
                  setUnlockCity(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all text-center cursor-pointer"
              >
                Add Territory ($129/mo)
              </button>
              <button
                type="button"
                onClick={() => setUnlockCity(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CitySelector;
