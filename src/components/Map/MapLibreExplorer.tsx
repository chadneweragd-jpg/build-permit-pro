'use client';

import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Permit } from '@/types';
import { Layers, Maximize2, Minimize2, ZoomIn, ZoomOut, Flame } from 'lucide-react';

interface MapLibreExplorerProps {
  permits: Permit[];
  selectedPermit: Permit | null;
  onSelectPermit: (permit: Permit) => void;
  onSelectPermitId?: (permitId: string) => void;
  center?: [number, number]; // [lng, lat]
  zoom?: number;
}

export const MapLibreExplorer: React.FC<MapLibreExplorerProps> = ({
  permits,
  selectedPermit,
  onSelectPermit,
  onSelectPermitId,
  center = [-119.4960, 49.8880],
  zoom = 12
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const permitsRef = useRef<Permit[]>(permits);
  permitsRef.current = permits;
  const onSelectPermitRef = useRef(onSelectPermit);
  onSelectPermitRef.current = onSelectPermit;
  const onSelectPermitIdRef = useRef(onSelectPermitId);
  onSelectPermitIdRef.current = onSelectPermitId;
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Convert permits to GeoJSON FeatureCollection
  const geojsonData = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: permits
        .filter((p) => p.longitude && p.latitude)
        .map((p) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude, p.latitude]
          },
          properties: {
            id: p.id,
            permit_number: p.permit_number,
            address: p.address,
            estimated_value: p.estimated_value || 0,
            permit_type: p.permit_type,
            work_class: p.work_class,
            trades_count: p.trades.length,
            primary_trade_color: p.trades[0]?.color || '#2563EB'
          }
        }))
    };
  }, [permits]);

  // Initialize MapLibre GL Map
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

      // 1. Add Clustered Permits GeoJSON Source
      map.addSource('permits-source', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // 2. Construction Activity Heat Map Layer (Density of Construction Valuation)
      map.addLayer({
        id: 'permits-heat',
        type: 'heatmap',
        source: 'permits-source',
        maxzoom: 15,
        layout: {
          visibility: 'none'
        },
        paint: {
          // Increase weight based on construction dollar valuation
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'estimated_value'],
            0, 0.2,
            5000000, 0.6,
            50000000, 1.0
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 1,
            15, 3
          ],
          // Color ramp from blue to green to yellow to red
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(37, 99, 235, 0)',
            0.2, 'rgb(59, 130, 246)',
            0.4, 'rgb(16, 185, 129)',
            0.6, 'rgb(245, 158, 11)',
            0.8, 'rgb(239, 68, 68)',
            1.0, 'rgb(147, 51, 234)'
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 20,
            15, 45
          ],
          'heatmap-opacity': 0.85
        }
      });

      // 3. Clustered Bubbles: Green for 100+, Blue for smaller counts
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'permits-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#2563EB', // Blue for smaller counts (< 100)
            100,
            '#16A34A'  // Green for 100+ counts
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18,
            20, 22,
            50, 26,
            100, 32
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff'
        }
      });

      // Cluster Count Labels
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'permits-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // 4. Individual Pins: Red Pins that explode upon zooming
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'permits-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#DC2626', // Red individual pins per spec
          'circle-radius': 7,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff'
        }
      });

      // 5. Selected Permit Blue Target Ring Layer
      map.addSource('selected-permit-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: 'selected-target-ring',
        type: 'circle',
        source: 'selected-permit-source',
        paint: {
          'circle-radius': 16,
          'circle-color': 'rgba(37, 99, 235, 0.25)',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#2563EB'
        }
      });

      // Interaction: Click on Cluster zooms in
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource('permits-source') as maplibregl.GeoJSONSource;
        if (source && clusterId !== undefined) {
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            map.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom + 1
            });
          });
        }
      });

      // Interaction: Click on Unclustered Point
      map.on('click', 'unclustered-point', (e) => {
        const feature = e.features?.[0];
        if (feature) {
          const permitId = feature.properties?.id;
          if (permitId && onSelectPermitIdRef.current) {
            onSelectPermitIdRef.current(permitId);
          }
          const found = permitsRef.current.find((p) => p.id === permitId || p.permit_number === permitId);
          if (found && onSelectPermitRef.current) {
            onSelectPermitRef.current(found);
          }
        }
      });

      // Cursor Pointers
      map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''));
      map.on('mouseenter', 'unclustered-point', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'unclustered-point', () => (map.getCanvas().style.cursor = ''));
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update GeoJSON source when permits change
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('permits-source') as maplibregl.GeoJSONSource;
    if (source && source.setData) {
      source.setData(geojsonData);
    }
  }, [geojsonData]);

  // Update Selected Permit Blue Target Ring
  useEffect(() => {
    if (!mapRef.current) return;
    const source = mapRef.current.getSource('selected-permit-source') as maplibregl.GeoJSONSource;
    if (source && source.setData) {
      if (selectedPermit && selectedPermit.longitude && selectedPermit.latitude) {
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [selectedPermit.longitude, selectedPermit.latitude]
              },
              properties: {}
            }
          ]
        });

        // Center map on selected permit
        mapRef.current.flyTo({
          center: [selectedPermit.longitude, selectedPermit.latitude],
          zoom: Math.max(mapRef.current.getZoom(), 13),
          essential: true
        });
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
    }
  }, [selectedPermit]);

  // Toggle Heatmap visibility
  const toggleHeatmap = () => {
    if (!mapRef.current) return;
    const nextVal = !isHeatmapVisible;
    setIsHeatmapVisible(nextVal);
    if (mapRef.current.getLayer('permits-heat')) {
      mapRef.current.setLayoutProperty(
        'permits-heat',
        'visibility',
        nextVal ? 'visible' : 'none'
      );
    }
  };

  // Zoom controls
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  // Fullscreen toggle
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
      {/* MapLibre Canvas Container with absolute positioning to fill parent */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Map Controls (Zoom +/-, Fullscreen, Heatmap Toggle) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        {/* Heat Map Layer Toggle */}
        <button
          onClick={toggleHeatmap}
          title="Toggle Construction Valuation Heat Map"
          className={`px-3 py-2 rounded-xl text-xs font-bold shadow-lg backdrop-blur-md border transition-all flex items-center space-x-1.5 ${
            isHeatmapVisible
              ? 'bg-red-600 text-white border-red-500 shadow-red-600/30'
              : 'bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white'
          }`}
        >
          <Flame className={`w-4 h-4 ${isHeatmapVisible ? 'text-white fill-white' : 'text-amber-500'}`} />
          <span>Heatmap</span>
        </button>

        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white shadow-lg backdrop-blur-md transition-all flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white shadow-lg backdrop-blur-md transition-all flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={handleToggleFullscreen}
          title="Toggle Fullscreen"
          className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white shadow-lg backdrop-blur-md transition-all flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Cluster Legend Indicator */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300 shadow-lg flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block border border-white" />
          <span>&lt; 100 Permits</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block border border-white" />
          <span>100+ Permits</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block border border-white" />
          <span>Individual Pin</span>
        </div>
      </div>
    </div>
  );
};
