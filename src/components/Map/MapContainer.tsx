'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Permit, RouteStop } from '@/types';
import { RouteGeometry } from '@/lib/spatial';
import { RoutesRepository } from '@/lib/routes-repo';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Navigation,
  CheckCircle
} from 'lucide-react';

export interface MapContainerProps {
  permits?: Permit[];
  selectedPermit?: Permit | null;
  onSelectPermit?: (permit: Permit) => void;
  onAddToRoute?: (permit: Permit) => void;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  routeGeometry?: RouteGeometry | null;
  bufferPolygonGeoJSON?: any | null;
  stops?: RouteStop[];
  bufferKm?: number;
  onBufferChange?: (km: number) => void;
  showBufferControls?: boolean;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  permits = [],
  selectedPermit = null,
  onSelectPermit,
  onAddToRoute,
  center = [-119.4960, 49.8880],
  zoom = 12,
  routeGeometry = null,
  bufferPolygonGeoJSON = null,
  stops = [],
  bufferKm = 3,
  onBufferChange,
  showBufferControls = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const BUFFER_OPTIONS = [2, 3, 5, 10];

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Direct inline OpenStreetMap raster style (0 API keys needed, guaranteed render)
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: center || [-119.4960, 49.8880], // Kelowna
      zoom: zoom || 12,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', () => {
      // Ensure canvas fills container immediately after mounting
      map.resize();
      setTimeout(() => map.resize(), 100);
      setTimeout(() => map.resize(), 500);
      setMapLoaded(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render DOM Markers for each permit
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Clear previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // 2. Add marker for each permit
    permits.forEach((permit) => {
      // Extract and ensure valid numbers (GeoJSON requires [lng, lat])
      const lng = Number(
        permit.longitude ??
        (permit as any).lng ??
        (permit as any).location?.coordinates?.[0]
      );
      const lat = Number(
        permit.latitude ??
        (permit as any).lat ??
        (permit as any).location?.coordinates?.[1]
      );

      if (!lng || !lat || isNaN(lng) || isNaN(lat)) return;

      const isSelected =
        selectedPermit?.id === permit.id ||
        selectedPermit?.permit_number === permit.permit_number;

      const primaryTrade = permit.trades?.[0];
      const tradeColor = primaryTrade?.color || '#EA580C';

      const formattedVal =
        permit.estimated_value >= 1000000
          ? `$${(permit.estimated_value / 1000000).toFixed(1)}M`
          : `$${Math.round(permit.estimated_value / 1000)}k`;

      // Create marker DOM element
      const el = document.createElement('div');
      el.className = 'cursor-pointer transform hover:scale-125 transition-transform z-10 group';

      if (isSelected) {
        el.innerHTML = `
          <div class="relative flex flex-col items-center justify-center">
            <div class="absolute -inset-2 bg-blue-500 rounded-full animate-ping opacity-60"></div>
            <div class="w-7 h-7 bg-blue-600 border-2 border-white rounded-full shadow-2xl flex items-center justify-center text-white text-xs font-black ring-2 ring-blue-400">
              ★
            </div>
            <div class="absolute -bottom-6 bg-slate-950 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded shadow-xl whitespace-nowrap border border-blue-400">
              ${formattedVal}
            </div>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div 
              class="w-4 h-4 rounded-full border-2 border-white shadow-md transition-all hover:scale-110 flex items-center justify-center"
              style="background-color: ${tradeColor};"
              title="${permit.address} - ${formattedVal}"
            >
            </div>
            <div class="mt-0.5 bg-slate-900/90 text-white font-mono text-[9px] font-bold px-1 py-0.2 rounded shadow whitespace-nowrap opacity-80 group-hover:opacity-100">
              ${formattedVal}
            </div>
          </div>
        `;
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectPermit) {
          onSelectPermit(permit);
        }
      });

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [permits, selectedPermit, onSelectPermit, mapLoaded]);

