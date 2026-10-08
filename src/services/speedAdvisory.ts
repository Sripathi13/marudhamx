import type { RoadStretch, SpeedAdvisorySummary, TrafficSpeed, LocalizedString, SpeedBand, SpeedReasonCode } from '../types.ts';

interface TownCenter {
  name: LocalizedString;
  lat: number;
  lng: number;
  radiusKm: number;
}

export const KNOWN_TOWNS: TownCenter[] = [
  {
    name: {
      en: 'Coimbatore City Limits',
      ta: 'கோயம்புத்தூர் நகர எல்லை',
      hi: 'कोयंबटूर नगर सीमा'
    },
    lat: 10.9982,
    lng: 76.9632,
    radiusKm: 6.0
  },
  {
    name: {
      en: 'Kinathukadavu Town',
      ta: 'கிணத்துக்கடவு நகரம்',
      hi: 'किनाथुकादवु कस्बा'
    },
    lat: 10.824,
    lng: 77.012,
    radiusKm: 3.0
  },
  {
    name: {
      en: 'Pollachi Municipal Limits',
      ta: 'பொள்ளாச்சி நகராட்சி எல்லை',
      hi: 'पोलाची नगर सीमा'
    },
    lat: 10.6609,
    lng: 77.0048,
    radiusKm: 4.5
  },
  {
    name: {
      en: 'Tiruppur City Limits',
      ta: 'திருப்பூர் நகர எல்லை',
      hi: 'तिरुपुर नगर सीमा'
    },
    lat: 11.1085,
    lng: 77.3411,
    radiusKm: 5.5
  },
  {
    name: {
      en: 'Salem City Limits',
      ta: 'சேலம் நகர எல்லை',
      hi: 'सेलम नगर सीमा'
    },
    lat: 11.6538,
    lng: 78.146,
    radiusKm: 6.0
  },
  {
    name: {
      en: 'Erode Municipal Area',
      ta: 'ஈரோடு நகராட்சி பகுதி',
      hi: 'इरोड नगर क्षेत्र'
    },
    lat: 11.341,
    lng: 77.7172,
    radiusKm: 5.0
  }
];

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function computeStretchesForRoute(
  geometry: [number, number][],
  totalDistanceKm: number,
  trafficLevel: TrafficSpeed = 'NORMAL'
): { stretches: RoadStretch[]; summary: SpeedAdvisorySummary } {
  if (!geometry || geometry.length < 2) {
    return {
      stretches: [],
      summary: {
        city_advised_speed_kmh: 30,
        highway_advised_speed_kmh: 60,
        total_stretch_time_min: 0
      }
    };
  }

  // Target stretch length: ~5 km
  const targetStretchKm = 5.0;
  const numStretches = Math.max(1, Math.round(totalDistanceKm / targetStretchKm));
  const pointsPerStretch = Math.max(2, Math.floor(geometry.length / numStretches));

  const stretches: RoadStretch[] = [];

  for (let i = 0; i < numStretches; i++) {
    const startIdx = i * pointsPerStretch;
    const endIdx = i === numStretches - 1 ? geometry.length - 1 : Math.min(geometry.length - 1, (i + 1) * pointsPerStretch);
    const stretchCoords = geometry.slice(startIdx, endIdx + 1);

    if (stretchCoords.length < 2) continue;

    // Calculate length of this stretch
    let stretchLengthKm = 0;
    for (let j = 0; j < stretchCoords.length - 1; j++) {
      stretchLengthKm += haversineDistanceKm(
        stretchCoords[j][0],
        stretchCoords[j][1],
        stretchCoords[j + 1][0],
        stretchCoords[j + 1][1]
      );
    }
    stretchLengthKm = Math.max(0.5, parseFloat(stretchLengthKm.toFixed(1)));

    // Midpoint to check town proximity
    const midPoint = stretchCoords[Math.floor(stretchCoords.length / 2)];
    const startPoint = stretchCoords[0];
    const endPoint = stretchCoords[stretchCoords.length - 1];

    let isUrban = false;
    let nearbyTown: TownCenter | null = null;

    for (const town of KNOWN_TOWNS) {
      const dist = haversineDistanceKm(midPoint[0], midPoint[1], town.lat, town.lng);
      if (dist <= town.radiusKm) {
        isUrban = true;
        nearbyTown = town;
        break;
      }
    }

    // Determine road class and posted speed limit
    // Default truck speed limit in India under MV Act is 60 km/h (80 km/h on expressways)
    const postedLimitKmh = isUrban ? 40 : 60;
    const speedLimitSource = 'default_truck_limit';

    // Road class factor: motorway 0.85, trunk 0.80, primary 0.75, secondary 0.70, tertiary 0.65, residential 0.50
    const roadClass = isUrban ? (i === 0 || i === numStretches - 1 ? 'residential' : 'primary') : 'trunk';
    const roadClassFactor = roadClass === 'trunk' ? 0.85 : roadClass === 'primary' ? 0.75 : 0.65;

    // Traffic factor
    let trafficFactor = 1.0;
    if (trafficLevel === 'SLOW') trafficFactor = 0.6;
    if (trafficLevel === 'TRAFFIC_JAM') trafficFactor = 0.35;

    let computedSpeed = postedLimitKmh * roadClassFactor * trafficFactor;
    let reasonCode: SpeedReasonCode = 'highway_flow';

    if (isUrban) {
      computedSpeed = Math.min(30, computedSpeed);
      reasonCode = 'urban_limit';
    } else if (trafficLevel === 'SLOW' || trafficLevel === 'TRAFFIC_JAM') {
      reasonCode = 'congested_traffic';
    } else if (roadClass === 'trunk') {
      reasonCode = 'highway_flow';
    } else {
      reasonCode = 'moderate_arterial';
    }

    // Round to nearest 5 km/h, min 15, max postedLimitKmh
    let recommendedSpeedKmh = Math.round(computedSpeed / 5) * 5;
    recommendedSpeedKmh = Math.max(15, Math.min(postedLimitKmh, recommendedSpeedKmh));

    const stretchTimeMin = Math.max(1, Math.round((stretchLengthKm / recommendedSpeedKmh) * 60));

    let speedBand: SpeedBand = 'medium';
    if (recommendedSpeedKmh > 50) speedBand = 'high';
    else if (recommendedSpeedKmh < 30) speedBand = 'low';

    // Place names
    let fromPlace: LocalizedString;
    let toPlace: LocalizedString;

    if (i === 0) {
      fromPlace = {
        en: 'Origin Departure Point',
        ta: 'புறப்படும் தொடக்கப் புள்ளி',
        hi: 'प्रारंभिक स्थल'
      };
      toPlace = nearbyTown ? nearbyTown.name : {
        en: 'Regional Junction',
        ta: 'மண்டல இணைப்புச் சாலை',
        hi: 'क्षेत्रीय चौराहा'
      };
    } else if (i === numStretches - 1) {
      fromPlace = nearbyTown ? nearbyTown.name : {
        en: 'Highway Approach Corridor',
        ta: 'நெடுஞ்சாலை அணுகுவழி',
        hi: 'राजमार्ग पहुंच पथ'
      };
      toPlace = {
        en: 'Destination Market Gate',
        ta: 'சென்றடையும் சந்தை வாயில்',
        hi: 'गंतव्य मंडी प्रवेश'
      };
    } else {
      fromPlace = {
        en: `Corridor KM ${(i * targetStretchKm).toFixed(0)}`,
        ta: `நெடுஞ்சாலை கி.மீ. ${(i * targetStretchKm).toFixed(0)}`,
        hi: `राजमार्ग किमी ${(i * targetStretchKm).toFixed(0)}`
      };
      toPlace = nearbyTown ? nearbyTown.name : {
        en: `Corridor KM ${((i + 1) * targetStretchKm).toFixed(0)}`,
        ta: `நெடுஞ்சாலை கி.மீ. ${((i + 1) * targetStretchKm).toFixed(0)}`,
        hi: `राजमार्ग किमी ${((i + 1) * targetStretchKm).toFixed(0)}`
      };
    }

    stretches.push({
      id: `stretch-${i + 1}`,
      stretch_index: i + 1,
      from_place: fromPlace,
      to_place: toPlace,
      length_km: stretchLengthKm,
      posted_limit_kmh: postedLimitKmh,
      speed_limit_source: speedLimitSource,
      osm_road_class: roadClass,
      is_urban: isUrban,
      traffic_level: trafficLevel,
      recommended_speed_kmh: recommendedSpeedKmh,
      speed_band: speedBand,
      reason_code: reasonCode,
      stretch_time_min: stretchTimeMin,
      coords: stretchCoords
    });
  }

  const totalTimeMin = stretches.reduce((acc, s) => acc + s.stretch_time_min, 0);

  return {
    stretches,
    summary: {
      city_advised_speed_kmh: 30,
      highway_advised_speed_kmh: 60,
      total_stretch_time_min: totalTimeMin
    }
  };
}
