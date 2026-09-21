'use client';

import React, { useState, useEffect } from 'react';
import { CRMStatus, Permit, UserPermitStatus } from '@/types';
import { PermitsRepository } from '@/lib/permits-repo';
import {
  Download,
  Filter,
  KanbanSquare,
  Plus,
  Clock,
  DollarSign,
  ChevronRight,
  Trash2,
  Calendar,
  Building,
  CheckCircle2
} from 'lucide-react';

interface ContractorCRMProps {
  permits: Permit[];
  onInspectPermit: (permit: Permit) => void;
}

const CRM_STAGES: { key: CRMStatus; label: string; color: string; bg: string }[] = [
  { key: 'New', label: 'New Leads', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { key: 'Under Review', label: 'Under Review', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { key: 'Site Visited', label: 'Site Visited', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  { key: 'Quote Sent', label: 'Quote Sent', color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  { key: 'Won', label: 'Won / Awarded', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { key: 'Lost', label: 'Lost / Closed', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-300' }
];

export const ContractorCRM: React.FC<ContractorCRMProps> = ({ permits, onInspectPermit }) => {
  const [crmStatuses, setCrmStatuses] = useState<Record<string, UserPermitStatus>>({});
  const [activeFilterStage, setActiveFilterStage] = useState<string>('all');

  const refreshCRM = () => {
    setCrmStatuses(PermitsRepository.getCRMStatuses());
  };

  useEffect(() => {
    refreshCRM();
  }, []);

  const getStatusForPermit = (permitId: string): CRMStatus => {
    return crmStatuses[permitId]?.status || 'New';
  };

  const handleStageChange = (permitId: string, newStage: CRMStatus) => {
    PermitsRepository.updateCRMStatus(permitId, newStage);
    refreshCRM();
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = [
      'Permit Number',
      'Address',
      'Work Class',
      'Estimated Value CAD',
      'CRM Pipeline Status',
      'Estimated Quote Bid CAD',
      'Reminder Date',
      'Private Estimator Notes',
      'General Contractor',
      'Primary Subtrades'
    ];

    const rows = permits.map((p) => {
      const crm = crmStatuses[p.id] || { status: 'New', notes: '', estimated_bid: 0, reminder_date: '' };
      const tradesStr = p.trades.map((t) => t.name).join('; ');
      return [
        `"${p.permit_number}"`,
        `"${p.address.replace(/"/g, '""')}"`,
        `"${p.work_class}"`,
        p.estimated_value,
        `"${crm.status}"`,
        crm.estimated_bid || 0,
        `"${crm.reminder_date || ''}"`,
        `"${(crm.notes || '').replace(/"/g, '""')}"`,
        `"${(p.contractor_name || '').replace(/"/g, '""')}"`,
        `"${tradesStr}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bpp_contractor_pipeline_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate totals across all CRM tracked jobs
  const totalPipelineVal = permits.reduce((acc, p) => acc + (p.estimated_value || 0), 0);
  const formattedPipelineTotal = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0
  }).format(totalPipelineVal);

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden h-[calc(100vh-4rem)]">
      {/* Top CRM Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <KanbanSquare className="w-5 h-5 text-brand-600" />
            <h2 className="font-extrabold text-lg text-slate-900">Contractor Pipeline & Mini-CRM</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track bidding progress from initial permit issue to won contracts in the Okanagan Hub.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right mr-2 hidden sm:block">
            <span className="text-[11px] text-slate-400 block font-semibold">Total Monitored Value</span>
            <span className="text-sm font-black text-emerald-600">{formattedPipelineTotal}</span>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex space-x-4 min-w-[1280px] h-full pb-4">
          {CRM_STAGES.map((stage) => {
            const stagePermits = permits.filter((p) => getStatusForPermit(p.id) === stage.key);
            const stageTotalVal = stagePermits.reduce((acc, p) => acc + (p.estimated_value || 0), 0);
            const formattedStageVal = new Intl.NumberFormat('en-CA', {
              style: 'currency',
              currency: 'CAD',
              maximumFractionDigits: 0
            }).format(stageTotalVal);

            return (
              <div
                key={stage.key}
                className="w-80 flex-shrink-0 flex flex-col bg-slate-200/70 rounded-2xl border border-slate-300/80 overflow-hidden"
              >
                {/* Stage Column Header */}
                <div className={`p-3.5 border-b ${stage.bg} flex items-center justify-between`}>
                  <div>
                    <span className={`text-xs font-black uppercase tracking-wider ${stage.color}`}>
                      {stage.label}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold ml-2">
                      ({stagePermits.length})
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">
                    {formattedStageVal}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {stagePermits.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
                      No permits in {stage.label}
                    </div>
                  ) : (
                    stagePermits.map((permit) => {
                      const crm = crmStatuses[permit.id];
                      return (
                        <div
                          key={permit.id}
                          onClick={() => onInspectPermit(permit)}
                          className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                          {/* Card Top */}
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                              {permit.permit_number}
                            </span>
                            <span className="text-xs font-black text-emerald-700">
                              ${(permit.estimated_value / 1000000).toFixed(1)}M
                            </span>
                          </div>

                          {/* Address & Scope */}
                          <h4 className="font-bold text-xs text-slate-900 mt-2 leading-snug group-hover:text-brand-600 transition-colors">
                            {permit.address}
                          </h4>

                          {/* Estimator Bid if set */}
                          {crm?.estimated_bid && (
                            <div className="mt-1.5 flex items-center space-x-1 text-[11px] font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                              <DollarSign className="w-3 h-3" />
                              <span>Quote Bid: ${new Intl.NumberFormat('en-CA').format(crm.estimated_bid)}</span>
                            </div>
                          )}

                          {/* Follow up reminder */}
                          {crm?.reminder_date && (
                            <div className="mt-1.5 flex items-center space-x-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Calendar className="w-3 h-3" />
                              <span>Follow up: {crm.reminder_date}</span>
                            </div>
                          )}

                          {/* Notes snippet */}
                          {crm?.notes && (
                            <p className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 italic line-clamp-2">
                              "{crm.notes}"
                            </p>
                          )}

                          {/* Trade Pills */}
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {permit.trades.slice(0, 2).map((t) => (
                              <span
                                key={t.subtrade_key}
                                style={{ color: t.color, backgroundColor: `${t.color}15` }}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>

                          {/* Quick Stage Mover Dropdown */}
                          <div
                            className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] text-slate-400 font-medium">Move Stage:</span>
                            <select
                              value={stage.key}
                              onChange={(e) => handleStageChange(permit.id, e.target.value as CRMStatus)}
                              className="bg-slate-100 text-[11px] font-bold text-slate-700 rounded px-2 py-0.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                              {CRM_STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
