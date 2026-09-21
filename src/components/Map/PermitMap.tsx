'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Permit } from '@/types';
import { SUBTRADES_CATALOG } from '@/lib/trades-data';
import { HeatmapLayer } from './HeatmapLayer';
import { RouteGeometry, getNativeMapUrls } from '@/lib/spatial';
import { Navigation, ExternalLink, HardHat, Compass, DollarSign, Calendar, ChevronRight } from 'lucide-react';

interface PermitMapProps {
  permits: Permit[];
  selectedPermit: Permit | null;
  onSelectPermit: (permit: Permit) => void;
  onSetScoutDestination?: (permit: Permit) => void;
  isHeatmapVisible: boolean;
  activeRoute: RouteGeometry | null;
  corridorBufferGeoJSON: any | null;
  center?: [number, number];
  zoom?: number;
}

// Recenter Map Helper
function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Generate Leaflet Custom HTML Trade Badge Marker Icon
function createTradeMarkerIcon(permit: Permit, isSelected: boolean) {
  const primaryTradeKey = permit.trades.length > 0 ? permit.trades[0].subtrade_key : 'electrical';
  const tradeDef = SUBTRADES_CATALOG[primaryTradeKey] || SUBTRADES_CATALOG.electrical;
  const color = tradeDef.color;

  // Format short valuation (e.g. $48M, $1.8M, $850k)
  const val = permit.estimated_value || 0;
  let valLabel = '';
  if (val >= 1000000) valLabel = `$${(val / 1000000).toFixed(1)}M`;
  else if (val >= 1000) valLabel = `$${(val / 1000).toFixed(0)}k`;
  else valLabel = `$${val}`;

  const html = `
    <div class="custom-trade-pin group relative flex flex-col items-center">
      <div class="pin-badge ${isSelected ? 'selected' : ''}" style="background-color: ${color};">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${
            primaryTradeKey === 'hvac_plumbing'
              ? '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'
              : primaryTradeKey === 'roofing'
              ? '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
              : primaryTradeKey === 'commercial_doors'
              ? '<path d="M14 18v.01"/><path d="M6 2v20h12V2H6z"/>'
              : primaryTradeKey === 'glazing'
              ? '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'
              : '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
          }
        </svg>
      </div>
      <div class="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-900/90 text-white shadow-md border border-slate-700 whitespace-nowrap">
        ${valLabel}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'leaflet-custom-marker',
    iconSize: [38, 56],
    iconAnchor: [19, 44],
    popupAnchor: [0, -42]
  });
}

export const PermitMap: React.FC<PermitMapProps> = ({
  permits,
  selectedPermit,
  onSelectPermit,
  onSetScoutDestination,
  isHeatmapVisible,
  activeRoute,
  corridorBufferGeoJSON,
  center = [49.888, -119.485],
  zoom = 12
}) => {
  const isRouteActive = Boolean(activeRoute);

  // Convert route coordinates for Leaflet Polyline: [lat, lng]
  const polylinePositions = useMemo(() => {
    if (!activeRoute || !activeRoute.geometry || !activeRoute.geometry.coordinates) return [];
    return activeRoute.geometry.coordinates.map((coord) => [coord[1], coord[0]] as [number, number]);
  }, [activeRoute]);

  return (
    <div className="relative w-full h-full min-h-[500px]">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapRecenter center={center} zoom={zoom} />

        {/* High contrast dark/carto tile layer for professional commercial GIS aesthetic */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &bull; City of Kelowna Open Data'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Construction Activity Heat Map with Dynamic Dimming in Route Mode */}
        <HeatmapLayer
          permits={permits}
          isVisible={isHeatmapVisible}
          isDimmed={isRouteActive}
        />

        {/* BPP Scout Spatial Corridor Buffer Polygon (GeoJSON) */}
        {corridorBufferGeoJSON && (
          <GeoJSON
            key={JSON.stringify(corridorBufferGeoJSON.geometry?.coordinates?.[0]?.[0] || 'buffer')}
            data={corridorBufferGeoJSON}
            pathOptions={{
              className: 'corridor-buffer-path'
            }}
          />
        )}

        {/* Driving Route Polyline */}
        {polylinePositions.length > 0 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#059669',
              weight: 6,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round',
              className: 'route-polyline-glow'
            }}
          />
        )}

        {/* Permit Markers */}
        {permits.map((permit) => {
          if (!permit.latitude || !permit.longitude) return null;
          const isSelected = selectedPermit?.id === permit.id;
          const icon = createTradeMarkerIcon(permit, isSelected);
          const navUrls = getNativeMapUrls(permit.latitude, permit.longitude, permit.address);

          return (
            <Marker
              key={permit.id}
              position={[permit.latitude, permit.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectPermit(permit)
              }}
            >
              <Popup className="bpp-permit-popup" maxWidth={340} minWidth={280}>
                <div className="p-1 text-slate-800">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {permit.permit_number}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ${new Intl.NumberFormat('en-CA').format(permit.estimated_value)}
                    </span>
                  </div>

                  {/* Address & Scope */}
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">
                    {permit.address}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                    <span>{permit.work_class}</span>
                    <span>&bull;</span>
                    <span>Issued {permit.issue_date}</span>
                  </p>

                  {/* Estimator Summary */}
                  <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                    <strong className="text-slate-800 font-semibold block mb-0.5">Estimator Scope:</strong>
                    {permit.ai_summary}
                  </div>

                  {/* Matched Trades */}
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {permit.trades.map((trade) => (
                      <span
                        key={trade.subtrade_key}
                        style={{
                          backgroundColor: `${trade.color}15`,
                          color: trade.color,
                          borderColor: `${trade.color}40`
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                      >
                        {trade.name}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between gap-1">
                    <button
                      onClick={() => onSelectPermit(permit)}
                      className="flex-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold text-center transition-all flex items-center justify-center space-x-1"
                    >
                      <span>Full Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    {onSetScoutDestination && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetScoutDestination(permit);
                        }}
                        title="Set as BPP Scout Destination"
                        className="py-1 px-2.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-bold transition-all flex items-center space-x-1"
                      >
                        <Compass className="w-3 h-3" />
                        <span>Scout</span>
                      </button>
                    )}

                    <a
                      href={navUrls.googleMaps}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Turn-by-turn Directions in Google Maps"
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-300"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
