'use client';

import React, { useState } from 'react';
import { getCoreName, calculateTrigramSimilarity } from '@/lib/builders-service';
import { ExternalLink, Search, ShieldAlert, PhoneOff, Mail, Phone, Compass, CheckCircle2 } from 'lucide-react';

export interface BuilderDossierProps {
  permit: {
    id?: string;
    permit_number: string;
    address: string;
    city_region?: string;
    city?: string;
    contractor_name?: string;
    contractor_phone?: string;
    contractor_email?: string;
    applicant_name?: string;
    sub_type?: string;
    permit_type?: string;
    value?: number | string;
    estimated_value?: number | string;
    tier?: number;
    verified_builder?: any;
    latitude?: number;
    longitude?: number;
  };
  builder?: {
    company_name: string;
    key_principal?: string;
    primary_phone?: string;
    email?: string;
    website?: string;
    physical_address?: string;
    association?: string;
    city?: string;
    province?: string;
  } | null;
}

export function BuilderDossier({ permit, builder }: BuilderDossierProps) {
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const activeBuilder = builder || (permit.tier === 1 ? permit.verified_builder : null);
  const contractorName = (permit.contractor_name || activeBuilder?.company_name || 'Standard Permittee').trim();
  const permitCore = getCoreName(contractorName);
  const builderCore = activeBuilder ? getCoreName(activeBuilder.company_name) : '';
  const city = permit.city_region || permit.city || 'Calgary';

  const permitCityLower = (permit.city_region || permit.city || '').toLowerCase().trim();
  const builderCityLower = (activeBuilder?.city || '').toLowerCase().trim();
  const permitProv = (
    permit.verified_builder?.province ||
    (permit.city_region || '').split(/[,\s]+/).filter(Boolean).pop() ||
    ''
  ).toUpperCase();
  const builderProv = (activeBuilder?.province || '').toUpperCase();

  // Strict check: builder must be non-null, core name similarity >= 0.90, and city/province match
  const similarity = activeBuilder ? calculateTrigramSimilarity(permitCore, builderCore) : 0;
  const isCoreMatch = Boolean(
    activeBuilder &&
    (
      permitCore === builderCore ||
      similarity >= 0.90
    )
  );

  const isCityMatch = activeBuilder
    ? Boolean(
        !builderCityLower ||
        !permitCityLower ||
        builderCityLower.includes(permitCityLower) ||
        permitCityLower.includes(builderCityLower) ||
        (builderProv && permitProv && builderProv === permitProv)
      )
    : false;

  const isVerified = (permit.tier === 1) && Boolean(activeBuilder) && isCoreMatch && isCityMatch;

  const subType = permit.sub_type || permit.permit_type || 'Approved Scope';
  const val = Number(permit.value ?? permit.estimated_value ?? 0);

  // Search Contractor Handler
  const handleSearchContractor = () => {
    const query = encodeURIComponent(`${permit.contractor_name || permit.applicant_name || contractorName} ${city} contractor`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
  };

  // Scout Jobsite Handler
  const handleScoutJobsite = () => {
    const lat = permit.latitude;
    const lng = permit.longitude;
    if (typeof window !== 'undefined') {
      if (lat && lng) {
        window.dispatchEvent(new CustomEvent('bpp:scout-permit', {
          detail: { permitId: permit.permit_number, latitude: lat, longitude: lng }
        }));
      }
      const query = (lat && lng) ? `${lat},${lng}` : encodeURIComponent(`${permit.address}, ${city}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
    }
  };

  // ---------------------------------------------------------------------------
  // CASE 1: VERIFIED BUILDER DOSSIER (Strict Master Database Match)
  // ---------------------------------------------------------------------------
  if (isVerified && activeBuilder) {
    const phoneToDisplay = activeBuilder.primary_phone || permit.contractor_phone || '';
    const emailToDisplay = activeBuilder.email || permit.contractor_email || '';
    const cleanPhone = phoneToDisplay.replace(/[^0-9+]/g, '');

    const handleCallOrCopy = (e: React.MouseEvent) => {
      if (!phoneToDisplay) return;
      const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isMobile) {
        e.preventDefault();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(phoneToDisplay);
        }
        setCopyToast('Phone number copied to clipboard!');
        setTimeout(() => setCopyToast(null), 3000);
      }
    };

    const siteAddr = (permit as any).site_address || permit.address || '';
    const projDesc = (permit as any).project_description || (permit as any).description || (permit as any).permit_type || (permit as any).work_class || 'Construction';
    const emailSubject = encodeURIComponent(
      `Subtrade Quote Inquiry - Permit ${permit.permit_number} (${siteAddr})`
    );
    const emailBody = encodeURIComponent(
      `Hi Estimating Team at ${activeBuilder.company_name},\n\n` +
      `I noticed your recently approved permit for the project at ${siteAddr} (${projDesc}).\n\n` +
      `We are a local trade contractor specializing in [Your Trade Scope] and would welcome the opportunity to submit a competitive tender on this project.\n\n` +
      `Could you please let us know if project drawings and specifications are available for review?\n\n` +
      `Best regards,\n[Your Name / Company Contact]`
    );

    const mailtoUrl = emailToDisplay
      ? `mailto:${emailToDisplay}?subject=${emailSubject}&body=${emailBody}`
      : '#';

    const websiteUrl = activeBuilder.website
      ? (/^https?:\/\//i.test(activeBuilder.website) ? activeBuilder.website : `https://${activeBuilder.website}`)
      : '#';

    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/90 p-5 text-white shadow-xl relative">
        {copyToast && (
          <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg animate-in fade-in z-20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{copyToast}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Verified Builder Dossier
            </span>
            <h3 className="text-lg font-bold text-white">{activeBuilder.company_name}</h3>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            ✓ Verified Builder
          </span>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-300">
          {activeBuilder.key_principal && (
            <p><strong className="text-slate-400">Principal / Key Contact:</strong> {activeBuilder.key_principal}</p>
          )}
          {activeBuilder.physical_address && (
            <p><strong className="text-slate-400">Head Office Address:</strong> {activeBuilder.physical_address}</p>
          )}
          {activeBuilder.association && (
            <p><strong className="text-slate-400">Association:</strong> {activeBuilder.association}</p>
          )}
        </div>

        {/* Action CTA Buttons */}
        <div className="mt-5 flex flex-wrap gap-2 overflow-x-auto">
          {phoneToDisplay ? (
            <a
              href={`tel:${cleanPhone}`}
              onClick={handleCallOrCopy}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 active:scale-95 cursor-pointer shadow-sm"
              title="Call builder or copy number"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call {phoneToDisplay}</span>
            </a>
          ) : (
            <button
              disabled
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed opacity-50"
              title="No verified phone on record"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span>No Phone Listed</span>
            </button>
          )}

          {emailToDisplay ? (
            <a
              href={mailtoUrl}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-95 shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Estimating</span>
            </a>
          ) : (
            <button
              disabled
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed opacity-50"
              title="No estimator email on file"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Estimating</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleScoutJobsite}
            className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-200 transition active:scale-95 cursor-pointer"
            title="Scout Jobsite on Google Street View & Map"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Scout Jobsite</span>
          </button>
        </div>

        {activeBuilder.website && (
          <div className="mt-3 text-center">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
            >
              ↗ Official Website ({activeBuilder.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')})
            </a>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSearchContractor}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 py-2 text-xs font-semibold transition-all text-center cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Search Contractor on Google</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CASE 2: UNVERIFIED PERMITTEE DOSSIER (Standard Permittee)
  // Displays genuine permit address (#140 3132 26 ST NE). No invented contacts.
  // ---------------------------------------------------------------------------
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/90 p-5 text-white shadow-xl relative">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Standard Permittee
          </span>
          <h3 className="text-lg font-bold text-white tracking-tight">{contractorName}</h3>
        </div>
        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400 border border-slate-700">
          Standard Permittee
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <p>
          <strong className="text-slate-400">Project / Site Address:</strong> {permit.address}
        </p>
        <p>
          <strong className="text-slate-400">Jurisdiction:</strong> {city}
        </p>
        <p className="text-xs text-slate-400 inline-flex items-center gap-1.5 pt-1">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          Public Municipal Record — Direct estimator contact pending verification
        </p>
      </div>

      {/* Action Buttons: Disabled Phone/Email with Tooltip + Functional Scout Jobsite */}
      <div className="mt-5 flex flex-wrap gap-2 overflow-x-auto">
        <button
          type="button"
          disabled
          title="No verified phone on record"
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-lg bg-slate-800/80 border border-slate-700/50 px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed"
        >
          <PhoneOff className="w-3.5 h-3.5 opacity-60" />
          <span>No Phone on Record</span>
        </button>

        <button
          type="button"
          disabled
          title="Direct estimator contact pending verification"
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-lg bg-slate-800/80 border border-slate-700/50 px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed"
        >
          <Mail className="w-3.5 h-3.5 opacity-60" />
          <span>Email Disabled</span>
        </button>

        <button
          type="button"
          onClick={handleScoutJobsite}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-200 transition active:scale-95 cursor-pointer"
          title="Scout Jobsite on Google Street View & Map"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Scout Jobsite</span>
        </button>
      </div>

      {/* Functional Google Search Button for Contractor */}
      <div className="mt-3.5 pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={handleSearchContractor}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 hover:text-blue-300 px-3 py-2 text-xs font-bold transition-all text-center cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Contractor on Google</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </button>
      </div>
    </div>
  );
}

export default BuilderDossier;
