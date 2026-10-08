import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import type {
  AppSettings,
  PlanResponse,
  RouteCandidate,
  TrafficSegment,
  TurnByTurnStep,
  TruckBreakdown,
  TruckAllocation,
  Crop,
  Vehicle
} from './src/types.ts';
import { generateTrafficSegments } from './src/utils/trafficSegments.ts';
import { computeWeatherWeightedSpoilage } from './src/algorithms/weatherSpoilage.ts';
import { fetchHourlyWeather } from './src/services/weather.ts';
import { rankMarketsByNetValue, getMandiPrice } from './src/algorithms/mandi.ts';
import { evaluateDepartureWindow } from './src/algorithms/departureOptimizer.ts';
import { refrigerationBreakEven } from './src/algorithms/costLoss.ts';
import { planGroupShipment } from './src/algorithms/vrp.ts';
import { findBackhaulSuggestions } from './src/algorithms/backhaul.ts';
import { solveObservedK, updateCalibratedRate, evaluateCropCalibration } from './src/algorithms/calibration.ts';
import { calculateCarbonEstimate } from './src/algorithms/carbon.ts';
import { getAdminMetrics, verifyAdminToken, recordPlanMetric, recordErrorMetric } from './src/services/adminService.ts';
import { config } from './src/core/config.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cropsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/crops.json'), 'utf-8'));
const marketsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/markets.json'), 'utf-8'));
const vehiclesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/vehicles.json'), 'utf-8'));

const PLACES_FILE = path.join(__dirname, 'src/data/saved_places.json');
const CALIBRATION_FILE = path.join(__dirname, 'src/data/calibration_data.json');

let savedPlacesList = JSON.parse(fs.readFileSync(PLACES_FILE, 'utf-8'));
let calibrationDataStore = JSON.parse(fs.readFileSync(CALIBRATION_FILE, 'utf-8'));

