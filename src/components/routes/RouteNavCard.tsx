'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SavedRoute, PurposeTag } from '@/types';
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
  MapPin,
  Plus,
  Tag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const DEFAULT_BASE_STORAGE_KEY = 'bpp_default_base_address';

interface DefaultBaseAddress {
  address: string;
  coords: [number, number]; // [lat, lng]
}

export const PURPOSE_TAG_OPTIONS: PurposeTag[] = [
  'Sales Call / Inbound Inquiry',
  'Site Measure / Pre-Walk',
  'Warranty / Service Check',
  'Installer / Crew Checkup',
  'Office / Base',
  'Personal / Lunch'
];

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
  onAddCustomStop?: (stop: {
    address: string;
    lat: number;
    lng: number;
    purpose_tag: PurposeTag;
    notes?: string;
  }) => void;
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
  onStartDriveMode,
  onAddCustomStop
}: RouteNavCardProps) {
  const [defaultBase, setDefaultBase] = useState<DefaultBaseAddress | null>(null);
  const [justSavedDefault, setJustSavedDefault] = useState<boolean>(false);

  // Custom Civic Stop State
  const [isAddCivicOpen, setIsAddCivicOpen] = useState(false);
  const [civicAddress, setCivicAddress] = useState('');
  const [civicPurpose, setCivicPurpose] = useState<PurposeTag>('Sales Call / Inbound Inquiry');
  const [civicNotes, setCivicNotes] = useState('');
  const [isGeocodingCivic, setIsGeocodingCivic] = useState(false);
  const [civicGeocodeResult, setCivicGeocodeResult] = useState<{
    coords: [number, number]; // [lat, lng]
    address: string;
  } | null>(null);
  const [civicGeocodeError, setCivicGeocodeError] = useState<string | null>(null);

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

  // Geocode Custom Address
  const handleGeocodeCivic = async (addrToSearch?: string) => {
    const q = addrToSearch || civicAddress;
    if (!q || q.trim().length === 0) return;
    setIsGeocodingCivic(true);
    setCivicGeocodeError(null);
    try {
      const res = await fetch(`/api/routes/geocode?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const lat = data.latitude ?? (data.coordinates ? data.coordinates[1] : null);
        const lng = data.longitude ?? (data.coordinates ? data.coordinates[0] : null);
        if (lat !== null && lng !== null) {
          setCivicGeocodeResult({
            coords: [lat, lng],
            address: data.address || data.displayName || q
          });
        } else {
          setCivicGeocodeError('Could not resolve coordinates for address');
        }
      } else {
        setCivicGeocodeError('Could not resolve coordinates in Okanagan region');
      }
    } catch {
      setCivicGeocodeError('Geocoding request timed out');
    } finally {
      setIsGeocodingCivic(false);
    }
  };

  // Add Custom Civic Stop to Route
  const handleAddCivicStop = async () => {
    if (!civicAddress.trim()) return;

    let targetCoords = civicGeocodeResult?.coords;
    let resolvedAddr = civicGeocodeResult?.address || civicAddress;

    if (!targetCoords) {
      setIsGeocodingCivic(true);
      try {
        const res = await fetch(`/api/routes/geocode?q=${encodeURIComponent(civicAddress.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const lat = data.latitude ?? (data.coordinates ? data.coordinates[1] : null);
          const lng = data.longitude ?? (data.coordinates ? data.coordinates[0] : null);
          if (lat !== null && lng !== null) {
            targetCoords = [lat, lng];
            resolvedAddr = data.address || data.displayName || civicAddress;
          }
        }
      } catch {}
      setIsGeocodingCivic(false);
    }

    if (!targetCoords) {
      setCivicGeocodeError('Please enter a valid address or select a preset below.');
      return;
    }

    if (onAddCustomStop) {
      onAddCustomStop({
        address: resolvedAddr,
        lat: targetCoords[0],
        lng: targetCoords[1],
        purpose_tag: civicPurpose,
        notes: civicNotes
      });
      setCivicAddress('');
      setCivicNotes('');
      setCivicGeocodeResult(null);
      setCivicGeocodeError(null);
      setIsAddCivicOpen(false);
    }
  };

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

      {/* UNIVERSAL CIVIC ADDRESS INPUT (NON-PERMIT STOPS) */}
      <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsAddCivicOpen(!isAddCivicOpen)}
            className="flex items-center space-x-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Civic Address Stop (Non-Permit)</span>
          </button>
          <span className="text-[10px] text-amber-700/70 dark:text-amber-300/70 font-semibold">
            Service Calls & Inquiries
          </span>
        </div>

        {isAddCivicOpen && (
          <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
            {/* Address Input Field */}
            <div>
              <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 border border-amber-400/40 rounded-xl px-3 py-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input
                  type="text"
                  value={civicAddress}
                  onChange={(e) => {
                    setCivicAddress(e.target.value);
                    setCivicGeocodeResult(null);
                    setCivicGeocodeError(null);
                  }}
                  onBlur={() => handleGeocodeCivic()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGeocodeCivic();
                    }
                  }}
                  placeholder="e.g. 720 Sutherland Ave, Kelowna or 2475 Dobbin Rd"
                  className="w-full bg-transparent font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleGeocodeCivic()}
                  disabled={isGeocodingCivic || !civicAddress.trim()}
                  className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] shrink-0 disabled:opacity-50"
                >
                  {isGeocodingCivic ? 'Locating...' : 'Locate'}
                </button>
              </div>

              {/* Geocode Confirmation Status */}
              {civicGeocodeResult && (
                <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 pl-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    ✓ Located at [{civicGeocodeResult.coords[0].toFixed(4)}, {civicGeocodeResult.coords[1].toFixed(4)}]
                  </span>
                </div>
              )}

              {civicGeocodeError && (
                <div className="flex items-center space-x-1.5 text-[11px] text-red-500 font-medium mt-1.5 pl-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{civicGeocodeError}</span>
                </div>
              )}
            </div>

            {/* Quick Presets for Common Service Stops */}
            <div className="flex items-center space-x-1.5 overflow-x-auto text-[10px]">
              <span className="text-slate-400 font-bold shrink-0">Sample Stops:</span>
              {[
                '720 Sutherland Ave, Kelowna',
                '2475 Dobbin Rd, West Kelowna',
                '1850 Kirschner Rd, Kelowna'
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setCivicAddress(sample);
                    handleGeocodeCivic(sample);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-400/30 hover:bg-amber-500/10 shrink-0 font-medium"
                >
                  {sample.split(',')[0]}
                </button>
              ))}
            </div>

            {/* Purpose Tag Selector */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Purpose Tag:
              </label>
              <select
                value={civicPurpose}
                onChange={(e) => setCivicPurpose(e.target.value as PurposeTag)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                {PURPOSE_TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Stop Notes */}
            <div>
              <input
                type="text"
                value={civicNotes}
                onChange={(e) => setCivicNotes(e.target.value)}
                placeholder="Job notes (e.g. Inbound inquiry regarding commercial service entrance)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Action to Add to Route */}
            <button
              type="button"
              onClick={handleAddCivicStop}
              disabled={isGeocodingCivic || !civicAddress.trim()}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Non-Permit Stop to Route</span>
            </button>
          </div>
        )}
      </div>

      {/* Sequential Stop List with Leg Metrics */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Sequential Stops ({currentRoute.stops.length})
          </span>
          <span className="text-[10px] text-slate-400">Order & Purpose</span>
        </div>

        <div className="space-y-2">
          {currentRoute.stops.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
              No stops added. Add municipal permits or civic addresses above.
            </div>
          ) : (
            currentRoute.stops.map((stop, idx) => {
              const legInfo = circuitResult?.legs?.[idx];
              const isCivic = stop.is_custom_address || !stop.permit_id;

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
                        : isCivic
                        ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/60 dark:border-amber-700/60'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                          stop.is_completed
                            ? 'bg-emerald-600 text-white'
                            : isCivic
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {stop.is_completed ? '✓' : idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          {isCivic ? (
                            <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-1 rounded flex items-center space-x-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              <span>Civic Stop</span>
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1 rounded">
                              {stop.permit_number || `Stop ${idx + 1}`}
                            </span>
                          )}

                          {stop.purpose_tag && (
                            <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 rounded">
                              {stop.purpose_tag.split('/')[0].trim()}
                            </span>
                          )}

                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {stop.address}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteStop(stop.id)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0 ml-2"
                      title="Remove stop"
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
