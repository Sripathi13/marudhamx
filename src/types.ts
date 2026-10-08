export type Language = 'en' | 'ta' | 'hi';

export interface LocalizedString {
  en: string;
  ta: string;
  hi: string;
}

export interface Crop {
  id: string;
  name: LocalizedString;
  category: 'highly_perishable' | 'medium' | 'low';
  base_spoilage_rate: number;
  default_price_per_kg: number;
  weights: {
    time: number;
    spoilage: number;
    cost: number;
    traffic: number;
  };
}

export interface Market {
  id: string;
  name: LocalizedString;
  lat: number;
  lng: number;
  district: string;
}

export interface Vehicle {
  id: string;
  name: LocalizedString;
  temp_factor: number;
  default_capacity_kg: number;
  fuel_efficiency_kmpl: number;
  description: LocalizedString;
}

export interface TruckAllocation {
  truck_index: number;
  load_kg: number;
  capacity_kg: number;
  utilization_percent: number;
}

export interface TruckBreakdown {
  total_kg: number;
  truck_capacity_kg: number;
  trucks_needed: number;
  full_trucks: number;
  last_truck_load: number;
  trucks: TruckAllocation[];
}

export type TrafficSpeed = 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM' | 'UNKNOWN';

export interface TrafficSegment {
  speed: TrafficSpeed;
  coords: [number, number][];
}

export interface TurnByTurnStep {
  instruction: string;
  distance_m: number;
  duration_sec: number;
  name: string;
}

export interface WeightContributions {
  time: number;
  cost: number;
  spoilage: number;
  traffic: number;
}

export interface RouteCandidate {
  id: string;
  name: string;
  via_point_name?: string;
  data_source: 'google_live' | 'osrm_estimated';
  traffic_is_live: boolean;
  geometry: [number, number][];
  geometry_segments: TrafficSegment[];
  distance_km: number;
  duration_min: number;
  duration_no_traffic_min: number;
  traffic_delay_min: number;
  fuel_cost_inr: number;
  driver_allowance_inr: number;
  toll_cost_inr: number;
  transport_cost_inr: number;
  spoilage_fraction: number;
  expected_loss_inr: number;
  total_economic_cost_inr: number;
  score: number;
  weight_contributions: WeightContributions;
  steps: TurnByTurnStep[];
}

export interface TradeOffExplanation {
  recommended_route_id: string;
  compared_route_id: string;
  extra_cost_inr: number;
  loss_savings_inr: number;
  time_savings_min: number;
}

export interface AssumptionsData {
  fuel_price_per_litre: number;
  wholesale_price_per_kg: number;
  base_spoilage_rate: number;
  temp_factor: number;
  traffic_profile: string;
  data_source: 'google_live' | 'osrm_estimated';
}

export interface PlanResponse {
  id: string;
  created_at: string;
  crop_id: string;
  crop_name: LocalizedString;
  total_kg: number;
  origin: {
    name: string;
    lat: number;
    lng: number;
  };
  destination: {
    name: string;
    lat: number;
    lng: number;
  };
  vehicle_type: string;
  departure_time: string;
  truck_breakdown: TruckBreakdown;
  recommended_route_id: string;
  tradeoff: TradeOffExplanation;
  routes: RouteCandidate[];
  assumptions: AssumptionsData;
}

export interface AppSettings {
  language: Language;
  fuel_price_per_litre: number;
  fuel_efficiency_kmpl: Record<string, number>;
  default_truck_capacity_kg: number;
  crop_prices: Record<string, number>;
  traffic_profile: 'off_peak' | 'typical' | 'heavy';
  units: 'km' | 'mi';
  google_maps_configured: boolean;
}

export interface PlanRequest {
  crop_id: string;
  total_kg: number;
  truck_capacity_kg: number;
  origin: {
    name?: string;
    lat: number;
    lng: number;
  };
  destination: {
    id?: string;
    name?: string;
    lat: number;
    lng: number;
  };
  vehicle_type: string;
  departure_time: string;
}
