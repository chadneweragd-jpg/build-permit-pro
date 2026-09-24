'use client';

import React from 'react';
import { getCoreName } from '@/lib/builders-service';
import { ExternalLink, Search, ShieldAlert, PhoneOff, Mail } from 'lucide-react';

export interface BuilderDossierProps {
  permit: {
    permit_number: string;
    address: string;
    city_region?: string;
    city?: string;
    contractor_name?: string;
    sub_type?: string;
    permit_type?: string;
    value?: number | string;
    estimated_value?: number | string;
    tier?: number;
  };
  builder?: {
    company_name: string;
    key_principal?: string;
    primary_phone?: string;
    email?: string;
    website?: string;
    physical_address?: string;
    association?: string;
  } | null;
}

export function BuilderDossier({ permit, builder }: BuilderDossierProps) {
  const contractorName = (permit.contractor_name || builder?.company_name || 'Owner / Builder').trim();
  const permitCore = getCoreName(contractorName);
  const builderCore = builder ? getCoreName(builder.company_name) : '';

  // Strict check: builder must be non-null AND core brand names must match
  const isMatch = Boolean(builder && permitCore && builderCore && permitCore === builderCore);
  const isVerified = (permit.tier === 1 || permit.tier === undefined) && Boolean(builder) && isMatch;

  const subType = permit.sub_type || permit.permit_type || 'Approved Scope';
  const val = Number(permit.value ?? permit.estimated_value ?? 0);
  const city = permit.city_region || permit.city || (permit.address.toLowerCase().includes('calgary') ? 'Calgary' : 'Kelowna');

  // ---------------------------------------------------------------------------
  // CASE 1: VERIFIED BUILDER DOSSIER (Strict Match)
  // ---------------------------------------------------------------------------
  if (isVerified && builder) {
    const rawPhone = builder.primary_phone?.replace(/[^0-9+]/g, '') || '';
    const emailSubject = encodeURIComponent(
      `Subtrade Bid Inquiry: Permit ${permit.permit_number} (${permit.address})`
    );
    const emailBody = encodeURIComponent(
      `Hi ${builder.key_principal || 'Estimating Team'},\n\n` +
      `I saw the recently approved permit ${permit.permit_number} for ${permit.address} ` +
      `(${subType}, estimated value: $${val.toLocaleString()}).\n\n` +
      `We specialize in subtrade services in ${city} and would like to review the project scope and submit a tender for this job.\n\n` +
      `Could you please let us know the best contact or share the plans when available?\n\n` +
      `Thank you,\n`
    );

    const mailtoUrl = builder.email
      ? `mailto:${builder.email}?subject=${emailSubject}&body=${emailBody}`
      : '#';

    const websiteUrl = builder.website
      ? (/^https?:\/\//i.test(builder.website) ? builder.website : `https://${builder.website}`)
      : '#';

    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/90 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Verified Builder Dossier
            </span>
            <h3 className="text-lg font-bold text-white">{builder.company_name}</h3>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            ✓ Verified Builder
          </span>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-300">
          {builder.key_principal && (
            <p><strong className="text-slate-400">Principal / Key Contact:</strong> {builder.key_principal}</p>
          )}
          {builder.physical_address && (
            <p><strong className="text-slate-400">Office / Address:</strong> {builder.physical_address}</p>
          )}
          {builder.association && (
            <p><strong className="text-slate-400">Association:</strong> {builder.association}</p>
          )}
        </div>

        {/* Action CTA Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {builder.primary_phone ? (
            <a
              href={`tel:${rawPhone}`}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
            >
              📞 Call {builder.primary_phone}
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed opacity-50"
              title="No builder phone on file"
            >
              📞 No Phone Listed
            </button>
          )}

          {builder.email ? (
            <a
              href={mailtoUrl}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-95"
            >
              ✉️ Email Estimating
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed opacity-50"
              title="No estimator email on file"
            >
              ✉️ Email Estimating
            </button>
          )}
        </div>

        {builder.website && (
          <div className="mt-3 text-center">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
            >
              ↗ Official Website ({builder.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')})
            </a>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CASE 2: UNVERIFIED PERMITTEE DOSSIER (Honest Fallback)
  // Displays the true permit contractor name (e.g. "SOULEAU CONTRACTING")
  // ---------------------------------------------------------------------------
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${contractorName} ${city} contractor`)}`;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/90 p-5 text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
            Standard Permittee Dossier
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

      {/* Disabled Actions with Tooltip */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          title="Direct estimator contact pending verification"
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-800/80 border border-slate-700/50 px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed"
        >
          <PhoneOff className="w-3.5 h-3.5 opacity-60" />
          <span>Call Disabled</span>
        </button>

        <button
          type="button"
          disabled
          title="Direct estimator contact pending verification"
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-800/80 border border-slate-700/50 px-3 py-2.5 text-xs text-slate-500 cursor-not-allowed"
        >
          <Mail className="w-3.5 h-3.5 opacity-60" />
          <span>Email Disabled</span>
        </button>
      </div>

      {/* Google Search Link for Contractor */}
      <div className="mt-3.5 pt-3 border-t border-slate-800">
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 hover:text-blue-300 px-3 py-2 text-xs font-bold transition-all text-center"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search Contractor on Google</span>
          <ExternalLink className="w-3 h-3 opacity-70" />
        </a>
      </div>
    </div>
  );
}

export default BuilderDossier;
