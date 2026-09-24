'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SUPPORTED_CITIES, CityConfig, getSelectedCityId, setSelectedCityId } from '@/lib/cities';
import { MapPin, ChevronDown, Check } from 'lucide-react';

export const CitySelector: React.FC = () => {
  const [selectedCityId, setCityId] = useState<string>('kelowna');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCityId(getSelectedCityId());

    const handleCityChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ cityId: string }>;
      if (customEvent.detail?.cityId) {
        setCityId(customEvent.detail.cityId);
      }
    };

    window.addEventListener('bpp:city-change', handleCityChange);
    return () => window.removeEventListener('bpp:city-change', handleCityChange);
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
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700/60 mb-1">
            Active Construction Market
          </div>

          {Object.values(SUPPORTED_CITIES).map((city: CityConfig) => {
            const isSelected = city.id === selectedCityId;
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
  );
};

export default CitySelector;
