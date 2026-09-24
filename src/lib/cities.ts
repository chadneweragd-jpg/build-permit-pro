export interface CityConfig {
  id: 'kelowna' | 'calgary';
  name: string;
  province: string;
  center: [number, number]; // [longitude, latitude] for MapLibre
  zoom: number;
  label: string;
  tagline: string;
}

export const SUPPORTED_CITIES: Record<string, CityConfig> = {
  kelowna: {
    id: 'kelowna',
    name: 'Kelowna',
    province: 'BC',
    center: [-119.4960, 49.8880],
    zoom: 12,
    label: 'Kelowna, BC',
    tagline: 'Central Okanagan Hub'
  },
  calgary: {
    id: 'calgary',
    name: 'Calgary',
    province: 'AB',
    center: [-114.0719, 51.0447],
    zoom: 11,
    label: 'Calgary, AB',
    tagline: 'Calgary Metropolitan Region'
  }
};

export const DEFAULT_CITY_ID: 'kelowna' | 'calgary' = 'kelowna';

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
