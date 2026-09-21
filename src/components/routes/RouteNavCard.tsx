'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SavedRoute } from '@/types';
import { CircuitResult } from '@/lib/spatial';
import {
  Navigation,
  Compass,
  RotateCcw,
  Zap,
  Trash2,
  Play,
  FileSpreadsheet,
  Search,
  Home,
  Bookmark,
  Check,
  MapPin
} from 'lucide-react';

export const DEFAULT_BASE_STORAGE_KEY = 'bpp_default_base_address';

interface DefaultBaseAddress {
  address: string;
  coords: [number, number]; // [lat, lng]
}

interface RouteNavCardProps {
  currentRoute: SavedRoute;
  isRoundTrip: boolean;
  setIsRoundTrip: (val: boolean) => void;
  circuitResult: CircuitResult | null;
  isGeocodingStart: boolean;
  startGeocodeStatus: string;
  onUpdateOrigin: (address: string) => void;
  onUpdateDestination: (address: string) => void;
  onUseMyLocation: () => void;
  onOptimizeCircuit: () => void;
  onDeleteStop: (stopId: string) => void;
  onStartDriveMode: () => void;
}

export function RouteNavCard({
  currentRoute,
  isRoundTrip,
  setIsRoundTrip,
  circuitResult,
  isGeocodingStart,
  startGeocodeStatus,
  onUpdateOrigin,
  onUpdateDestination,
  onUseMyLocation,
  onOptimizeCircuit,
  onDeleteStop,
  onStartDriveMode
}: RouteNavCardProps) {
  const [defaultBase, setDefaultBase] = useState<DefaultBaseAddress | null>(null);
  const [justSavedDefault, setJustSavedDefault] = useState<boolean>(false);

  // Load default base address from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(DEFAULT_BASE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.address) {
          setDefaultBase(parsed);
        }
      } else {
        // Preset default to user's shop/home: 1665 Rutland Rd
        const initialDefault: DefaultBaseAddress = {
          address: '1665 Rutland Rd, Kelowna, BC',
          coords: [49.9102, -119.3865]
        };
        localStorage.setItem(DEFAULT_BASE_STORAGE_KEY, JSON.stringify(initialDefault));
        setDefaultBase(initialDefault);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  // Check if current route origin matches default base address
  const isCurrentOriginDefaultBase = Boolean(
    defaultBase?.address &&
      currentRoute.origin_address.toLowerCase().includes(defaultBase.address.split(',')[0].toLowerCase().trim())
  );

  // Save current origin as the new default base address
  const handleSetAsDefaultBase = () => {
    if (typeof window === 'undefined') return;
    const newDefault: DefaultBaseAddress = {
      address: currentRoute.origin_address,
      coords: currentRoute.origin_coords
    };
    try {
      localStorage.setItem(DEFAULT_BASE_STORAGE_KEY, JSON.stringify(newDefault));
      setDefaultBase(newDefault);
      setJustSavedDefault(true);
      setTimeout(() => setJustSavedDefault(false), 2500);
    } catch (err) {
      console.error('Failed to save default base address:', err);
    }
  };

  // Quick apply default base
  const handleApplyDefaultBase = () => {
    if (defaultBase?.address) {
      onUpdateOrigin(defaultBase.address);
    }
  };

  const PRESETS = [
    { label: '📍 1665 Rutland Rd (House)', address: '1665 Rutland Rd, Kelowna, BC' },
    { label: 'Downtown Queensway', address: 'Queensway Transit Depot, Kelowna, BC' },
    { label: 'YLW Airport', address: '5500 Airport Way, Kelowna, BC' },
    { label: 'Bartle & Gibson', address: '1850 Kirschner Rd, Kelowna, BC' }
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4.5 space-y-4">
      {/* Header & GPS Button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-1.5">
          <Navigation className="w-4 h-4 text-blue-600" />
          <span>Navigation & Itinerary</span>
        </span>
        <button
          type="button"
          onClick={onUseMyLocation}
          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1"
        >
          <Compass className="w-3 h-3" />
          <span>Use My Location</span>
        </button>
      </div>

      {/* Origin & Destination with Default Base Address persistence */}
      <div className="space-y-2.5 text-xs">
        {/* Origin / Start Field */}
        <div>
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-slate-400 font-bold w-12">Start:</span>
            <input
              type="text"
              value={currentRoute.origin_address}
              onChange={(e) => onUpdateOrigin(e.target.value)}
              onBlur={() => onUpdateOrigin(currentRoute.origin_address)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateOrigin(currentRoute.origin_address);
                }
              }}
              placeholder="e.g. 1665 Rutland Rd, Kelowna"
              className="w-full bg-transparent font-medium text-slate-900 dark:text-white focus:outline-none"
            />
            {isGeocodingStart && (
              <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
            )}
          </div>

          {/* Default Base Address Toolbar */}
          <div className="flex items-center justify-between pt-1.5 px-0.5 text-[11px]">
            {isCurrentOriginDefaultBase ? (
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <Home className="w-3 h-3" />
                <span>Default Base Address</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSetAsDefaultBase}
                className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold transition-colors"
                title="Save current origin as morning starting point in localStorage"
              >
                {justSavedDefault ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Saved as Default Base!</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3 h-3" />
                    <span>Set as Default Base Address</span>
                  </>
                )}
              </button>
            )}

            {defaultBase && !isCurrentOriginDefaultBase && (
              <button
                type="button"
                onClick={handleApplyDefaultBase}
                className="text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium underline"
              >
                Reset to Base ({defaultBase.address.split(',')[0]})
              </button>
            )}
          </div>

          {/* Quick Origin Presets */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 pb-0.5 text-[10px]">
            <span className="text-slate-400 font-bold shrink-0">Presets:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onUpdateOrigin(preset.address)}
                className={`px-2 py-0.5 rounded-lg font-bold shrink-0 border transition-all ${
                  currentRoute.origin_address.toLowerCase().includes(preset.address.split(',')[0].toLowerCase())
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {startGeocodeStatus && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold mt-0.5 pl-1">
              {startGeocodeStatus}
            </div>
          )}
        </div>

        {/* Destination / End Field */}
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-slate-400 font-bold w-12">End:</span>
          <input
            type="text"
            value={currentRoute.destination_address}
            onChange={(e) => onUpdateDestination(e.target.value)}
            onBlur={() => onUpdateDestination(currentRoute.destination_address)}
            className="w-full bg-transparent font-medium text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Circuit Options: Round Trip & Optimization */}
      <div className="flex items-center justify-between pt-1 pb-1 border-t border-b border-slate-200 dark:border-slate-700/60 text-xs">
        <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isRoundTrip}
            onChange={(e) => setIsRoundTrip(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
          />
          <span className="flex items-center space-x-1">
            <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
            <span>Round-Trip Circuit</span>
          </span>
        </label>

        {currentRoute.stops.length >= 2 && (
          <button
            type="button"
            onClick={onOptimizeCircuit}
            className="text-xs font-black text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800/60 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-500" />
            <span>Optimize Circuit</span>
          </button>
        )}
      </div>

      {/* Sequential Stop List with Leg Metrics */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Sequential Stops ({currentRoute.stops.length})
          </span>
          <span className="text-[10px] text-slate-400">Drag or delete stops</span>
        </div>

        <div className="space-y-2">
          {currentRoute.stops.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              No stops added. Pick permits below or from the map to add stops.
            </div>
          ) : (
            currentRoute.stops.map((stop, idx) => {
              const legInfo = circuitResult?.legs?.[idx];
              return (
                <div key={stop.id} className="space-y-1">
                  {idx > 0 && legInfo && (
                    <div className="flex items-center space-x-2 pl-3 py-0.5 text-[10px] font-mono text-slate-400">
                      <span className="w-0.5 h-3 bg-slate-300 dark:bg-slate-700" />
                      <span>
                        Leg {idx}: {legInfo.distanceKm} km ({legInfo.durationMin} min)
                      </span>
                    </div>
                  )}
                  <div
                    className={`border rounded-xl p-2.5 flex items-center justify-between text-xs transition-colors ${
                      stop.is_completed
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                          stop.is_completed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {stop.is_completed ? '✓' : idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1 rounded">
                            {stop.permit_number || `Stop ${idx + 1}`}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {stop.address}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteStop(stop.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* In-Cab Commercial Action Buttons (100% In-App) */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={onStartDriveMode}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98]"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Start In-App Drive Mode</span>
        </button>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <Link
            href="/routes/mileage"
            className="py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 flex items-center justify-center space-x-1.5 text-center transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CRA Mileage Log</span>
          </Link>

          <Link
            href="/search"
            className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center space-x-1.5 text-center transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Search Leads</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