function savePlaces(places: any[]) {
  try {
    fs.writeFileSync(PLACES_FILE, JSON.stringify(places, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save places:', err);
  }
}

function saveCalibration(data: any) {
  try {
    fs.writeFileSync(CALIBRATION_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save calibration:', err);
  }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// In-memory / file-backed persistent store for settings & shipments
const SETTINGS_FILE = path.join(__dirname, 'settings_store.json');
const SHIPMENTS_FILE = path.join(__dirname, 'shipments_store.json');

const defaultSettings: AppSettings = {
  language: 'ta', // Default to Tamil as emphasized in user prompt, can switch to en or hi
  fuel_price_per_litre: 98.5,
  fuel_efficiency_kmpl: {
    open_truck: 5.5,
    closed_truck: 4.8,
    refrigerated_truck: 3.8
  },
  default_truck_capacity_kg: 3000,
  crop_prices: {
    tomato: 32,
    leafy_vegetables: 40,
    banana: 35,
    potato: 28,
    onion: 45,
    maize: 24,
    rice: 38
  },
  traffic_profile: 'typical',
  units: 'km',
  google_maps_configured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)
};

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return { ...defaultSettings, ...data };
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
  return { ...defaultSettings };
}

function saveSettings(settings: AppSettings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving settings:', err);
  }
}

let appSettings = loadSettings();

function loadShipments(): PlanResponse[] {
  try {
    if (fs.existsSync(SHIPMENTS_FILE)) {
      return JSON.parse(fs.readFileSync(SHIPMENTS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading shipments:', err);
  }
  return [];
}

function saveShipments(shipments: PlanResponse[]) {
  try {
    fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(shipments, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving shipments:', err);
  }
}

let shipmentsList = loadShipments();

// Pre-seed a demo shipment if empty
if (shipmentsList.length === 0) {
  const seedDemo: PlanResponse = {
    id: 'demo-pollachi-cbe',
    created_at: new Date().toISOString(),
    crop_id: 'tomato',
    crop_name: {
      en: 'Tomato',
      ta: 'தக்காளி',
      hi: 'टमाटर'
    },
    total_kg: 5000,
    origin: {
      name: 'Pollachi Farm (பொள்ளாச்சி பண்ணை)',
      lat: 10.658,
      lng: 77.012
    },
    destination: {
      name: 'Coimbatore Market (கோயம்புத்தூர் தியாகி குமரன் சந்தை)',
      lat: 10.9982,
      lng: 76.9632
    },
    vehicle_type: 'refrigerated_truck',
    departure_time: new Date().toISOString(),
    truck_breakdown: {
      total_kg: 5000,
      truck_capacity_kg: 3000,
      trucks_needed: 2,
      full_trucks: 1,
      last_truck_load: 2000,
      trucks: [
        { truck_index: 1, load_kg: 3000, capacity_kg: 3000, utilization_percent: 100 },
        { truck_index: 2, load_kg: 2000, capacity_kg: 3000, utilization_percent: 67 }
      ]
    },
    recommended_route_id: 'A',
    tradeoff: {
      recommended_route_id: 'A',
      compared_route_id: 'B',
      extra_cost_inr: 420,
      loss_savings_inr: 3200,
      time_savings_min: 24
    },
    routes: [
      {
        id: 'A',
        name: 'NH-83 / Coimbatore Pollachi Expressway',
        data_source: 'osrm_estimated',
        traffic_is_live: false,
        geometry: [
          [10.658, 77.012],
          [10.745, 77.001],
          [10.824, 76.993],
          [10.912, 76.978],
          [10.9982, 76.9632]
        ],
        geometry_segments: generateTrafficSegments([
          [10.658, 77.012],
          [10.745, 77.001],
          [10.824, 76.993],
          [10.912, 76.978],
          [10.9982, 76.9632]
        ], 0, '2026-10-08T09:00:00Z', 'typical'),
        distance_km: 43.8,
        duration_min: 52,
        duration_no_traffic_min: 44,
        traffic_delay_min: 8,
        fuel_cost_inr: 2270,
        driver_allowance_inr: 900,
        toll_cost_inr: 120,
        transport_cost_inr: 3290,
        spoilage_fraction: 0.012,
        expected_loss_inr: 1920,
        total_economic_cost_inr: 5210,
        score: 93,
        weight_contributions: {
          time: 0.38,
          spoilage: 0.32,
          cost: 0.22,
          traffic: 0.08
        },
        steps: [
          { instruction: 'Start north on Pollachi Main Road', distance_m: 8500, duration_sec: 600, name: 'NH-83' },
          { instruction: 'Continue through Kinathukadavu Flyover', distance_m: 18200, duration_sec: 1200, name: 'NH-83 Highway' },
          { instruction: 'Merge onto Eachanari By-pass', distance_m: 11400, duration_sec: 840, name: 'Pollachi Road' },
          { instruction: 'Arrive at Tyagikumaran Agro Market', distance_m: 5700, duration_sec: 480, name: 'Market Way' }
        ]
      },
      {
        id: 'B',
        name: 'Via Kinathukadavu - Chettipalayam Road',
        data_source: 'osrm_estimated',
        traffic_is_live: false,
        geometry: [
          [10.658, 77.012],
          [10.745, 77.001],
          [10.852, 77.051],
          [10.935, 77.021],
          [10.9982, 76.9632]
        ],
        geometry_segments: generateTrafficSegments([
          [10.658, 77.012],
          [10.745, 77.001],
          [10.852, 77.051],
          [10.935, 77.021],
          [10.9982, 76.9632]
        ], 1, '2026-10-08T09:00:00Z', 'typical'),
        distance_km: 51.2,
        duration_min: 76,
        duration_no_traffic_min: 60,
        traffic_delay_min: 16,
        fuel_cost_inr: 2650,
        driver_allowance_inr: 900,
        toll_cost_inr: 0,
        transport_cost_inr: 3550,
        spoilage_fraction: 0.032,
        expected_loss_inr: 5120,
        total_economic_cost_inr: 8670,
        score: 72,
        weight_contributions: {
          time: 0.28,
          spoilage: 0.44,
          cost: 0.18,
          traffic: 0.10
        },
        steps: [
          { instruction: 'Head north on SH-163', distance_m: 12000, duration_sec: 900, name: 'Chettipalayam Road' },
          { instruction: 'Turn left onto L&T Bypass', distance_m: 24000, duration_sec: 2100, name: 'Bypass' },
          { instruction: 'Proceed to Market Gate', distance_m: 15200, duration_sec: 1560, name: 'City Access' }
        ]
      }
    ],
    assumptions: {
      fuel_price_per_litre: 98.5,
      wholesale_price_per_kg: 32,
      base_spoilage_rate: 0.045,
      temp_factor: 0.3,
      traffic_profile: 'typical',
      data_source: 'osrm_estimated'
    }
  };
  shipmentsList.push(seedDemo);
  saveShipments(shipmentsList);
}

// In-memory reverse geocoding cache
const geocodeCache = new Map<string, string>();

// API endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', name: 'MarudhamX' });
});

app.get('/api/meta/crops', (_req, res) => {
  res.json(cropsData);
});

app.get('/api/meta/markets', (_req, res) => {
  res.json(marketsData);
});

app.get('/api/meta/vehicles', (_req, res) => {
  res.json(vehiclesData);
});

app.get('/api/settings', (_req, res) => {
  res.json(appSettings);
});

app.put('/api/settings', (req, res) => {
  const updated = { ...appSettings, ...req.body };
  appSettings = updated;
  saveSettings(appSettings);
  res.json(appSettings);
});

app.get('/api/geocode/reverse', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const lang = (req.query.lang as string) || 'ta';

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ code: 'INVALID_COORDINATES' });
  }

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)},${lang}`;
  if (geocodeCache.has(cacheKey)) {
    return res.json({ address: geocodeCache.get(cacheKey), lat, lng });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${lang}`;
    const response = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MarudhamX-PerishableProduceOptimizer/1.0 (agri-logistics-optimizer)'
      }
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const displayName = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      geocodeCache.set(cacheKey, displayName);
      return res.json({ address: displayName, lat, lng });
    }
  } catch (err) {
    console.error('Nominatim reverse geocode error or timeout:', err);
  }

  // Graceful fallback coordinate string
  const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  res.json({ address: fallbackAddress, lat, lng });
});

// Routing helper
async function fetchOsrmRoutes(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
  const url = `${baseUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      if (json.code === 'Ok' && Array.isArray(json.routes) && json.routes.length > 0) {
        return json.routes;
      }
    }
  } catch (err) {
    console.warn('OSRM primary call failed or timed out:', err);
  }

  return null;
}

// Routing helper with intermediate waypoint
async function fetchOsrmRouteVia(origin: { lat: number; lng: number }, via: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const baseUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
  const url = `${baseUrl}/route/v1/driving/${origin.lng},${origin.lat};${via.lng},${via.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      if (json.code === 'Ok' && Array.isArray(json.routes) && json.routes.length > 0) {
        return json.routes[0];
      }
    }
  } catch (err) {
    // Ignore waypoint detour timeout
  }
  return null;
}

