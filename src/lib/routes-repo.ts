import { SavedRoute, RouteStop, Permit, TurnByTurnInstruction } from '@/types';
import * as turf from '@turf/turf';

const ROUTES_STORAGE_KEY = 'bpp_saved_routes_v2';
const FAVORITES_STORAGE_KEY = 'bpp_user_favorites_v2';

export const INITIAL_SAVED_ROUTES: SavedRoute[] = [
  {
    id: 'route-downtown-1',
    title: 'Downtown High-Rise Corridor',
    origin_address: 'Queensway Transit Depot, Kelowna, BC',
    origin_coords: [49.8870, -119.4960],
    destination_address: '1250 Ellis Street, Kelowna, BC',
    destination_coords: [49.8895, -119.4932],
    stops: [
      {
        id: 'stop-1',
        permit_id: 'permit-1',
        permit_number: 'BP010011',
        address: '1250 Ellis Street, Kelowna, BC',
        stop_order: 1,
        latitude: 49.8895,
        longitude: -119.4932,
        estimated_value: 48500000,
        is_completed: false
      },
      {
        id: 'stop-2',
        permit_id: 'permit-2',
        permit_number: 'BP2026-00280',
        address: '1405 St Paul Street, Kelowna, BC',
        stop_order: 2,
        latitude: 49.8912,
        longitude: -119.4901,
        estimated_value: 52000000,
        is_completed: false
      },
      {
        id: 'stop-3',
        permit_id: 'permit-5',
        permit_number: 'BP010088',
        address: '1310 Water Street, Kelowna, BC',
        stop_order: 3,
        latitude: 49.8872,
        longitude: -119.4978,
        estimated_value: 2400000,
        is_completed: true
      },
      {
        id: 'stop-4',
        permit_id: 'permit-4',
        permit_number: 'BP2026-00312',
        address: '420 Bernard Avenue, Kelowna, BC',
        stop_order: 4,
        latitude: 49.8863,
        longitude: -119.4950,
        estimated_value: 920000,
        is_completed: false
      }
    ],
    total_distance_km: 7.4,
    total_duration_min: 16,
    corridor_buffer_km: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 min ago
    updated_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    directions: [
      { instruction: 'Head north on Queensway toward Pandosy St', distanceMeters: 200, distanceText: '200m', durationSeconds: 30 },
      { instruction: 'Turn left onto Ellis St toward 1250 Ellis', distanceMeters: 450, distanceText: '450m', durationSeconds: 60 },
      { instruction: 'Arrive at Stop 1: 1250 Ellis St (Ledcor Tower)', distanceMeters: 0, distanceText: '0m', durationSeconds: 0 },
      { instruction: 'Continue east on Clement Ave toward St Paul St', distanceMeters: 600, distanceText: '600m', durationSeconds: 90 },
      { instruction: 'Turn right onto St Paul St for 1405 St Paul', distanceMeters: 300, distanceText: '300m', durationSeconds: 45 }
    ]
  },
  {
    id: 'route-hwy97-2',
    title: 'Highway 97 & Industrial Run',
    origin_address: 'YLW Kelowna Airport Depot, Kelowna, BC',
    origin_coords: [49.9575, -119.3810],
    destination_address: '2150 Enterprise Way, Kelowna, BC',
    destination_coords: [49.8920, -119.4320],
    stops: [
      {
        id: 'stop-201',
        permit_id: 'permit-13',
        permit_number: 'BP010355',
        address: '5500 Airport Way, Kelowna, BC',
        stop_order: 1,
        latitude: 49.9575,
        longitude: -119.3810,
        estimated_value: 31000000,
        is_completed: false
      },
      {
        id: 'stop-202',
        permit_id: 'permit-14',
        permit_number: 'BP2026-00822',
        address: '2100 Pier Mac Way, Kelowna, BC',
        stop_order: 2,
        latitude: 49.9610,
        longitude: -119.3890,
        estimated_value: 11500000,
        is_completed: false
      },
      {
        id: 'stop-203',
        permit_id: 'permit-11',
        permit_number: 'BP010299',
        address: '2700 Highway 97 N, Kelowna, BC',
        stop_order: 3,
        latitude: 49.9140,
        longitude: -119.4150,
        estimated_value: 9800000,
        is_completed: false
      }
    ],
    total_distance_km: 14.8,
    total_duration_min: 24,
    corridor_buffer_km: 5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // 20 hours ago
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    directions: [
      { instruction: 'Depart YLW Airport Way heading south toward Hwy 97', distanceMeters: 800, distanceText: '800m', durationSeconds: 90 },
      { instruction: 'Merge onto Highway 97 S toward Kelowna City Centre', distanceMeters: 6200, distanceText: '6.2 km', durationSeconds: 360 },
      { instruction: 'Turn right onto Enterprise Way', distanceMeters: 400, distanceText: '400m', durationSeconds: 60 }
    ]
  }
];

