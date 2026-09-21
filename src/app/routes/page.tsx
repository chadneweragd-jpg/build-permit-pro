'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RoutesRepository } from '@/lib/routes-repo';
import { SavedRoute } from '@/types';
import {
  Route as RouteIcon,
  Plus,
  LayoutGrid,
  List,
  MapPin,
  Clock,
  Navigation,
  Trash2,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  FileSpreadsheet,
  Play,
  Car
} from 'lucide-react';
import { getNativeMapUrls } from '@/lib/spatial';

export default function RoutesHubPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setRoutes(RoutesRepository.getSavedRoutes());
  }, []);

  const handleCreateNew = () => {
    const newRoute = RoutesRepository.createNewRoute();
    router.push(`/routes/builder?id=${newRoute.id}`);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    RoutesRepository.deleteRoute(id);
    setRoutes(RoutesRepository.getSavedRoutes());
  };

  const formatTimestamp = (iso: string) => {
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60));
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <RouteIcon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Contractor Routes Hub
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build and manage multi-stop driving itineraries with BPP Scout spatial corridor lead analysis.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Grid / List Toggle */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* + New Route Button */}
          <button
            onClick={handleCreateNew}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Route</span>
          </button>
        </div>
      </div>

      {/* Sub-Nav Tabs: Active Routes vs CRA Mileage */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Link
          href="/routes"
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center space-x-2 shadow-sm"
        >
          <RouteIcon className="w-4 h-4" />
          <span>Active Routes ({routes.length})</span>
        </Link>

        <Link
          href="/routes/mileage"
          className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs flex items-center space-x-2 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>CRA Mileage Logbook</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full font-mono font-bold">
            $0.70/km
          </span>
        </Link>
      </div>

      {/* Routes Grid / List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route) => {
            const navUrls = getNativeMapUrls(route.destination_coords[0], route.destination_coords[1], route.destination_address);

            return (
              <div
                key={route.id}
                onClick={() => router.push(`/routes/builder?id=${route.id}`)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Title, Timestamp, Delete */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {route.title}
                      </h3>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Updated {formatTimestamp(route.updated_at)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDelete(route.id, e)}
                      title="Delete Route"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Route Itinerary Flow */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate font-medium">{route.origin_address}</span>
                    </div>

                    <div className="pl-1 border-l-2 border-dashed border-slate-300 dark:border-slate-700 ml-1 py-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        +{route.stops.length} stops
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate font-medium">{route.destination_address}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Metrics & Launch */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {route.total_distance_km} km
                    </span>
                    <span>&bull;</span>
                    <span>{route.total_duration_min} min</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/routes/builder?id=${route.id}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[11px] flex items-center space-x-1 hover:bg-blue-100 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Drive</span>
                    </button>
                    <div className="flex items-center space-x-1 text-slate-500 font-bold group-hover:translate-x-1 transition-transform">
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {routes.map((route) => (
            <div
              key={route.id}
              onClick={() => router.push(`/routes/builder?id=${route.id}`)}
              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <RouteIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{route.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {route.origin_address} &rarr; {route.destination_address} ({route.stops.length} stops)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">{route.total_distance_km} km</span>
                  <span className="text-slate-400 block">{formatTimestamp(route.updated_at)}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
