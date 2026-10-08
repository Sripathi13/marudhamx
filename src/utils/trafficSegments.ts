import type { TrafficSegment, TrafficSpeed } from '../types.ts';

// Haversine formula to compute geodesic distance in kilometres
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Subdivides / interpolates sparse coordinates along the route polyline
 * so that smooth, continuous, multi-colored traffic segments can be drawn
 * even when raw geometry only contains a few points.
 */
export function interpolatePolyline(
  coords: [number, number][],
  minPoints = 80
): [number, number][] {
  if (!coords || coords.length === 0) return [];
  if (coords.length >= minPoints) return coords;

  const interpolated: [number, number][] = [];
  const legs = coords.length - 1;
  const perLeg = Math.max(2, Math.ceil(minPoints / Math.max(1, legs)));

  for (let i = 0; i < coords.length - 1; i++) {
    const start = coords[i];
    const end = coords[i + 1];

    for (let step = 0; step < perLeg; step++) {
      const frac = step / perLeg;
      const lat = start[0] + (end[0] - start[0]) * frac;
      const lng = start[1] + (end[1] - start[1]) * frac;
      interpolated.push([parseFloat(lat.toFixed(6)), parseFloat(lng.toFixed(6))]);
    }
  }

  // Always append the final destination coordinate
  const last = coords[coords.length - 1];
  interpolated.push([parseFloat(last[0].toFixed(6)), parseFloat(last[1].toFixed(6))]);

  return interpolated;
}

/**
 * Generates realistic traffic-colored segments:
 * - Green (NORMAL): Free-flowing highway and open rural stretches
 * - Yellow (SLOW): Mild traffic, town crossings, toll gates, and suburban merges
 * - Red (TRAFFIC_JAM): Heavy traffic bottlenecks, urban market approaches, and gridlock
 *
 * Guarantees 100% contiguity (each segment starts at the exact last coordinate of previous segment).
 */
export function generateTrafficSegments(
  rawCoords: [number, number][],
  routeIndex = 0,
  departureTime?: string,
  trafficProfile = 'typical'
): TrafficSegment[] {
  if (!rawCoords || rawCoords.length < 2) {
    return [{ speed: 'NORMAL', coords: rawCoords || [] }];
  }

  // Ensure high density coordinates along the polyline
  const coords = rawCoords.length < 50 ? interpolatePolyline(rawCoords, 80) : rawCoords;
  const n = coords.length;

  // Compute cumulative distances along the interpolated path
  const cumDist: number[] = [0];
  for (let i = 1; i < n; i++) {
    const legDist = haversineKm(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    cumDist.push(cumDist[i - 1] + legDist);
  }
  const totalDist = cumDist[cumDist.length - 1] || 1;

  // Parse departure hour for temporal traffic variation
  let hour = 9;
  if (departureTime) {
    try {
      const d = new Date(departureTime);
      if (!isNaN(d.getTime())) {
        hour = d.getHours();
      }
    } catch {
      hour = 9;
    }
  }

  const isPeakMorning = hour >= 8 && hour <= 11;
  const isPeakEvening = hour >= 17 && hour <= 20;
  const isNight = hour >= 22 || hour <= 5;
  const isAggressive = trafficProfile === 'rush_hour' || trafficProfile === 'conservative';

  // Zone cutoffs as fractions of cumulative distance along the trip:
  // Zone 1: Rural / Farm departure (Green - Free flow)
  // Zone 2: Intermediate town crossing / toll queue (Yellow - Mild Traffic)
  // Zone 3: Express bypass corridor (Green - Free flow)
  // Zone 4: Suburban ring approach / flyover merge (Yellow - Mild Traffic)
  // Zone 5: City wholesale terminal & mandi approach (Red - Heavy Congestion / Bottleneck)

  let c1 = 0.20; // 0% - 20%
  let c2 = 0.38; // 20% - 38%
  let c3 = 0.70; // 38% - 70%
  let c4 = 0.85; // 70% - 85%
  // 85% - 100% is always Zone 5 (Red)

  let speedZone2: TrafficSpeed = 'SLOW'; // Mild Traffic (Yellow)
  let speedZone4: TrafficSpeed = 'SLOW'; // Mild Traffic (Yellow)
  let speedZone5: TrafficSpeed = 'TRAFFIC_JAM'; // Heavy Congestion (Red)

  if (isNight) {
    c1 = 0.28;
    c2 = 0.42;
    c3 = 0.78;
    c4 = 0.90;
    speedZone2 = 'SLOW'; // Mild near illuminated toll
    speedZone4 = 'SLOW';
    speedZone5 = 'TRAFFIC_JAM'; // Late night unloading truck queues
  } else if (isPeakMorning || isPeakEvening || isAggressive) {
    c1 = 0.16;
    c2 = 0.36;
    c3 = 0.62;
    c4 = 0.78;
    speedZone2 = 'SLOW';
    speedZone4 = 'SLOW';
    speedZone5 = 'TRAFFIC_JAM';
  }

  // Alternate route variations (Secondary road vs Bypass)
  if (routeIndex === 1) {
    // Secondary arterial route: longer slow zones and earlier congestion
    c1 = 0.15;
    c2 = 0.42;
    c3 = 0.64;
    c4 = 0.82;
  } else if (routeIndex === 2) {
    // Bypass route: extended free-flow highway, but terminal approach still heavy
    c1 = 0.25;
    c2 = 0.38;
    c3 = 0.76;
    c4 = 0.88;
  }

  // Find exact coordinate indices matching distance cutoffs
  const targetDist1 = totalDist * c1;
  const targetDist2 = totalDist * c2;
  const targetDist3 = totalDist * c3;
  const targetDist4 = totalDist * c4;

  const findIdx = (target: number, minIdx: number, maxIdx: number) => {
    let idx = cumDist.findIndex((d) => d >= target);
    if (idx === -1) idx = maxIdx;
    return Math.max(minIdx, Math.min(maxIdx, idx));
  };

  const idx1 = findIdx(targetDist1, 1, n - 4);
  const idx2 = findIdx(targetDist2, idx1 + 1, n - 3);
  const idx3 = findIdx(targetDist3, idx2 + 1, n - 2);
  const idx4 = findIdx(targetDist4, idx3 + 1, n - 1);

  const segments: TrafficSegment[] = [
    {
      speed: 'NORMAL',
      coords: coords.slice(0, idx1 + 1)
    },
    {
      speed: speedZone2, // Yellow (Mild Traffic)
      coords: coords.slice(idx1, idx2 + 1)
    },
    {
      speed: 'NORMAL', // Green (Free Flow)
      coords: coords.slice(idx2, idx3 + 1)
    },
    {
      speed: speedZone4, // Yellow (Mild Traffic)
      coords: coords.slice(idx3, idx4 + 1)
    },
    {
      speed: speedZone5, // Red (Heavy Traffic Jam)
      coords: coords.slice(idx4)
    }
  ];

  return segments.filter((s) => s.coords.length >= 2);
}
