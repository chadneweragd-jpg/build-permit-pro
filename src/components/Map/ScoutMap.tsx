'use client';

import React from 'react';
import { MapContainer, MapContainerProps } from './MapContainer';
import { RouteGeometry } from '@/lib/spatial';
import { Permit, RouteStop } from '@/types';

export interface ScoutMapProps extends MapContainerProps {
  routeGeometry?: RouteGeometry | null;
  bufferPolygonGeoJSON?: any | null;
  corridorPermits?: Permit[];
  originCoords?: [number, number]; // [lng, lat]
  destinationCoords?: [number, number]; // [lng, lat]
  stops?: RouteStop[];
  bufferKm?: number;
  onBufferChange?: (km: number) => void;
  showBufferControls?: boolean;
}

/**
 * Dedicated BPP Scout Route Corridor Map Component
 * Renders the vibrant Blue Route Corridor (#2563eb, width 5),
 * Turf.js corridor buffer polygon, origin/destination pins, and nearby permits.
 */
export const ScoutMap: React.FC<ScoutMapProps> = (props) => {
  return (
    <MapContainer
      {...props}
      showBufferControls={props.showBufferControls ?? true}
      bufferKm={props.bufferKm ?? 3}
    />
  );
};

export default ScoutMap;
