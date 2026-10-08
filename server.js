// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// src/data/crops.json
var crops_default = {
  crops: [
    {
      id: "tomato",
      name: {
        en: "Tomato",
        ta: "\u0BA4\u0B95\u0BCD\u0B95\u0BBE\u0BB3\u0BBF",
        hi: "\u091F\u092E\u093E\u091F\u0930"
      },
      category: "highly_perishable",
      base_spoilage_rate: 0.045,
      default_price_per_kg: 32,
      weights: {
        time: 0.5,
        spoilage: 0.3,
        cost: 0.15,
        traffic: 0.05
      }
    },
    {
      id: "leafy_vegetables",
      name: {
        en: "Leafy Vegetables (Spinach / Greens)",
        ta: "\u0B95\u0BC0\u0BB0\u0BC8 \u0BB5\u0B95\u0BC8\u0B95\u0BB3\u0BCD",
        hi: "\u0939\u0930\u0940 \u092A\u0924\u094D\u0924\u0947\u0926\u093E\u0930 \u0938\u092C\u094D\u091C\u093F\u092F\u093E\u0902"
      },
      category: "highly_perishable",
      base_spoilage_rate: 0.065,
      default_price_per_kg: 40,
      weights: {
        time: 0.52,
        spoilage: 0.33,
        cost: 0.1,
        traffic: 0.05
      }
    },
    {
      id: "banana",
      name: {
        en: "Banana (Nendran / Robusta)",
        ta: "\u0BB5\u0BBE\u0BB4\u0BC8\u0BAA\u0BCD\u0BAA\u0BB4\u0BAE\u0BCD",
        hi: "\u0915\u0947\u0932\u093E"
      },
      category: "medium",
      base_spoilage_rate: 0.025,
      default_price_per_kg: 35,
      weights: {
        time: 0.35,
        spoilage: 0.25,
        cost: 0.25,
        traffic: 0.15
      }
    },
    {
      id: "potato",
      name: {
        en: "Potato",
        ta: "\u0B89\u0BB0\u0BC1\u0BB3\u0BC8\u0B95\u0BCD\u0B95\u0BBF\u0BB4\u0B99\u0BCD\u0B95\u0BC1",
        hi: "\u0906\u0932\u0942"
      },
      category: "medium",
      base_spoilage_rate: 0.012,
      default_price_per_kg: 28,
      weights: {
        time: 0.3,
        spoilage: 0.2,
        cost: 0.35,
        traffic: 0.15
      }
    },
    {
      id: "onion",
      name: {
        en: "Small Onion (Shallots / Bellary)",
        ta: "\u0B9A\u0BBF\u0BA9\u0BCD\u0BA9 \u0BB5\u0BC6\u0B99\u0BCD\u0B95\u0BBE\u0BAF\u0BAE\u0BCD",
        hi: "\u092A\u094D\u092F\u093E\u091C"
      },
      category: "medium",
      base_spoilage_rate: 0.018,
      default_price_per_kg: 45,
      weights: {
        time: 0.32,
        spoilage: 0.22,
        cost: 0.32,
        traffic: 0.14
      }
    },
    {
      id: "maize",
      name: {
        en: "Maize (Corn)",
        ta: "\u0BAE\u0B95\u0BCD\u0B95\u0BBE\u0B9A\u0BCD\u0B9A\u0BCB\u0BB3\u0BAE\u0BCD",
        hi: "\u092E\u0915\u094D\u0915\u093E"
      },
      category: "low",
      base_spoilage_rate: 6e-3,
      default_price_per_kg: 24,
      weights: {
        time: 0.2,
        spoilage: 0.1,
        cost: 0.5,
        traffic: 0.2
      }
    },
    {
      id: "rice",
      name: {
        en: "Paddy / Rice",
        ta: "\u0BA8\u0BC6\u0BB2\u0BCD / \u0B85\u0BB0\u0BBF\u0B9A\u0BBF",
        hi: "\u0927\u093E\u0928 / \u091A\u093E\u0935\u0932"
      },
      category: "low",
      base_spoilage_rate: 2e-3,
      default_price_per_kg: 38,
      weights: {
        time: 0.15,
        spoilage: 0.05,
        cost: 0.6,
        traffic: 0.2
      }
    }
  ]
};

