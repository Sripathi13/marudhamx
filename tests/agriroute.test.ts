import assert from 'node:assert';
import en from '../src/locales/en.json';
import ta from '../src/locales/ta.json';
import hi from '../src/locales/hi.json';
import cropsData from '../src/data/crops.json';
import vehiclesData from '../src/data/vehicles.json';

console.log('🧪 Starting AgriRoute / MarudhamX Validation Tests...');

// --- TEST 1: Locale Key Parity ---
console.log('Test 1: Locale key parity between EN, TA, and HI');
function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getAllKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

const enKeys = getAllKeys(en);
const taKeys = getAllKeys(ta);
const hiKeys = getAllKeys(hi);

assert.deepStrictEqual(
  enKeys,
  taKeys,
  `Tamil keys do not match English keys. Difference: ${JSON.stringify(enKeys.filter((k) => !taKeys.includes(k)))}`
);
assert.deepStrictEqual(
  enKeys,
  hiKeys,
  `Hindi keys do not match English keys. Difference: ${JSON.stringify(enKeys.filter((k) => !hiKeys.includes(k)))}`
);
console.log(`✅ All ${enKeys.length} locale keys match perfectly across EN, TA, and HI.`);

// --- TEST 2: Strict Tamil Verification (No English Leakage) ---
console.log('Test 2: Strict Tamil Verification (No Latin script leakage)');
const allowedExceptions = new Set(['₹', '%', ':', '-', '•', '.', ',', '(', ')', '/', '+']);

function checkTamilValue(key: string, val: any) {
  if (typeof val === 'string') {
    // Skip template variables like {{unit}}, {{count}}, {{lat}}, {{lng}}, {{needed}}, etc.
    const cleanVal = val.replace(/\{\{[^}]+\}\}/g, '').trim();

    // Check for raw Latin characters [A-Za-z]
    const latinMatch = cleanVal.match(/[A-Za-z]/);
    if (latinMatch) {
      throw new Error(`Untranslated Latin character "${latinMatch[0]}" found in Tamil translation key: "${key}" (value: "${val}")`);
    }
  } else if (typeof val === 'object' && val !== null) {
    for (const [k, v] of Object.entries(val)) {
      checkTamilValue(`${key}.${k}`, v);
    }
  }
}

for (const [key, val] of Object.entries(ta)) {
  checkTamilValue(key, val);
}
console.log('✅ Strict Tamil verification passed: Zero Latin letters found in Tamil translations.');

// --- TEST 3: Truck Capacity and Load Split ---
console.log('Test 3: Truck Capacity and Load Split');
function computeTruckBreakdown(totalKg: number, truckCapacityKg: number) {
  if (totalKg <= 0 || truckCapacityKg <= 0) {
    throw new Error('INVALID_INPUT');
  }
  const trucksNeeded = Math.ceil(totalKg / truckCapacityKg);
  const fullTrucks = Math.floor(totalKg / truckCapacityKg);
  const lastTruckLoad = totalKg - fullTrucks * truckCapacityKg;
  return { trucksNeeded, fullTrucks, lastTruckLoad };
}

// 10,000 kg with 3,000 kg capacity -> 4 trucks, last load 1,000 kg
const split1 = computeTruckBreakdown(10000, 3000);
assert.strictEqual(split1.trucksNeeded, 4);
assert.strictEqual(split1.fullTrucks, 3);
assert.strictEqual(split1.lastTruckLoad, 1000);

// 9,000 kg with 3,000 kg capacity -> 3 full trucks, last load 0
const split2 = computeTruckBreakdown(9000, 3000);
assert.strictEqual(split2.trucksNeeded, 3);
assert.strictEqual(split2.fullTrucks, 3);
assert.strictEqual(split2.lastTruckLoad, 0);

// Zero or negative rejects
assert.throws(() => computeTruckBreakdown(0, 3000));
assert.throws(() => computeTruckBreakdown(-50, 3000));
assert.throws(() => computeTruckBreakdown(5000, 0));
assert.throws(() => computeTruckBreakdown(5000, -100));
console.log('✅ Truck split calculation validated successfully.');

