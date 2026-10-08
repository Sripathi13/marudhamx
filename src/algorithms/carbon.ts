export interface RouteCarbonEstimate {
  distance_km: number;
  fuel_litres: number;
  co2_kg: number;
  emission_factor_kg_per_l: number;
  is_estimated: boolean;
  baseline_difference_co2_kg: number;
  baseline_difference_litres: number;
  summary_note: {
    en: string;
    ta: string;
    hi: string;
  };
}

/**
 * Calculates estimated diesel fuel consumption and carbon footprint.
 * co2_kg = litres * emission_factor_kg_per_litre
 */
export function calculateCarbonEstimate(
  distanceKm: number,
  fuelEfficiencyKmpl: number,
  trucksNeeded: number,
  baselineDistanceKm: number,
  emissionFactorKgPerL = 2.68
): RouteCarbonEstimate {
  const fuel_litres = parseFloat(((distanceKm / fuelEfficiencyKmpl) * trucksNeeded).toFixed(1));
  const co2_kg = parseFloat((fuel_litres * emissionFactorKgPerL).toFixed(1));

  const baseline_litres = parseFloat(((baselineDistanceKm / fuelEfficiencyKmpl) * trucksNeeded).toFixed(1));
  const baseline_co2 = parseFloat((baseline_litres * emissionFactorKgPerL).toFixed(1));

  const baseline_difference_litres = parseFloat((fuel_litres - baseline_litres).toFixed(1));
  const baseline_difference_co2_kg = parseFloat((co2_kg - baseline_co2).toFixed(1));

  const summary_note = {
    en: baseline_difference_co2_kg <= 0
      ? `Estimated emissions: ${co2_kg} kg CO₂ (${fuel_litres} L diesel), saving ${Math.abs(baseline_difference_co2_kg)} kg CO₂ vs baseline.`
      : `Estimated emissions: ${co2_kg} kg CO₂ (${fuel_litres} L diesel, +${baseline_difference_co2_kg} kg CO₂ vs shortest distance route due to faster bypass).`,
    ta: baseline_difference_co2_kg <= 0
      ? `கணிக்கப்பட்ட கரியமில உமிழ்வு: ${co2_kg} கிலோ CO₂ (${fuel_litres} லிட்டர் டீசல்), அடிப்படை வழியை விட ${Math.abs(baseline_difference_co2_kg)} கிலோ சேமிப்பு.`
      : `கணிக்கப்பட்ட கரியமில உமிழ்வு: ${co2_kg} கிலோ CO₂ (${fuel_litres} லிட்டர் டீசல், அதிவேக புறவழிச்சாலையால் +${baseline_difference_co2_kg} கிலோ CO₂).`,
    hi: baseline_difference_co2_kg <= 0
      ? `अनुमानित उत्सर्जन: ${co2_kg} किग्रा CO₂ (${fuel_litres} ली डीजल), बेसलाइन की तुलना में ${Math.abs(baseline_difference_co2_kg)} किग्रा बचत।`
      : `अनुमानित उत्सर्जन: ${co2_kg} किग्रा CO₂ (${fuel_litres} ली डीजल, त्वरित बाईपास के कारण +${baseline_difference_co2_kg} किग्रा CO₂)।`
  };

  return {
    distance_km: distanceKm,
    fuel_litres,
    co2_kg,
    emission_factor_kg_per_l: emissionFactorKgPerL,
    is_estimated: true,
    baseline_difference_co2_kg,
    baseline_difference_litres,
    summary_note
  };
}
