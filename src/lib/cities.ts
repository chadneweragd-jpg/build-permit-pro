export interface CityConfig {
  id: string;
  name: string;
  province: string;
  region: string;
  hub: string;
  center: [number, number]; // [lng, lat] for MapLibre
  zoom: number;
  label?: string;
  tagline?: string;
}

export const SUPPORTED_CITIES: Record<string, CityConfig> = {
  kelowna: {
    id: 'kelowna',
    name: 'Kelowna',
    province: 'BC',
    region: 'Okanagan Valley',
    hub: 'City of Kelowna & Central Okanagan',
    center: [-119.4960, 49.8880],
    zoom: 12,
    label: 'Kelowna, BC',
    tagline: 'City of Kelowna & Central Okanagan'
  },
  vancouver: {
    id: 'vancouver',
    name: 'Vancouver',
    province: 'BC',
    region: 'Metro Vancouver',
    hub: 'City of Vancouver Open Data',
    center: [-123.1207, 49.2827],
    zoom: 12,
    label: 'Vancouver, BC',
    tagline: 'City of Vancouver Commercial Core'
  },
  surrey: {
    id: 'surrey',
    name: 'Surrey',
    province: 'BC',
    region: 'Metro Vancouver',
    hub: 'City of Surrey Open Data Portal',
    center: [-122.8490, 49.1913],
    zoom: 11,
    label: 'Surrey, BC',
    tagline: 'Surrey City Centre & Industrial'
  },
  burnaby: {
    id: 'burnaby',
    name: 'Burnaby',
    province: 'BC',
    region: 'Metro Vancouver',
    hub: 'City of Burnaby ArcGIS Hub',
    center: [-122.9805, 49.2488],
    zoom: 12,
    label: 'Burnaby, BC',
    tagline: 'Metrotown & Brentwood Corridors'
  },
  richmond: {
    id: 'richmond',
    name: 'Richmond',
    province: 'BC',
    region: 'Metro Vancouver',
    hub: 'City of Richmond Open Data',
    center: [-123.1336, 49.1666],
    zoom: 12,
    label: 'Richmond, BC',
    tagline: 'Lansdowne & Airport Commercial Hub'
  },
  coquitlam: {
    id: 'coquitlam',
    name: 'Coquitlam',
    province: 'BC',
    region: 'Tri-Cities',
    hub: 'City of Coquitlam ArcGIS Hub',
    center: [-122.7932, 49.2838],
    zoom: 12,
    label: 'Coquitlam, BC',
    tagline: 'Tri-Cities High-Density Pipeline'
  },
  calgary: {
    id: 'calgary',
    name: 'Calgary',
    province: 'AB',
    region: 'Calgary Metro',
    hub: 'City of Calgary Socrata Open Data',
    center: [-114.0719, 51.0447],
    zoom: 11,
    label: 'Calgary, AB',
    tagline: 'City of Calgary & Hub'
  },
  edmonton: {
    id: 'edmonton',
    name: 'Edmonton',
    province: 'AB',
    region: 'Capital Region',
    hub: 'City of Edmonton Socrata Open Data',
    center: [-113.4938, 53.5461],
    zoom: 11,
    label: 'Edmonton, AB',
    tagline: 'Edmonton Metro & ICE District'
  },
  toronto: {
    id: 'toronto',
    name: 'Toronto',
    province: 'ON',
    region: 'Greater Toronto Area',
    hub: 'City of Toronto CKAN Open Data',
    center: [-79.3832, 43.6532],
    zoom: 11,
    label: 'Toronto, ON',
    tagline: 'Toronto Downtown & Commercial Towers'
  },
  mississauga: {
    id: 'mississauga',
    name: 'Mississauga',
    province: 'ON',
    region: 'Peel Region / GTA',
    hub: 'City of Mississauga ArcGIS Hub',
    center: [-79.6441, 43.5890],
    zoom: 11,
    label: 'Mississauga, ON',
    tagline: 'Square One & Airport Corporate Hub'
  },
  brampton: {
    id: 'brampton',
    name: 'Brampton',
    province: 'ON',
    region: 'Peel Region / GTA',
    hub: 'City of Brampton GeoHub',
    center: [-79.7624, 43.7315],
    zoom: 11,
    label: 'Brampton, ON',
    tagline: 'Brampton Industrial Logistics & Housing'
  },
  markham: {
    id: 'markham',
    name: 'Markham',
    province: 'ON',
    region: 'York Region / GTA',
    hub: 'City of Markham ArcGIS Hub',
    center: [-79.3370, 43.8561],
    zoom: 11,
    label: 'Markham, ON',
    tagline: 'Markham Tech Hub & Commercial'
  },
  vaughan: {
    id: 'vaughan',
    name: 'Vaughan',
    province: 'ON',
    region: 'York Region / GTA',
    hub: 'City of Vaughan ArcGIS Open Data',
    center: [-79.5085, 43.8563],
    zoom: 11,
    label: 'Vaughan, ON',
    tagline: 'VMC Metropolitan Centre & Industrial'
  },
  hamilton: {
    id: 'hamilton',
    name: 'Hamilton',
    province: 'ON',
    region: 'Greater Golden Horseshoe',
    hub: 'City of Hamilton ArcGIS Open Data',
    center: [-79.8711, 43.2557],
    zoom: 11,
    label: 'Hamilton, ON',
    tagline: 'Hamilton Downtown & Heavy Industrial'
  },
  ottawa: {
    id: 'ottawa',
    name: 'Ottawa',
    province: 'ON',
    region: 'National Capital Region',
    hub: 'City of Ottawa ArcGIS GeoOttawa',
    center: [-75.6972, 45.4215],
    zoom: 11,
    label: 'Ottawa, ON',
    tagline: 'Ottawa National Capital Commercial Hub'
  },
  'kitchener-waterloo': {
    id: 'kitchener-waterloo',
    name: 'Kitchener-Waterloo',
    province: 'ON',
    region: 'Waterloo Region',
    hub: 'City of Kitchener ArcGIS Open Data',
    center: [-80.4925, 43.4516],
    zoom: 11,
    label: 'Kitchener-Waterloo, ON',
    tagline: 'Silicon Valley North Tech & Commercial'
  },
  winnipeg: {
    id: 'winnipeg',
    name: 'Winnipeg',
    province: 'MB',
    region: 'Winnipeg Capital Region',
    hub: 'City of Winnipeg Socrata Open Data',
    center: [-97.1384, 49.8951],
    zoom: 11,
    label: 'Winnipeg, MB',
    tagline: 'Portage & Main Commercial Hub'
  },
  // ADDED (2026-10-04): these three were already wired up as live data connectors
  // (src/lib/ingestion/connectors/registry.ts) but were missing from this UI-facing list, so
  // they could never appear in the city switcher even once their feeds started producing real
  // permits. CitySelector now only renders a city here if it also has live permits in Supabase
  // (see getLiveActiveCitySlugs below), so adding metadata for a city is safe to do ahead of
  // time -- it simply won't show up in the dropdown until real data for it actually exists.
  halifax: {
    id: 'halifax',
    name: 'Halifax',
    province: 'NS',
    region: 'Halifax Regional Municipality',
    hub: 'HRM Planning & Development (PPL&C)',
    center: [-63.5752, 44.6488],
    zoom: 11,
    label: 'Halifax, NS',
    tagline: 'Halifax Peninsula & Regional Growth Centres'
  },
  barrie: {
    id: 'barrie',
    name: 'Barrie',
    province: 'ON',
    region: 'Simcoe County',
    hub: 'City of Barrie Open Data',
    center: [-79.6903, 44.3894],
    zoom: 12,
    label: 'Barrie, ON',
    tagline: 'South Barrie Waterfront & Growth Corridor'
  },
  delta: {
    id: 'delta',
    name: 'Delta',
    province: 'BC',
    region: 'Metro Vancouver',
    hub: 'City of Delta Open Data',
    center: [-123.0586, 49.0847],
    zoom: 11,
    label: 'Delta, BC',
    tagline: 'Tilbury Industrial & Ladner Village'
  }
};