// src/data/markets.json
var markets_default = {
  markets: [
    {
      id: "cbe_central",
      name: {
        en: "Coimbatore Tyagikumaran Market",
        ta: "\u0B95\u0BCB\u0BAF\u0BAE\u0BCD\u0BAA\u0BC1\u0BA4\u0BCD\u0BA4\u0BC2\u0BB0\u0BCD \u0BA4\u0BBF\u0BAF\u0BBE\u0B95\u0BBF \u0B95\u0BC1\u0BAE\u0BB0\u0BA9\u0BCD \u0B9A\u0BA8\u0BCD\u0BA4\u0BC8",
        hi: "\u0915\u094B\u092F\u0902\u092C\u091F\u0942\u0930 \u0924\u094D\u092F\u093E\u0917\u093F\u0915\u0941\u092E\u093E\u0930\u0928 \u092E\u0902\u0921\u0940"
      },
      lat: 10.9982,
      lng: 76.9632,
      district: "Coimbatore"
    },
    {
      id: "pollachi",
      name: {
        en: "Pollachi Gandhi Market",
        ta: "\u0BAA\u0BCA\u0BB3\u0BCD\u0BB3\u0BBE\u0B9A\u0BCD\u0B9A\u0BBF \u0B95\u0BBE\u0BA8\u0BCD\u0BA4\u0BBF \u0B9A\u0BA8\u0BCD\u0BA4\u0BC8",
        hi: "\u092A\u094B\u0932\u093E\u091A\u0940 \u0917\u093E\u0902\u0927\u0940 \u092E\u0902\u0921\u0940"
      },
      lat: 10.6609,
      lng: 77.0048,
      district: "Coimbatore"
    },
    {
      id: "tiruppur",
      name: {
        en: "Tiruppur Thennampalayam Market",
        ta: "\u0BA4\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BC2\u0BB0\u0BCD \u0BA4\u0BC6\u0BA9\u0BCD\u0BA9\u0BAE\u0BCD\u0BAA\u0BBE\u0BB3\u0BC8\u0BAF\u0BAE\u0BCD \u0B9A\u0BA8\u0BCD\u0BA4\u0BC8",
        hi: "\u0924\u093F\u0930\u0941\u092A\u0941\u0930 \u0925\u0947\u0928\u094D\u0928\u092E\u092A\u0932\u093E\u092F\u092E \u092E\u0902\u0921\u0940"
      },
      lat: 11.1085,
      lng: 77.3411,
      district: "Tiruppur"
    },
    {
      id: "salem",
      name: {
        en: "Salem Shevapet Agro Market",
        ta: "\u0B9A\u0BC7\u0BB2\u0BAE\u0BCD \u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD\u0BAA\u0BCD\u0BAA\u0BC7\u0B9F\u0BCD\u0B9F\u0BC8 \u0B9A\u0BA8\u0BCD\u0BA4\u0BC8",
        hi: "\u0938\u0947\u0932\u092E \u0936\u0947\u0935\u093E\u092A\u0947\u091F \u0915\u0943\u0937\u093F \u092E\u0902\u0921\u0940"
      },
      lat: 11.6538,
      lng: 78.146,
      district: "Salem"
    },
    {
      id: "erode",
      name: {
        en: "Erode Nethaji Agro Market",
        ta: "\u0B88\u0BB0\u0BCB\u0B9F\u0BC1 \u0BA8\u0BC7\u0BA4\u0BBE\u0B9C\u0BBF \u0B95\u0BBE\u0BAF\u0BCD\u0B95\u0BB1\u0BBF \u0B9A\u0BA8\u0BCD\u0BA4\u0BC8",
        hi: "\u0907\u0930\u094B\u0921 \u0928\u0947\u0924\u093E\u091C\u0940 \u0938\u092C\u094D\u091C\u0940 \u092E\u0902\u0921\u0940"
      },
      lat: 11.341,
      lng: 77.7172,
      district: "Erode"
    },
    {
      id: "mettupalayam",
      name: {
        en: "Mettupalayam Agro Market",
        ta: "\u0BAE\u0BC7\u0B9F\u0BCD\u0B9F\u0BC1\u0BAA\u0BCD\u0BAA\u0BBE\u0BB3\u0BC8\u0BAF\u0BAE\u0BCD \u0BB5\u0BC7\u0BB3\u0BBE\u0BA3\u0BCD \u0B9A\u0BA8\u0BCD\u0BA4\u0BC8",
        hi: "\u092E\u0947\u091F\u094D\u091F\u0941\u092A\u093E\u0932\u092F\u092E \u0915\u0943\u0937\u093F \u092E\u0902\u0921\u0940"
      },
      lat: 11.3005,
      lng: 76.9482,
      district: "Coimbatore"
    },
    {
      id: "chennai_koyambedu",
      name: {
        en: "Chennai Koyambedu Wholesale Market",
        ta: "\u0B9A\u0BC6\u0BA9\u0BCD\u0BA9\u0BC8 \u0B95\u0BCB\u0BAF\u0BAE\u0BCD\u0BAA\u0BC7\u0B9F\u0BC1 \u0BAE\u0BCA\u0BA4\u0BCD\u0BA4 \u0B9A\u0BA8\u0BCD\u0BA4\u0BC8",
        hi: "\u091A\u0947\u0928\u094D\u0928\u0908 \u0915\u094B\u092F\u092E\u094D\u092C\u0947\u0921\u0941 \u0925\u094B\u0915 \u092E\u0902\u0921\u0940"
      },
      lat: 13.0694,
      lng: 80.1948,
      district: "Chennai"
    }
  ]
};

