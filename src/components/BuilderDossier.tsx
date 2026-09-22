'use client';

import React from 'react';

export interface BuilderDossierProps {
  permit: {
    permit_number: string;
    address: string;
    sub_type?: string;
    permit_type?: string;
    value?: number | string;
    estimated_value?: number | string;
  };
  builder: {
    company_name: string;
    key_principal?: string;
    primary_phone?: string;
    email?: string;
    website?: string;
    physical_address?: string;
    association?: string;
  };
}

export function BuilderDossier({ permit, builder }: BuilderDossierProps) {
  // Format clean phone number for tel: link
  const rawPhone = builder.primary_phone?.replace(/[^0-9+]/g, '') || '';

  const subType = permit.sub_type || permit.permit_type || 'Approved Scope';
  const val = Number(permit.value ?? permit.estimated_value ?? 0);

  // Pre-fill subject and body for high-conversion subtrade outreach
  const emailSubject = encodeURIComponent(
    `Subtrade Bid Inquiry: Permit ${permit.permit_number} (${permit.address})`
  );
  const emailBody = encodeURIComponent(
    `Hi ${builder.key_principal || 'Estimating Team'},\n\n` +
    `I saw the recently approved permit ${permit.permit_number} for ${permit.address} ` +
    `(${subType}, estimated value: $${val.toLocaleString()}).\n\n` +
    `We are an Okanagan contractor specializing in subtrade services and would like to review the project scope and submit a tender for this job.\n\n` +
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
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Verified Builder Dossier</span>
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
        {/* Call Button */}
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

        {/* Email Estimating Button (Native OS Mail Handler, NO target="_blank") */}
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

      {/* Official Website Link */}
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

export default BuilderDossier;
