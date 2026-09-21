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

      // 2. Route Polyline Source & Layer
      map.addSource('route-line-source', {
        type: 'geojson',
        data: routeGeometry || { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'route-line-glow',
        type: 'line',
        source: 'route-line-source',
        paint: {
          'line-color': '#10b981',
          'line-width': 6,
          'line-opacity': 0.85
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
          'circle-radius': 6,
          'circle-color': '#EA580C',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    });

    return () => {
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

  return (
    <div className="relative w-full h-full min-h-[500px] bg-slate-900 overflow-hidden">
      {/* MapLibre Canvas Container with absolute positioning to fill parent */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Spatial Legend Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 shadow-xl space-y-1">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-1 rounded bg-emerald-500 inline-block" />
          <span className="font-bold">Driving Route</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-400 border-dashed inline-block" />
          <span>Scout Corridor Buffer</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-white inline-block" />
          <span>Corridor Permit Leads</span>
        </div>
      </div>
    </div>
  );
};
