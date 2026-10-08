import { RouteCandidate } from '../types.ts';
import { interpolatePolyline } from './trafficSegments.ts';

export interface SpeedTimelinePeriod {
  periodIndex: number;
  timeRange: string;
  startMin: number;
  endMin: number;
  durationMin: number;
  distanceKm: number;
  cumulativeKm: number;
  stretchName: {
    en: string;
    ta: string;
    hi: string;
  };
  trafficLevel: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';
  feasibleSpeedKmph: number;
  speedRange: string;
  maxSafeSpeedKmph: number;
  roadType: {
    en: string;
    ta: string;
    hi: string;
  };
  cargoSafetyAdvice: {
    en: string;
    ta: string;
    hi: string;
  };
  speedPercentage: number;
  midpointCoord: [number, number];
  coords: [number, number][];
}

export interface SpeedSummaryStats {
  averageFeasibleSpeedKmph: number;
  maxFeasibleSpeedKmph: number;
  minBottleneckSpeedKmph: number;
  freeFlowPercentage: number;
  totalDurationMin: number;
  totalDistanceKm: number;
}

/**
 * Calculates feasible speeds for each period of time along the entire route,
 * accounting for road conditions, traffic congestion levels, and perishable produce safety.
 */
export function calculateSpeedTimeline(
  route: RouteCandidate,
  cropCategory = 'highly_perishable'
): { periods: SpeedTimelinePeriod[]; stats: SpeedSummaryStats } {
  const totalMin = Math.max(15, route.duration_min || 45);
  const totalKm = Math.max(5, route.distance_km || 30);
  const denseCoords = interpolatePolyline(route.geometry || [], 80);

  // Define 5 distinct transit phases along the route
  // [startFrac, endFrac, trafficLevel, speedKmph, maxKmph]
  const isAltRoute = route.id !== 'A';

  const phaseProfiles: Array<{
    startFrac: number;
    endFrac: number;
    trafficLevel: 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';
    speedKmph: number;
    speedRange: string;
    maxKmph: number;
    stretchName: { en: string; ta: string; hi: string };
    roadType: { en: string; ta: string; hi: string };
    cargoAdvice: { en: string; ta: string; hi: string };
  }> = [
    {
      startFrac: 0.0,
      endFrac: 0.18,
      trafficLevel: 'NORMAL',
      speedKmph: 42,
      speedRange: '38 - 48 km/h',
      maxKmph: 50,
      stretchName: {
        en: 'Farm Origin & Pollachi Outskirts',
        ta: 'பண்ணை புறப்பாடு மற்றும் பொள்ளாச்சி புறநகர்',
        hi: 'फार्म प्रस्थान एवं पोलाची बाहरी क्षेत्र'
      },
      roadType: {
        en: 'Rural Feeder / Paved Carriageway',
        ta: 'கிராமப்புற அணுகுசாலை / தார்ச்சாலை',
        hi: 'ग्रामीण संपर्क मार्ग / पक्की सड़क'
      },
      cargoAdvice: {
        en: 'Smooth acceleration; let stacked produce crates settle before high-speed road.',
        ta: 'மெதுவான முடுக்கம்; அதிக வேக சாலைக்கு முன் பெட்டிகளை நிலைப்படுத்தவும்.',
        hi: 'सहज त्वरण; उच्च गति मार्ग से पहले क्रेट्स को स्थिर होने दें।'
      }
    },
    {
      startFrac: 0.18,
      endFrac: 0.38,
      trafficLevel: 'SLOW',
      speedKmph: isAltRoute ? 28 : 34,
      speedRange: isAltRoute ? '24 - 32 km/h' : '30 - 38 km/h',
      maxKmph: 40,
      stretchName: {
        en: 'Town Crossing & Toll Approach (Kinathukadavu)',
        ta: 'நகர சந்திப்பு மற்றும் சுங்கச்சாவடி அணுகுமுறை (கிணத்துக்கடவு)',
        hi: 'कस्बा क्रॉसिंग एवं टोल प्लाजा (किनाथुकादावु)'
      },
      roadType: {
        en: 'Semi-Urban Arterial Highway',
        ta: 'நகர்ப்புற முதன்மை நெடுஞ்சாலை',
        hi: 'अर्ध-शहरी मुख्य राजमार्ग'
      },
      cargoAdvice: {
        en: 'Moderate braking over speed ramps to prevent bottom crate compression bruising.',
        ta: 'அடிமட்ட பெட்டி நசுங்குதலைத் தடுக்க வேகத்தடைகளில் மிதமான பிரேக்கிங்.',
        hi: 'निचले क्रेट्स को दबने से बचाने के लिए गति अवरोधकों पर धीमा ब्रेक।'
      }
    },
    {
      startFrac: 0.38,
      endFrac: 0.72,
      trafficLevel: 'NORMAL',
      speedKmph: isAltRoute ? 55 : 68,
      speedRange: isAltRoute ? '50 - 60 km/h' : '62 - 72 km/h',
      maxKmph: cropCategory === 'highly_perishable' ? 70 : 80,
      stretchName: {
        en: 'NH-83 4-Lane Bypass Corridor',
        ta: 'தேசிய நெடுஞ்சாலை-83 நான்கு வழிப்புறவழிச் சாலை',
        hi: 'एनएच-83 चार-लेन बाईपास कॉरिडोर'
      },
      roadType: {
        en: '4-Lane Divided National Highway',
        ta: 'நான்கு வழி பிரிக்கப்பட்ட தேசிய நெடுஞ்சாலை',
        hi: 'चार लेन विभाजित राष्ट्रीय राजमार्ग'
      },
      cargoAdvice: {
        en: 'Maintain steady high gear cruise; keep refrigeration ventilation active.',
        ta: 'சீரான உயர் கியர் வேகம்; குளிரூட்டும் காற்றோட்டத்தை சீராக பராமரிக்கவும்.',
        hi: 'स्थिर क्रूज गति बनाए रखें; रेफ्रिजरेशन वेंटिलेशन चालू रखें।'
      }
    },
    {
      startFrac: 0.72,
      endFrac: 0.88,
      trafficLevel: 'SLOW',
      speedKmph: 32,
      speedRange: '28 - 36 km/h',
      maxKmph: 40,
      stretchName: {
        en: 'Suburban Ring & Flyover Merge (Eachanari)',
        ta: 'புறநகர் வளையச்சாலை மற்றும் மேம்பால இணைப்பு (ஈச்சனாரி)',
        hi: 'उपनगरीय रिंग रोड एवं फ्लाईओवर जंक्शन (ईचनारी)'
      },
      roadType: {
        en: 'Suburban Multi-Lane Corridor',
        ta: 'புறநகர் பலவழிப் பாதை',
        hi: 'उपनगरीय मल्टी-लेन मार्ग'
      },
      cargoAdvice: {
        en: 'Anticipate merging trucks; maintain 30m safe buffer to avoid sudden stops.',
        ta: 'இணையும் வாகனங்களை கவனிக்கவும்; திடீர் நிறுத்தங்களைத் தவிர்க்க 30மீ இடைவெளி தேவை.',
        hi: 'मिलने वाले वाहनों पर नजर रखें; अचानक रुकने से बचने के लिए 30 मीटर दूरी रखें।'
      }
    },
    {
      startFrac: 0.88,
      endFrac: 1.0,
      trafficLevel: 'TRAFFIC_JAM',
      speedKmph: isAltRoute ? 14 : 18,
      speedRange: isAltRoute ? '10 - 18 km/h' : '15 - 22 km/h',
      maxKmph: 25,
      stretchName: {
        en: 'City Mandi Approach & Terminal (Ukkadam / Central)',
        ta: 'நகர சந்தை அணுகுமுறை மற்றும் முனையம் (உக்கடம் / மத்திய சந்தை)',
        hi: 'शहर मंडी पहुंच मार्ग एवं टर्मिनल (उक्कड़म / केंद्रीय)'
      },
      roadType: {
        en: 'Dense Urban Commercial Corridor',
        ta: 'நெருக்கமான நகர வணிகச் சாலை',
        hi: 'सघन शहरी वाणिज्यिक मार्ग'
      },
      cargoAdvice: {
        en: 'Stop-and-go idle heat; keep cabin cooling & cargo chiller running until dock.',
        ta: 'நெரிசலில் என்ஜின் வெப்பம் அதிகரிக்கும்; இறக்கும் வரை குளிர்சாதனத்தை இயக்கவும்.',
        hi: 'रुक-रुक कर चलने से गर्मी बढ़ती है; अनलोडिंग तक चिलर चालू रखें।'
      }
    }
  ];

  let cumulativeKm = 0;
  const periods: SpeedTimelinePeriod[] = [];

  for (let i = 0; i < phaseProfiles.length; i++) {
    const prof = phaseProfiles[i];
    const startMin = Math.round(totalMin * prof.startFrac);
    const endMin = Math.round(totalMin * prof.endFrac);
    const durationMin = Math.max(1, endMin - startMin);

    const distFrac = prof.endFrac - prof.startFrac;
    const distanceKm = parseFloat((totalKm * distFrac).toFixed(1));
    cumulativeKm = parseFloat((cumulativeKm + distanceKm).toFixed(1));

    const startH = Math.floor(startMin / 60);
    const startM = startMin % 60;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;

    const timeRange = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')} (${startMin}-${endMin} min)`;

    // Percentage relative to maximum realistic truck speed (80 km/h)
    const speedPercentage = Math.min(100, Math.round((prof.speedKmph / 80) * 100));

    const rawLen = denseCoords.length;
    const startIdx = Math.min(rawLen - 1, Math.floor(rawLen * prof.startFrac));
    const endIdx = Math.max(startIdx + 1, Math.min(rawLen - 1, Math.floor(rawLen * prof.endFrac)));
    const periodCoords = denseCoords.slice(startIdx, endIdx + 1);
    const midIdx = Math.floor(periodCoords.length / 2);
    const midpointCoord = (periodCoords[midIdx] || denseCoords[0] || [10.8, 77.0]) as [number, number];

    periods.push({
      periodIndex: i + 1,
      timeRange,
      startMin,
      endMin,
      durationMin,
      distanceKm,
      cumulativeKm: Math.min(totalKm, cumulativeKm),
      stretchName: prof.stretchName,
      trafficLevel: prof.trafficLevel,
      feasibleSpeedKmph: prof.speedKmph,
      speedRange: prof.speedRange,
      maxSafeSpeedKmph: prof.maxKmph,
      roadType: prof.roadType,
      cargoSafetyAdvice: prof.cargoAdvice,
      speedPercentage,
      midpointCoord,
      coords: periodCoords
    });
  }

  // Calculate summary stats
  const totalSpeeds = periods.map((p) => p.feasibleSpeedKmph);
  const avgSpeed = Math.round(totalKm / (totalMin / 60));
  const maxSpeed = Math.max(...totalSpeeds);
  const minSpeed = Math.min(...totalSpeeds);
  const freeFlowKm = periods
    .filter((p) => p.trafficLevel === 'NORMAL')
    .reduce((acc, p) => acc + p.distanceKm, 0);
  const freeFlowPercentage = Math.round((freeFlowKm / totalKm) * 100);

  const stats: SpeedSummaryStats = {
    averageFeasibleSpeedKmph: avgSpeed,
    maxFeasibleSpeedKmph: maxSpeed,
    minBottleneckSpeedKmph: minSpeed,
    freeFlowPercentage,
    totalDurationMin: totalMin,
    totalDistanceKm: totalKm
  };

  return { periods, stats };
}
