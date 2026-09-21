'use client';

import React from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { CRMDeal, DealStage } from '@/types';
import { DEAL_STAGES } from '@/lib/crm-repo';

interface DealCardProps {
  deal: CRMDeal;
  onDragStart?: (e: React.DragEvent, dealId: string) => void;
  onClick?: (deal: CRMDeal) => void;
  onStageChange?: (dealId: string, newStage: DealStage) => void;
}

export const DealCard: React.FC<DealCardProps> = ({
  deal,
  onDragStart,
  onClick,
  onStageChange
}) => {
  // Check if the card is overdue
  const isOverdue = Boolean(
    deal.follow_up_date &&
    new Date(deal.follow_up_date) < new Date() &&
    deal.stage !== 'won' &&
    (deal.stage as string) !== 'lost'
  );

  return (
    <div
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => onDragStart?.(e, deal.id)}
      onClick={() => onClick?.(deal)}
      className={`group rounded-xl p-3.5 border transition-all cursor-pointer relative ${
        isOverdue
          ? 'bg-red-50/80 dark:bg-red-950/30 border-red-500 dark:border-red-500 shadow-lg shadow-red-500/20 ring-2 ring-red-500/60 dark:ring-red-500/50 animate-pulse'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Address & Permit Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <h3
              className={`font-bold text-xs truncate transition-colors ${
                isOverdue
                  ? 'text-red-700 dark:text-red-300 group-hover:text-red-800 dark:group-hover:text-red-200'
                  : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
              }`}
            >
              {deal.address}
            </h3>

            {isOverdue && (
              <span className="inline-flex items-center space-x-0.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-red-600 text-white shadow-xs">
                <AlertCircle className="w-2.5 h-2.5" />
                <span>Overdue</span>
              </span>
            )}
          </div>

          {deal.permit_number && (
            <span className="inline-block mt-1 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {deal.permit_number}
            </span>
          )}
        </div>

        {/* Quick Stage Mover Dropdown */}
        {onStageChange && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <select
              value={deal.stage}
              onChange={(e) => onStageChange(deal.id, e.target.value as DealStage)}
              className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {DEAL_STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.shortLabel}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Trade Tag & Quote Value */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
          {deal.subtrade_category}
        </span>
        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
          ${deal.quote_amount.toLocaleString('en-CA')} CAD
        </span>
      </div>

      {/* GC Contact & Follow-up Date */}
      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="truncate max-w-[140px]">
          {deal.general_contractor || 'General Contractor'}
        </span>

        {deal.follow_up_date && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 ${
              isOverdue
                ? 'bg-red-600 text-white font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>{deal.follow_up_date.substring(5)}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default DealCard;
