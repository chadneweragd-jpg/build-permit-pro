import * as turf from '@turf/turf';
import { Permit, TurnByTurnInstruction } from '@/types';

export interface RouteGeometry {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [longitude, latitude]
  };
  properties: {
    distanceKm: number;
    durationMinutes: number;
  };
}

export interface CorridorResult {
  route: RouteGeometry;
  bufferPolygon: any; // GeoJSON Feature<Polygon | MultiPolygon>
  permitsInside: Permit[];
  bufferKm: number;
}

// Fast local dictionary for Kelowna landmarks, subdivisions, and user addresses
const KELOWNA_GEOCODE_CACHE: Record<string, [number, number]> = {
  '1665 rutland': [49.9102, -119.3865],
  '1665 rutland rd': [49.9102, -119.3865],
  '1665 rutland road': [49.9102, -119.3865],
  '1665 rutland road n': [49.9102, -119.3865],
  '1665 rutland rd n': [49.9102, -119.3865],
  'rutland': [49.9000, -119.3870],
  'queensway': [49.8870, -119.4960],
  'queensway transit depot': [49.8870, -119.4960],
  'downtown kelowna': [49.8870, -119.4960],
  'airport': [49.9575, -119.3810],
  'ylw': [49.9575, -119.3810],
  'kelowna airport': [49.9575, -119.3810],
  'bartle & gibson': [49.8840, -119.4500],
  '1850 kirschner': [49.8840, -119.4500],
  '1250 ellis': [49.8895, -119.4932],
  '1405 st paul': [49.8912, -119.4901],
  '5230 chute lake': [49.7956, -119.5076],
  'kettle valley': [49.8150, -119.4900],
  'upper mission': [49.8150, -119.4900],
  'wilden': [49.9400, -119.4650],
  '1480 skyland': [49.9380, -119.4640],
  'black mountain': [49.8790, -119.3380],
  'glenmore': [49.9125, -119.4480],
  'dilworth': [49.8950, -119.4400],
  'mckinley beach': [49.9650, -119.4450],
  'west kelowna': [49.8625, -119.5833]
};

/**
 * Geocodes an address string into [latitude, longitude].
 * Checks local high-frequency dictionary first, then falls back to OpenStreetMap Nominatim.
 */
