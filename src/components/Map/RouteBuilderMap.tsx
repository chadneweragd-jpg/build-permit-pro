'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { RouteGeometry } from '@/lib/spatial';
import { RouteStop, Permit } from '@/types';

interface RouteBuilderMapProps {
  routeGeometry: RouteGeometry | null;
  bufferPolygonGeoJSON: any | null;
  stops: RouteStop[];
  corridorPermits: Permit[];
  originCoords: [number, number]; // [lat, lng]
  destinationCoords: [number, number]; // [lat, lng]
  center?: [number, number];
  zoom?: number;
}

export const RouteBuilderMap: React.FC<RouteBuilderMapProps> = ({
  routeGeometry,
  bufferPolygonGeoJSON,
  stops,
  corridorPermits,
  originCoords,
  destinationCoords,
  center = [-119.4960, 49.8880],
  zoom = 12
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Direct inline OpenStreetMap raster style (0 API keys needed, guaranteed render)
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: center || [-119.4960, 49.8880],
      zoom: zoom || 12,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
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
      }
    });

    mapRef.current = map;

    map.on('load', () => {
      // Ensure canvas fills container immediately after mounting
      map.resize();
      setTimeout(() => map.resize(), 100);
      setTimeout(() => map.resize(), 500);

      // 1. Buffer Polygon Source & Layer
      map.addSource('corridor-buffer-source', {
        type: 'geojson',
        data: bufferPolygonGeoJSON || { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'corridor-buffer-fill',
        type: 'fill',
        source: 'corridor-buffer-source',
        paint: {
          'fill-color': '#0284c7',
          'fill-opacity': 0.16
        }
      });

      map.addLayer({
        id: 'corridor-buffer-line',
        type: 'line',
        source: 'corridor-buffer-source',
        paint: {
          'line-color': '#0284c7',
          'line-width': 2,
          'line-dasharray': [3, 2]
        }
      });

      // 2. Vibrant Blue Route Line Casing & Glow (Blue Line Fix)
      map.addSource('route-line-source', {
        type: 'geojson',
        data: routeGeometry || { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'route-line-glow',
        type: 'line',
        source: 'route-line-source',
        paint: {
          'line-color': '#1d4ed8',
          'line-width': 8,
          'line-opacity': 0.6
        }
      });

      map.addLayer({
        id: 'route-line-main',
        type: 'line',
        source: 'route-line-source',
        paint: {
          'line-color': '#2563eb',
          'line-width': 5,
          'line-opacity': 0.95
        }
      });

      // 3. Corridor Leads Source & Layer
      map.addSource('corridor-leads-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: corridorPermits.map((p) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [p.longitude, p.latitude]
            },
            properties: {
              permit_number: p.permit_number,
              address: p.address,
              value: p.estimated_value
            }
          }))
        }
      });

      map.addLayer({
        id: 'corridor-leads-points',
        type: 'circle',
        source: 'corridor-leads-source',
        paint: {
          'circle-radius': 5,
          'circle-color': '#eab308',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Buffer Polygon Layer
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('corridor-buffer-source') as maplibregl.GeoJSONSource;
    if (source && source.setData) {
      source.setData(bufferPolygonGeoJSON || { type: 'FeatureCollection', features: [] });
    }
  }, [bufferPolygonGeoJSON]);

  // Update Route Polyline Layer
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('route-line-source') as maplibregl.GeoJSONSource;
    if (source && source.setData) {
      source.setData(routeGeometry || { type: 'FeatureCollection', features: [] });
    }

    try {
      const coords = (routeGeometry as any)?.geometry?.coordinates || (routeGeometry as any)?.coordinates;
      if (coords && coords.length > 0) {
        const bounds = coords.reduce(
          (b: maplibregl.LngLatBounds, c: [number, number]) => b.extend(c),
          new maplibregl.LngLatBounds(coords[0], coords[0])
        );
        mapRef.current.fitBounds(bounds, { padding: 80, duration: 1000 });
      }
    } catch (err) {
      console.error('RouteBuilderMap fitBounds error:', err);
    }
  }, [routeGeometry]);

  // Update Corridor Leads Layer
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('corridor-leads-source') as maplibregl.GeoJSONSource;
    if (source && source.setData) {
      source.setData({
        type: 'FeatureCollection',
        features: corridorPermits.map((p) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [p.longitude, p.latitude]
          },
          properties: {
            permit_number: p.permit_number,
            address: p.address
          }
        }))
      });
    }
  }, [corridorPermits]);

  // Render Markers: Start, Destination, and Orange (Civic) vs Red (Permit) Stops
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Origin / Start Marker (Green)
    if (originCoords && originCoords.length === 2) {
      const el = document.createElement('div');
      el.className = 'w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs cursor-pointer hover:scale-110 transition-transform';
      el.innerHTML = 'S';
      el.title = 'Route Origin (Start)';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([originCoords[1], originCoords[0]])
        .setPopup(
          new maplibregl.Popup({ offset: 15 }).setHTML(
            `<div style="font-family:sans-serif;font-size:12px;padding:4px;"><strong style="color:#059669;">Route Origin</strong><br/>Starting point</div>`
          )
        )
        .addTo(map);

      markersRef.current.push(marker);
    }

    // 2. Sequential Stops: Orange for Non-Permit Civic Stops, Red for Municipal Permits
    stops.forEach((stop, idx) => {
      if (!stop.latitude || !stop.longitude) return;
      const isCivic = stop.is_custom_address || !stop.permit_id;

      const el = document.createElement('div');
      el.className = `w-7 h-7 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-black text-xs cursor-pointer hover:scale-110 transition-transform ${
        isCivic
          ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50'
          : 'bg-red-600 text-white ring-2 ring-red-500/50'
      }`;
      el.innerHTML = `${idx + 1}`;
      el.title = isCivic
        ? `Stop ${idx + 1}: ${stop.address} (${stop.purpose_tag || 'Civic Stop'})`
        : `Stop ${idx + 1}: ${stop.address} [${stop.permit_number || 'Permit'}]`;

      const popupHTML = `
        <div style="font-family:sans-serif;font-size:12px;padding:6px;max-width:200px;">
          <div style="font-weight:900;font-size:11px;color:${isCivic ? '#d97706' : '#dc2626'};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">
            ${isCivic ? '📍 Non-Permit Civic Stop' : '🏛️ Municipal Permit'} #${idx + 1}
          </div>
          <div style="font-weight:700;color:#1e293b;margin-bottom:4px;">${stop.address}</div>
          ${stop.purpose_tag ? `<div style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;display:inline-block;font-weight:700;">${stop.purpose_tag}</div>` : ''}
          ${stop.permit_number ? `<div style="font-size:10px;font-family:monospace;color:#2563eb;font-weight:700;">Permit: ${stop.permit_number}</div>` : ''}
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.longitude, stop.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(popupHTML))
        .addTo(map);

      markersRef.current.push(marker);
    });

    // 3. Destination Marker (Finish Flag / Checkered) if stops is empty
    if (stops.length === 0 && destinationCoords && destinationCoords.length === 2) {
      const el = document.createElement('div');
      el.className = 'w-7 h-7 rounded-full bg-slate-900 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs cursor-pointer hover:scale-110 transition-transform';
      el.innerHTML = '🏁';
      el.title = 'Route Destination';

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([destinationCoords[1], destinationCoords[0]])
        .setPopup(
          new maplibregl.Popup({ offset: 15 }).setHTML(
            `<div style="font-family:sans-serif;font-size:12px;padding:4px;"><strong>Destination</strong></div>`
          )
        )
        .addTo(map);

      markersRef.current.push(marker);
    }
  }, [stops, originCoords, destinationCoords]);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-900 overflow-hidden">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Spatial Legend Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 shadow-xl space-y-1.5">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-1 rounded bg-blue-600 inline-block shadow-sm" />
          <span className="font-bold">Active Driving Route</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white inline-block shadow-sm" />
          <span className="font-bold text-amber-300">Orange: Civic Stop (Non-Permit)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white inline-block shadow-sm" />
          <span className="font-bold text-red-300">Red: Permit Stop</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 border border-white inline-block" />
          <span>Nearby Corridor Leads</span>
        </div>
      </div>
    </div>
  );
};
