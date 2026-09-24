'use client';

import { useState, useCallback } from 'react';
import { Permit } from '@/types';
import {
  RouteGeometry,
  generateRouteBuffer,
  findPermitsInCorridor,
  fetchDrivingRoute
} from '@/lib/spatial';

export interface UseScoutRouteOptions {
  initialBufferKm?: number;
}

export function useScoutRoute(options?: UseScoutRouteOptions) {
  const [bufferKm, setBufferKmState] = useState<number>(options?.initialBufferKm || 3);
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);
  const [bufferPolygon, setBufferPolygon] = useState<any | null>(null);
  const [corridorPermits, setCorridorPermits] = useState<Permit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generates turn-by-turn deep links for in-cab contractor dispatch
   */
  const getGoogleMapsUrl = useCallback(
    (origin: string, destination: string, waypoints: string[] = []): string => {
      const originParam = `origin=${encodeURIComponent(origin)}`;
      const destParam = `destination=${encodeURIComponent(destination)}`;
      const waypointsParam =
        waypoints.length > 0 ? `&waypoints=${waypoints.map(encodeURIComponent).join('|')}` : '';
      return `https://www.google.com/maps/dir/?api=1&${originParam}&${destParam}${waypointsParam}&travelmode=driving`;
    },
    []
  );

  const getWazeUrl = useCallback((lat: number, lng: number): string => {
    return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }, []);

  /**
   * Calculates driving route corridor between origin and destination, generates Turf buffer polygon,
   * and queries nearby commercial permits.
   */
  const calculateRoute = useCallback(
    async (
      origin: [number, number], // [lng, lat]
      destination: [number, number], // [lng, lat]
      waypoints: [number, number][] = [],
      permitsPool: Permit[] = [],
      overrideBufferKm?: number
    ) => {
      setIsLoading(true);
      setError(null);

      const activeBufferKm = overrideBufferKm ?? bufferKm;

      try {
        let routeGeo: RouteGeometry | null = null;

        // 1. Query routing proxy
        const res = await fetch('/api/routes/directions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            destination,
            waypoints
          }),
          signal: AbortSignal.timeout(7000)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const osrmRoute = data.routes[0];
            routeGeo = {
              type: 'Feature',
              geometry: osrmRoute.geometry,
              properties: {
                distanceKm: Number((osrmRoute.distance / 1000).toFixed(1)),
                durationMinutes: Math.round(osrmRoute.duration / 60)
              }
            };
          }
        }

        // Fallback to spatial helper if upstream timeout
        if (!routeGeo) {
          routeGeo = await fetchDrivingRoute(origin[0], origin[1], destination[0], destination[1]);
        }

        setRouteGeometry(routeGeo);

        // 2. Generate Buffer Polygon via Turf.js
        const buffer = generateRouteBuffer(routeGeo, activeBufferKm);
        setBufferPolygon(buffer);

        // 3. Query permits inside corridor buffer
        if (permitsPool && permitsPool.length > 0) {
          const inside = findPermitsInCorridor(permitsPool, routeGeo, buffer);
          setCorridorPermits(inside);
        } else {
          setCorridorPermits([]);
        }

        return { routeGeometry: routeGeo, bufferPolygon: buffer };
      } catch (err: any) {
        console.error('useScoutRoute calculation failed:', err);
        setError(err.message || 'Failed to calculate driving route');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [bufferKm]
  );

  const setBufferKm = useCallback(
    (km: number, currentPermits?: Permit[]) => {
      setBufferKmState(km);
      if (routeGeometry) {
        const buffer = generateRouteBuffer(routeGeometry, km);
        setBufferPolygon(buffer);
        if (currentPermits && currentPermits.length > 0) {
          const inside = findPermitsInCorridor(currentPermits, routeGeometry, buffer);
          setCorridorPermits(inside);
        }
      }
    },
    [routeGeometry]
  );

  return {
    routeGeometry,
    bufferPolygon,
    corridorPermits,
    bufferKm,
    setBufferKm,
    isLoading,
    error,
    calculateRoute,
    getGoogleMapsUrl,
    getWazeUrl
  };
}
