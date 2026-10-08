export interface CalibrationRecord {
  id: string;
  crop_id: string;
  shipment_id: string;
  recorded_at: string;
  duration_hours: number;
  heat_factor: number;
  predicted_loss_kg: number;
  actual_loss_kg: number;
  total_kg: number;
  k_observed: number;
}

export interface CalibrationStatus {
  crop_id: string;
  sample_count: number;
  is_calibrated: boolean;
  effective_k: number;
  prior_k: number;
  label: {
    en: string;
    ta: string;
    hi: string;
  };
  mean_absolute_error_kg: number;
}

/**
 * Solves k_observed from actual post-harvest loss fraction, travel time, and heat factor.
 */
export function solveObservedK(
  actualLossKg: number,
  totalKg: number,
  durationHours: number,
  heatFactor = 1.0
): number {
  const fraction = Math.min(0.95, Math.max(0.001, actualLossKg / totalKg));
  const effectiveHours = Math.max(0.2, durationHours * heatFactor);
  // fraction = 1 - exp(-k * T) -> k = -ln(1 - fraction) / T
  const kObserved = -Math.log(1 - fraction) / effectiveHours;
  return parseFloat(kObserved.toFixed(5));
}

/**
 * Exponential smoothing:
 * k_new = alpha * k_observed + (1 - alpha) * k_prior, where alpha = 0.2
 */
export function updateCalibratedRate(
  priorK: number,
  kObserved: number,
  alpha = 0.2
): number {
  const kNew = alpha * kObserved + (1 - alpha) * priorK;
  return parseFloat(kNew.toFixed(5));
}

/**
 * Evaluates calibration status adhering to the strict 5-record threshold rule.
 */
export function evaluateCropCalibration(
  cropId: string,
  records: CalibrationRecord[],
  defaultPriorK: number
): CalibrationStatus {
  const cropRecords = records.filter((r) => r.crop_id === cropId);
  const sampleCount = cropRecords.length;

  if (sampleCount < 5) {
    return {
      crop_id: cropId,
      sample_count: sampleCount,
      is_calibrated: false,
      effective_k: defaultPriorK,
      prior_k: defaultPriorK,
      label: {
        en: `Demonstration assumption (${sampleCount}/5 actual outcome records needed for calibration)`,
        ta: `மாதிரி அனுமானம் (அளவுத்திருத்தத்திற்கு ${sampleCount}/5 உண்மையான பதிவுகள் தேவை)`,
        hi: `प्रदर्शन धारणा (अंशांकन के लिए ${sampleCount}/5 वास्तविक रिकॉर्ड आवश्यक)`
      },
      mean_absolute_error_kg: sampleCount > 0
        ? Math.round(cropRecords.reduce((acc, r) => acc + Math.abs(r.actual_loss_kg - r.predicted_loss_kg), 0) / sampleCount)
        : 0
    };
  }

  // Compute sequential exponential smoothing over records
  let currentK = defaultPriorK;
  cropRecords.forEach((r) => {
    currentK = updateCalibratedRate(currentK, r.k_observed, 0.2);
  });

  const mae = Math.round(cropRecords.reduce((acc, r) => acc + Math.abs(r.actual_loss_kg - r.predicted_loss_kg), 0) / sampleCount);

  return {
    crop_id: cropId,
    sample_count: sampleCount,
    is_calibrated: true,
    effective_k: currentK,
    prior_k: defaultPriorK,
    label: {
      en: `Estimated, calibrated from ${sampleCount} actual trip delivery records (α=0.2)`,
      ta: `${sampleCount} உண்மைப் பயண விநியோகப் பதிவுகளிலிருந்து அளவுத்திருத்தம் செய்யப்பட்டது (கணிக்கப்பட்டது)`,
      hi: `${sampleCount} वास्तविक यात्रा वितरण रिकॉर्ड से अंशांकित (अनुमानित)`
    },
    mean_absolute_error_kg: mae
  };
}
