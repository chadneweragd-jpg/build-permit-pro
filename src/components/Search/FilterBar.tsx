'use client';

import React, { useState } from 'react';
import { ChevronDown, X, MapPin, Layers, DollarSign, Filter, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  selectedPermitType: string;
  setSelectedPermitType: (type: string) => void;
  selectedValueTier: number; // min value
  setSelectedValueTier: (val: number) => void;
  onClearAll: () => void;
  activeFilterCount: number;
}

const LOCATIONS = ['All Locations', 'Kelowna', 'West Kelowna', 'Lake Country', 'Vernon', 'Penticton'];
const PERMIT_TYPES = [
  'All Permit Types',
  'Single-Family Residential (SFD)',
  'Multi-Family Residential',
  'Commercial New Construction',
  'Tenant Improvement / Renovation'
];
const VALUE_TIERS = [
  { label: 'All Values', value: 0 },
  { label: '$1M+ CAD', value: 1000000 },
  { label: '$5M+ CAD', value: 5000000 },
  { label: '$10M+ CAD', value: 10000000 },
  { label: '$25M+ CAD', value: 25000000 }
];

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedLocation,
  setSelectedLocation,
  selectedPermitType,
  setSelectedPermitType,
  selectedValueTier,
  setSelectedValueTier,
  onClearAll,
  activeFilterCount
}) => {
  const [openDropdown, setOpenDropdown] = useState<'location' | 'type' | 'value' | null>(null);

  const toggleDropdown = (name: 'location' | 'type' | 'value') => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const hasLocationFilter = selectedLocation !== 'All Locations';
  const hasTypeFilter = selectedPermitType !== 'All Permit Types' && selectedPermitType !== 'All Types';
  const hasValueFilter = selectedValueTier > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-3 relative z-20">
      <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
        {/* Location Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('location')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              hasLocationFilter
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>{hasLocationFilter ? selectedLocation : 'Location'}</span>
            {hasLocationFilter && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {openDropdown === 'location' && (
            <div
              className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs z-30 animate-in fade-in"
              onMouseLeave={() => setOpenDropdown(null)}
            >
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => {
                    setSelectedLocation(loc);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3.5 py-2 font-medium transition-colors ${
                    selectedLocation === loc
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Permit Type Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('type')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              hasTypeFilter
                ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 text-purple-700 dark:text-purple-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-500" />
            <span className="max-w-[130px] truncate">{hasTypeFilter ? selectedPermitType : 'Permit Type'}</span>
            {hasTypeFilter && (
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {openDropdown === 'type' && (
            <div
              className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs z-30 animate-in fade-in"
              onMouseLeave={() => setOpenDropdown(null)}
            >
              {PERMIT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedPermitType(type);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3.5 py-2 font-medium truncate transition-colors ${
                    selectedPermitType === type
                      ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Valuation Tier Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown('value')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              hasValueFilter
                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {hasValueFilter
                ? VALUE_TIERS.find((t) => t.value === selectedValueTier)?.label
                : 'Value'}
            </span>
            {hasValueFilter && (
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {openDropdown === 'value' && (
            <div
              className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs z-30 animate-in fade-in"
              onMouseLeave={() => setOpenDropdown(null)}
            >
              {VALUE_TIERS.map((tier) => (
                <button
                  key={tier.label}
                  onClick={() => {
                    setSelectedValueTier(tier.value);
                    setOpenDropdown(null);
                  }}
                  className={`w-full text-left px-3.5 py-2 font-medium transition-colors ${
                    selectedValueTier === tier.value
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clear All Reset Button */}
      {activeFilterCount > 0 && (
        <button
          onClick={onClearAll}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 hover:bg-red-100 transition-all"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear All ({activeFilterCount})</span>
        </button>
      )}
    </div>
  );
};