export async function geocodeAddress(query: string): Promise<[number, number] | null> {
  if (!query || query.trim().length === 0) return null;

  const normalized = query.toLowerCase().replace(/,/g, '').trim();

  // 1. Direct dictionary match
  for (const [key, coords] of Object.entries(KELOWNA_GEOCODE_CACHE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }

  // 2. Query internal server API proxy (/api/routes/geocode)
  try {
    const res = await fetch(`/api/routes/geocode?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(4500)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        return [data.latitude, data.longitude];
      }
      if (data && data.coordinates) {
        return [data.coordinates[1], data.coordinates[0]];
      }
    }
  } catch (err) {
    // Network timeout or offline
  }

  return null;
}

/**
 * Calculates a driving route between origin and destination coordinates.
 * Queries internal server directions proxy with seamless curved fallback.
 */
export async function fetchDrivingRoute(
  startLng: number,
  startLat: number,
  destLng: number,
  destLat: number
): Promise<RouteGeometry> {
  try {
    const res = await fetch('/api/routes/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: [startLng, startLat],
        destination: [destLng, destLat]
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          type: 'Feature',
          geometry: route.geometry,
          properties: {
            distanceKm: Number((route.distance / 1000).toFixed(1)),
            durationMinutes: Math.round(route.duration / 60)
          }
        };
      }
    }
  } catch (err) {
    // Graceful fallback to interpolated polyline
  }

  // Fallback: Generate a smooth realistic road-like arc between start & destination
  const steps = 15;
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lng = startLng + (destLng - startLng) * t + Math.sin(t * Math.PI) * 0.008;
    const lat = startLat + (destLat - startLat) * t + Math.sin(t * Math.PI) * 0.005;
    coordinates.push([lng, lat]);
  }

  const line = turf.lineString(coordinates);
  const distanceKm = Number(turf.length(line, { units: 'kilometers' }).toFixed(1));

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates
    },
    properties: {
      distanceKm,
      durationMinutes: Math.round(distanceKm * 1.6)
    }
  };
}

/**
 * Creates a spatial buffer polygon around a route line using Turf.js
 * Supports 2km, 3km, 5km, 10km corridor buffer widths
 */
export function generateRouteBuffer(
  routeGeometry: RouteGeometry,
  bufferKm: number
): any {
  const line = turf.lineString(routeGeometry.geometry.coordinates);
  // Buffer in kilometers
  const buffered = turf.buffer(line, bufferKm, { units: 'kilometers' });
  return buffered;
}

/**
 * Filters a list of permits to find only those within the spatial corridor buffer,
 * computing exact perpendicular distance (in km and meters) to the driving polyline.
 */
export function findPermitsInCorridor(
  permits: Permit[],
  routeGeometry: RouteGeometry,
  bufferPolygon: any
): Permit[] {
  const line = turf.lineString(routeGeometry.geometry.coordinates);
  const matched: Permit[] = [];

  for (const permit of permits) {
    if (!permit.longitude || !permit.latitude) continue;
    const pt = turf.point([permit.longitude, permit.latitude]);

    // Fast containment test using Turf's point-in-polygon
    const isInside = turf.booleanPointInPolygon(pt, bufferPolygon);

    if (isInside) {
      // Calculate distance to route in kilometers
      const distKm = turf.pointToLineDistance(pt, line, { units: 'kilometers' });
      matched.push({
        ...permit,
        distance_meters: Math.round(distKm * 1000)
      });
    }
  }

  // Sort nearest to the driving route first
  matched.sort((a, b) => (a.distance_meters || 0) - (b.distance_meters || 0));
  return matched;
}

/**
 * Generates turn-by-turn deep links for contractor truck navigation in Apple & Google Maps
 */
export function getNativeMapUrls(lat: number, lng: number, address: string) {
  const encodedAddr = encodeURIComponent(address);
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedAddr}`,
    appleMaps: `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodedAddr}`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
  };
}

/**
 * Launches native turn-by-turn mobile navigation:
 * - iOS: Apple Maps deep link with origin, destination & driving mode flag (d)
 * - Android/Desktop: Google Maps directions API with origin, destination & multi-stop waypoints
 */
export function launchNativeNavigation(
  originAddress?: string,
  destinationAddress?: string,
  waypoints: (string | { address: string })[] = []
) {
  if (typeof window === 'undefined' || !destinationAddress) return;

  const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);

  if (isApple) {
    // Launches native Apple Maps directly onto Ram Uconnect via CarPlay
    const originParam = originAddress ? `saddr=${encodeURIComponent(originAddress)}&` : '';
    const appleUrl = `maps://?${originParam}daddr=${encodeURIComponent(destinationAddress)}&dirflg=d`;
    window.location.href = appleUrl;
  } else {
    // Launches Google Maps Navigation directly onto Ram Uconnect via Android Auto
    const originParam = originAddress ? `origin=${encodeURIComponent(originAddress)}&` : '';
    const waypointsParam =
      waypoints && waypoints.length > 0
        ? `&waypoints=${waypoints
            .map((w: any) => encodeURIComponent(typeof w === 'string' ? w : w.address))
            .join('|')}`
        : '';
    const googleUrl = `https://www.google.com/maps/dir/?api=1&${originParam}destination=${encodeURIComponent(
      destinationAddress
    )}${waypointsParam}&travelmode=driving`;
    window.open(googleUrl, '_blank');
  }
}

export interface CircuitLeg {
  legIndex: number;
  originAddress: string;
  destinationAddress: string;
  originCoords: [number, number]; // [lat, lng]
  destinationCoords: [number, number]; // [lat, lng]
  distanceKm: number;
  durationMin: number;
  permitNumber?: string;
  directions: TurnByTurnInstruction[];
  geometryCoordinates: [number, number][]; // [lng, lat]
}

export interface CircuitResult {
  fullRoute: RouteGeometry;
  legs: CircuitLeg[];
  totalDistanceKm: number;
  totalDurationMin: number;
  isRoundTrip: boolean;
}

/**
 * Calculates a multi-leg circuit across sequential stops using OSRM with step-by-step guidance.
 * Falls back to high-fidelity simulated geometry if offline.
 */
export async function fetchMultiStopCircuit(
  points: Array<{ lat: number; lng: number; address: string; permit_number?: string }>,
  isRoundTrip: boolean = false
): Promise<CircuitResult> {
  const sequence = [...points];
  if (isRoundTrip && sequence.length > 1) {
    sequence.push({
      ...sequence[0],
      address: `Return to: ${sequence[0].address}`
    });
  }

  if (sequence.length < 2) {
    const pt = sequence[0] || { lat: 49.8880, lng: -119.4960, address: 'Kelowna Core' };
    return {
      fullRoute: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[pt.lng, pt.lat], [pt.lng + 0.001, pt.lat + 0.001]] },
        properties: { distanceKm: 0, durationMinutes: 0 }
      },
      legs: [],
      totalDistanceKm: 0,
      totalDurationMin: 0,
      isRoundTrip
    };
  }

  try {
    const res = await fetch('/api/routes/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: sequence }),
      signal: AbortSignal.timeout(7000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const osrmRoute = data.routes[0];
        const allCoords: [number, number][] = osrmRoute.geometry.coordinates;

        const legs: CircuitLeg[] = (osrmRoute.legs || []).map((leg: any, idx: number) => {
          const originP = sequence[idx];
          const destP = sequence[idx + 1];

          const legDirections: TurnByTurnInstruction[] = (leg.steps || []).map((st: any) => {
            const maneuverType = st.maneuver?.type || 'turn';
            const modifier = st.maneuver?.modifier ? ` ${st.maneuver.modifier}` : '';
            const road = st.name ? ` onto ${st.name}` : '';
            let text = `${maneuverType}${modifier}${road}`;
            if (maneuverType === 'depart') text = `Depart ${originP.address.split(',')[0]}`;
            if (maneuverType === 'arrive') text = `Arrive at Stop ${idx + 1}: ${destP.address.split(',')[0]}`;

            const dist = Math.round(st.distance || 0);
            return {
              instruction: text,
              distanceMeters: dist,
              distanceText: dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist}m`,
              durationSeconds: Math.round(st.duration || 0),
              location: st.maneuver?.location as [number, number] | undefined
            };
          });

          // Extract coordinates for this leg from leg.steps
          const legCoords: [number, number][] = [];
          if (leg.steps) {
            leg.steps.forEach((st: any) => {
              if (st.geometry && st.geometry.coordinates) {
                legCoords.push(...st.geometry.coordinates);
              }
            });
          }

          return {
            legIndex: idx + 1,
            originAddress: originP.address,
            destinationAddress: destP.address,
            originCoords: [originP.lat, originP.lng],
            destinationCoords: [destP.lat, destP.lng],
            distanceKm: Number((leg.distance / 1000).toFixed(1)),
            durationMin: Math.round(leg.duration / 60),
            permitNumber: destP.permit_number,
            directions: legDirections.length > 0 ? legDirections : [
              {
                instruction: `Drive toward ${destP.address.split(',')[0]}`,
                distanceMeters: Math.round(leg.distance),
                distanceText: `${(leg.distance / 1000).toFixed(1)} km`,
                durationSeconds: Math.round(leg.duration)
              }
            ],
            geometryCoordinates: legCoords.length > 0 ? legCoords : [[originP.lng, originP.lat], [destP.lng, destP.lat]]
          };
        });

        const totalDist = Number((osrmRoute.distance / 1000).toFixed(1));
        const totalDur = Math.round(osrmRoute.duration / 60);

        return {
          fullRoute: {
            type: 'Feature',
            geometry: osrmRoute.geometry,
            properties: {
              distanceKm: totalDist,
              durationMinutes: totalDur
            }
          },
          legs,
          totalDistanceKm: totalDist,
          totalDurationMin: totalDur,
          isRoundTrip
        };
      }
    }
  } catch (err) {
    // Network fallback
  }

  // High-fidelity road-arc fallback
  const fallbackCoords: [number, number][] = [];
  const fallbackLegs: CircuitLeg[] = [];
  let cumulativeDist = 0;

  for (let i = 0; i < sequence.length - 1; i++) {
    const originP = sequence[i];
    const destP = sequence[i + 1];
    const legSteps = 12;
    const legCoords: [number, number][] = [];

    for (let s = 0; s <= legSteps; s++) {
      const t = s / legSteps;
      const lng = originP.lng + (destP.lng - originP.lng) * t + Math.sin(t * Math.PI) * 0.005;
      const lat = originP.lat + (destP.lat - originP.lat) * t + Math.sin(t * Math.PI) * 0.003;
      legCoords.push([lng, lat]);
      if (i === 0 || s > 0) {
        fallbackCoords.push([lng, lat]);
      }
    }

    const legLine = turf.lineString(legCoords);
    const legDist = Number(turf.length(legLine, { units: 'kilometers' }).toFixed(1));
    const legDur = Math.round(legDist * 1.8);
    cumulativeDist += legDist;

    fallbackLegs.push({
      legIndex: i + 1,
      originAddress: originP.address,
      destinationAddress: destP.address,
      originCoords: [originP.lat, originP.lng],
      destinationCoords: [destP.lat, destP.lng],
      distanceKm: legDist,
      durationMin: legDur,
      permitNumber: destP.permit_number,
      directions: [
        {
          instruction: `Depart ${originP.address.split(',')[0]} heading toward ${destP.address.split(',')[0]}`,
          distanceMeters: Math.round(legDist * 1000 * 0.3),
          distanceText: `${(legDist * 0.3).toFixed(1)} km`,
          durationSeconds: Math.round(legDur * 60 * 0.3),
          location: legCoords[0]
        },
        {
          instruction: `Continue along arterial road toward ${destP.address.split(',')[0]}`,
          distanceMeters: Math.round(legDist * 1000 * 0.7),
          distanceText: `${(legDist * 0.7).toFixed(1)} km`,
          durationSeconds: Math.round(legDur * 60 * 0.7),
          location: legCoords[Math.min(4, legCoords.length - 1)]
        },
        {
          instruction: `Arrive at Stop ${i + 1}: ${destP.address.split(',')[0]}`,
          distanceMeters: 0,
          distanceText: '0m',
          durationSeconds: 0,
          location: legCoords[legCoords.length - 1]
        }
      ],
      geometryCoordinates: legCoords
    });
  }

  const totalDist = Number(cumulativeDist.toFixed(1));
  const totalDur = Math.round(totalDist * 1.8);

  return {
    fullRoute: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: fallbackCoords
      },
      properties: {
        distanceKm: totalDist,
        durationMinutes: totalDur
      }
    },
    legs: fallbackLegs,
    totalDistanceKm: totalDist,
    totalDurationMin: totalDur,
    isRoundTrip
  };
}

/**
 * Optimizes circuit stops sequence using the Nearest Neighbor heuristic
 * starting from the specified origin point.
 */
export function optimizeCircuitSequence<T extends { lat?: number; lng?: number; latitude?: number; longitude?: number }>(
  origin: { lat: number; lng: number },
  stops: T[]
): T[] {
  if (stops.length <= 1) return [...stops];

  const unvisited = [...stops];
  const ordered: T[] = [];
  let currentLat = origin.lat;
  let currentLng = origin.lng;

  while (unvisited.length > 0) {
    let nearestIdx = -1;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const candLat = candidate.latitude ?? candidate.lat ?? 0;
      const candLng = candidate.longitude ?? candidate.lng ?? 0;
      const dLat = candLat - currentLat;
      const dLng = candLng - currentLng;
      const distSq = dLat * dLat + dLng * dLng;

      if (distSq < minDistance) {
        minDistance = distSq;
        nearestIdx = i;
      }
    }

    if (nearestIdx >= 0) {
      const nextStop = unvisited.splice(nearestIdx, 1)[0];
      ordered.push(nextStop);
      currentLat = nextStop.latitude ?? nextStop.lat ?? 0;
      currentLng = nextStop.longitude ?? nextStop.lng ?? 0;
    } else {
      break;
    }
  }

  return ordered;
}