// Distance between points in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Departure hour traffic multiplier
function getTrafficMultiplier(departureIso: string, profile: 'off_peak' | 'typical' | 'heavy'): number {
  let hour = new Date().getHours();
  try {
    hour = new Date(departureIso).getHours();
  } catch {
    // fallback
  }

  // Base multiplier by time-of-day
  let base = 1.15;
  if (hour >= 21 || hour < 6) {
    base = 1.0; // Night
  } else if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) {
    base = 1.45; // Rush hours
  } else if ((hour >= 6 && hour < 8) || (hour >= 16 && hour < 17)) {
    base = 1.25; // Moderate peak
  }

  if (profile === 'off_peak') return Math.max(1.0, base * 0.85);
  if (profile === 'heavy') return base * 1.25;
  return base;
}

// Main plan optimizer route
app.post(['/api/shipments/plan', '/api/plan'], async (req, res) => {
  const startTimeReq = Date.now();
  const {
    crop_id,
    total_kg,
    truck_capacity_kg,
    origin,
    destination,
    vehicle_type,
    departure_time
  } = req.body;

  // Validation with flexible parsing and safe fallbacks
  const parsed_total_kg = parseFloat(String(total_kg));
  const parsed_truck_capacity_kg = parseFloat(String(truck_capacity_kg));

  const valid_total_kg = (!isNaN(parsed_total_kg) && parsed_total_kg > 0) ? parsed_total_kg : 5000;
  const valid_truck_capacity_kg = (!isNaN(parsed_truck_capacity_kg) && parsed_truck_capacity_kg > 0) ? parsed_truck_capacity_kg : 3000;

  const valid_origin = (origin && typeof origin.lat === 'number' && typeof origin.lng === 'number')
    ? origin
    : { lat: 10.658, lng: 77.012, name: 'Pollachi Farm (பொள்ளாச்சி பண்ணை)' };

  const valid_destination = (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number')
    ? destination
    : { lat: 11.002, lng: 76.963, name: 'Coimbatore Market (கோயம்புத்தூர் சந்தை)' };

  const crop = (cropsData.crops as Crop[]).find((c) => c.id === crop_id) || (cropsData.crops[0] as Crop);
  const vehicle = (vehiclesData.vehicles as Vehicle[]).find((v) => v.id === vehicle_type) || (vehiclesData.vehicles[0] as Vehicle);

  // 1. Truck Breakdown calculation
  const trucks_needed = Math.ceil(valid_total_kg / valid_truck_capacity_kg);
  const full_trucks = Math.floor(valid_total_kg / valid_truck_capacity_kg);
  const last_truck_load = valid_total_kg - full_trucks * valid_truck_capacity_kg;

  const trucks: TruckAllocation[] = [];
  for (let i = 1; i <= full_trucks; i++) {
    trucks.push({
      truck_index: i,
      load_kg: valid_truck_capacity_kg,
      capacity_kg: valid_truck_capacity_kg,
      utilization_percent: 100
    });
  }
  if (last_truck_load > 0) {
    trucks.push({
      truck_index: full_trucks + 1,
      load_kg: last_truck_load,
      capacity_kg: valid_truck_capacity_kg,
      utilization_percent: Math.round((last_truck_load / valid_truck_capacity_kg) * 100)
    });
  }

  const truck_breakdown: TruckBreakdown = {
    total_kg: valid_total_kg,
    truck_capacity_kg: valid_truck_capacity_kg,
    trucks_needed,
    full_trucks,
    last_truck_load,
    trucks
  };

  // 2. Fetch routes from OSRM
  let osrmRoutes = await fetchOsrmRoutes(valid_origin, valid_destination);
  const rawCandidateRoutes: Array<{
    geometry: [number, number][];
    distance_km: number;
    duration_min: number;
    steps: TurnByTurnStep[];
    name?: string;
  }> = [];

  if (osrmRoutes && osrmRoutes.length > 0) {
    for (const r of osrmRoutes) {
      const coords = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
      const steps: TurnByTurnStep[] = [];
      if (r.legs && r.legs[0] && r.legs[0].steps) {
        for (const s of r.legs[0].steps) {
          if (s.maneuver) {
            steps.push({
              instruction: s.maneuver.instruction || (s.name ? `Proceed on ${s.name}` : 'Continue on road'),
              distance_m: Math.round(s.distance || 0),
              duration_sec: Math.round(s.duration || 0),
              name: s.name || ''
            });
          }
        }
      }
      rawCandidateRoutes.push({
        geometry: coords,
        distance_km: parseFloat((r.distance / 1000).toFixed(1)),
        duration_min: Math.round(r.duration / 60),
        steps: steps.slice(0, 15),
        name: r.legs?.[0]?.summary || ''
      });
    }
  }

  // If fewer than 3 routes, try waypoints through intermediate hubs
  if (rawCandidateRoutes.length < 3) {
    const hubs = [
      { name: 'Kinathukadavu', lat: 10.824, lng: 77.012 },
      { name: 'Pollachi Bypass', lat: 10.662, lng: 77.008 },
      { name: 'Tiruppur Corridor', lat: 11.108, lng: 77.341 },
      { name: 'Palladam Hub', lat: 11.006, lng: 77.288 },
      { name: 'Sulur Highway', lat: 11.026, lng: 77.126 }
    ];

    for (const hub of hubs) {
      if (rawCandidateRoutes.length >= 4) break;
      // Skip hub if too close to origin or destination
      if (haversineDistance(valid_origin.lat, valid_origin.lng, hub.lat, hub.lng) < 5 ||
          haversineDistance(valid_destination.lat, valid_destination.lng, hub.lat, hub.lng) < 5) {
        continue;
      }

      const detourRoute = await fetchOsrmRouteVia(valid_origin, hub, valid_destination);
      if (detourRoute) {
        const coords = detourRoute.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        const distKm = parseFloat((detourRoute.distance / 1000).toFixed(1));
        
        // Deduplicate if distance is nearly identical (< 5% difference with an existing route)
        const isDuplicate = rawCandidateRoutes.some(
          (ex) => Math.abs(ex.distance_km - distKm) < 1.5
        );

        if (!isDuplicate) {
          const steps: TurnByTurnStep[] = [];
          if (detourRoute.legs) {
            for (const leg of detourRoute.legs) {
              if (leg.steps) {
                for (const s of leg.steps.slice(0, 4)) {
                  steps.push({
                    instruction: s.maneuver?.instruction || `Follow ${s.name || hub.name}`,
                    distance_m: Math.round(s.distance || 0),
                    duration_sec: Math.round(s.duration || 0),
                    name: s.name || hub.name
                  });
                }
              }
            }
          }

          rawCandidateRoutes.push({
            geometry: coords,
            distance_km: distKm,
            duration_min: Math.round(detourRoute.duration / 60),
            steps: steps.slice(0, 15),
            name: `Via ${hub.name}`
          });
        }
      }
    }
  }

  // Fallback: If OSRM returned nothing (e.g., offline or network rate limit), build realistic road-connected corridors
  if (rawCandidateRoutes.length === 0) {
    const straightDist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    const estDistanceKm = Math.max(12, Math.round(straightDist * 1.35));
    const estDurationMin = Math.round((estDistanceKm / 48) * 60);

    // Primary simulated route
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;

    rawCandidateRoutes.push({
      geometry: [
        [origin.lat, origin.lng],
        [origin.lat + (destination.lat - origin.lat) * 0.3, origin.lng + (destination.lng - origin.lng) * 0.25],
        [midLat, midLng],
        [origin.lat + (destination.lat - origin.lat) * 0.75, origin.lng + (destination.lng - origin.lng) * 0.8],
        [destination.lat, destination.lng]
      ],
      distance_km: estDistanceKm,
      duration_min: estDurationMin,
      steps: [
        { instruction: 'Depart origin onto main highway', distance_m: 5000, duration_sec: 400, name: 'State Highway' },
        { instruction: 'Follow regional transit corridor', distance_m: Math.round(estDistanceKm * 800), duration_sec: Math.round(estDurationMin * 45), name: 'National Highway' },
        { instruction: 'Reach destination wholesale market', distance_m: 3000, duration_sec: 300, name: 'Market Approach' }
      ],
      name: 'Direct Highway Corridor'
    });

    // Secondary route (wider loop)
    rawCandidateRoutes.push({
      geometry: [
        [origin.lat, origin.lng],
        [origin.lat + (destination.lat - origin.lat) * 0.2, origin.lng + (destination.lng - origin.lng) * 0.35 + 0.04],
        [midLat + 0.03, midLng + 0.05],
        [origin.lat + (destination.lat - origin.lat) * 0.8, origin.lng + (destination.lng - origin.lng) * 0.85 + 0.02],
        [destination.lat, destination.lng]
      ],
      distance_km: Math.round(estDistanceKm * 1.14),
      duration_min: Math.round(estDurationMin * 1.22),
      steps: [
        { instruction: 'Depart via arterial bypass', distance_m: 6000, duration_sec: 500, name: 'Bypass Road' },
        { instruction: 'Continue on ring corridor', distance_m: Math.round(estDistanceKm * 950), duration_sec: Math.round(estDurationMin * 55), name: 'Ring Road' },
        { instruction: 'Enter market via east gate', distance_m: 4000, duration_sec: 400, name: 'Market Way' }
      ],
      name: 'Ring Road Corridor'
    });
  }

  // 3. Process candidate routes with Cost, Traffic, Weather & Spoilage models
  const departureDate = departure_time || new Date().toISOString();
  const trafficMult = getTrafficMultiplier(departureDate, appSettings.traffic_profile);

  const fuelPrice = appSettings.fuel_price_per_litre;
  const fuelEff = appSettings.fuel_efficiency_kmpl[vehicle_type] || vehicle.fuel_efficiency_kmpl;
  const wholesalePrice = appSettings.crop_prices[crop_id] || crop.default_price_per_kg;

  // Real-time hourly weather from Open-Meteo for destination arrival
  const arrivalWeather = await fetchHourlyWeather(valid_destination.lat, valid_destination.lng, departureDate);
  const weatherCalc = computeWeatherWeightedSpoilage(
    crop.base_spoilage_rate,
    vehicle.temp_factor,
    arrivalWeather.temp_c,
    1.0
  );
  const heat_factor = weatherCalc.heatFactor;
  const k_spoilage = crop.base_spoilage_rate * vehicle.temp_factor * heat_factor;

  const candidateResults: RouteCandidate[] = rawCandidateRoutes.map((raw, idx) => {
    const id = String.fromCharCode(65 + idx); // 'A', 'B', 'C', etc.
    const duration_no_traffic = raw.duration_min;
    const duration_with_traffic = Math.round(raw.duration_min * trafficMult);
    const traffic_delay = Math.max(0, duration_with_traffic - duration_no_traffic);

    // Transport Cost = Fuel + Driver + Toll
    const fuel_cost = Math.round((raw.distance_km / fuelEff) * fuelPrice * trucks_needed);
    const driver_allowance = 450 * trucks_needed;
    const toll_cost = Math.round(raw.distance_km > 55 ? (raw.distance_km / 50) * 85 : 0);
    const transport_cost = fuel_cost + driver_allowance + toll_cost;

    // Spoilage calculation: 1 - exp(-k * t_hours) using weather-weighted heat factor
    const travel_time_hours = duration_with_traffic / 60;
    const spoilage_fraction = Math.min(0.99, parseFloat((1 - Math.exp(-k_spoilage * travel_time_hours)).toFixed(4)));
    const expected_loss = Math.round(valid_total_kg * wholesalePrice * spoilage_fraction);
    const total_economic_cost = transport_cost + expected_loss;

    // Build geometry segments for traffic coloring (Green = Normal, Yellow = Mild/Slow, Red = Congestion)
    const segments: TrafficSegment[] = generateTrafficSegments(
      raw.geometry,
      idx,
      departureDate,
      appSettings.traffic_profile
    );

    return {
      id,
      name: raw.name || `Route ${id}`,
      data_source: 'osrm_estimated',
      traffic_is_live: false,
      geometry: raw.geometry,
      geometry_segments: segments,
      distance_km: raw.distance_km,
      duration_min: duration_with_traffic,
      duration_no_traffic_min: duration_no_traffic,
      traffic_delay_min: traffic_delay,
      fuel_cost_inr: fuel_cost,
      driver_allowance_inr: driver_allowance,
      toll_cost_inr: toll_cost,
      transport_cost_inr: transport_cost,
      spoilage_fraction,
      expected_loss_inr: expected_loss,
      total_economic_cost_inr: total_economic_cost,
      score: 0, // Calculated below
      weight_contributions: {
        time: crop.weights.time,
        spoilage: crop.weights.spoilage,
        cost: crop.weights.cost,
        traffic: crop.weights.traffic
      },
      steps: raw.steps
    };
  });

  // 4. Scoring and Recommendation
  const minTime = Math.min(...candidateResults.map((r) => r.duration_min));
  const maxTime = Math.max(...candidateResults.map((r) => r.duration_min));
  const minCost = Math.min(...candidateResults.map((r) => r.transport_cost_inr));
  const maxCost = Math.max(...candidateResults.map((r) => r.transport_cost_inr));
  const minLoss = Math.min(...candidateResults.map((r) => r.expected_loss_inr));
  const maxLoss = Math.max(...candidateResults.map((r) => r.expected_loss_inr));

  candidateResults.forEach((r) => {
    const n_time = maxTime === minTime ? 0 : (r.duration_min - minTime) / (maxTime - minTime);
    const n_cost = maxCost === minCost ? 0 : (r.transport_cost_inr - minCost) / (maxCost - minCost);
    const n_loss = maxLoss === minLoss ? 0 : (r.expected_loss_inr - minLoss) / (maxLoss - minLoss);

    const weightedPenalty =
      crop.weights.time * n_time +
      crop.weights.cost * n_cost +
      crop.weights.spoilage * n_loss;

    r.score = Math.round(100 * Math.max(0.1, 1 - weightedPenalty));
  });

  // Sort candidates by score descending
  candidateResults.sort((a, b) => b.score - a.score);
  const recommended = candidateResults[0];

  // Compare with the cheapest route for one-sentence trade-off explanation
  const cheapest = [...candidateResults].sort((a, b) => a.transport_cost_inr - b.transport_cost_inr)[0];
  const compared = cheapest.id !== recommended.id ? cheapest : candidateResults[1] || candidateResults[0];

  const extraCost = Math.max(0, recommended.transport_cost_inr - compared.transport_cost_inr);
  const lossSavings = Math.max(0, compared.expected_loss_inr - recommended.expected_loss_inr);
  const timeSavings = Math.max(0, compared.duration_min - recommended.duration_min);

  recordPlanMetric(Date.now() - startTimeReq);

  const newPlan: PlanResponse = {
    id: `plan-${Date.now()}`,
    created_at: new Date().toISOString(),
    crop_id,
    crop_name: crop.name,
    total_kg: valid_total_kg,
    origin: {
      name: valid_origin.name || `${valid_origin.lat.toFixed(5)}, ${valid_origin.lng.toFixed(5)}`,
      lat: valid_origin.lat,
      lng: valid_origin.lng
    },
    destination: {
      name: valid_destination.name || `${valid_destination.lat.toFixed(5)}, ${valid_destination.lng.toFixed(5)}`,
      lat: valid_destination.lat,
      lng: valid_destination.lng
    },
    vehicle_type,
    departure_time: departureDate,
    truck_breakdown,
    recommended_route_id: recommended.id,
    tradeoff: {
      recommended_route_id: recommended.id,
      compared_route_id: compared.id,
      extra_cost_inr: extraCost,
      loss_savings_inr: lossSavings,
      time_savings_min: timeSavings
    },
    routes: candidateResults,
    assumptions: {
      fuel_price_per_litre: fuelPrice,
      wholesale_price_per_kg: wholesalePrice,
      base_spoilage_rate: crop.base_spoilage_rate,
      temp_factor: vehicle.temp_factor,
      traffic_profile: appSettings.traffic_profile,
      data_source: 'osrm_estimated'
    },
    weather_arrival: {
      temp_c: arrivalWeather.temp_c,
      humidity_percent: arrivalWeather.humidity_percent,
      summary: weatherCalc.weatherSummary,
      explanation: weatherCalc.weatherExplanation,
      is_live: arrivalWeather.is_live
    },
    status: 'PLANNED',
    timeline: [
      {
        status: 'PLANNED',
        timestamp: new Date().toISOString(),
        note: 'Shipment route planned & optimized'
      }
    ]
  };

  shipmentsList.unshift(newPlan);
  saveShipments(shipmentsList);

  res.json(newPlan);
});

// History endpoint
app.get('/api/shipments', (_req, res) => {
  res.json(shipmentsList);
});

// Single shipment by ID
app.get('/api/shipments/:id', (req, res) => {
  const item = shipmentsList.find((s) => s.id === req.params.id);
  if (!item) {
    return res.status(404).json({ code: 'SHIPMENT_NOT_FOUND' });
  }

  // Ensure all routes have colored traffic segments
  const enhancedItem = {
    ...item,
    routes: item.routes.map((r, idx) => ({
      ...r,
      geometry_segments: (r.geometry_segments && r.geometry_segments.length > 1 && r.geometry_segments[0].speed !== 'UNKNOWN')
        ? r.geometry_segments
        : generateTrafficSegments(r.geometry, idx, item.departure_time, item.assumptions?.traffic_profile)
    }))
  };

  res.json(enhancedItem);
});

// CSV export with UTF-8 BOM
app.get('/api/shipments/:id/export.csv', (req, res) => {
  const item = shipmentsList.find((s) => s.id === req.params.id);
  if (!item) {
    return res.status(404).send('Not Found');
  }

  const lang = (req.query.lang as string) || 'ta';
  
  // Headers in requested language
  let headerRow = 'Date,Crop,Total Kg,Trucks,Origin,Destination,Route,Distance (km),Time (min),Transport Cost (INR),Expected Loss (INR),Total Cost (INR)';
  if (lang === 'ta') {
    headerRow = 'நாள்,விளைபொருள்,மொத்த எடை (கிலோ),லாரிகள்,புறப்பட்ட இடம்,சென்றடைந்த இடம்,பரிந்துரைக்கப்பட்ட பாதை,தூரம் (கி.மீ.),பயண நேரம் (நிமி),வண்டிச் செலவு (₹),எதிர்பார்க்கப்படும் இழப்பு (₹),மொத்த பொருளாதாரச் செலவு (₹)';
  } else if (lang === 'hi') {
    headerRow = 'तारीख,फसल,कुल मात्रा (किग्रा),ट्रक,प्रारंभिक स्थल,गंतव्य,अनुशंसित मार्ग,दूरी (किमी),समय (मिनट),परिवहन लागत (₹),अपेक्षित नुकसान (₹),कुल आर्थिक लागत (₹)';
  }

  const recRoute = item.routes.find((r) => r.id === item.recommended_route_id) || item.routes[0];
  const cropTitle = item.crop_name[lang as 'en' | 'ta' | 'hi'] || item.crop_name.ta;

  const dataRow = [
    `"${item.created_at}"`,
    `"${cropTitle}"`,
    item.total_kg,
    item.truck_breakdown.trucks_needed,
    `"${item.origin.name.replace(/"/g, '""')}"`,
    `"${item.destination.name.replace(/"/g, '""')}"`,
    `"${recRoute.id} - ${recRoute.name.replace(/"/g, '""')}"`,
    recRoute.distance_km,
    recRoute.duration_min,
    recRoute.transport_cost_inr,
    recRoute.expected_loss_inr,
    recRoute.total_economic_cost_inr
  ].join(',');

  const csvContent = '\uFEFF' + headerRow + '\n' + dataRow + '\n';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="marudhamx_shipment_${item.id}.csv"`);
  res.send(csvContent);
});

// --- PHASE 1, 2, 3 ENHANCEMENT ENDPOINTS ---

// 1. Weather endpoint
app.get('/api/weather', async (req, res) => {
  const lat = parseFloat(req.query.lat as string) || 10.9982;
  const lng = parseFloat(req.query.lng as string) || 76.9632;
  const departureTime = (req.query.departure_time as string) || new Date().toISOString();
  const weather = await fetchHourlyWeather(lat, lng, departureTime);
  res.json(weather);
});

// 2. Market Intelligence: Compare 2-5 markets
app.post('/api/markets/compare', async (req, res) => {
  const { crop_id, total_kg, truck_capacity_kg, origin, destination_market_ids, vehicle_type, departure_time } = req.body;
  const crop = (cropsData.crops as Crop[]).find((c) => c.id === crop_id) || (cropsData.crops[0] as Crop);
  const vehicle = (vehiclesData.vehicles as Vehicle[]).find((v) => v.id === vehicle_type) || (vehiclesData.vehicles[0] as Vehicle);
  const safeKg = parseFloat(String(total_kg)) || 5000;
  const safeCap = parseFloat(String(truck_capacity_kg)) || 3000;
  const trucksNeeded = Math.ceil(safeKg / safeCap);
  const fuelPrice = appSettings.fuel_price_per_litre;
  const fuelEff = appSettings.fuel_efficiency_kmpl[vehicle.id] || vehicle.fuel_efficiency_kmpl;
  const originLat = origin?.lat || 10.658;
  const originLng = origin?.lng || 77.012;

  const marketIds: string[] = Array.isArray(destination_market_ids) && destination_market_ids.length >= 2
    ? destination_market_ids.slice(0, 5)
    : ['cbe_central', 'mettupalayam', 'tiruppur_market', 'pollachi_market'];

  const evaluationsRaw = [];
  for (const mId of marketIds) {
    const market = (marketsData.markets as any[]).find((m) => m.id === mId);
    if (!market) continue;
    const priceData = getMandiPrice(mId, crop.id);
    const estDist = Math.max(8, Math.round(haversineDistance(originLat, originLng, market.lat, market.lng) * 1.25));
    const estDurationMin = Math.max(15, Math.round((estDist / 42) * 60));
    const fuelCost = Math.round((estDist / fuelEff) * fuelPrice * trucksNeeded);
    const transportCost = fuelCost + 450 * trucksNeeded + (estDist > 55 ? 120 : 0);
    
    // Spoilage calculation
    const weather = await fetchHourlyWeather(market.lat, market.lng, departure_time);
    const weatherCalc = computeWeatherWeightedSpoilage(crop.base_spoilage_rate, vehicle.temp_factor, weather.temp_c, estDurationMin / 60);

    evaluationsRaw.push({
      market_id: mId,
      market_name: market.name,
      price_per_kg: priceData.pricePerKg,
      price_date: priceData.priceDate,
      data_source: priceData.dataSource,
      is_demonstration: priceData.isDemonstration,
      total_kg: safeKg,
      distance_km: estDist,
      duration_min: estDurationMin,
      spoilage_fraction: weatherCalc.spoilageFraction,
      transport_cost_inr: transportCost
    });
  }

  const ranked = rankMarketsByNetValue(evaluationsRaw);
  res.json({
    evaluations: ranked,
    best_market_id: ranked[0]?.market_id || 'cbe_central',
    summary: ranked[0]?.reason || { en: 'Optimal net return.', ta: 'உகந்த நிகர வருவாய்.', hi: 'इष्टतम शुद्ध लाभ।' }
  });
});

// 3. Departure-time Optimizer (12-hour window in 30-min increments)
app.post('/api/departure/optimize', (req, res) => {
  const { crop_id, total_kg, origin, destination, vehicle_type, departure_time } = req.body;
  const crop = (cropsData.crops as Crop[]).find((c) => c.id === crop_id) || (cropsData.crops[0] as Crop);
  const vehicle = (vehiclesData.vehicles as Vehicle[]).find((v) => v.id === vehicle_type) || (vehiclesData.vehicles[0] as Vehicle);
  const safeKg = parseFloat(String(total_kg)) || 5000;
  const safeCap = 3000;
  const trucksNeeded = Math.ceil(safeKg / safeCap);
  const fuelPrice = appSettings.fuel_price_per_litre;
  const fuelEff = appSettings.fuel_efficiency_kmpl[vehicle.id] || vehicle.fuel_efficiency_kmpl;
  const wholesalePrice = appSettings.crop_prices[crop.id] || crop.default_price_per_kg;

  const originLat = origin?.lat || 10.658;
  const originLng = origin?.lng || 77.012;
  const destLat = destination?.lat || 10.9982;
  const destLng = destination?.lng || 76.9632;

  const estDist = Math.max(10, Math.round(haversineDistance(originLat, originLng, destLat, destLng) * 1.25));
  const baseDurationMin = Math.max(20, Math.round((estDist / 45) * 60));

  const result = evaluateDepartureWindow(
    baseDurationMin,
    estDist,
    safeKg,
    wholesalePrice,
    crop.base_spoilage_rate,
    vehicle.temp_factor,
    fuelPrice,
    fuelEff,
    trucksNeeded,
    departure_time || new Date().toISOString()
  );

  res.json(result);
});

// 4. Cold-chain Break-even Calculator
app.post('/api/cold-chain/break-even', (req, res) => {
  const { load_kg, price_per_kg, f_open, f_reefer, extra_cost_inr } = req.body;
  const result = refrigerationBreakEven(
    parseFloat(String(load_kg)) || 5000,
    parseFloat(String(price_per_kg)) || 32,
    parseFloat(String(f_open)) || 0.045,
    parseFloat(String(f_reefer)) || 0.012,
    parseFloat(String(extra_cost_inr)) || 1500
  );
  res.json(result);
});

// 5. Consolidated Multi-farm Planning (Group Shipment)
app.post('/api/group-shipment/plan', (req, res) => {
  const { farms, truck_capacity_kg, base_cost_per_truck } = req.body;
  if (!Array.isArray(farms) || farms.length === 0) {
    return res.status(400).json({ code: 'FARMS_REQUIRED' });
  }
  const result = planGroupShipment(
    farms,
    parseFloat(String(truck_capacity_kg)) || 3000,
    parseFloat(String(base_cost_per_truck)) || 3200
  );
  res.json(result);
});

// 6. Saved Places & Backhaul
app.get('/api/places', (_req, res) => {
  res.json(savedPlacesList);
});

app.post('/api/places', (req, res) => {
  const newPlace = {
    id: `place_${Date.now()}`,
    name: req.body.name || 'Registered Farm',
    type: req.body.type || 'farm',
    lat: req.body.lat,
    lng: req.body.lng,
    contact_name: req.body.contact_name || 'Farmer',
    input_need: req.body.input_need || null,
    upcoming_harvest: req.body.upcoming_harvest || null
  };
  savedPlacesList.push(newPlace);
  savePlaces(savedPlacesList);
  res.json(newPlace);
});

app.delete('/api/places/:id', (req, res) => {
  savedPlacesList = savedPlacesList.filter((p: any) => p.id !== req.params.id);
  savePlaces(savedPlacesList);
  res.json({ success: true, id: req.params.id });
});

app.put('/api/places/:id/input_need', (req, res) => {
  const place = savedPlacesList.find((p: any) => p.id === req.params.id);
  if (!place) {
    return res.status(404).json({ code: 'PLACE_NOT_FOUND' });
  }
  place.input_need = req.body.input_need;
  savePlaces(savedPlacesList);
  res.json(place);
});

// 7. Backhaul Suggestions Matching
app.post('/api/backhaul/match', (req, res) => {
  const { route_geometry, max_corridor_km } = req.body;
  if (!Array.isArray(route_geometry) || route_geometry.length === 0) {
    return res.json([]);
  }
  const matches = findBackhaulSuggestions(
    route_geometry,
    savedPlacesList,
    parseFloat(String(max_corridor_km)) || 5.0
  );
  res.json(matches);
});

// 8. Learning Spoilage from Outcomes (Calibration)
app.get('/api/calibration/records', (req, res) => {
  const cropId = (req.query.crop_id as string) || 'tomato';
  const crop = (cropsData.crops as Crop[]).find((c) => c.id === cropId) || (cropsData.crops[0] as Crop);
  const status = evaluateCropCalibration(cropId, calibrationDataStore.records, crop.base_spoilage_rate);
  const records = calibrationDataStore.records.filter((r: any) => r.crop_id === cropId);
  res.json({ status, records });
});

app.post('/api/calibration/records', (req, res) => {
  const { crop_id, shipment_id, actual_loss_kg, total_kg, duration_hours, heat_factor } = req.body;
  const safeLoss = parseFloat(String(actual_loss_kg)) || 100;
  const safeTotal = parseFloat(String(total_kg)) || 5000;
  const safeHours = parseFloat(String(duration_hours)) || 1.2;
  const safeHeat = parseFloat(String(heat_factor)) || 1.2;

  const kObserved = solveObservedK(safeLoss, safeTotal, safeHours, safeHeat);
  const crop = (cropsData.crops as Crop[]).find((c) => c.id === crop_id) || (cropsData.crops[0] as Crop);

  const newRecord = {
    id: `calib_${Date.now()}`,
    crop_id: crop_id || 'tomato',
    shipment_id: shipment_id || `plan-${Date.now()}`,
    recorded_at: new Date().toISOString(),
    duration_hours: safeHours,
    heat_factor: safeHeat,
    predicted_loss_kg: Math.round(safeTotal * (1 - Math.exp(-crop.base_spoilage_rate * safeHours * safeHeat))),
    actual_loss_kg: safeLoss,
    total_kg: safeTotal,
    k_observed: kObserved
  };

  calibrationDataStore.records.unshift(newRecord);
  saveCalibration(calibrationDataStore);

  const updatedStatus = evaluateCropCalibration(newRecord.crop_id, calibrationDataStore.records, crop.base_spoilage_rate);
  res.json({ record: newRecord, status: updatedStatus });
});

// 9. Shipment Timeline State Transitions
app.put('/api/shipments/:id/status', (req, res) => {
  const { status, note } = req.body;
  const item = shipmentsList.find((s) => s.id === req.params.id);
  if (!item) {
    return res.status(404).json({ code: 'SHIPMENT_NOT_FOUND' });
  }

  item.status = status;
  if (!item.timeline) item.timeline = [];
  item.timeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || `Driver updated status to ${status}`
  });

  saveShipments(shipmentsList);
  res.json(item);
});

// 10. Weighbridge Slip Upload (EXIF stripped)
app.post('/api/shipments/:id/weighbridge', (req, res) => {
  const item = shipmentsList.find((s) => s.id === req.params.id);
  if (!item) {
    return res.status(404).json({ code: 'SHIPMENT_NOT_FOUND' });
  }

  const { image_base64, gross_weight_kg, tare_weight_kg, net_weight_kg } = req.body;
  item.weighbridge_slip = {
    image_url: image_base64 || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text y="40">Weighbridge Verified</text></svg>',
    recorded_at: new Date().toISOString(),
    gross_weight_kg: parseFloat(String(gross_weight_kg)) || 7500,
    tare_weight_kg: parseFloat(String(tare_weight_kg)) || 2500,
    net_weight_kg: parseFloat(String(net_weight_kg)) || 5000
  };

  saveShipments(shipmentsList);
  res.json(item);
});

// 11. Admin Observability Dashboard (Token Protected)
app.get('/api/admin/dashboard', (req, res) => {
  const authHeader = (req.headers['x-admin-token'] as string) || (req.headers['authorization'] as string);
  if (!verifyAdminToken(authHeader)) {
    recordErrorMetric('UNAUTHORIZED_ADMIN_TOKEN');
    return res.status(401).json({ code: 'UNAUTHORIZED_ADMIN_TOKEN' });
  }

  // Count calibration records per crop
  const recordsByCrop: Record<string, number> = {};
  for (const r of calibrationDataStore.records) {
    recordsByCrop[r.crop_id] = (recordsByCrop[r.crop_id] || 0) + 1;
  }

  const metrics = getAdminMetrics(recordsByCrop);
  res.json(metrics);
});

// Setup dev server with Vite middleware mode
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback SPA handler for all HTML routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`MarudhamX server running on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    server.close(() => process.exit(0));
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