  // Smoothly pan/fly to selected permit
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPermit) return;

    const lng = Number(
      selectedPermit.longitude ??
      (selectedPermit as any).lng ??
      (selectedPermit as any).location?.coordinates?.[0]
    );
    const lat = Number(
      selectedPermit.latitude ??
      (selectedPermit as any).lat ??
      (selectedPermit as any).location?.coordinates?.[1]
    );

    if (lng && lat && !isNaN(lng) && !isNaN(lat)) {
      const fly = () => {
        map.flyTo({
          center: [lng, lat],
          zoom: 15,
          duration: 1500
        });
      };

      if (map.loaded()) {
        fly();
      } else {
        map.once('load', fly);
      }
    }
  }, [selectedPermit, mapLoaded]);

  // Smoothly pan/fly to center when center coordinates change (e.g. switching between Kelowna and Calgary)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !center) return;
    map.flyTo({
      center,
      zoom: zoom || 12,
      duration: 1200
    });
  }, [center?.[0], center?.[1], zoom, mapLoaded]);

  // Render Blue Route Line over Raster Basemap
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    renderRouteLine(map, routeGeometry);
  }, [routeGeometry, mapLoaded]);

  // Render Buffer Polygon GeoJSON over Raster Basemap
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    renderBufferPolygon(map, bufferPolygonGeoJSON);
  }, [bufferPolygonGeoJSON, mapLoaded]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const handleToggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-900 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-4 z-20 bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-lg flex items-center space-x-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MapLibre Canvas Container with absolute positioning to fill parent */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating BPP Scout Corridor Buffer Slider (if showBufferControls enabled) */}
      {showBufferControls && onBufferChange && (
        <div className="absolute top-4 left-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 dark:text-white mr-1">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>Scout Buffer:</span>
          </div>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl space-x-1">
            {BUFFER_OPTIONS.map((km) => (
              <button
                key={km}
                type="button"
                onClick={() => onBufferChange(km)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  bufferKm === km
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {km}k
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white shadow-lg backdrop-blur-md transition-all flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white shadow-lg backdrop-blur-md transition-all flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen"
          className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white shadow-lg backdrop-blur-md transition-all flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 shadow-lg flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block border border-white" />
          <span>Selected Permit</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block border border-white" />
          <span>Active Commercial Permit</span>
        </div>
      </div>
    </div>
  );
};

export default MapContainer;

/**
 * Draws solid vibrant blue route line ON TOP of raster basemap and auto-fits the camera bounds
 */
/**
 * Draws solid vibrant blue route line ON TOP of raster basemap and auto-fits the camera bounds
 * Source: 'scout-route' | Layer: 'scout-route-line' (#2563eb, width 5)
 */
export function renderRouteLine(map: maplibregl.Map, routeGeoJSON: any) {
  if (!map) return;

  const emptyData = { type: 'FeatureCollection', features: [] };
  const data = routeGeoJSON || emptyData;

  const applyLayer = () => {
    // If source already exists, update its data
    if (map.getSource('scout-route')) {
      (map.getSource('scout-route') as maplibregl.GeoJSONSource).setData(data);
    } else {
      map.addSource('scout-route', {
        type: 'geojson',
        data
      });

      // Subtle glow underlay
      map.addLayer({
        id: 'scout-route-glow',
        type: 'line',
        source: 'scout-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 8,
          'line-opacity': 0.45
        }
      });

      // Main Blue Route Line
      map.addLayer({
        id: 'scout-route-line',
        type: 'line',
        source: 'scout-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#2563eb', // Vibrant Blue Corridor
          'line-width': 5,
          'line-opacity': 0.95
        }
      });
    }

    // Also update legacy source if any components query it
    if (map.getSource('bpp-route-source')) {
      (map.getSource('bpp-route-source') as maplibregl.GeoJSONSource).setData(data);
    }

    if (!routeGeoJSON) return;

    // Automatically zoom/pan map so the entire route is in view
    try {
      const coords = routeGeoJSON.geometry?.coordinates || routeGeoJSON.coordinates;
      if (coords && coords.length > 0) {
        const bounds = coords.reduce(
          (b: maplibregl.LngLatBounds, c: [number, number]) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        map.fitBounds(bounds, { padding: 80, duration: 1000 });
      }
    } catch (err) {
      console.error('fitBounds error:', err);
    }
  };

  if (map.isStyleLoaded()) {
    applyLayer();
  } else {
    map.once('styledata', applyLayer);
  }
}

/**
 * Renders the corridor buffer polygon (2km, 3km, 5km, 10km) on the map
 */
export function renderBufferPolygon(map: maplibregl.Map, bufferGeoJSON: any) {
  if (!map) return;

  const emptyData = { type: 'FeatureCollection', features: [] };
  const data = bufferGeoJSON || emptyData;

  const applyBuffer = () => {
    if (map.getSource('scout-buffer-source')) {
      (map.getSource('scout-buffer-source') as maplibregl.GeoJSONSource).setData(data);
    } else {
      map.addSource('scout-buffer-source', {
        type: 'geojson',
        data
      });

      // Corridor Buffer Fill
      map.addLayer({
        id: 'scout-buffer-fill',
        type: 'fill',
        source: 'scout-buffer-source',
        paint: {
          'fill-color': '#0284c7',
          'fill-opacity': 0.14
        }
      });

      // Corridor Buffer Dashed Boundary Line
      map.addLayer({
        id: 'scout-buffer-line',
        type: 'line',
        source: 'scout-buffer-source',
        paint: {
          'line-color': '#0284c7',
          'line-width': 2,
          'line-dasharray': [3, 2]
        }
      });
    }
  };

  if (map.isStyleLoaded()) {
    applyBuffer();
  } else {
    map.once('styledata', applyBuffer);
  }
}
