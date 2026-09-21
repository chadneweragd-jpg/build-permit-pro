'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Kanban,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Clock,
  Phone,
  Mail,
  Building,
  HardHat,
  MapPin,
  Route,
  ChevronRight,
  X,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Trash2,
  ExternalLink,
  Edit3,
  Sliders,
  TrendingUp,
  Briefcase
} from 'lucide-react';
import { CRMDeal, DealStage, Permit } from '@/types';
import { CRMRepository, DEAL_STAGES } from '@/lib/crm-repo';
import { PermitsRepository } from '@/lib/permits-repo';

export default function PipelinePage() {
  const router = useRouter();
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<string>('all');
  const [selectedDeal, setSelectedDeal] = useState<CRMDeal | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

  // Edit Drawer Form State
  const [editQuoteAmount, setEditQuoteAmount] = useState<string>('');
  const [editStage, setEditStage] = useState<DealStage>('watched');
  const [editFollowUpDate, setEditFollowUpDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editGC, setEditGC] = useState<string>('');
  const [editContactName, setEditContactName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // New Deal Modal State
  const [newDealPermitId, setNewDealPermitId] = useState<string>('');
  const [newDealAddress, setNewDealAddress] = useState<string>('');
  const [newDealGC, setNewDealGC] = useState<string>('');
  const [newDealTrade, setNewDealTrade] = useState<string>('Electrical');
  const [newDealStage, setNewDealStage] = useState<DealStage>('watched');
  const [newDealQuote, setNewDealQuote] = useState<string>('');
  const [newDealNotes, setNewDealNotes] = useState<string>('');

  const allPermits = useMemo(() => PermitsRepository.getAllPermits(), []);

  // Fetch Deals
  useEffect(() => {
    const loadDeals = async () => {
      setIsLoading(true);
      try {
        const data = await CRMRepository.fetchDealsFromSupabase();
        setDeals(data);
      } catch (err) {
        console.error('Error loading deals:', err);
        setDeals(CRMRepository.getDeals());
      } finally {
        setIsLoading(false);
      }
    };

    loadDeals();
  }, []);

  // Filter Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchesSearch =
        !searchQuery.trim() ||
        deal.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (deal.permit_number && deal.permit_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (deal.general_contractor && deal.general_contractor.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTrade =
        selectedTrade === 'all' ||
        deal.subtrade_category.toLowerCase().includes(selectedTrade.toLowerCase());

      return matchesSearch && matchesTrade;
    });
  }, [deals, searchQuery, selectedTrade]);

  // Grouped by stage
  const groupedDeals = useMemo(() => {
    return CRMRepository.getDealsByStage(filteredDeals);
  }, [filteredDeals]);

  // Metrics
  const metrics = useMemo(() => {
    return CRMRepository.getPipelineMetrics(filteredDeals);
  }, [filteredDeals]);

  // Check if date is past due
  const isPastDue = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
  };

  // Open Edit Drawer
  const handleOpenDrawer = (deal: CRMDeal) => {
    setSelectedDeal(deal);
    setEditQuoteAmount(deal.quote_amount ? deal.quote_amount.toString() : '');
    setEditStage(deal.stage);
    setEditFollowUpDate(deal.follow_up_date || '');
    setEditNotes(deal.notes || '');
    setEditGC(deal.general_contractor || '');
    setEditContactName(deal.contact_name || '');
    setEditPhone(deal.contact_phone || '');
    setEditEmail(deal.contact_email || '');
    setNewNoteText('');
    setIsDrawerOpen(true);
  };

  // Quick Change Stage (from card dropdown or drag-and-drop)
  const handleStageChange = async (dealId: string, newStage: DealStage) => {
    const updated = await CRMRepository.updateDealStage(dealId, newStage);
    if (updated) {
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)));
      if (selectedDeal && selectedDeal.id === dealId) {
        setSelectedDeal((prev) => (prev ? { ...prev, stage: newStage } : null));
        setEditStage(newStage);
      }
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('text/plain') || draggedDealId;
    if (dealId) {
      await handleStageChange(dealId, targetStage);
    }
    setDraggedDealId(null);
  };

  // Save Drawer Changes
  const handleSaveDrawer = async () => {
    if (!selectedDeal) return;

    let finalNotes = editNotes;
    if (newNoteText.trim()) {
      const timestamp = new Date().toLocaleString('en-CA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const noteEntry = `[${timestamp}] ${newNoteText.trim()}`;
      finalNotes = finalNotes ? `${finalNotes}\n\n${noteEntry}` : noteEntry;
    }

    const updates: Partial<CRMDeal> = {
      quote_amount: parseFloat(editQuoteAmount) || 0,
      stage: editStage,
      follow_up_date: editFollowUpDate || null,
      notes: finalNotes,
      general_contractor: editGC,
      contact_name: editContactName,
      contact_phone: editPhone,
      contact_email: editEmail
    };

    const updated = await CRMRepository.updateDeal(selectedDeal.id, updates);
    if (updated) {
      setDeals((prev) => prev.map((d) => (d.id === selectedDeal.id ? updated : d)));
      setSelectedDeal(updated);
      setEditNotes(finalNotes);
      setNewNoteText('');
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 2500);
    }
  };

  // Delete Deal
  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to remove this deal from your pipeline?')) return;
    const ok = await CRMRepository.deleteDeal(dealId);
    if (ok) {
      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      setIsDrawerOpen(false);
      setSelectedDeal(null);
    }
  };

  // Create Manual Deal
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealAddress.trim()) {
      alert('Please enter an address');
      return;
    }

    let deal: CRMDeal;
    if (newDealPermitId) {
      const permit = allPermits.find((p) => p.id === newDealPermitId);
      if (permit) {
        deal = await CRMRepository.createDealFromPermit(
          permit,
          newDealStage,
          parseFloat(newDealQuote) || 0,
          newDealNotes
        );
      } else {
        deal = await CRMRepository.createManualDeal({
          address: newDealAddress,
          general_contractor: newDealGC,
          subtrade_category: newDealTrade,
          stage: newDealStage,
          quote_amount: parseFloat(newDealQuote) || 0,
          notes: newDealNotes
        });
      }
    } else {
      deal = await CRMRepository.createManualDeal({
        address: newDealAddress,
        general_contractor: newDealGC,
        subtrade_category: newDealTrade,
        stage: newDealStage,
        quote_amount: parseFloat(newDealQuote) || 0,
        notes: newDealNotes
      });
    }

    setDeals((prev) => [deal, ...prev]);
    setIsNewDealModalOpen(false);
    setNewDealAddress('');
    setNewDealGC('');
    setNewDealQuote('');
    setNewDealNotes('');
  };

  // Populate from permit selection in modal
  const handleSelectPermitForNewDeal = (permitId: string) => {
    setNewDealPermitId(permitId);
    const p = allPermits.find((item) => item.id === permitId);
    if (p) {
      setNewDealAddress(p.address);
      setNewDealGC(p.contractor_name || '');
      setNewDealTrade(p.trades?.[0]?.name || 'Electrical');
      setNewDealQuote(Math.round(p.estimated_value * 0.15).toString());
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header & Metrics Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-600/20">
                <Kanban className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Quotes & Deals Pipeline
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track contractor quotes, site measures, and awarded bids across Kelowna & Okanagan Hub
                </p>
              </div>
            </div>
          </div>

          {/* Top Actions: Search, Filter, + Add Deal */}
          <div className="flex items-center space-x-3">
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals, address, GC..."
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <button
              onClick={() => setIsNewDealModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Deal</span>
            </button>
          </div>
        </div>

        {/* Pipeline Summary KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Total Active Deals</span>
              <Briefcase className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {metrics.totalDeals}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Pipeline Volume</span>
              <DollarSign className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
              ${(metrics.totalPipelineValue / 1000).toFixed(0)}k CAD
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Quotes Out</span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
              ${(metrics.stageValues.quoted / 1000).toFixed(0)}k CAD ({metrics.stageCounts.quoted})
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Won & Booked</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ${(metrics.wonValue / 1000).toFixed(0)}k CAD ({metrics.wonCount})
            </p>
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex items-start space-x-4 min-w-[1280px] pb-6">
          {DEAL_STAGES.map((col) => {
            const columnDeals = groupedDeals[col.key] || [];
            const colTotal = columnDeals.reduce((sum, d) => sum + (d.quote_amount || 0), 0);

            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`w-80 shrink-0 flex flex-col rounded-2xl border transition-colors ${col.bgLight} ${col.borderLight} min-h-[600px]`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-inherit flex items-center justify-between bg-white/40 dark:bg-slate-900/40 rounded-t-2xl">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white tracking-tight">
                        {col.label}
                      </span>
                      <span className={`text-[11px] font-black px-1.5 py-0.2 rounded ${col.badgeBg} ${col.badgeText}`}>
                        {columnDeals.length}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      {columnDeals.length} Quotes &bull; ${colTotal.toLocaleString('en-CA')} CAD
                    </p>
                  </div>
                </div>

                {/* Column Cards Drop Area */}
                <div className="p-3 flex-1 space-y-3 overflow-y-auto">
                  {columnDeals.map((deal) => {
                    const pastDue = isPastDue(deal.follow_up_date);

                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => handleOpenDrawer(deal)}
                        className="group bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
                      >
                        {/* Address & Permit Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {deal.address}
                            </h3>
                            {deal.permit_number && (
                              <span className="inline-block mt-0.5 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {deal.permit_number}
                              </span>
                            )}
                          </div>

                          {/* Quick Stage Mover Dropdown */}
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          >
                            <select
                              value={deal.stage}
                              onChange={(e) => handleStageChange(deal.id, e.target.value as DealStage)}
                              className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              {DEAL_STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.shortLabel}
                                </option>
                              ))}
                            </select>
                          </div>
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
                                pastDue
                                  ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse'
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
                  })}

                  {columnDeals.length === 0 && (
                    <div className="h-32 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                      <p>Drag deals here</p>
                      <span className="text-[10px] text-slate-400">or use card dropdown</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slideout Card Details Drawer */}
      {isDrawerOpen && selectedDeal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {selectedDeal.permit_number || 'BP-DEAL'}
                    </span>
                    <span className="text-xs font-bold text-slate-400">&bull;</span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {selectedDeal.subtrade_category}
                    </span>
                  </div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedDeal.address}
                  </h2>
                  <p className="text-xs text-slate-500">{selectedDeal.project_name}</p>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {saveSuccessToast && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold">Deal updated successfully!</span>
                  </div>
                )}

                {/* Stage & Quote Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pipeline Stage
                    </label>
                    <select
                      value={editStage}
                      onChange={(e) => setEditStage(e.target.value as DealStage)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {DEAL_STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quote Amount ($ CAD)
                    </label>
                    <input
                      type="number"
                      value={editQuoteAmount}
                      onChange={(e) => setEditQuoteAmount(e.target.value)}
                      placeholder="e.g. 85000"
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Follow-up Reminder */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Follow-up Reminder Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={editFollowUpDate}
                      onChange={(e) => setEditFollowUpDate(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {isPastDue(editFollowUpDate) && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500">
                        PAST DUE
                      </span>
                    )}
                  </div>
                </div>

                {/* General Contractor & Contacts */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                  <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <HardHat className="w-3.5 h-3.5 text-blue-500" />
                    <span>Contractor & Contact Info</span>
                  </h3>

                  <div>
                    <label className="text-[10px] text-slate-400">General Contractor</label>
                    <input
                      type="text"
                      value={editGC}
                      onChange={(e) => setEditGC(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white mt-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400">Contact Person</label>
                      <input
                        type="text"
                        value={editContactName}
                        onChange={(e) => setEditContactName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Phone</label>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-white mt-0.5"
                      />
                    </div>
                  </div>

                  {editPhone && (
                    <div className="flex items-center space-x-2 pt-1">
                      <a
                        href={`tel:${editPhone.replace(/[^0-9]/g, '')}`}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call {editPhone}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Notes History */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Activity & Notes Log
                  </label>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-300 mb-2">
                    {editNotes || 'No notes logged yet.'}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Add timestamped note..."
                      className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSaveDrawer}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs"
                    >
                      Add Note
                    </button>
                  </div>
                </div>

                {/* In-App Direct Actions */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Field Actions (100% In-App)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        router.push(`/search?permitId=${selectedDeal.permit_id || selectedDeal.permit_number}`);
                      }}
                      className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>View on Map</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        router.push(`/routes/builder?destination=${selectedDeal.permit_id || selectedDeal.permit_number}`);
                      }}
                      className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-sm"
                    >
                      <Route className="w-3.5 h-3.5" />
                      <span>Drive Mode</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                <button
                  onClick={() => handleDeleteDeal(selectedDeal.id)}
                  className="flex items-center space-x-1 text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Deal</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDrawer}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Deal Modal */}
      {isNewDealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Add New Pipeline Deal
                </h3>
              </div>
              <button
                onClick={() => setIsNewDealModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pick from Active Kelowna Permits (Optional)
                </label>
                <select
                  value={newDealPermitId}
                  onChange={(e) => handleSelectPermitForNewDeal(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose a permit or enter custom below --</option>
                  {allPermits.slice(0, 25).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.permit_number} - {p.address} (${(p.estimated_value / 1000).toFixed(0)}k)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Job Site Address *
                </label>
                <input
                  type="text"
                  required
                  value={newDealAddress}
                  onChange={(e) => setNewDealAddress(e.target.value)}
                  placeholder="e.g. 1480 Skyland Drive, Kelowna, BC"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    General Contractor
                  </label>
                  <input
                    type="text"
                    value={newDealGC}
                    onChange={(e) => setNewDealGC(e.target.value)}
                    placeholder="e.g. Ledcor, AuthenTech"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subtrade Category
                  </label>
                  <input
                    type="text"
                    value={newDealTrade}
                    onChange={(e) => setNewDealTrade(e.target.value)}
                    placeholder="e.g. Electrical, Framing"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Stage
                  </label>
                  <select
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value as DealStage)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Quote Amount ($ CAD)
                  </label>
                  <input
                    type="number"
                    value={newDealQuote}
                    onChange={(e) => setNewDealQuote(e.target.value)}
                    placeholder="e.g. 75000"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Scope Notes
                </label>
                <textarea
                  rows={2}
                  value={newDealNotes}
                  onChange={(e) => setNewDealNotes(e.target.value)}
                  placeholder="Key deliverables, meeting notes, or specs..."
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewDealModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
                >
                  Add to Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
