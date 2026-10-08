import type { NavigationManeuver, ManeuverType, LocalizedString, TurnByTurnStep } from '../types.ts';

export function parseManeuversFromSteps(
  steps: TurnByTurnStep[],
  geometry: [number, number][]
): NavigationManeuver[] {
  if (!steps || steps.length === 0) {
    // Generate fallback manoeuvres from geometry
    return generateFallbackManeuvers(geometry);
  }

  return steps.map((s, idx) => {
    const raw = (s.instruction || s.name || '').toLowerCase();
    let type: ManeuverType = 'straight';

    if (idx === steps.length - 1 || raw.includes('arrive') || raw.includes('destination')) {
      type = 'destination';
    } else if (raw.includes('u-turn') || raw.includes('uturn')) {
      type = 'u_turn';
    } else if (raw.includes('roundabout') || raw.includes('rotary')) {
      type = 'roundabout';
    } else if (raw.includes('slight right') || raw.includes('bear right')) {
      type = 'slight_right';
    } else if (raw.includes('slight left') || raw.includes('bear left')) {
      type = 'slight_left';
    } else if (raw.includes('turn right') || raw.includes('right')) {
      type = 'turn_right';
    } else if (raw.includes('turn left') || raw.includes('left')) {
      type = 'turn_left';
    } else {
      type = 'straight';
    }

    const roadName = s.name || 'Highway Corridor';

    const instruction: LocalizedString = {
      en: getEnInstruction(type, roadName),
      ta: getTaInstruction(type, roadName),
      hi: getHiInstruction(type, roadName)
    };

    const coordIdx = Math.min(
      geometry.length - 1,
      Math.floor((idx / Math.max(1, steps.length)) * geometry.length)
    );
    const location = geometry[coordIdx] || [10.9982, 76.9632];

    return {
      id: `maneuver-${idx + 1}`,
      index: idx,
      type,
      instruction,
      distance_m: s.distance_m || 500,
      duration_sec: s.duration_sec || 60,
      road_name: roadName,
      location
    };
  });
}

function generateFallbackManeuvers(geometry: [number, number][]): NavigationManeuver[] {
  if (!geometry || geometry.length < 2) return [];

  const count = Math.min(6, Math.max(2, Math.floor(geometry.length / 4)));
  const maneuvers: NavigationManeuver[] = [];

  for (let i = 0; i < count; i++) {
    const coordIdx = Math.floor((i / count) * geometry.length);
    const loc = geometry[coordIdx];
    let type: ManeuverType = 'straight';
    let road = 'NH Corridor';

    if (i === 0) {
      type = 'straight';
      road = 'Origin Highway Gate';
    } else if (i === count - 1) {
      type = 'destination';
      road = 'Wholesale Mandi Gate';
    } else if (i % 2 === 1) {
      type = 'turn_right';
      road = 'Expressway Junction';
    } else {
      type = 'turn_left';
      road = 'Market Approach Road';
    }

    maneuvers.push({
      id: `maneuver-${i + 1}`,
      index: i,
      type,
      instruction: {
        en: getEnInstruction(type, road),
        ta: getTaInstruction(type, road),
        hi: getHiInstruction(type, road)
      },
      distance_m: Math.round(1500 + i * 800),
      duration_sec: Math.round(90 + i * 40),
      road_name: road,
      location: loc
    });
  }

  return maneuvers;
}

function getEnInstruction(type: ManeuverType, road: string): string {
  switch (type) {
    case 'turn_right': return `Turn right onto ${road}`;
    case 'turn_left': return `Turn left onto ${road}`;
    case 'slight_right': return `Keep right onto ${road}`;
    case 'slight_left': return `Keep left onto ${road}`;
    case 'u_turn': return `Make a U-turn onto ${road}`;
    case 'roundabout': return `Enter roundabout and take exit onto ${road}`;
    case 'destination': return `Arrive at destination on ${road}`;
    default: return `Continue straight on ${road}`;
  }
}

function getTaInstruction(type: ManeuverType, road: string): string {
  switch (type) {
    case 'turn_right': return `${road}-இல் வலதுபுறம் திரும்பவும்`;
    case 'turn_left': return `${road}-இல் இடதுபுறம் திரும்பவும்`;
    case 'slight_right': return `${road}-இல் வலது பக்கமாகச் செல்லவும்`;
    case 'slight_left': return `${road}-இல் இடது பக்கமாகச் செல்லவும்`;
    case 'u_turn': return `${road}-இல் யூ-டர்ன் செய்து திரும்பவும்`;
    case 'roundabout': return `சுற்றுச்சந்தியில் நுழைந்து ${road} வழியே வெளியேறவும்`;
    case 'destination': return `இலக்கை அடைந்தீர்கள்: ${road}`;
    default: return `${road}-இல் நேராகத் தொடரவும்`;
  }
}

function getHiInstruction(type: ManeuverType, road: string): string {
  switch (type) {
    case 'turn_right': return `${road} पर दाएं मुड़ें`;
    case 'turn_left': return `${road} पर बाएं मुड़ें`;
    case 'slight_right': return `${road} पर थोड़ा दाएं चलें`;
    case 'slight_left': return `${road} पर थोड़ा बाएं चलें`;
    case 'u_turn': return `${road} पर यू-टर्न लें`;
    case 'roundabout': return `गोलचक्कर में प्रवेश करें और ${road} की ओर निकलें`;
    case 'destination': return `गंतव्य पर पहुंच गए: ${road}`;
    default: return `${road} पर सीधे आगे बढ़ें`;
  }
}
