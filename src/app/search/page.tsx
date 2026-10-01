'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PermitsRepository } from '@/lib/permits-repo';
import { RoutesRepository } from '@/lib/routes-repo';
import { Permit } from '@/types';
import { FilterBar } from '@/components/Search/FilterBar';
import { PermitCard } from '@/components/Search/PermitCard';
import { PermitDetailsSheet } from '@/components/Search/PermitDetailsSheet';
import { ArrowUpDown, Search as SearchIcon, CheckCircle2, LayoutList, AlignJustify, Car, Phone, PhoneOff, MapPin, Navigation, Compass } from 'lucide-react';
import { getSelectedCityId, getActiveCityConfig } from '@/lib/cities';

// Dynamically import MapContainer with ssr: false as required
const MapContainer = dynamic(
  () => import('@/components/map/MapContainer'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-900 text-slate-400">
        <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-300">Loading MapLibre Vector Engine...</p>
      </div>
    )
  }
);

function SearchExplorerContent() {
  const searchParams = useSearchParams();
  const permitIdParam = searchParams.get('permitId');
  const cityParam = searchParams.get('city');

  const [activeCityId, setActiveCityId] = useState<string>(cityParam || 'kelowna');
  const [permitsList, setPermitsList] = useState<Permit[]>(PermitsRepository.getAllPermits());

  useEffect(() => {
    document.title = 'Permit Intel | BuildPermitPro';
    if (cityParam) {
      setActiveCityId(cityParam);
    } else {
      setActiveCityId(getSelectedCityId());
    }

    const handleCityChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ cityId: string }>;
      if (customEvent.detail?.cityId) {
        setActiveCityId(customEvent.detail.cityId);
      }
    };

    window.addEventListener('bpp:city-change', handleCityChange);
    return () => window.removeEventListener('bpp:city-change', handleCityChange);
  }, []);

  // Exact Uncapped City Count State
  const [exactCityCount, setExactCityCount] = useState<number | null>(null);

  // Fetch live permits for activeCityId from Supabase via API & retrieve exact uncapped counts
  useEffect(() => {
    if (!activeCityId || activeCityId === 'all') {
      setExactCityCount(null);
      return;
    }
    let isCancelled = false;

    fetch(`/api/permits?city=${encodeURIComponent(activeCityId)}&dateRange=2026`)
      .then((res) => res.json())
      .then((data) => {
        if (isCancelled) return;
        if (data && data.permits && data.permits.length > 0) {
          PermitsRepository.appendPermits(data.permits);
          setPermitsList(PermitsRepository.getAllPermits());
        }
        if (data && typeof data.total === 'number') {
          setExactCityCount(data.total);
        }
      })
      .catch(() => {});

    // Also fetch reports metadata for guaranteed exact uncapped count
    fetch(`/api/reports?city=${encodeURIComponent(activeCityId)}&dateRange=all`)
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data && typeof data.totalPermits === 'number') {
          setExactCityCount(data.totalPermits);
        }
      })
      .catch(() => {});

    return () => { isCancelled = true; };
  }, [activeCityId]);

  const cityConfig = getActiveCityConfig(activeCityId);
  const allPermits = permitsList;

  // Filter States
  const [selectedPermitType, setSelectedPermitType] = useState('All Permit Types');
  const [selectedValueTier, setSelectedValueTier] = useState<number>(0);
  const [selectedDateRange, setSelectedDateRange] = useState<string>('90d');
  const [sortOrder, setSortOrder] = useState<'newest' | 'highest_value'>('newest');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Mobile Map vs. List Toggle View
  const [mobileView, setMobileView] = useState<'map' | 'list'>('list');

  // Full-Screen In-Cab Drive Mode State
  const [isDriveMode, setIsDriveMode] = useState(false);
  const [driveStopIndex, setDriveStopIndex] = useState(0);

  // Sync mobileView with URL parameter (?mobileView=map / ?mobileView=list)
  const mobileViewParam = searchParams.get('mobileView');
  useEffect(() => {
    if (mobileViewParam === 'map' || mobileViewParam === 'list') {
      setMobileView(mobileViewParam);
    }
  }, [mobileViewParam]);

  // Card Density Toggle (Comfortable vs Compact)
  const [cardDensity, setCardDensity] = useState<'comfortable' | 'compact'>('comfortable');

  // Selected Permit for slideout detail sheet (initialized to null to prevent Kelowna bleed on secondary cities)
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);

  // Map-to-Card Auto-Scroll & Temporary Glow Listener
  useEffect(() => {
    const handleFocusCard = (e: Event) => {
      const { permitId } = (e as CustomEvent<{ permitId?: string }>).detail || {};
      if (!permitId) return;
      const cardEl = document.getElementById(`permit-card-${permitId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.classList.add('ring-4', 'ring-blue-500', 'border-blue-500', 'shadow-xl', 'scale-[1.01]');
        setTimeout(() => {
          cardEl.classList.remove('ring-4', 'ring-blue-500', 'border-blue-500', 'shadow-xl', 'scale-[1.01]');
        }, 1500);
      }
    };

    window.addEventListener('bpp:focus-permit-card', handleFocusCard);
    return () => window.removeEventListener('bpp:focus-permit-card', handleFocusCard);
  }, []);

  // Sync with bpp:global-search custom event & popstate
  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string }>;
      if (typeof customEvent.detail?.query === 'string') {
        setSearchQuery(customEvent.detail.query);
      }
    };

    const handlePopState = () => {
      const q = new URLSearchParams(window.location.search).get('q') || '';
      setSearchQuery(q);
    };

    window.addEventListener('bpp:global-search', handleGlobalSearch);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('bpp:global-search', handleGlobalSearch);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Auto-select permit and open slideout sheet when permitId query param is present
  useEffect(() => {
    if (!permitIdParam) return;
    const found = allPermits.find(
      (p) =>
        p.id.toLowerCase() === permitIdParam.toLowerCase() ||
        p.permit_number.toLowerCase() === permitIdParam.toLowerCase()
    );
    if (found) {
      setSelectedPermit(found);
      if (selectedValueTier > (found.estimated_value || 0)) {
        setSelectedValueTier(0);
      }
    }
  }, [permitIdParam, allPermits]);

  // Favorites
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(RoutesRepository.getFavorites());
  }, []);

  const handleToggleFavorite = (permitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    RoutesRepository.toggleFavorite(permitId);
    setFavorites(RoutesRepository.getFavorites());
  };

  // Filtered and sorted permits
  const filteredPermits = useMemo(() => {
    let list = allPermits;

    // Multi-field Live Search Filter
    if (searchQuery.trim()) {
      const queryLower = searchQuery.trim().toLowerCase();
      list = list.filter((permit: any) => {
        const contractor = (permit.contractor_name || permit.contractor || '').toLowerCase();
        const applicant = (permit.applicant_name || permit.applicant || '').toLowerCase();
        const address = (permit.site_address || permit.address || '').toLowerCase();
        const permitNum = (permit.permit_number || permit.permit_no || '').toLowerCase();
        const subtype = (permit.permit_type || permit.project_subtype || permit.subtype || permit.description || '').toLowerCase();

        return (
          contractor.includes(queryLower) ||
          applicant.includes(queryLower) ||
          address.includes(queryLower) ||
          permitNum.includes(queryLower) ||
          subtype.includes(queryLower)
        );
      });
    }

    if (activeCityId && activeCityId !== 'all') {
      const target = activeCityId.toLowerCase().trim();
      list = list.filter((p) => {
        const pSlug = (p.city_slug || '').toLowerCase().trim();
        const pRegion = (p.city_region || '').toLowerCase().trim();
        const pAddr = (p.address || '').toLowerCase();
        if (pSlug === target) return true;
        if (pRegion === target) return true;
        if (target === 'calgary' && (pRegion === 'calgary' || pAddr.includes('calgary'))) return true;
        if (target === 'kelowna' && (pRegion === 'kelowna' || (!pSlug && !pAddr.includes('calgary')))) return true;
        return false;
      });
    }

    if (selectedPermitType !== 'All Permit Types' && selectedPermitType !== 'All Types') {
      if (selectedPermitType === 'Single-Family Residential (SFD)') {
        list = list.filter((p) =>
          p.permit_type.toLowerCase().includes('single') ||
          p.permit_type.toLowerCase().includes('sfd') ||
          p.description.toLowerCase().includes('single family') ||
          p.description.toLowerCase().includes('sfd')
        );
      } else if (selectedPermitType === 'Multi-Family Residential') {
        list = list.filter((p) =>
          p.permit_type.toLowerCase().includes('multi-family') ||
          (p.work_class === 'Residential' && !p.permit_type.toLowerCase().includes('single'))
        );
      } else if (selectedPermitType === 'Commercial New Construction') {
        list = list.filter((p) =>
          p.work_class === 'Commercial' || p.permit_type.toLowerCase().includes('commercial')
        );
      } else if (selectedPermitType === 'Tenant Improvement / Renovation') {
        list = list.filter((p) =>
          p.permit_type.toLowerCase().includes('tenant') ||
          p.permit_type.toLowerCase().includes('renovation') ||
          p.description.toLowerCase().includes('renovation') ||
          p.description.toLowerCase().includes('addition') ||
          p.description.toLowerCase().includes('tenant')
        );
      } else {
        list = list.filter((p) => p.permit_type.toLowerCase().includes(selectedPermitType.toLowerCase()));
      }
    }

    if (selectedValueTier > 0) {
      list = list.filter((p) => (p.estimated_value || 0) >= selectedValueTier);
    }

    if (selectedDateRange && selectedDateRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date | null = null;
      if (selectedDateRange === '30d') {
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (selectedDateRange === '90d') {
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else if (selectedDateRange === '6m') {
        cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      } else if (selectedDateRange === '2026') {
        cutoffDate = new Date('2026-01-01T00:00:00Z');
      }
      if (cutoffDate) {
        const cutoffStr = cutoffDate.toISOString().split('T')[0];
        list = list.filter((p) => p.issue_date >= cutoffStr);
      }
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortOrder === 'highest_value') {
        return (b.estimated_value || 0) - (a.estimated_value || 0);
      }
      return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
    });
  }, [allPermits, activeCityId, searchQuery, selectedPermitType, selectedValueTier, selectedDateRange, sortOrder]);

  // True total count for the city when default or broad view
  const isDefaultView =
    !searchQuery.trim() &&
    (selectedPermitType === 'All Permit Types' || selectedPermitType === 'All Types') &&
    selectedValueTier === 0 &&
    (selectedDateRange === 'all' || selectedDateRange === '2026' || selectedDateRange === '90d');

  const displayTotalCount = isDefaultView && exactCityCount && exactCityCount > filteredPermits.length
    ? exactCityCount
    : filteredPermits.length;

  // Infinite scroll pagination state (50 items per page chunk)
  const PAGE_CHUNK = 50;
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_CHUNK);

  useEffect(() => {
    setVisibleCount(PAGE_CHUNK);
  }, [activeCityId, searchQuery, selectedPermitType, selectedValueTier, selectedDateRange, sortOrder]);

  const visiblePermits = useMemo(() => {
    return filteredPermits.slice(0, visibleCount);
  }, [filteredPermits, visibleCount]);

  const handleFeedScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      if (visibleCount < filteredPermits.length) {
        setVisibleCount((prev) => Math.min(prev + PAGE_CHUNK, filteredPermits.length));
      }
    }
  };

  // Synchronize selected permit when city changes (prevent Kelowna record stuck on secondary cities)
  useEffect(() => {
    if (!filteredPermits.length) {
      setSelectedPermit(null);
      return;
    }
    if (permitIdParam) return; // Handled by permitIdParam effect

    if (selectedPermit && activeCityId !== 'all') {
      const pSlug = (selectedPermit.city_slug || '').toLowerCase().trim();
      const pRegion = (selectedPermit.city_region || '').toLowerCase().trim();
      const target = activeCityId.toLowerCase().trim();
      const matchesCity = pSlug === target || pRegion === target || pRegion.replace(/\s+/g, '-') === target;
      if (!matchesCity) {
        setSelectedPermit(filteredPermits[0] || null);
      }
    } else if (!selectedPermit) {
      setSelectedPermit(filteredPermits[0] || null);
    }
  }, [activeCityId, filteredPermits]);

  // Robust Map & Card Permit Selection Handler (passes and fetches exact permit ID)
  const handleSelectPermit = async (permitOrId: Permit | string) => {
    const pId = typeof permitOrId === 'string' ? permitOrId : (permitOrId.id || permitOrId.permit_number);
    if (!pId) return;

    if (typeof permitOrId === 'object' && permitOrId.id && permitOrId.address) {
      setSelectedPermit(permitOrId);
      const params = new URLSearchParams(window.location.search);
      params.set('permitId', permitOrId.id);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      return;
    }

    // 1. Search in active filtered permits
    let match = filteredPermits.find(
      (p) => p.id.toLowerCase() === pId.toLowerCase() || p.permit_number.toLowerCase() === pId.toLowerCase()
    );

    // 2. Search in all loaded permits
    if (!match) {
      match = allPermits.find(
        (p) => p.id.toLowerCase() === pId.toLowerCase() || p.permit_number.toLowerCase() === pId.toLowerCase()
      );
    }

    // 3. Search in repository cache
    if (!match) {
      match = PermitsRepository.getPermitById(pId);
    }

    // 4. Fetch live from /api/permits?id=...
    if (!match) {
      try {
        const res = await fetch(`/api/permits?id=${encodeURIComponent(pId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.permit) {
            match = data.permit;
            PermitsRepository.appendPermits([match!]);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch permit by ID:', err);
      }
    }

    if (match) {
      setSelectedPermit(match);
      const params = new URLSearchParams(window.location.search);
      params.set('permitId', match.id);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  };

  const activeFilterCount =
    (selectedPermitType !== 'All Permit Types' && selectedPermitType !== 'All Types' ? 1 : 0) +
    (selectedValueTier > 0 ? 1 : 0) +
    (selectedDateRange !== '90d' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const handleClearAll = () => {
    setSelectedPermitType('All Permit Types');
    setSelectedValueTier(0);
    setSelectedDateRange('90d');
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('bpp:global-search-sync', { detail: { query: '' } })
      );
      const url = new URL(window.location.href);
      url.searchParams.delete('q');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Top Filter Bar */}
      <FilterBar
        selectedPermitType={selectedPermitType}
        setSelectedPermitType={setSelectedPermitType}
        selectedValueTier={selectedValueTier}
        setSelectedValueTier={setSelectedValueTier}
        selectedDateRange={selectedDateRange}
        setSelectedDateRange={setSelectedDateRange}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
      />

      {/* Main Split Master-Detail & Map Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Master Feed */}
        <aside
          className={`w-full md:w-[380px] lg:w-[420px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shrink-0 h-full z-10 ${
            mobileView === 'map' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Feed Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Permit Intel
              </span>
              <span className="text-slate-300 dark:text-slate-700 font-bold">&bull;</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {displayTotalCount.toLocaleString()} Permits
              </span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                {cityConfig.label}
              </span>
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60 px-2 py-0.5 rounded-full">
                  <SearchIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="truncate max-w-[120px]">&ldquo;{searchQuery}&rdquo;</span>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                          new CustomEvent('bpp:global-search-sync', { detail: { query: '' } })
                        );
                        const url = new URL(window.location.href);
                        url.searchParams.delete('q');
                        window.history.replaceState(null, '', url.pathname + url.search);
                      }
                    }}
                    className="hover:text-red-500 ml-0.5 font-black text-xs leading-none"
                    title="Clear search"
                  >
                    &times;
                  </button>
                </span>
              )}
            </div>

            {/* Sort & Density Switcher */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Card Density Toggle */}
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCardDensity('comfortable')}
                  className={`p-1 rounded-md transition-all ${
                    cardDensity === 'comfortable'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Comfortable View (Full Card)"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCardDensity('compact')}
                  className={`p-1 rounded-md transition-all ${
                    cardDensity === 'compact'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Compact View (Tabular Rows)"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* In-Cab Drive Mode Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  setIsDriveMode(true);
                  if (!selectedPermit && filteredPermits.length > 0) {
                    setSelectedPermit(filteredPermits[0]);
                  }
                }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-400/40 text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Enter Fullscreen In-Cab Driving Mode"
              >
                <Car className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Drive Mode</span>
              </button>

              {/* Sort Dropdown */}
              <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                <ArrowUpDown className="w-3 h-3" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="newest" className="bg-white dark:bg-slate-900">Sort Newest</option>
                  <option value="highest_value" className="bg-white dark:bg-slate-900">Sort Value</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scrollable Permit Card Feed with Infinite Pagination */}
          <div
            onScroll={handleFeedScroll}
            className={`flex-1 overflow-y-auto p-3.5 ${
              cardDensity === 'compact' ? 'space-y-1.5' : 'space-y-2.5'
            }`}
          >
            {filteredPermits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No permits match your active filter criteria.
              </div>
            ) : (
              <>
                {visiblePermits.map((permit) => (
                  <PermitCard
                    key={permit.id}
                    permit={permit}
                    density={cardDensity}
                    isSelected={selectedPermit?.id === permit.id}
                    onSelect={(p) => handleSelectPermit(p)}
                    isFavorite={favorites.includes(permit.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
                {visibleCount < filteredPermits.length && (
                  <div className="py-3 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => Math.min(prev + PAGE_CHUNK, filteredPermits.length))}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 transition-all shadow-xs cursor-pointer"
                    >
                      Load More ({visibleCount} of {filteredPermits.length} loaded)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Center: MapLibre Vector Map Engine */}
        <div
          className={`flex-1 relative w-full h-full min-h-[400px] bg-slate-950 ${
            mobileView === 'list'
              ? 'hidden md:block'
              : 'block h-[calc(100vh-120px)] md:h-full'
          }`}
        >
          <MapContainer
            permits={filteredPermits}
            selectedPermit={selectedPermit}
            onSelectPermit={handleSelectPermit}
            onSelectPermitId={(id) => handleSelectPermit(id)}
            center={cityConfig.center}
            zoom={cityConfig.zoom}
          />
        </div>

        {/* Right: Slideout Permit Details Sheet */}
        {selectedPermit && (
          <>
            <div
              onClick={() => setSelectedPermit(null)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-35 md:hidden"
            />
            <PermitDetailsSheet
              permit={selectedPermit}
              onClose={() => setSelectedPermit(null)}
            />
          </>
        )}

        {/* Floating View Toggle Pill Button on Mobile */}
        {!selectedPermit && (
          <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <button
              onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xl shadow-blue-600/40 border border-blue-400/30 transition-all cursor-pointer"
              aria-label="Toggle between Map and List view"
            >
              {mobileView === 'list' ? (
                <>
                  <span className="text-sm">🗺️</span>
                  <span>Map</span>
                </>
              ) : (
                <>
                  <span className="text-sm">📋</span>
                  <span>List</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Full-Screen In-Cab Driving Mode */}
      {isDriveMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-white animate-in fade-in duration-200">
          {/* Top In-Cab HUD Header */}
          <div className="h-14 px-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-mono text-xs font-black uppercase tracking-wider text-emerald-400">
                In-Cab GPS Corridor &bull; {cityConfig.label}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsDriveMode(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>✕ Exit Drive Mode</span>
            </button>
          </div>

          {/* 85% Viewport Dedicated Vector Map */}
          <div className="flex-1 relative w-full h-[calc(85vh-56px)] bg-slate-950">
            <MapContainer
              permits={filteredPermits}
              selectedPermit={filteredPermits[driveStopIndex] || selectedPermit}
              onSelectPermit={(p) => {
                const idx = filteredPermits.findIndex((item) => item.id === p.id);
                if (idx !== -1) setDriveStopIndex(idx);
                setSelectedPermit(p);
              }}
              center={cityConfig.center}
              zoom={cityConfig.zoom}
            />
          </div>

          {/* Bottom Floating Card: Next Jobsite Along Route */}
          {filteredPermits.length > 0 && (
            <div className="p-4 bg-slate-900 border-t border-slate-800 shadow-2xl z-20 shrink-0">
              {(() => {
                const currentDrivePermit = filteredPermits[driveStopIndex] || selectedPermit || filteredPermits[0];
                const phone = currentDrivePermit?.contractor_phone;
                return (
                  <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                          Next Jobsite #{driveStopIndex + 1} of {filteredPermits.length}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          ${currentDrivePermit.estimated_value?.toLocaleString('en-CA')} CAD
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white truncate mt-0.5">
                        {currentDrivePermit.address}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        {currentDrivePermit.contractor_name || 'Owner/Builder'} &bull; {currentDrivePermit.permit_type}
                      </p>
                    </div>

                    {/* Large 1-Tap In-Cab Action Buttons */}
                    <div className="flex items-center gap-2 overflow-x-auto">
                      {phone ? (
                        <a
                          href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all shrink-0 cursor-pointer"
                        >
                          <Phone className="w-4 h-4" />
                          <span>Call GC</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5 opacity-60 shrink-0 cursor-not-allowed"
                        >
                          <PhoneOff className="w-4 h-4" />
                          <span>No Phone</span>
                        </button>
                      )}

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentDrivePermit.address)}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[48px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95 transition-all shrink-0 cursor-pointer"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Google Maps</span>
                      </a>

                      <a
                        href={`https://waze.com/ul?ll=${currentDrivePermit.latitude},${currentDrivePermit.longitude}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[48px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/30 active:scale-95 transition-all shrink-0 cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Waze</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          const next = (driveStopIndex + 1) % filteredPermits.length;
                          setDriveStopIndex(next);
                          setSelectedPermit(filteredPermits[next]);
                        }}
                        className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-700 transition-all shrink-0 cursor-pointer"
                      >
                        <span>Next Job &rarr;</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        </div>
      }
    >
      <SearchExplorerContent />
    </Suspense>
  );
}