export class RoutesRepository {
  public static getSavedRoutes(): SavedRoute[] {
    if (typeof window === 'undefined') return INITIAL_SAVED_ROUTES;
    try {
      const stored = localStorage.getItem(ROUTES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(INITIAL_SAVED_ROUTES));
      return INITIAL_SAVED_ROUTES;
    } catch {
      return INITIAL_SAVED_ROUTES;
    }
  }

  public static getRouteById(id: string): SavedRoute | undefined {
    const routes = this.getSavedRoutes();
    return routes.find((r) => r.id === id);
  }

  public static saveRoute(route: SavedRoute): SavedRoute {
    const routes = this.getSavedRoutes();
    const idx = routes.findIndex((r) => r.id === route.id);
    const updated = {
      ...route,
      updated_at: new Date().toISOString()
    };

    if (idx >= 0) {
      routes[idx] = updated;
    } else {
      routes.unshift(updated);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes));
    }
    return updated;
  }

  public static createNewRoute(title?: string): SavedRoute {
    const newRoute: SavedRoute = {
      id: `route-${Date.now()}`,
      title: title || 'New Trade Route',
      origin_address: 'Downtown Kelowna (Queensway)',
      origin_coords: [49.8870, -119.4960],
      destination_address: '1250 Ellis Street, Kelowna, BC',
      destination_coords: [49.8895, -119.4932],
      stops: [],
      total_distance_km: 0,
      total_duration_min: 0,
      corridor_buffer_km: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      directions: []
    };

    const routes = this.getSavedRoutes();
    routes.unshift(newRoute);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes));
    }
    return newRoute;
  }

  public static deleteRoute(id: string) {
    const routes = this.getSavedRoutes().filter((r) => r.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes));
    }
  }

  public static addStopToActiveRoute(permit: Permit, routeId?: string): { success: boolean; routeTitle: string } {
    const routes = this.getSavedRoutes();
    const target = routeId ? routes.find((r) => r.id === routeId) : routes[0];

    if (!target) {
      const created = this.createNewRoute(`Route for ${permit.address.split(',')[0]}`);
      created.stops.push({
        id: `stop-${Date.now()}`,
        permit_id: permit.id,
        permit_number: permit.permit_number,
        address: permit.address,
        stop_order: 1,
        latitude: permit.latitude,
        longitude: permit.longitude,
        estimated_value: permit.estimated_value,
        trades: permit.trades,
        is_completed: false
      });
      this.saveRoute(created);
      return { success: true, routeTitle: created.title };
    }

    const alreadyExists = target.stops.some((s) => s.permit_id === permit.id || s.permit_number === permit.permit_number);
    if (!alreadyExists) {
      target.stops.push({
        id: `stop-${Date.now()}`,
        permit_id: permit.id,
        permit_number: permit.permit_number,
        address: permit.address,
        stop_order: target.stops.length + 1,
        latitude: permit.latitude,
        longitude: permit.longitude,
        estimated_value: permit.estimated_value,
        trades: permit.trades,
        is_completed: false
      });
      // Recalculate estimated distance
      target.total_distance_km = Number((target.stops.length * 3.4).toFixed(1));
      target.total_duration_min = Math.round(target.total_distance_km * 2.1);
      this.saveRoute(target);
    }
    return { success: true, routeTitle: target.title };
  }

  // Favorites
  public static getFavorites(): string[] {
    if (typeof window === 'undefined') return ['permit-1', 'permit-2', 'permit-9'];
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : ['permit-1', 'permit-2', 'permit-9'];
    } catch {
      return ['permit-1', 'permit-2', 'permit-9'];
    }
  }

  public static toggleFavorite(permitId: string): boolean {
    const favs = this.getFavorites();
    const exists = favs.includes(permitId);
    let updated: string[];
    if (exists) {
      updated = favs.filter((id) => id !== permitId);
    } else {
      updated = [...favs, permitId];
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    }
    return !exists;
  }
}
