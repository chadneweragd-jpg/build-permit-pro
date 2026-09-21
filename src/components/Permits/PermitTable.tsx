'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Permit } from '@/types';
import { Plus, MapPin } from 'lucide-react';

interface PermitTableProps {
  permits: Permit[];
  onAddToRoute: (permit: Permit) => void;
}

export function PermitTable({ permits, onAddToRoute }: PermitTableProps) {
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 font-extrabold uppercase text-[10px]">
              <th className="py-3.5 px-4">Permit #</th>
              <th className="py-3.5 px-4">Address & City</th>
              <th className="py-3.5 px-4">Work Class</th>
              <th className="py-3.5 px-4">Estimated Value</th>
              <th className="py-3.5 px-4">General Contractor</th>
              <th className="py-3.5 px-4">Subtrades</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {permits.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No permits match your criteria.
                </td>
              </tr>
            ) : (
              permits.map((p) => {
                const valStr = new Intl.NumberFormat('en-CA', {
                  style: 'currency',
                  currency: 'CAD',
                  maximumFractionDigits: 0
                }).format(p.estimated_value);

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/search?permitId=${p.id}`)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {p.permit_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.address}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {p.city_region || 'Kelowna'} &bull; Issued {p.issue_date}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {p.work_class}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-emerald-600 dark:text-emerald-400">
                      {valStr}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {p.contractor_name || 'Not Listed'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {p.trades.slice(0, 2).map((t) => (
                          <span
                            key={t.subtrade_key}
                            style={{ color: t.color, backgroundColor: `${t.color}15` }}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td
                      className="py-3.5 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onAddToRoute(p)}
                          title="Add to Active Route"
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => router.push(`/search?permitId=${p.id}`)}
                          title="View on Map (In-App)"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-all flex items-center space-x-1 font-bold text-[11px]"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-500 group-hover:text-white" />
                          <span>View on Map</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default PermitTable;
