import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PermitsRepository } from '@/lib/permits-repo';
import { fetchDrivingRoute, generateRouteBuffer, findPermitsInCorridor } from '@/lib/spatial';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      startLng,
      startLat,
      destLng,
      destLat,
      bufferKm = 3,
      workClasses
    } = body as {
      startLng: number;
      startLat: number;
      destLng: number;
      destLat: number;
      bufferKm?: number;
      workClasses?: string[];
    };

    if (!startLng || !startLat || !destLng || !destLat) {
      return NextResponse.json(
        { error: 'Origin (startLng, startLat) and Destination (destLng, destLat) coordinates are required.' },
        { status: 400 }
      );
    }

    // 1. Calculate the driving route
    const route = await fetchDrivingRoute(startLng, startLat, destLng, destLat);

    // 2. Generate the spatial buffer polygon using Turf.js
    const bufferPolygon = generateRouteBuffer(route, bufferKm);

    // 3. Attempt PostGIS stored procedure if Supabase is active
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('get_permits_along_corridor', {
          route_linestring_geojson: JSON.stringify(route.geometry),
          buffer_meters: bufferKm * 1000,
          target_work_classes: workClasses && workClasses.length > 0 ? workClasses : null
        });

        if (!error && data) {
          return NextResponse.json({
            route,
            bufferPolygon,
            bufferKm,
            permits: data,
            source: 'postgis'
          });
        }
      } catch (postgisErr) {
        console.warn('PostGIS corridor RPC failed, falling back to Turf.js client spatial engine:', postgisErr);
      }
    }

    // 4. Fallback Turf.js high-performance spatial containment and distance query
    const allPermits = PermitsRepository.getAllPermits();
    const filteredByClass = workClasses && workClasses.length > 0
      ? allPermits.filter(p => workClasses.includes(p.work_class))
      : allPermits;

    const permitsInside = findPermitsInCorridor(filteredByClass, route, bufferPolygon);

    return NextResponse.json({
      route,
      bufferPolygon,
      bufferKm,
      permits: permitsInside,
      source: 'turf_spatial'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
