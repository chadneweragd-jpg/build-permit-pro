'use client';

import React, { useState, useEffect } from 'react';
import { Permit } from '@/types';
import { Compass, Navigation, MapPin, Sliders, X, ChevronRight, Route, ShieldAlert, CheckCircle2, ExternalLink, ArrowRight } from 'lucide-react';
import { getNativeMapUrls } from '@/lib/spatial';

interface BPPScoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  permits: Permit[];
  selectedDestinationPermit: Permit | null;
  onSelectDestinationPermit: (permit: Permit | null) => void;
  bufferKm: number;
  setBufferKm: (km: number) => void;
  corridorPermits: Permit[];
  isLoadingRoute: boolean;
  onRunScoutAnalysis: (start: [number, number], startName: string, dest: [number, number], destName: string) => void;
  onInspectPermit: (permit: Permit) => void;
  isScoutFeatureLocked?: boolean;
  onUpgradePrompt?: () => void;
}

// Preset Okanagan Contractor Depots / Hub Locations for instant testing
const PRESET_ORIGINS = [
  { name: 'YLW Kelowna Airport Depot', coords: [49.9575, -119.3810] as [number, number], label: 'YLW Airport' },
  { name: 'Downtown Kelowna Core (Queensway)', coords: [49.8870, -119.4960] as [number, number], label: 'Downtown' },
  { name: 'West Kelowna Commercial Center', coords: [49.8350, -119.5930] as [number, number], label: 'West Kelowna' },
  { name: 'Orchard Park / Highway 97 Yard', coords: [49.8820, -119.4390] as [number, number], label: 'Orchard Park' }
];

const BUFFER_OPTIONS = [2, 3, 5, 10];

