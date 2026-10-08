import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const heatFactorsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/heat_factors.json'), 'utf-8')
);

export interface WeatherSamplePoint {
  lat: number;
  lng: number;
  name?: string;
  temp_c: number;
  humidity_percent: number;
  condition: string;
  timestamp: string;
}

export function heatFactorFromTemperature(tempC: number): {
  heatFactor: number;
  label: string;
  isDemonstration: boolean;
} {
  const thresholds = heatFactorsData.thresholds;
  if (tempC < 25.0) {
    return { heatFactor: 1.0, label: 'Cool / Mild (<25°C)', isDemonstration: true };
  } else if (tempC >= 25.0 && tempC < 30.0) {
    return { heatFactor: 1.2, label: 'Moderate Ambient (25-30°C)', isDemonstration: true };
  } else if (tempC >= 30.0 && tempC < 35.0) {
    return { heatFactor: 1.5, label: 'Warm / Elevated (30-35°C)', isDemonstration: true };
  } else {
    return { heatFactor: 1.8, label: 'High Heat Stress (>35°C)', isDemonstration: true };
  }
}

export function computeWeatherWeightedSpoilage(
  baseSpoilageRate: number,
  tempFactor: number,
  ambientTempC: number,
  durationHours: number
): {
  heatFactor: number;
  effectiveK: number;
  spoilageFraction: number;
  weatherSummary: string;
  weatherExplanation: string;
} {
  const { heatFactor, label } = heatFactorFromTemperature(ambientTempC);
  const effectiveK = baseSpoilageRate * tempFactor * heatFactor;
  const spoilageFraction = Math.min(0.99, parseFloat((1 - Math.exp(-effectiveK * durationHours)).toFixed(4)));

  const weatherSummary = `Weather at arrival: ${Math.round(ambientTempC)} °C (estimated, forecast)`;
  
  let weatherExplanation = '';
  if (heatFactor >= 1.5) {
    weatherExplanation = `Elevated ambient temperatures (${Math.round(ambientTempC)}°C, ${label}) along transit increase biochemical respiration, raising estimated spoilage by ~${Math.round((heatFactor - 1.0) * 100)}% over standard baseline.`;
  } else if (heatFactor === 1.2) {
    weatherExplanation = `Moderate daytime heat (${Math.round(ambientTempC)}°C) slightly accelerates degradation (~20% increase in estimated spoilage rate).`;
  } else {
    weatherExplanation = `Cooler transit conditions (${Math.round(ambientTempC)}°C) preserve produce shelf-life with minimal heat-induced spoilage.`;
  }

  return {
    heatFactor,
    effectiveK,
    spoilageFraction,
    weatherSummary,
    weatherExplanation
  };
}
