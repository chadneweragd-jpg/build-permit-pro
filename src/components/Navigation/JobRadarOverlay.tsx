'use client';

import React, { useEffect, useRef } from 'react';
import { Permit, JobRadarAlert } from '@/types';
import { Radio, X, Plus, Phone, ExternalLink, Zap, ShieldAlert } from 'lucide-react';

interface JobRadarOverlayProps {
  alerts: JobRadarAlert[];
  onAddStopAsNext: (permit: Permit) => void;
  onDismissAlert: (permitId: string) => void;
  isMuted?: boolean;
}

// Synthesizes a high-clarity sonar/radar ping using HTML5 Web Audio API
export function playRadarSoundPing() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency chirp from 880Hz (A5) up to 1760Hz (A6)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (err) {
    // AudioContext might require user gesture on first interaction
  }
}

export function JobRadarOverlay({
  alerts,
  onAddStopAsNext,
  onDismissAlert,
  isMuted = false
}: JobRadarOverlayProps) {
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Trigger audio ping when a new alert enters radar proximity
  useEffect(() => {
    if (alerts.length === 0) return;
    const newest = alerts[0];
    if (newest && !alertedIdsRef.current.has(newest.permit.id)) {
      alertedIdsRef.current.add(newest.permit.id);
      if (!isMuted) {
        playRadarSoundPing();
      }
    }
  }, [alerts, isMuted]);

  if (alerts.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 left-4 md:left-auto md:w-96 z-50 pointer-events-auto space-y-2.5">
      {alerts.slice(0, 2).map((item) => {
        const { permit, distanceKm } = item;
        const mainTrade = permit.trades?.[0];

        return (
          <div
            key={permit.id}
            className="bg-slate-900/95 backdrop-blur-md text-white border-2 border-amber-500 shadow-2xl shadow-amber-500/20 rounded-2xl p-4 overflow-hidden animate-in slide-in-from-top-4 duration-300 ring-4 ring-amber-500/10"
          >
            {/* Radar Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                  <Radio className="w-3.5 h-3.5 mr-1 animate-pulse" />
                  <span>Job Radar Alert</span>
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="font-mono text-xs font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                  {distanceKm} km away
                </span>
                <button
                  onClick={() => onDismissAlert(permit.id)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Permit Info */}
            <div className="pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-extrabold text-blue-400">
                  {permit.permit_number}
                </span>
                <span className="font-black text-sm text-emerald-400">
                  ${permit.estimated_value.toLocaleString()} CAD
                </span>
              </div>

              <p className="font-bold text-xs text-white line-clamp-1">
                {permit.address}
              </p>

              {mainTrade && (
                <div className="flex items-center space-x-2 text-[11px]">
                  <span
                    className="px-2 py-0.5 rounded-md font-bold text-[10px]"
                    style={{ backgroundColor: `${mainTrade.color}25`, color: mainTrade.color }}
                  >
                    {mainTrade.name}
                  </span>
                  <span className="text-slate-400 truncate">
                    {permit.contractor_name || 'Contractor on file'}
                  </span>
                </div>
              )}
            </div>

            {/* In-Cab Actions */}
            <div className="pt-3 grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => onAddStopAsNext(permit)}
                className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center space-x-1.5 font-black transition-colors shadow-lg shadow-amber-500/30"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Next Stop</span>
              </button>

              {permit.contractor_phone ? (
                <a
                  href={`tel:${permit.contractor_phone}`}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center space-x-1.5 transition-colors border border-slate-700"
                >
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Call GC</span>
                </a>
              ) : (
                <button
                  onClick={() => onDismissAlert(permit.id)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center space-x-1.5 transition-colors border border-slate-700"
                >
                  <span>Ignore</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
