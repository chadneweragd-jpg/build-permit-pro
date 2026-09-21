export type WorkClass = 'Commercial' | 'Residential' | 'Industrial' | 'Institutional';

export type SubtradeKey =
  | 'electrical'
  | 'hvac_plumbing'
  | 'roofing'
  | 'drywall_framing'
  | 'commercial_doors'
  | 'glazing'
  | 'concrete'
  | 'framing';

export interface MatchedTrade {
  subtrade_key: SubtradeKey;
  name: string;
  color: string;
  icon: string;
  confidence: number;
  matched_terms: string[];
}

export interface Permit {
  id: string;
  municipality_id: string;
  permit_number: string;
  issue_date: string;
  application_date?: string;
  address: string;
  city_region: string;
  legal_description?: string;
  permit_type: string;
  work_class: WorkClass;
  description: string;
  ai_summary: string;
  estimated_value: number;
  contractor_name: string;
  contractor_phone?: string;
  contractor_email?: string;
  applicant_name: string;
  status: string;
  latitude: number;
  longitude: number;
  trades: MatchedTrade[];
  distance_meters?: number; // Spatial distance when along a route corridor
  is_favorite?: boolean;
}

export interface RouteStop {
  id: string;
  route_id?: string;
  permit_id?: string;
  permit_number?: string;
  address: string;
  stop_order: number;
  latitude: number;
  longitude: number;
  estimated_value?: number;
  trades?: MatchedTrade[];
  is_completed?: boolean;
  is_custom_address?: boolean;
  purpose_tag?: PurposeTag;
  notes?: string;
}

export interface TurnByTurnInstruction {
  instruction: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  location?: [number, number]; // [lng, lat] of the maneuver
  headsUpAnnounced?: boolean;
  turnAnnounced?: boolean;
}

export interface SavedRoute {
  id: string;
  title: string;
  origin_address: string;
  origin_coords: [number, number]; // [lat, lng]
  destination_address: string;
  destination_coords: [number, number]; // [lat, lng]
  stops: RouteStop[];
  total_distance_km: number;
  total_duration_min: number;
  corridor_buffer_km: number;
  created_at: string;
  updated_at: string;
  directions: TurnByTurnInstruction[];
  geometry_geojson?: any;
}

export type CRMStatus = 'New' | 'Under Review' | 'Site Visited' | 'Quote Sent' | 'Won' | 'Lost';

export interface UserPermitStatus {
  permit_id: string;
  status: CRMStatus;
  notes: string;
  reminder_date?: string;
  estimated_bid?: number;
  updated_at: string;
}

export type SubscriptionTier = 'solo' | 'pro_scout' | 'supplier';

export interface SubscriptionConfig {
  tier: SubscriptionTier;
  name: string;
  priceCAD: number;
  hubsLimit: number | 'all';
  tradesLimit: number | 'all';
  hasScoutCorridor: boolean;
  seatsLimit: number | 'unlimited';
  hasWebhooks: boolean;
}

export interface SavedSearch {
  id: string;
  name: string;
  subtrade_keys: SubtradeKey[];
  min_value: number;
  work_classes: WorkClass[];
  daily_email_alert: boolean;
  email: string;
  created_at: string;
}

// 8. In-App Drive Mode, Radar & CRA Mileage
export type TripType = 'business' | 'personal';

export type PurposeTag =
  | 'Sales Call / Inbound Inquiry'
  | 'Site Measure / Pre-Walk'
  | 'Warranty / Service Check'
  | 'Installer / Crew Checkup'
  | 'Office / Base'
  | 'Personal / Lunch'
  | 'Sales Call'
  | 'Site Measure'
  | 'Installer Check'
  | 'Delivery'
  | 'Office'
  | 'Personal';

export interface TripLeg {
  id: string;
  user_id?: string;
  route_id?: string;
  permit_id?: string;
  permit_number?: string;
  leg_number: number;
  origin_address: string;
  destination_address: string;
  distance_km: number;
  duration_min: number;
  trip_type: TripType;
  purpose_tag: PurposeTag;
  notes?: string;
  deductible_cad?: number;
  recorded_at: string;
  created_at?: string;
}

export interface RouteCircuitLeg {
  legIndex: number;
  originAddress: string;
  destinationAddress: string;
  originCoords: [number, number]; // [lat, lng]
  destinationCoords: [number, number]; // [lat, lng]
  distanceKm: number;
  durationMin: number;
  stopId?: string;
  permit?: Permit;
  isCompleted?: boolean;
}

export interface JobRadarAlert {
  permit: Permit;
  distanceMeters: number;
  distanceKm: string;
  directionBearing?: number;
  detectedAt: string;
}

// 9. Lite CRM & Quotes Pipeline
export type DealStage = 'watched' | 'visited' | 'estimating' | 'quoted' | 'won';

export interface DealNote {
  id: string;
  text: string;
  created_at: string;
  author?: string;
}

export interface CRMDeal {
  id: string;
  user_id?: string;
  permit_id?: string;
  permit_number?: string;
  project_name: string;
  address: string;
  city_region: string;
  general_contractor?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  subtrade_category: string;
  stage: DealStage;
  quote_amount: number;
  bid_due_date?: string | null;
  follow_up_date?: string | null;
  lost_reason?: string;
  notes?: string;
  notes_history?: DealNote[];
  created_at: string;
  updated_at: string;
}

