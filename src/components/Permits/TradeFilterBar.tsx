'use client';

import React from 'react';
import { SUBTRADES_CATALOG } from '@/lib/trades-data';
import { SubtradeKey, WorkClass } from '@/types';
import { Search, Filter, DollarSign, X, Check, Flame, Zap, Home, Layers, DoorOpen, Maximize, Hammer, Box } from 'lucide-react';

interface TradeFilterBarProps {
  selectedTrades: SubtradeKey[];
  setSelectedTrades: (trades: SubtradeKey[]) => void;
  minValue: number;
  setMinValue: (val: number) => void;
  selectedWorkClasses: WorkClass[];
  setSelectedWorkClasses: (classes: WorkClass[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isHeatmapVisible: boolean;
  setIsHeatmapVisible: (visible: boolean) => void;
  isScoutActive: boolean;
}

const TRADE_ICONS: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-3.5 h-3.5" />,
  Flame: <Flame className="w-3.5 h-3.5" />,
  Home: <Home className="w-3.5 h-3.5" />,
  Layers: <Layers className="w-3.5 h-3.5" />,
  DoorOpen: <DoorOpen className="w-3.5 h-3.5" />,
  Maximize: <Maximize className="w-3.5 h-3.5" />,
  Hammer: <Hammer className="w-3.5 h-3.5" />,
  Box: <Box className="w-3.5 h-3.5" />
};

export const TradeFilterBar: React.FC<TradeFilterBarProps> = ({
  selectedTrades,
  setSelectedTrades,
  minValue,
  setMinValue,
  selectedWorkClasses,
  setSelectedWorkClasses,
  searchQuery,
  setSearchQuery,
  isHeatmapVisible,
  setIsHeatmapVisible,
  isScoutActive
}) => {
  const toggleTrade = (tradeKey: SubtradeKey) => {
    if (selectedTrades.includes(tradeKey)) {
      setSelectedTrades(selectedTrades.filter((k) => k !== tradeKey));
    } else {
      setSelectedTrades([...selectedTrades, tradeKey]);
    }
  };

  const toggleWorkClass = (wc: WorkClass) => {
    if (selectedWorkClasses.includes(wc)) {
      setSelectedWorkClasses(selectedWorkClasses.filter((c) => c !== wc));
    } else {
      setSelectedWorkClasses([...selectedWorkClasses, wc]);
    }
  };

  const formatVal = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M+`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}k+`;
    return 'All Values';
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input & Valuation filter */}
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Kelowna permits (e.g. Ellis St, LED, warehouse, 400A)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Min Valuation Slider Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-slate-700">{formatVal(minValue)}</span>
            <input
              type="range"
              min="0"
              max="20000000"
              step="500000"
              value={minValue}
              onChange={(e) => setMinValue(Number(e.target.value))}
              className="w-24 accent-brand-600 cursor-pointer"
            />
          </div>

          {/* Heatmap Layer Toggle */}
          <button
            onClick={() => setIsHeatmapVisible(!isHeatmapVisible)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isHeatmapVisible
                ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isHeatmapVisible ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>Valuation Heatmap</span>
            {isScoutActive && isHeatmapVisible && (
              <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded font-mono">DIMMED</span>
            )}
          </button>
        </div>

        {/* Work Class Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0">
          {(['Commercial', 'Industrial', 'Residential', 'Institutional'] as WorkClass[]).map((wc) => {
            const isSelected = selectedWorkClasses.includes(wc);
            return (
              <button
                key={wc}
                onClick={() => toggleWorkClass(wc)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {wc}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtrade Pills Bar */}
      <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap mr-1">
          Trades:
        </span>
        {Object.values(SUBTRADES_CATALOG).map((trade) => {
          const isSelected = selectedTrades.includes(trade.key);
          const icon = TRADE_ICONS[trade.icon] || <Zap className="w-3.5 h-3.5" />;

          return (
            <button
              key={trade.key}
              onClick={() => toggleTrade(trade.key)}
              style={{
                borderColor: isSelected ? trade.color : '#e2e8f0',
                backgroundColor: isSelected ? `${trade.color}15` : '#ffffff',
                color: isSelected ? trade.color : '#475569'
              }}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                isSelected ? 'ring-1 shadow-sm' : 'hover:border-slate-300'
              }`}
            >
              <span style={{ color: trade.color }}>{icon}</span>
              <span>{trade.name}</span>
              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
        {selectedTrades.length > 0 && (
          <button
            onClick={() => setSelectedTrades([])}
            className="text-[11px] font-semibold text-slate-400 hover:text-red-500 whitespace-nowrap underline px-1"
          >
            Clear Trades
          </button>
        )}
      </div>
    </div>
  );
};
