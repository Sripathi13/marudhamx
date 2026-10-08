export interface BackhaulSuggestion {
  place_id: string;
  farm_name: string;
  contact_name: string;
  lat: number;
  lng: number;
  distance_from_corridor_km: number;
  suggestion_type: 'input_delivery' | 'harvest_pickup';
  title: { en: string; ta: string; hi: string };
  details: { en: string; ta: string; hi: string };
  estimated_freight_recovery_inr: number;
  is_confirmed: boolean;
}

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
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

export function findBackhaulSuggestions(
  routeGeometry: [number, number][],
  savedPlaces: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    contact_name?: string;
    input_need?: { item: string; category: string; weight_kg: number; needed_date: string } | null;
    upcoming_harvest?: { crop_id: string; quantity_kg: number; harvest_date: string } | null;
  }>,
  maxCorridorDistanceKm = 5.0
): BackhaulSuggestion[] {
  const suggestions: BackhaulSuggestion[] = [];

  for (const place of savedPlaces) {
    if (!place.input_need && !place.upcoming_harvest) {
      continue;
    }

    // Compute minimum distance from place to any point along the route corridor
    let minDistance = Infinity;
    for (const pt of routeGeometry) {
      const d = haversineDist(place.lat, place.lng, pt[0], pt[1]);
      if (d < minDistance) {
        minDistance = d;
      }
    }

    if (minDistance <= maxCorridorDistanceKm) {
      const distRounded = parseFloat(minDistance.toFixed(1));

      if (place.input_need) {
        suggestions.push({
          place_id: place.id,
          farm_name: place.name,
          contact_name: place.contact_name || 'Farmer',
          lat: place.lat,
          lng: place.lng,
          distance_from_corridor_km: distRounded,
          suggestion_type: 'input_delivery',
          title: {
            en: `Return Freight: ${place.input_need.item}`,
            ta: `திரும்புவழி சரக்கு: ${place.input_need.item}`,
            hi: `वापसी भाड़ा: ${place.input_need.item}`
          },
          details: {
            en: `${place.name} (${distRounded} km from return corridor) needs ${place.input_need.weight_kg} kg inputs by ${place.input_need.needed_date}.`,
            ta: `${place.name} (திரும்புவழி பாதையிலிருந்து ${distRounded} கி.மீ.) ${place.input_need.weight_kg} கிலோ இடுபொருட்கள் தேவை.`,
            hi: `${place.name} (वापसी मार्ग से ${distRounded} किमी) को ${place.input_need.needed_date} तक ${place.input_need.weight_kg} किग्रा इनपुट चाहिए।`
          },
          estimated_freight_recovery_inr: 850,
          is_confirmed: false
        });
      } else if (place.upcoming_harvest) {
        suggestions.push({
          place_id: place.id,
          farm_name: place.name,
          contact_name: place.contact_name || 'Farmer',
          lat: place.lat,
          lng: place.lng,
          distance_from_corridor_km: distRounded,
          suggestion_type: 'harvest_pickup',
          title: {
            en: `Return Harvest: ${place.upcoming_harvest.quantity_kg} kg ${place.upcoming_harvest.crop_id}`,
            ta: `திரும்புவழி அறுவடை: ${place.upcoming_harvest.quantity_kg} கிலோ ${place.upcoming_harvest.crop_id}`,
            hi: `वापसी उपज: ${place.upcoming_harvest.quantity_kg} किग्रा ${place.upcoming_harvest.crop_id}`
          },
          details: {
            en: `${place.name} (${distRounded} km detour) has ${place.upcoming_harvest.quantity_kg} kg ready on ${place.upcoming_harvest.harvest_date}.`,
            ta: `${place.name} (விலகல் ${distRounded} கி.மீ.) ${place.upcoming_harvest.quantity_kg} கிலோ தயார் நிலையில் உள்ளது.`,
            hi: `${place.name} (${distRounded} किमी) में ${place.upcoming_harvest.quantity_kg} किग्रा उपज तैयार है।`
          },
          estimated_freight_recovery_inr: 1200,
          is_confirmed: false
        });
      }
    }
  }

  return suggestions;
}
