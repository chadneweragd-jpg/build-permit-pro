'use client';

import React from 'react';
import { Permit } from '@/types';
import { MapPin, Calendar, DollarSign, ChevronRight, Star } from 'lucide-react';

interface PermitCardProps {
  permit: Permit;
  isSelected: boolean;
  onSelect: (permit: Permit) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (permitId: string, e: React.MouseEvent) => void;
}

export const PermitCard: React.FC<PermitCardProps> = ({
  permit,
  isSelected,
  onSelect,
  isFavorite = false,
  onToggleFavorite
}) => {
  const formattedVal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(permit.estimated_value);

  return (
    <div
      onClick={() => onSelect(permit)}
      className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${
        isSelected
          ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-400'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
      }`}
    >
      {/* Top Row: Permit #, Valuation, Favorite */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
            {permit.permit_number}
          </span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {permit.city_region || 'Kelowna'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            {formattedVal}
          </span>
          {onToggleFavorite && (
            <button
              onClick={(e) => onToggleFavorite(permit.id, e)}
              className="p-1 rounded-lg text-slate-300 hover:text-amber-400 dark:hover:text-amber-300 transition-colors"
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Address */}
      <h3 className="text-xs font-bold text-slate-900 dark:text-white mt-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {permit.address}
      </h3>

      {/* Permit Type & Issue Date */}
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="truncate max-w-[180px] font-medium">{permit.permit_type}</span>
        <span className="shrink-0">{permit.issue_date}</span>
      </div>

      {/* Trade Tags (Small Color Chips) */}
      {permit.trades.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {permit.trades.slice(0, 3).map((trade) => (
            <span
              key={trade.subtrade_key}
              style={{
                backgroundColor: `${trade.color}15`,
                color: trade.color,
                borderColor: `${trade.color}35`
              }}
              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border"
            >
              {trade.name}
            </span>
          ))}
          {permit.trades.length > 3 && (
            <span className="text-[9px] font-bold text-slate-400 self-center">
              +{permit.trades.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
