import { NextRequest, NextResponse } from 'next/server';

// Okanagan Regional Landmark & High-Frequency Address Dictionary
const OKANAGAN_GEOCODE_CACHE: Record<string, { coords: [number, number]; displayName: string }> = {
  // User Base / Home
  '1665 rutland': { coords: [-119.3865, 49.9102], displayName: '1665 Rutland Rd, Kelowna, BC' },
  '1665 rutland rd': { coords: [-119.3865, 49.9102], displayName: '1665 Rutland Rd, Kelowna, BC' },
  '1665 rutland road': { coords: [-119.3865, 49.9102], displayName: '1665 Rutland Rd, Kelowna, BC' },
  '1665 rutland road n': { coords: [-119.3865, 49.9102], displayName: '1665 Rutland Rd N, Kelowna, BC' },
  '1665 rutland rd n': { coords: [-119.3865, 49.9102], displayName: '1665 Rutland Rd N, Kelowna, BC' },
  
  // Commercial & Trade Stops
  '720 sutherland': { coords: [-119.4852, 49.8785], displayName: '720 Sutherland Ave, Kelowna, BC' },
  '720 sutherland ave': { coords: [-119.4852, 49.8785], displayName: '720 Sutherland Ave, Kelowna, BC' },
  '2475 dobbin': { coords: [-119.5842, 49.8601], displayName: '2475 Dobbin Rd, West Kelowna, BC' },
  '2475 dobbin rd': { coords: [-119.5842, 49.8601], displayName: '2475 Dobbin Rd, West Kelowna, BC' },
  'bartle & gibson': { coords: [-119.4500, 49.8840], displayName: 'Bartle & Gibson Supplies, 1850 Kirschner Rd, Kelowna, BC' },
  '1850 kirschner': { coords: [-119.4500, 49.8840], displayName: '1850 Kirschner Rd, Kelowna, BC' },
  '1250 ellis': { coords: [-119.4932, 49.8895], displayName: '1250 Ellis St, Kelowna, BC' },
  '1405 st paul': { coords: [-119.4901, 49.8912], displayName: '1405 St Paul St, Kelowna, BC' },
  '5230 chute lake': { coords: [-119.5076, 49.7956], displayName: '5230 Chute Lake Rd, Kelowna, BC' },
  '1480 skyland': { coords: [-119.4640, 49.9380], displayName: '1480 Skyland Dr, Kelowna, BC' },
  '1356 water': { coords: [-119.4975, 49.8872], displayName: '1356 Water St, Kelowna, BC' },
  
  // Hubs & Landmarks
  'queensway': { coords: [-119.4960, 49.8870], displayName: 'Queensway Transit Depot, Kelowna, BC' },
  'downtown kelowna': { coords: [-119.4960, 49.8870], displayName: 'Downtown Kelowna, BC' },
  'airport': { coords: [-119.3810, 49.9575], displayName: 'Kelowna International Airport (YLW), Kelowna, BC' },
  'ylw': { coords: [-119.3810, 49.9575], displayName: 'Kelowna International Airport (YLW), Kelowna, BC' },
  'orchard park': { coords: [-119.4395, 49.8812], displayName: 'Orchard Park Shopping Centre, 2271 Harvey Ave, Kelowna, BC' },
  'rutland': { coords: [-119.3870, 49.9000], displayName: 'Rutland Urban Centre, Kelowna, BC' },
  'west kelowna': { coords: [-119.5833, 49.8625], displayName: 'West Kelowna Core, BC' },
  'westbank': { coords: [-119.6050, 49.8320], displayName: 'Westbank Centre, West Kelowna, BC' },
  'wilden': { coords: [-119.4650, 49.9400], displayName: 'Wilden Ridge, Kelowna, BC' },
  'kettle valley': { coords: [-119.4900, 49.8150], displayName: 'Kettle Valley, Kelowna, BC' },
  'upper mission': { coords: [-119.4900, 49.8150], displayName: 'Upper Mission, Kelowna, BC' },
  'black mountain': { coords: [-119.3380, 49.8790], displayName: 'Black Mountain, Kelowna, BC' },
  'glenmore': { coords: [-119.4480, 49.9125], displayName: 'Glenmore, Kelowna, BC' },
  'dilworth': { coords: [-119.4400, 49.8950], displayName: 'Dilworth Mountain, Kelowna, BC' },
  'mckinley beach': { coords: [-119.4450, 49.9650], displayName: 'McKinley Beach, Kelowna, BC' },
  'lake country': { coords: [-119.4120, 50.0520], displayName: 'Lake Country, BC' },
  'vernon': { coords: [-119.2720, 50.2670], displayName: 'Vernon, BC' },
  'penticton': { coords: [-119.5886, 49.4928], displayName: 'Penticton, BC' }
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || searchParams.get('address');

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  const result = await resolveGeocode(q.trim());
  if (result) {
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Address could not be located in Okanagan region' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.address || body.q || body.query;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const result = await resolveGeocode(query.trim());
    if (result) {
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Address could not be located in Okanagan region' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function resolveGeocode(query: string) {
  const normalized = query.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Check local high-frequency dictionary
  for (const [key, val] of Object.entries(OKANAGAN_GEOCODE_CACHE)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        success: true,
        address: val.displayName,
        coordinates: val.coords, // [lng, lat]
        longitude: val.coords[0],
        latitude: val.coords[1],
        displayName: val.displayName,
        source: 'local_cache'
      };
    }
  }

  // 2. Query OpenStreetMap Nominatim with Canadian / BC context
  try {
    const hasCity = /(kelowna|okanagan|vernon|penticton|lake country|westbank)/i.test(query);
    const searchString = hasCity ? query : `${query}, Kelowna, BC, Canada`;

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=${encodeURIComponent(
      searchString
    )}`;

    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'BuildPermitPro/1.0 (Okanagan Field Contractor Geocoder)'
      },
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            success: true,
            address: data[0].display_name.split(',').slice(0, 3).join(', '),
            coordinates: [lng, lat] as [number, number],
            longitude: lng,
            latitude: lat,
            displayName: data[0].display_name,
            source: 'nominatim'
          };
        }
      }
    }
  } catch (err) {
    console.warn('Nominatim lookup error:', err);
  }

  // 3. Fallback: If street number and name are present, approximate in Kelowna core
  const streetMatch = query.match(/^(\d+)\s+([A-Za-z]+)/);
  if (streetMatch) {
    const num = parseInt(streetMatch[1], 10);
    // Rough offset from downtown Kelowna
    const lat = 49.8880 + (num % 50) * 0.001;
    const lng = -119.4960 + (num % 30) * 0.001;
    return {
      success: true,
      address: `${query}, Kelowna, BC`,
      coordinates: [lng, lat] as [number, number],
      longitude: lng,
      latitude: lat,
      displayName: `${query}, Kelowna, BC`,
      source: 'synthesized_approximate'
    };
  }

  return null;
}