// src/data/vehicles.json
var vehicles_default = {
  vehicles: [
    {
      id: "open_truck",
      name: {
        en: "Open Truck",
        ta: "\u0BA4\u0BBF\u0BB1\u0BA8\u0BCD\u0BA4 \u0BB2\u0BBE\u0BB0\u0BBF",
        hi: "\u0916\u0941\u0932\u093E \u091F\u094D\u0930\u0915"
      },
      temp_factor: 1,
      default_capacity_kg: 3e3,
      fuel_efficiency_kmpl: 5.5,
      description: {
        en: "Standard ambient airflow, highest sun exposure and spoilage rate",
        ta: "\u0B87\u0BAF\u0BB2\u0BCD\u0BAA\u0BBE\u0BA9 \u0B95\u0BBE\u0BB1\u0BCD\u0BB1\u0BC1 \u0B93\u0B9F\u0BCD\u0B9F\u0BAE\u0BCD, \u0B85\u0BA4\u0BBF\u0B95 \u0B9A\u0BC2\u0BB0\u0BBF\u0BAF \u0BB5\u0BC6\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0B85\u0BB4\u0BC1\u0B95\u0BB2\u0BCD \u0BB5\u0BBE\u0BAF\u0BCD\u0BAA\u0BCD\u0BAA\u0BC1",
        hi: "\u0938\u093E\u092E\u093E\u0928\u094D\u092F \u0939\u0935\u093E, \u0905\u0927\u093F\u0915 \u0927\u0942\u092A \u0914\u0930 \u0916\u0930\u093E\u092C \u0939\u094B\u0928\u0947 \u0915\u093E \u0909\u091A\u094D\u091A \u091C\u094B\u0916\u093F\u092E"
      }
    },
    {
      id: "closed_truck",
      name: {
        en: "Closed Container Truck",
        ta: "\u0BAE\u0BC2\u0B9F\u0BBF\u0BAF \u0B95\u0BCA\u0BB3\u0BCD\u0B95\u0BB2\u0BA9\u0BCD \u0BB2\u0BBE\u0BB0\u0BBF",
        hi: "\u092C\u0902\u0926 \u0915\u0902\u091F\u0947\u0928\u0930 \u091F\u094D\u0930\u0915"
      },
      temp_factor: 0.7,
      default_capacity_kg: 6e3,
      fuel_efficiency_kmpl: 4.8,
      description: {
        en: "Covered cargo, protects against direct sunlight and rain",
        ta: "\u0BAE\u0BC2\u0B9F\u0BBF\u0BAF \u0B9A\u0BB0\u0B95\u0BCD\u0B95\u0BC1 \u0B85\u0BB1\u0BC8, \u0BA8\u0BC7\u0BB0\u0B9F\u0BBF \u0BB5\u0BC6\u0BAF\u0BBF\u0BB2\u0BCD \u0BAE\u0BB1\u0BCD\u0BB1\u0BC1\u0BAE\u0BCD \u0BAE\u0BB4\u0BC8\u0BAF\u0BBF\u0BB2\u0BBF\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4\u0BC1 \u0BAA\u0BBE\u0BA4\u0BC1\u0B95\u0BBE\u0BAA\u0BCD\u0BAA\u0BC1",
        hi: "\u0922\u0915\u093E \u0939\u0941\u0906 \u092E\u093E\u0932\u0935\u093E\u0939\u0915, \u0938\u0940\u0927\u0940 \u0927\u0942\u092A \u0914\u0930 \u092C\u093E\u0930\u093F\u0936 \u0938\u0947 \u092C\u091A\u093E\u0935"
      }
    },
    {
      id: "refrigerated_truck",
      name: {
        en: "Refrigerated Truck (Cold Chain)",
        ta: "\u0B95\u0BC1\u0BB3\u0BBF\u0BB0\u0BC2\u0B9F\u0BCD\u0B9F\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F \u0BB2\u0BBE\u0BB0\u0BBF",
        hi: "\u0936\u0940\u0924\u0932\u0928 (\u0930\u0947\u092B\u094D\u0930\u093F\u091C\u0930\u0947\u091F\u0947\u0921) \u091F\u094D\u0930\u0915"
      },
      temp_factor: 0.3,
      default_capacity_kg: 6e3,
      fuel_efficiency_kmpl: 3.8,
      description: {
        en: "Active temperature control, slows down perishable spoilage by 70%",
        ta: "\u0B9A\u0BC6\u0BAF\u0BB2\u0BCD\u0BA4\u0BBF\u0BB1\u0BA9\u0BCD \u0B95\u0BCA\u0BA3\u0BCD\u0B9F \u0B95\u0BC1\u0BB3\u0BBF\u0BB0\u0BCD\u0B9A\u0BBE\u0BA4\u0BA9\u0BAE\u0BCD, \u0B85\u0BB4\u0BC1\u0B95\u0BB2\u0BCD \u0BB5\u0BC7\u0B95\u0BA4\u0BCD\u0BA4\u0BC8 70% \u0BB5\u0BB0\u0BC8 \u0B95\u0BC1\u0BB1\u0BC8\u0B95\u0BCD\u0B95\u0BBF\u0BB1\u0BA4\u0BC1",
        hi: "\u0938\u0915\u094D\u0930\u093F\u092F \u0924\u093E\u092A\u092E\u093E\u0928 \u0928\u093F\u092F\u0902\u0924\u094D\u0930\u0923, \u0916\u0930\u093E\u092C \u0939\u094B\u0928\u0947 \u0915\u0940 \u0917\u0924\u093F \u0915\u094B 70% \u0924\u0915 \u0927\u0940\u092E\u093E \u0915\u0930\u0924\u093E \u0939\u0948"
      }
    }
  ],
  capacity_presets: [1e3, 3e3, 6e3, 1e4]
};

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json());
var SETTINGS_FILE = path.join(__dirname, "settings_store.json");
var SHIPMENTS_FILE = path.join(__dirname, "shipments_store.json");
var defaultSettings = {
  language: "ta",
  // Default to Tamil as emphasized in user prompt, can switch to en or hi
  fuel_price_per_litre: 98.5,
  fuel_efficiency_kmpl: {
    open_truck: 5.5,
    closed_truck: 4.8,
    refrigerated_truck: 3.8
  },
  default_truck_capacity_kg: 3e3,
  crop_prices: {
    tomato: 32,
    leafy_vegetables: 40,
    banana: 35,
    potato: 28,
    onion: 45,
    maize: 24,
    rice: 38
  },
  traffic_profile: "typical",
  units: "km",
  google_maps_configured: Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY)
};
function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      return { ...defaultSettings, ...data };
    }
  } catch (err) {
    console.error("Error loading settings:", err);
  }
  return { ...defaultSettings };
}
function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving settings:", err);
  }
}
var appSettings = loadSettings();
function loadShipments() {
  try {
    if (fs.existsSync(SHIPMENTS_FILE)) {
      return JSON.parse(fs.readFileSync(SHIPMENTS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading shipments:", err);
  }
  return [];
}
function saveShipments(shipments) {
  try {
    fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(shipments, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving shipments:", err);
  }
}
var shipmentsList = loadShipments();
if (shipmentsList.length === 0) {
  const seedDemo = {
    id: "demo-pollachi-cbe",
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    crop_id: "tomato",
    crop_name: {
      en: "Tomato",
      ta: "\u0BA4\u0B95\u0BCD\u0B95\u0BBE\u0BB3\u0BBF",
      hi: "\u091F\u092E\u093E\u091F\u0930"
    },
    total_kg: 5e3,
    origin: {
      name: "Pollachi Farm (\u0BAA\u0BCA\u0BB3\u0BCD\u0BB3\u0BBE\u0B9A\u0BCD\u0B9A\u0BBF \u0BAA\u0BA3\u0BCD\u0BA3\u0BC8)",
      lat: 10.658,
      lng: 77.012
    },
    destination: {
      name: "Coimbatore Market (\u0B95\u0BCB\u0BAF\u0BAE\u0BCD\u0BAA\u0BC1\u0BA4\u0BCD\u0BA4\u0BC2\u0BB0\u0BCD \u0BA4\u0BBF\u0BAF\u0BBE\u0B95\u0BBF \u0B95\u0BC1\u0BAE\u0BB0\u0BA9\u0BCD \u0B9A\u0BA8\u0BCD\u0BA4\u0BC8)",
      lat: 10.9982,
      lng: 76.9632
    },
    vehicle_type: "refrigerated_truck",
    departure_time: (/* @__PURE__ */ new Date()).toISOString(),
    truck_breakdown: {
      total_kg: 5e3,
      truck_capacity_kg: 3e3,
      trucks_needed: 2,
      full_trucks: 1,
      last_truck_load: 2e3,
      trucks: [
        { truck_index: 1, load_kg: 3e3, capacity_kg: 3e3, utilization_percent: 100 },
        { truck_index: 2, load_kg: 2e3, capacity_kg: 3e3, utilization_percent: 67 }
      ]
    },
    recommended_route_id: "A",
    tradeoff: {
      recommended_route_id: "A",
      compared_route_id: "B",
      extra_cost_inr: 420,
      loss_savings_inr: 3200,
      time_savings_min: 24
    },
    routes: [
      {
        id: "A",
        name: "NH-83 / Coimbatore Pollachi Expressway",
        data_source: "osrm_estimated",
        traffic_is_live: false,
        geometry: [
          [10.658, 77.012],
          [10.745, 77.001],
          [10.824, 76.993],
          [10.912, 76.978],
          [10.9982, 76.9632]
        ],
        geometry_segments: [
          {
            speed: "UNKNOWN",
            coords: [
              [10.658, 77.012],
              [10.745, 77.001],
              [10.824, 76.993],
              [10.912, 76.978],
              [10.9982, 76.9632]
            ]
          }
        ],
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
          { instruction: "Start north on Pollachi Main Road", distance_m: 8500, duration_sec: 600, name: "NH-83" },
          { instruction: "Continue through Kinathukadavu Flyover", distance_m: 18200, duration_sec: 1200, name: "NH-83 Highway" },
          { instruction: "Merge onto Eachanari By-pass", distance_m: 11400, duration_sec: 840, name: "Pollachi Road" },
          { instruction: "Arrive at Tyagikumaran Agro Market", distance_m: 5700, duration_sec: 480, name: "Market Way" }
        ]
      },
      {
        id: "B",
        name: "Via Kinathukadavu - Chettipalayam Road",
        data_source: "osrm_estimated",
        traffic_is_live: false,
        geometry: [
          [10.658, 77.012],
          [10.745, 77.001],
          [10.852, 77.051],
          [10.935, 77.021],
          [10.9982, 76.9632]
        ],
        geometry_segments: [
          {
            speed: "UNKNOWN",
            coords: [
              [10.658, 77.012],
              [10.745, 77.001],
              [10.852, 77.051],
              [10.935, 77.021],
              [10.9982, 76.9632]
            ]
          }
        ],
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
          traffic: 0.1
        },
        steps: [
          { instruction: "Head north on SH-163", distance_m: 12e3, duration_sec: 900, name: "Chettipalayam Road" },
          { instruction: "Turn left onto L&T Bypass", distance_m: 24e3, duration_sec: 2100, name: "Bypass" },
          { instruction: "Proceed to Market Gate", distance_m: 15200, duration_sec: 1560, name: "City Access" }
        ]
      }
    ],
    assumptions: {
      fuel_price_per_litre: 98.5,
      wholesale_price_per_kg: 32,
      base_spoilage_rate: 0.045,
      temp_factor: 0.3,
      traffic_profile: "typical",
      data_source: "osrm_estimated"
    }
  };
  shipmentsList.push(seedDemo);
  saveShipments(shipmentsList);
}
var geocodeCache = /* @__PURE__ */ new Map();
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "MarudhamX" });
});
app.get("/api/meta/crops", (_req, res) => {
  res.json(crops_default);
});
app.get("/api/meta/markets", (_req, res) => {
  res.json(markets_default);
});
app.get("/api/meta/vehicles", (_req, res) => {
  res.json(vehicles_default);
});
app.get("/api/settings", (_req, res) => {
  res.json(appSettings);
});
app.put("/api/settings", (req, res) => {
  const updated = { ...appSettings, ...req.body };
  appSettings = updated;
  saveSettings(appSettings);
  res.json(appSettings);
});
app.get("/api/geocode/reverse", async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const lang = req.query.lang || "ta";
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ code: "INVALID_COORDINATES" });
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
        "User-Agent": "MarudhamX-PerishableProduceOptimizer/1.0 (agri-logistics-optimizer)"
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
    console.error("Nominatim reverse geocode error or timeout:", err);
  }
  const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  res.json({ address: fallbackAddress, lat, lng });
});
async function fetchOsrmRoutes(origin, destination) {
  const baseUrl = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
  const url = `${baseUrl}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6e3);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      if (json.code === "Ok" && Array.isArray(json.routes) && json.routes.length > 0) {
        return json.routes;
      }
    }
  } catch (err) {
    console.warn("OSRM primary call failed or timed out:", err);
  }
  return null;
}
async function fetchOsrmRouteVia(origin, via, destination) {
  const baseUrl = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
  const url = `${baseUrl}/route/v1/driving/${origin.lng},${origin.lat};${via.lng},${via.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4e3);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      if (json.code === "Ok" && Array.isArray(json.routes) && json.routes.length > 0) {
        return json.routes[0];
      }
    }
  } catch (err) {
  }
  return null;
}
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function getTrafficMultiplier(departureIso, profile) {
  let hour = (/* @__PURE__ */ new Date()).getHours();
  try {
    hour = new Date(departureIso).getHours();
  } catch {
  }
  let base = 1.15;
  if (hour >= 21 || hour < 6) {
    base = 1;
  } else if (hour >= 8 && hour <= 10 || hour >= 17 && hour <= 20) {
    base = 1.45;
  } else if (hour >= 6 && hour < 8 || hour >= 16 && hour < 17) {
    base = 1.25;
  }
  if (profile === "off_peak") return Math.max(1, base * 0.85);
  if (profile === "heavy") return base * 1.25;
  return base;
}
app.post("/api/shipments/plan", async (req, res) => {
  const {
    crop_id,
    total_kg,
    truck_capacity_kg,
    origin,
    destination,
    vehicle_type,
    departure_time
  } = req.body;
  if (!total_kg || total_kg <= 0) {
    return res.status(400).json({ code: "QUANTITY_INVALID" });
  }
  if (!truck_capacity_kg || truck_capacity_kg <= 0) {
    return res.status(400).json({ code: "CAPACITY_INVALID" });
  }
  if (!origin || typeof origin.lat !== "number" || typeof origin.lng !== "number") {
    return res.status(400).json({ code: "ORIGIN_REQUIRED" });
  }
  if (!destination || typeof destination.lat !== "number" || typeof destination.lng !== "number") {
    return res.status(400).json({ code: "DESTINATION_REQUIRED" });
  }
  const crop = crops_default.crops.find((c) => c.id === crop_id) || crops_default.crops[0];
  const vehicle = vehicles_default.vehicles.find((v) => v.id === vehicle_type) || vehicles_default.vehicles[0];
  const trucks_needed = Math.ceil(total_kg / truck_capacity_kg);
  const full_trucks = Math.floor(total_kg / truck_capacity_kg);
  const last_truck_load = total_kg - full_trucks * truck_capacity_kg;
  const trucks = [];
  for (let i = 1; i <= full_trucks; i++) {
    trucks.push({
      truck_index: i,
      load_kg: truck_capacity_kg,
      capacity_kg: truck_capacity_kg,
      utilization_percent: 100
    });
  }
  if (last_truck_load > 0) {
    trucks.push({
      truck_index: full_trucks + 1,
      load_kg: last_truck_load,
      capacity_kg: truck_capacity_kg,
      utilization_percent: Math.round(last_truck_load / truck_capacity_kg * 100)
    });
  }
  const truck_breakdown = {
    total_kg,
    truck_capacity_kg,
    trucks_needed,
    full_trucks,
    last_truck_load,
    trucks
  };
  let osrmRoutes = await fetchOsrmRoutes(origin, destination);
  const rawCandidateRoutes = [];
  if (osrmRoutes && osrmRoutes.length > 0) {
    for (const r of osrmRoutes) {
      const coords = r.geometry.coordinates.map((c) => [c[1], c[0]]);
      const steps = [];
      if (r.legs && r.legs[0] && r.legs[0].steps) {
        for (const s of r.legs[0].steps) {
          if (s.maneuver) {
            steps.push({
              instruction: s.maneuver.instruction || (s.name ? `Proceed on ${s.name}` : "Continue on road"),
              distance_m: Math.round(s.distance || 0),
              duration_sec: Math.round(s.duration || 0),
              name: s.name || ""
            });
          }
        }
      }
      rawCandidateRoutes.push({
        geometry: coords,
        distance_km: parseFloat((r.distance / 1e3).toFixed(1)),
        duration_min: Math.round(r.duration / 60),
        steps: steps.slice(0, 15),
        name: r.legs?.[0]?.summary || ""
      });
    }
  }
  if (rawCandidateRoutes.length < 3) {
    const hubs = [
      { name: "Kinathukadavu", lat: 10.824, lng: 77.012 },
      { name: "Pollachi Bypass", lat: 10.662, lng: 77.008 },
      { name: "Tiruppur Corridor", lat: 11.108, lng: 77.341 },
      { name: "Palladam Hub", lat: 11.006, lng: 77.288 },
      { name: "Sulur Highway", lat: 11.026, lng: 77.126 }
    ];
    for (const hub of hubs) {
      if (rawCandidateRoutes.length >= 4) break;
      if (haversineDistance(origin.lat, origin.lng, hub.lat, hub.lng) < 5 || haversineDistance(destination.lat, destination.lng, hub.lat, hub.lng) < 5) {
        continue;
      }
      const detourRoute = await fetchOsrmRouteVia(origin, hub, destination);
      if (detourRoute) {
        const coords = detourRoute.geometry.coordinates.map((c) => [c[1], c[0]]);
        const distKm = parseFloat((detourRoute.distance / 1e3).toFixed(1));
        const isDuplicate = rawCandidateRoutes.some(
          (ex) => Math.abs(ex.distance_km - distKm) < 1.5
        );
        if (!isDuplicate) {
          const steps = [];
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
  if (rawCandidateRoutes.length === 0) {
    const straightDist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    const estDistanceKm = Math.max(12, Math.round(straightDist * 1.35));
    const estDurationMin = Math.round(estDistanceKm / 48 * 60);
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
        { instruction: "Depart origin onto main highway", distance_m: 5e3, duration_sec: 400, name: "State Highway" },
        { instruction: "Follow regional transit corridor", distance_m: Math.round(estDistanceKm * 800), duration_sec: Math.round(estDurationMin * 45), name: "National Highway" },
        { instruction: "Reach destination wholesale market", distance_m: 3e3, duration_sec: 300, name: "Market Approach" }
      ],
      name: "Direct Highway Corridor"
    });
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
        { instruction: "Depart via arterial bypass", distance_m: 6e3, duration_sec: 500, name: "Bypass Road" },
        { instruction: "Continue on ring corridor", distance_m: Math.round(estDistanceKm * 950), duration_sec: Math.round(estDurationMin * 55), name: "Ring Road" },
        { instruction: "Enter market via east gate", distance_m: 4e3, duration_sec: 400, name: "Market Way" }
      ],
      name: "Ring Road Corridor"
    });
  }
  const departureDate = departure_time || (/* @__PURE__ */ new Date()).toISOString();
  const trafficMult = getTrafficMultiplier(departureDate, appSettings.traffic_profile);
  const fuelPrice = appSettings.fuel_price_per_litre;
  const fuelEff = appSettings.fuel_efficiency_kmpl[vehicle_type] || vehicle.fuel_efficiency_kmpl;
  const wholesalePrice = appSettings.crop_prices[crop_id] || crop.default_price_per_kg;
  const currentMonth = new Date(departureDate).getMonth();
  let heat_factor = 1.1;
  if (currentMonth >= 2 && currentMonth <= 5) {
    heat_factor = 1.25;
  } else if (currentMonth >= 10 || currentMonth <= 0) {
    heat_factor = 0.95;
  }
  const k_spoilage = crop.base_spoilage_rate * vehicle.temp_factor * heat_factor;
  const candidateResults = rawCandidateRoutes.map((raw, idx) => {
    const id = String.fromCharCode(65 + idx);
    const duration_no_traffic = raw.duration_min;
    const duration_with_traffic = Math.round(raw.duration_min * trafficMult);
    const traffic_delay = Math.max(0, duration_with_traffic - duration_no_traffic);
    const fuel_cost = Math.round(raw.distance_km / fuelEff * fuelPrice * trucks_needed);
    const driver_allowance = 450 * trucks_needed;
    const toll_cost = Math.round(raw.distance_km > 55 ? raw.distance_km / 50 * 85 : 0);
    const transport_cost = fuel_cost + driver_allowance + toll_cost;
    const travel_time_hours = duration_with_traffic / 60;
    const spoilage_fraction = Math.min(0.99, parseFloat((1 - Math.exp(-k_spoilage * travel_time_hours)).toFixed(4)));
    const expected_loss = Math.round(total_kg * wholesalePrice * spoilage_fraction);
    const total_economic_cost = transport_cost + expected_loss;
    const segments = [
      {
        speed: "UNKNOWN",
        coords: raw.geometry
      }
    ];
    return {
      id,
      name: raw.name || `Route ${id}`,
      data_source: "osrm_estimated",
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
      score: 0,
      // Calculated below
      weight_contributions: {
        time: crop.weights.time,
        spoilage: crop.weights.spoilage,
        cost: crop.weights.cost,
        traffic: crop.weights.traffic
      },
      steps: raw.steps
    };
  });
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
    const weightedPenalty = crop.weights.time * n_time + crop.weights.cost * n_cost + crop.weights.spoilage * n_loss;
    r.score = Math.round(100 * Math.max(0.1, 1 - weightedPenalty));
  });
  candidateResults.sort((a, b) => b.score - a.score);
  const recommended = candidateResults[0];
  const cheapest = [...candidateResults].sort((a, b) => a.transport_cost_inr - b.transport_cost_inr)[0];
  const compared = cheapest.id !== recommended.id ? cheapest : candidateResults[1] || candidateResults[0];
  const extraCost = Math.max(0, recommended.transport_cost_inr - compared.transport_cost_inr);
  const lossSavings = Math.max(0, compared.expected_loss_inr - recommended.expected_loss_inr);
  const timeSavings = Math.max(0, compared.duration_min - recommended.duration_min);
  const newPlan = {
    id: `plan-${Date.now()}`,
    created_at: (/* @__PURE__ */ new Date()).toISOString(),
    crop_id,
    crop_name: crop.name,
    total_kg,
    origin: {
      name: origin.name || `${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}`,
      lat: origin.lat,
      lng: origin.lng
    },
    destination: {
      name: destination.name || `${destination.lat.toFixed(5)}, ${destination.lng.toFixed(5)}`,
      lat: destination.lat,
      lng: destination.lng
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
      data_source: "osrm_estimated"
    }
  };
  shipmentsList.unshift(newPlan);
  saveShipments(shipmentsList);
  res.json(newPlan);
});
app.get("/api/shipments", (_req, res) => {
  res.json(shipmentsList);
});
app.get("/api/shipments/:id", (req, res) => {
  const item = shipmentsList.find((s) => s.id === req.params.id);
  if (!item) {
    return res.status(404).json({ code: "SHIPMENT_NOT_FOUND" });
  }
  res.json(item);
});
app.get("/api/shipments/:id/export.csv", (req, res) => {
  const item = shipmentsList.find((s) => s.id === req.params.id);
  if (!item) {
    return res.status(404).send("Not Found");
  }
  const lang = req.query.lang || "ta";
  let headerRow = "Date,Crop,Total Kg,Trucks,Origin,Destination,Route,Distance (km),Time (min),Transport Cost (INR),Expected Loss (INR),Total Cost (INR)";
  if (lang === "ta") {
    headerRow = "\u0BA8\u0BBE\u0BB3\u0BCD,\u0BB5\u0BBF\u0BB3\u0BC8\u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BCD,\u0BAE\u0BCA\u0BA4\u0BCD\u0BA4 \u0B8E\u0B9F\u0BC8 (\u0B95\u0BBF\u0BB2\u0BCB),\u0BB2\u0BBE\u0BB0\u0BBF\u0B95\u0BB3\u0BCD,\u0BAA\u0BC1\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F \u0B87\u0B9F\u0BAE\u0BCD,\u0B9A\u0BC6\u0BA9\u0BCD\u0BB1\u0B9F\u0BC8\u0BA8\u0BCD\u0BA4 \u0B87\u0B9F\u0BAE\u0BCD,\u0BAA\u0BB0\u0BBF\u0BA8\u0BCD\u0BA4\u0BC1\u0BB0\u0BC8\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F \u0BAA\u0BBE\u0BA4\u0BC8,\u0BA4\u0BC2\u0BB0\u0BAE\u0BCD (\u0B95\u0BBF.\u0BAE\u0BC0.),\u0BAA\u0BAF\u0BA3 \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD (\u0BA8\u0BBF\u0BAE\u0BBF),\u0BB5\u0BA3\u0BCD\u0B9F\u0BBF\u0B9A\u0BCD \u0B9A\u0BC6\u0BB2\u0BB5\u0BC1 (\u20B9),\u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BC1\u0BAE\u0BCD \u0B87\u0BB4\u0BAA\u0BCD\u0BAA\u0BC1 (\u20B9),\u0BAE\u0BCA\u0BA4\u0BCD\u0BA4 \u0BAA\u0BCA\u0BB0\u0BC1\u0BB3\u0BBE\u0BA4\u0BBE\u0BB0\u0B9A\u0BCD \u0B9A\u0BC6\u0BB2\u0BB5\u0BC1 (\u20B9)";
  } else if (lang === "hi") {
    headerRow = "\u0924\u093E\u0930\u0940\u0916,\u092B\u0938\u0932,\u0915\u0941\u0932 \u092E\u093E\u0924\u094D\u0930\u093E (\u0915\u093F\u0917\u094D\u0930\u093E),\u091F\u094D\u0930\u0915,\u092A\u094D\u0930\u093E\u0930\u0902\u092D\u093F\u0915 \u0938\u094D\u0925\u0932,\u0917\u0902\u0924\u0935\u094D\u092F,\u0905\u0928\u0941\u0936\u0902\u0938\u093F\u0924 \u092E\u093E\u0930\u094D\u0917,\u0926\u0942\u0930\u0940 (\u0915\u093F\u092E\u0940),\u0938\u092E\u092F (\u092E\u093F\u0928\u091F),\u092A\u0930\u093F\u0935\u0939\u0928 \u0932\u093E\u0917\u0924 (\u20B9),\u0905\u092A\u0947\u0915\u094D\u0937\u093F\u0924 \u0928\u0941\u0915\u0938\u093E\u0928 (\u20B9),\u0915\u0941\u0932 \u0906\u0930\u094D\u0925\u093F\u0915 \u0932\u093E\u0917\u0924 (\u20B9)";
  }
  const recRoute = item.routes.find((r) => r.id === item.recommended_route_id) || item.routes[0];
  const cropTitle = item.crop_name[lang] || item.crop_name.ta;
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
  ].join(",");
  const csvContent = "\uFEFF" + headerRow + "\n" + dataRow + "\n";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="marudhamx_shipment_${item.id}.csv"`);
  res.send(csvContent);
});
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MarudhamX server running on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
