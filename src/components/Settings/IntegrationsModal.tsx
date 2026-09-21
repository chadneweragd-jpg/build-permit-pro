'use client';

import React, { useState, useEffect } from 'react';
import { Database, Sparkles, CreditCard, Mail, X, CheckCircle, AlertCircle, RefreshCw, Copy, Check } from 'lucide-react';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const integrations = [
    {
      id: 'supabase',
      name: 'Supabase (PostgreSQL + PostGIS)',
      icon: <Database className="w-5 h-5 text-emerald-500" />,
      status: 'Fallback Ready (Local Spatial Active)',
      statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'Powers spatial route corridor buffering, user CRM persistence, and permit searches. The app currently runs on the built-in Turf.js & in-memory PostGIS-compatible engine.',
      envVars: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
      actionTip: 'Execute schema.sql in Supabase SQL editor, then paste your credentials into .env.local'
    },
    {
      id: 'gemini',
      name: 'Google Gemini AI (gemini-2.5-flash)',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      status: 'Engine Active (Heuristic + Gemini Ready)',
      statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description: 'Generates deep estimator flash summaries, key equipment callouts, and multi-trade classifications. Built-in classifier is active, and Gemini API is ready when key is provided.',
      envVars: ['GEMINI_API_KEY'],
      actionTip: 'Set GEMINI_API_KEY in .env.local to enable real-time Gemini 2.5 Flash permit analysis'
    },
    {
      id: 'stripe',
      name: 'Stripe Monetization (Okanagan Hub)',
      icon: <CreditCard className="w-5 h-5 text-blue-400" />,
      status: 'Sandbox Simulation Active',
      statusColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      description: 'Handles recurring monthly subscriptions for Tier 1 Solo ($129), Tier 2 Pro/Scout ($199), and Tier 3 Supplier ($499). Sandbox simulation allows instant testing of all tiers.',
      envVars: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
      actionTip: 'Set STRIPE_SECRET_KEY in .env.local to connect to live or test Stripe Checkout'
    },
    {
      id: 'resend',
      name: 'Resend Transactional Email (6 AM Digests)',
      icon: <Mail className="w-5 h-5 text-purple-400" />,
      status: 'Interactive Previewer Active',
      statusColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description: 'Automated 6:00 AM daily permit intelligence alerts. The app renders full interactive HTML previews in-app and dispatches live emails when Resend API key is present.',
      envVars: ['RESEND_API_KEY'],
      actionTip: 'Set RESEND_API_KEY in .env.local to send real emails to your inbox every morning'
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="integrations-modal-title"
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden my-auto max-h-[90vh] flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
                SYSTEM CONFIGURATION
              </span>
              <h2 id="integrations-modal-title" className="text-lg font-extrabold text-white">
                Cloud & API Integrations Status
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Build Permit Pro is architected to run completely autonomous out-of-the-box, with plug-and-play cloud expansion.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Integrations */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {integrations.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4.5 transition-all hover:border-slate-600"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-700">
                    {item.icon}
                  </div>
                  <h3 className="font-extrabold text-sm text-white">{item.name}</h3>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${item.statusColor} self-start sm:self-auto`}
                >
                  {item.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mt-2">{item.description}</p>

              <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
                  <span>Env:</span>
                  {item.envVars.map((v) => (
                    <code key={v} className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 border border-slate-700">
                      {v}
                    </code>
                  ))}
                </div>

                <div className="text-[11px] text-brand-400 font-semibold">{item.actionTip}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Config file: <strong>.env.local</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
