'use client';

import React, { useState } from 'react';
import { Calendar, AlertCircle, Clock, CheckCircle2, CalendarDays } from 'lucide-react';
import { CRMDeal, DealStage } from '@/types';
import { DEAL_STAGES, CRMRepository } from '@/lib/crm-repo';

interface DealCardProps {
  deal: CRMDeal;
  onDragStart?: (e: React.DragEvent, dealId: string) => void;
  onClick?: (deal: CRMDeal) => void;
  onStageChange?: (dealId: string, newStage: DealStage) => void;
  onUpdateFollowUp?: (dealId: string, newDate: string, updatedStage?: DealStage) => void;
}

export const DealCard: React.FC<DealCardProps> = ({
  deal,
  onDragStart,
  onClick,
  onStageChange,
  onUpdateFollowUp
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Check if the card is overdue
  const isOverdue = Boolean(
    deal.follow_up_date &&
    new Date(deal.follow_up_date) < new Date() &&
    deal.stage !== 'won' &&
    (deal.stage as string) !== 'lost'
  );

  const handleOverdueAction = async (action: 'contacted' | 'snooze_3d' | 'reschedule_next_week') => {
    setIsUpdating(true);
    let nextDate = '';
    let nextStage: DealStage | undefined = undefined;

    const now = new Date();
    if (action === 'contacted') {
      nextStage = deal.stage === 'watched' ? 'visited' : deal.stage === 'visited' ? 'estimating' : 'quoted';
      nextDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (action === 'snooze_3d') {
      nextDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else if (action === 'reschedule_next_week') {
      nextDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    try {
      await CRMRepository.updateDeal(deal.id, {
        follow_up_date: nextDate,
        ...(nextStage ? { stage: nextStage } : {})
      });
      if (onUpdateFollowUp) {
        onUpdateFollowUp(deal.id, nextDate, nextStage);
      }
    } finally {
      setIsUpdating(false);
      setIsPopoverOpen(false);
    }
  };

  return (
    <div
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => onDragStart?.(e, deal.id)}
      onClick={() => onClick?.(deal)}
      className={`relative p-4 rounded-xl transition-all cursor-pointer ${
        isOverdue
          ? 'border-2 border-red-500 bg-red-50/60 dark:bg-red-950/40 shadow-lg shadow-red-500/10'
          : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md'
      }`}
    >
      {/* Overdue Alert Badge & Quick-Action Popover */}
      {isOverdue && (
        <div className="absolute -top-2.5 right-3 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsPopoverOpen(!isPopoverOpen);
            }}
            className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95 animate-pulse hover:animate-none"
            title="Click to take instant follow-up action"
          >
            <span>⚠️ Overdue Follow-Up</span>
          </button>

          {isPopoverOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full right-0 mt-1.5 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-red-200 dark:border-red-900/60 p-2 z-40 text-xs animate-in fade-in zoom-in-95"
            >
              <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 border-b border-slate-100 dark:border-slate-800 mb-1.5 flex items-center justify-between">
                <span>Quick Follow-Up Action</span>
                <button
                  type="button"
                  onClick={() => setIsPopoverOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleOverdueAction('contacted')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div>
                    <span>Contacted / Advance Stage</span>
                    <span className="block text-[10px] font-normal text-slate-400">Moves deal & sets +5d follow-up</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleOverdueAction('snooze_3d')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div>
                    <span>Snooze 3 Days</span>
                    <span className="block text-[10px] font-normal text-slate-400">Pushes follow-up date by +3 days</span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleOverdueAction('reschedule_next_week')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <div>
                    <span>Reschedule Next Week</span>
                    <span className="block text-[10px] font-normal text-slate-400">Pushes follow-up date by +7 days</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Address & Permit Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className={`font-bold text-xs truncate transition-colors ${
              isOverdue
                ? 'text-red-700 dark:text-red-300'
                : 'text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }`}
          >
            {deal.address}
          </h3>

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
