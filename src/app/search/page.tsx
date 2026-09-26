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
import { ArrowUpDown, Search as SearchIcon, CheckCircle2 } from 'lucide-react';
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

  // Fetch live Calgary Socrata permits if Calgary is active
  useEffect(() => {
    if (activeCityId === 'calgary') {
      fetch('/api/ingest/calgary?limit=150')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.permits && data.permits.length > 0) {
            PermitsRepository.appendPermits(data.permits);
            setPermitsList(PermitsRepository.getAllPermits());
          }
        })
        .catch(() => {});
    }
  }, [activeCityId]);

  const cityConfig = getActiveCityConfig(activeCityId);
  const allPermits = permitsList;

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedPermitType, setSelectedPermitType] = useState('All Permit Types');
  const [selectedValueTier, setSelectedValueTier] = useState<number>(0);
  const [selectedDateRange, setSelectedDateRange] = useState<string>('90d');
  const [sortOrder, setSortOrder] = useState<'newest' | 'highest_value'>('newest');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Mobile Map vs. List Toggle View
  const [mobileView, setMobileView] = useState<'map' | 'list'>('list');

  // Selected Permit for slideout detail sheet
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(allPermits[0] || null);

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
      // Ensure active filters do not hide the targeted permit
      if (
        selectedLocation !== 'All Locations' &&
        (found.city_region || 'Kelowna').toLowerCase() !== selectedLocation.toLowerCase()
      ) {
        setSelectedLocation('All Locations');
      }
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

    if (selectedLocation !== 'All Locations') {
      list = list.filter((p) => (p.city_region || 'Kelowna').toLowerCase() === selectedLocation.toLowerCase());
    } else if (activeCityId && activeCityId !== 'all') {
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
  }, [allPermits, activeCityId, searchQuery, selectedLocation, selectedPermitType, selectedValueTier, selectedDateRange, sortOrder]);

  const activeFilterCount =
    (selectedLocation !== 'All Locations' ? 1 : 0) +
    (selectedPermitType !== 'All Permit Types' && selectedPermitType !== 'All Types' ? 1 : 0) +
    (selectedValueTier > 0 ? 1 : 0) +
    (selectedDateRange !== '90d' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const handleClearAll = () => {
    setSelectedLocation('All Locations');
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
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
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
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {filteredPermits.length} Permits
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

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-white dark:bg-slate-900">Sort Newest First</option>
                <option value="highest_value" className="bg-white dark:bg-slate-900">Sort Highest Value</option>
              </select>
            </div>
          </div>

          {/* Scrollable Permit Card Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {filteredPermits.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No permits match your active filter criteria.
              </div>
            ) : (
              filteredPermits.map((permit) => (
                <PermitCard
                  key={permit.id}
                  permit={permit}
                  isSelected={selectedPermit?.id === permit.id}
                  onSelect={(p) => setSelectedPermit(p)}
                  isFavorite={favorites.includes(permit.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))
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
            onSelectPermit={(p) => setSelectedPermit(p)}
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
