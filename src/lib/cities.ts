export interface CityConfig {
  id: string;
  name: string;
  province: string;
  region: string;
  hub: string;
  center: [number, number];
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
  calgary: {
    id: 'calgary',
    name: 'Calgary',
    province: 'AB',
    region: 'Calgary Metro',
    hub: 'City of Calgary & Hub',
    center: [-114.0719, 51.0447],
    zoom: 11,
    label: 'Calgary, AB',
    tagline: 'City of Calgary & Hub'
  }
};

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
  if (!SUPPORTED_CITIES[cityId]) return;
  try {
    localStorage.setItem('bpp_selected_city', cityId);
    window.dispatchEvent(
      new CustomEvent('bpp:city-change', {
        detail: { cityId, city: SUPPORTED_CITIES[cityId] }
      })
    );
  } catch (err) {
    console.error('Failed to set selected city:', err);
  }
}
