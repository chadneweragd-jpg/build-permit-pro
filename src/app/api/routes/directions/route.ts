import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { origin, destination, waypoints, points } = body;

    // Support points array: [{ lat, lng }] or [[lng, lat]]
    if (points && Array.isArray(points) && points.length >= 2) {
      const normalized = points.map((p: any) => {
        if (Array.isArray(p)) return p;
        if (typeof p === 'object' && p !== null) {
          return [p.lng ?? p.lon ?? p.longitude, p.lat ?? p.latitude];
        }
        return [0, 0];
      });
      origin = normalized[0];
      destination = normalized[normalized.length - 1];
      waypoints = normalized.slice(1, -1);
    }

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination coordinates required' },
        { status: 400 }
      );
    }

    // Coordinates are [lng, lat]
    // Build coordinate string: origin;waypoint1;waypoint2;destination
    const coordString = [
      `${origin[0]},${origin[1]}`,
      ...(waypoints || []).map((w: [number, number]) => `${w[0]},${w[1]}`),
      `${destination[0]},${destination[1]}`
    ].join(';');

    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BuildPermitPro-Nav/1.0 (Commercial Contractor In-Cab Navigation)'
      },
      next: { revalidate: 60 } // Cache routes briefly for snappy repeat requests
    });

    if (!res.ok) {
      throw new Error(`OSRM routing upstream responded with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Directions server proxy error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal routing proxy failed' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const coordParam = searchParams.get('coordinates'); // "lng1,lat1;lng2,lat2"
    let coordString = '';

    if (coordParam) {
      coordString = coordParam;
    } else {
      const originParam = searchParams.get('origin'); // "lng,lat"
      const destParam = searchParams.get('destination'); // "lng,lat"
      const waypointsParam = searchParams.get('waypoints'); // "lng1,lat1;lng2,lat2"

      if (!originParam || !destParam) {
        return NextResponse.json(
          { error: 'origin and destination query params (or coordinates) required' },
          { status: 400 }
        );
      }

      const coordParts = [originParam];
      if (waypointsParam) {
        coordParts.push(...waypointsParam.split(';'));
      }
      coordParts.push(destParam);
      coordString = coordParts.join(';');
    }
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=true`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BuildPermitPro-Nav/1.0'
      }
    });

    if (!res.ok) {
      throw new Error(`OSRM routing failed with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Directions GET proxy error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