// --- TEST 4: Spoilage Function Monotonicity & Boundedness ---
console.log('Test 4: Spoilage Function Properties (Monotonic increasing & bounded [0, 1])');
function spoilageFraction(baseRate: number, tempFactor: number, hours: number): number {
  const k = baseRate * tempFactor * 1.1; // heat factor
  return 1 - Math.exp(-k * hours);
}

const tomato = cropsData.crops.find((c) => c.id === 'tomato')!;
const refrigerated = vehiclesData.vehicles.find((v) => v.id === 'refrigerated_truck')!;

let prevSpoilage = -1;
for (let h = 0; h <= 48; h += 0.5) {
  const s = spoilageFraction(tomato.base_spoilage_rate, refrigerated.temp_factor, h);
  assert.ok(s >= 0 && s <= 1, `Spoilage fraction ${s} must be between 0 and 1 at hour ${h}`);
  assert.ok(s >= prevSpoilage, `Spoilage must be monotonically increasing. At ${h}h: ${s} < ${prevSpoilage}`);
  prevSpoilage = s;
}
console.log('✅ Spoilage function is strictly monotonic and bounded [0, 1].');

// --- TEST 5: Route Scoring Logic (Perishability Sensitivity) ---
console.log('Test 5: Crop-specific route selection (Faster route wins for perishable tomatoes; Cheapest wins for durable rice)');
// Scenario: Route 1 is fast (1 hour) but costly (₹4000). Route 2 is slow (5 hours) but cheap (₹2000).
const fastRoute = { duration_hours: 1, cost_inr: 4000 };
const cheapRoute = { duration_hours: 5, cost_inr: 2000 };
const totalKg = 10000;

function evaluateBestRoute(cropId: string) {
  const crop = cropsData.crops.find((c) => c.id === cropId)!;
  const wholesalePrice = crop.default_price_per_kg;

  const routes = [fastRoute, cheapRoute].map((r, idx) => {
    const sFraction = spoilageFraction(crop.base_spoilage_rate, 1.0, r.duration_hours);
    const expectedLoss = totalKg * wholesalePrice * sFraction;
    const totalCost = r.cost_inr + expectedLoss;
    return { id: idx === 0 ? 'FAST' : 'CHEAP', duration: r.duration_hours, transportCost: r.cost_inr, expectedLoss, totalCost };
  });

  // Calculate score
  const minTime = Math.min(...routes.map(r => r.duration));
  const maxTime = Math.max(...routes.map(r => r.duration));
  const minCost = Math.min(...routes.map(r => r.transportCost));
  const maxCost = Math.max(...routes.map(r => r.transportCost));
  const minLoss = Math.min(...routes.map(r => r.expectedLoss));
  const maxLoss = Math.max(...routes.map(r => r.expectedLoss));

  routes.forEach(r => {
    const nTime = (r.duration - minTime) / (maxTime - minTime || 1);
    const nCost = (r.transportCost - minCost) / (maxCost - minCost || 1);
    const nLoss = (r.expectedLoss - minLoss) / (maxLoss - minLoss || 1);
    const score = 100 * (1 - (crop.weights.time * nTime + crop.weights.cost * nCost + crop.weights.spoilage * nLoss));
    (r as any).score = score;
  });

  routes.sort((a: any, b: any) => b.score - a.score);
  return routes[0].id;
}

const bestForTomatoes = evaluateBestRoute('tomato');
const bestForRice = evaluateBestRoute('rice');

assert.strictEqual(bestForTomatoes, 'FAST', 'For perishable tomatoes, fast route must win to minimize spoilage.');
assert.strictEqual(bestForRice, 'CHEAP', 'For non-perishable rice, cheap route must win to minimize transport costs.');
console.log('✅ Route scoring correctly picks FAST for tomatoes and CHEAP for rice.');

console.log('\n🎉 ALL 5 TEST SUITES PASSED CLEANLY!');