// ADDED (2026-10-04): the connector registry (src/lib/ingestion/connectors/registry.ts) also
// ingests ~20 US cities, which share the same `permits` table as the Canadian ones this
// product is actually branded and sold around ("Pan-Canadian Commercial Intelligence Hub").
// Used to keep Canadian-facing aggregation (city dropdowns, dashboard totals) from silently
// counting US cities/dollars as part of a "Canadian" figure.
export const CANADIAN_PROVINCES = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'];

export function isCanadianProvince(province?: string | null): boolean {
  return !!province && CANADIAN_PROVINCES.includes(province.toUpperCase().trim());
}

export const DEFAULT_CITY_ID: string = 'kelowna';

export function getSelectedCityId(): string {
  if (typeof window === 'undefined') return DEFAULT_CITY_ID;
  try {
    const saved = localStorage.getItem('bpp_selected_city');
    if (saved && SUPPORTED_CITIES[saved]) {
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_CITY_ID;
}

export function getActiveCityConfig(cityId?: string): CityConfig {
  const id = cityId || getSelectedCityId();
  return SUPPORTED_CITIES[id] || SUPPORTED_CITIES[DEFAULT_CITY_ID];
}

export function setSelectedCityId(cityId: string): void {
  if (typeof window === 'undefined') return;
  if (!SUPPORTED_CITIES[cityId] && cityId !== 'all') return;
  try {
    localStorage.setItem('bpp_selected_city', cityId);
    window.dispatchEvent(new CustomEvent('bpp:city-change', { detail: { cityId } }));
  } catch {
    // ignore
  }
}
