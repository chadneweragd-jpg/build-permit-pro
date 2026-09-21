'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Permit } from '@/types';

interface HeatmapLayerProps {
  permits: Permit[];
  isVisible: boolean;
  isDimmed: boolean; // Dynamic dimming in route mode
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ permits, isVisible, isDimmed }) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map) return;

    // Clean up existing layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!isVisible || permits.length === 0) return;

    // Build intensity points: [lat, lng, normalized_intensity]
    // Normalized by estimated_value (log scale for smooth density visualization)
    const points = permits
      .filter((p) => p.latitude && p.longitude)
      .map((p) => {
        const val = p.estimated_value || 500000;
        // Intensity between 0.3 and 1.0 based on valuation
        const intensity = Math.min(Math.max(Math.log10(val) / 8, 0.3), 1.0);
        return [p.latitude, p.longitude, intensity];
      });

    // Determine opacity: if route mode is active, dynamically dim the heatmap!
    const targetOpacity = isDimmed ? 0.18 : 0.75;

    try {
      const heat = (L as any).heatLayer(points, {
        radius: 35,
        blur: 25,
        maxZoom: 16,
        max: 1.0,
        minOpacity: isDimmed ? 0.08 : 0.25,
        gradient: {
          0.2: '#3b82f6', // blue (low)
          0.4: '#10b981', // green
          0.6: '#f59e0b', // amber
          0.8: '#ef4444', // red
          1.0: '#7c3aed'  // purple high-rise concentration
        }
      });

      heat.addTo(map);
      heatLayerRef.current = heat;

      // Adjust layer container opacity if dimmed
      const heatContainer = heat._el || (map.getPanes().overlayPane.querySelector('canvas') as HTMLCanvasElement);
      if (heatContainer) {
        heatContainer.style.opacity = `${targetOpacity}`;
        heatContainer.style.transition = 'opacity 0.4s ease-in-out';
      }
    } catch (e) {
      console.warn('Failed to initialize Leaflet heat layer:', e);
    }

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, permits, isVisible, isDimmed]);

  return null;
};