export const BPPScoutDrawer: React.FC<BPPScoutDrawerProps> = ({
  isOpen,
  onClose,
  permits,
  selectedDestinationPermit,
  onSelectDestinationPermit,
  bufferKm,
  setBufferKm,
  corridorPermits,
  isLoadingRoute,
  onRunScoutAnalysis,
  onInspectPermit,
  isScoutFeatureLocked = false,
  onUpgradePrompt
}) => {
  const [selectedOrigin, setSelectedOrigin] = useState<typeof PRESET_ORIGINS[0]>(PRESET_ORIGINS[0]);
  const [customOriginAddress, setCustomOriginAddress] = useState('');

  // Auto-run analysis when origin or destination changes
  useEffect(() => {
    if (selectedDestinationPermit && selectedDestinationPermit.latitude && selectedDestinationPermit.longitude) {
      onRunScoutAnalysis(
        selectedOrigin.coords,
        selectedOrigin.name,
        [selectedDestinationPermit.latitude, selectedDestinationPermit.longitude],
        selectedDestinationPermit.address
      );
    }
  }, [selectedOrigin, selectedDestinationPermit, bufferKm]);

  if (!isOpen) return null;

  // Calculate total corridor pipeline value
  const totalCorridorValuation = corridorPermits.reduce((acc, p) => acc + (p.estimated_value || 0), 0);
  const formattedCorridorVal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(totalCorridorValuation);

  return (
    <aside aria-label="BPP Scout Route Corridor Lead Finder" className="fixed top-16 right-0 bottom-0 w-full sm:w-[460px] bg-white border-l border-slate-200 shadow-2xl z-40 flex flex-col transition-transform duration-300">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-extrabold text-sm tracking-tight text-white">BPP SCOUT</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-400 border border-amber-400/30">
                ROUTE CORRIDOR FINDER
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Find job-site leads along your driving path</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Feature Gating for Tier 1 Solo Users */}
      {isScoutFeatureLocked && (
        <div className="bg-amber-50 border-b border-amber-200 p-4">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">Regional Pro / Scout Tier Feature</h4>
              <p className="text-xs text-amber-800 mt-1">
                The interactive route corridor buffer slider is unlocked on <strong>Regional Pro / Scout</strong> ($199 CAD/mo) or <strong>Provincial Supplier</strong>.
              </p>
              <button
                onClick={onUpgradePrompt}
                className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                Upgrade to Unlock BPP Scout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Container */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-4">
        {/* Origin Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Start Location (Depot / Yard / GPS)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Presets or Current GPS</span>
          </label>

          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_ORIGINS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setSelectedOrigin(preset)}
                className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold border transition-all ${
                  selectedOrigin.name === preset.name
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="font-bold truncate">{preset.label}</div>
                <div className="text-[10px] text-slate-500 truncate">{preset.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Target Destination Permit Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Route className="w-3.5 h-3.5 text-emerald-600" />
              <span>2. Destination Job-Site Permit</span>
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">
              {selectedDestinationPermit ? 'Selected' : 'Pick a Permit'}
            </span>
          </label>

          <select
            value={selectedDestinationPermit?.id || ''}
            onChange={(e) => {
              const found = permits.find((p) => p.id === e.target.value);
              onSelectDestinationPermit(found || null);
            }}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">-- Choose destination target permit --</option>
            {permits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.permit_number} &bull; {p.address} (${(p.estimated_value / 1000000).toFixed(1)}M)
              </option>
            ))}
          </select>
        </div>

        {/* Corridor Buffer Slider (2km, 3km, 5km, 10km) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>3. Corridor Buffer Width:</span>
              <span className="text-sm font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {bufferKm} km
              </span>
            </label>
            <span className="text-[11px] text-slate-500">Spatial PostGIS / Turf.js buffer</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {BUFFER_OPTIONS.map((km) => (
              <button
                key={km}
                disabled={isScoutFeatureLocked}
                onClick={() => setBufferKm(km)}
                className={`py-2 rounded-lg text-xs font-extrabold border transition-all ${
                  bufferKm === km
                    ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-sm ring-1 ring-amber-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
                }`}
              >
                {km} km
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Corridor Analysis Summary Header */}
      <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-800">
            {corridorPermits.length} Active Leads Along Corridor
          </span>
          <p className="text-[11px] text-slate-500">Within {bufferKm} km of driving route</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
            {formattedCorridorVal} Pipeline
          </span>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingRoute && (
          <div className="p-8 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold">Calculating driving route & Turf.js buffer...</p>
          </div>
        )}

        {!isLoadingRoute && !selectedDestinationPermit && (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Compass className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
            <h4 className="text-sm font-bold text-slate-700">Select a Target Destination</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Pick any permit or job-site above to draw the driving corridor and discover nearby contractor opportunities.
            </p>
          </div>
        )}

        {!isLoadingRoute && selectedDestinationPermit && corridorPermits.length === 0 && (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-bold">No permits found within {bufferKm} km.</p>
            <p className="text-xs text-slate-400 mt-1">Try expanding the corridor buffer to 5 km or 10 km.</p>
          </div>
        )}

        {!isLoadingRoute &&
          corridorPermits.map((permit) => {
            const navUrls = getNativeMapUrls(permit.latitude, permit.longitude, permit.address);
            const distKm = permit.distance_meters ? (permit.distance_meters / 1000).toFixed(1) : '0.1';

            return (
              <div
                key={permit.id}
                onClick={() => onInspectPermit(permit)}
                className="bg-white border border-slate-200 hover:border-amber-400 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border">
                      {permit.permit_number}
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center space-x-1">
                      <Navigation className="w-2.5 h-2.5" />
                      <span>{distKm} km from route</span>
                    </span>
                  </div>

                  <span className="text-xs font-extrabold text-emerald-700">
                    ${(permit.estimated_value / 1000000).toFixed(1)}M
                  </span>
                </div>

                <h4 className="font-bold text-xs text-slate-900 mt-2 group-hover:text-brand-600 transition-colors">
                  {permit.address}
                </h4>

                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {permit.ai_summary}
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  {permit.trades.slice(0, 3).map((t) => (
                    <span
                      key={t.subtrade_key}
                      style={{ color: t.color, backgroundColor: `${t.color}15` }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>

                {/* Deep Links: Native Navigation in Truck */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">In-Truck Navigation:</span>
                  <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={navUrls.googleMaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1 shadow-xs"
                      title="Launch Google Maps"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={navUrls.waze}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold px-2 py-1 rounded bg-sky-500 hover:bg-sky-600 text-white flex items-center space-x-1 shadow-xs"
                      title="Launch Waze"
                    >
                      <span>Waze</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </aside>
  );
};
