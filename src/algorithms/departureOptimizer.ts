export interface DepartureTimeSlot {
  departure_time: string;
  hour_label: string;
  duration_min: number;
  traffic_delay_min: number;
  ambient_temp_c: number;
  spoilage_fraction: number;
  expected_loss_inr: number;
  total_economic_cost_inr: number;
  is_selected: boolean;
  is_optimal: boolean;
}

export interface DepartureOptimizationResult {
  slots: DepartureTimeSlot[];
  optimal_slot: DepartureTimeSlot;
  current_slot: DepartureTimeSlot;
  savings_min: number;
  savings_inr: number;
  recommendation_note: {
    en: string;
    ta: string;
    hi: string;
  };
}

export function evaluateDepartureWindow(
  baseDurationMin: number,
  baseDistanceKm: number,
  totalKg: number,
  wholesalePrice: number,
  baseSpoilageRate: number,
  tempFactor: number,
  fuelPrice: number,
  fuelEff: number,
  trucksNeeded: number,
  baseDepartureIso: string
): DepartureOptimizationResult {
  const baseDate = new Date(baseDepartureIso);
  const slots: DepartureTimeSlot[] = [];

  // Generate 24 slots (every 30 mins over 12 hours)
  for (let i = 0; i < 24; i++) {
    const slotDate = new Date(baseDate.getTime() + i * 30 * 60 * 1000);
    const hour = slotDate.getHours();
    const minutes = slotDate.getMinutes();
    const hourFormatted = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Traffic congestion profile by time of day in Tamil Nadu corridors
    let trafficMult = 1.05;
    if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
      trafficMult = 1.35; // Morning / evening peak
    } else if (hour >= 11 && hour <= 16) {
      trafficMult = 1.15; // Moderate midday
    } else if (hour >= 21 || hour <= 5) {
      trafficMult = 0.95; // Night / early dawn clear roads
    } else {
      trafficMult = 1.05; // Early morning
    }

    // Estimated ambient temperature curve throughout day
    let tempC = 26;
    if (hour >= 12 && hour <= 15) {
      tempC = 35; // Peak afternoon heat
    } else if (hour >= 9 && hour < 12) {
      tempC = 30;
    } else if (hour >= 16 && hour <= 18) {
      tempC = 31;
    } else if (hour >= 19 && hour <= 23) {
      tempC = 27;
    } else {
      tempC = 23; // Early morning / night cool
    }

    const duration_min = Math.round(baseDurationMin * trafficMult);
    const traffic_delay_min = Math.max(0, duration_min - baseDurationMin);
    const duration_hours = duration_min / 60;

    // Piecewise heat factor
    let heatFactor = 1.0;
    if (tempC >= 35) heatFactor = 1.8;
    else if (tempC >= 30) heatFactor = 1.5;
    else if (tempC >= 25) heatFactor = 1.2;

    const effectiveK = baseSpoilageRate * tempFactor * heatFactor;
    const spoilage_fraction = Math.min(0.99, parseFloat((1 - Math.exp(-effectiveK * duration_hours)).toFixed(4)));
    const expected_loss_inr = Math.round(totalKg * wholesalePrice * spoilage_fraction);

    const fuel_cost = Math.round((baseDistanceKm / fuelEff) * fuelPrice * trucksNeeded);
    const transport_cost = fuel_cost + 450 * trucksNeeded + (baseDistanceKm > 55 ? 120 : 0);
    const total_economic_cost_inr = transport_cost + expected_loss_inr;

    slots.push({
      departure_time: slotDate.toISOString(),
      hour_label: hourFormatted,
      duration_min,
      traffic_delay_min,
      ambient_temp_c: tempC,
      spoilage_fraction,
      expected_loss_inr,
      total_economic_cost_inr,
      is_selected: i === 0,
      is_optimal: false
    });
  }

  // Find lowest total cost & time slot
  let minCostSlot = slots[0];
  for (const s of slots) {
    if (s.total_economic_cost_inr < minCostSlot.total_economic_cost_inr) {
      minCostSlot = s;
    }
  }
  minCostSlot.is_optimal = true;

  const currentSlot = slots[0];
  const savings_min = Math.max(0, currentSlot.duration_min - minCostSlot.duration_min);
  const savings_inr = Math.max(0, currentSlot.total_economic_cost_inr - minCostSlot.total_economic_cost_inr);

  const recommendation_note = {
    en: `Leaving at ${minCostSlot.hour_label} saves about ${savings_min} min and ₹${savings_inr.toLocaleString()} (estimated) compared with ${currentSlot.hour_label} due to cooler ambient temps and free-flowing highway conditions.`,
    ta: `${currentSlot.hour_label} நேரத்தை விட ${minCostSlot.hour_label} மணியளவில் புறப்படுவது சுமார் ${savings_min} நிமிடங்கள் மற்றும் ₹${savings_inr.toLocaleString()} சேமிக்கிறது (கணிக்கப்பட்டது).`,
    hi: `${currentSlot.hour_label} की तुलना में ${minCostSlot.hour_label} पर प्रस्थान करने से ठंडे मौसम और कम जाम के कारण लगभग ${savings_min} मिनट और ₹${savings_inr.toLocaleString()} की बचत होती है (अनुमानित)।`
  };

  return {
    slots,
    optimal_slot: minCostSlot,
    current_slot: currentSlot,
    savings_min,
    savings_inr,
    recommendation_note
  };
}
