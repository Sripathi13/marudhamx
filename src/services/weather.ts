import { config } from '../core/config.ts';

interface CachedWeather {
  temp_c: number;
  humidity_percent: number;
  timestamp: number;
}

const weatherCache = new Map<string, CachedWeather>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes cache

export async function fetchHourlyWeather(
  lat: number,
  lng: number,
  targetTimeIso?: string
): Promise<{ temp_c: number; humidity_percent: number; is_live: boolean }> {
  const targetDate = targetTimeIso ? new Date(targetTimeIso) : new Date();
  const hour = targetDate.getHours();
  
  // Cache key by rounded coordinates (2 decimals ~ 1.1km) and date-hour
  const key = `${lat.toFixed(2)}_${lng.toFixed(2)}_${targetDate.toISOString().slice(0, 13)}`;

  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { temp_c: cached.temp_c, humidity_percent: cached.humidity_percent, is_live: true };
  }

  try {
    const url = `${config.OPEN_METEO_BASE_URL}?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=temperature_2m,relative_humidity_2m&forecast_days=2`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout for fast response

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.hourly && data.hourly.temperature_2m && data.hourly.temperature_2m.length > 0) {
        // Find closest hour in forecast array
        const temps: number[] = data.hourly.temperature_2m;
        const humids: number[] = data.hourly.relative_humidity_2m || [];
        const index = Math.min(hour, temps.length - 1);
        const temp_c = temps[index] ?? 28.0;
        const humidity_percent = humids[index] ?? 65.0;

        weatherCache.set(key, { temp_c, humidity_percent, timestamp: Date.now() });
        return { temp_c, humidity_percent, is_live: true };
      }
    }
  } catch (err) {
    // Graceful offline fallback
  }

  // Realistic diurnal curve fallback for Tamil Nadu inland plain
  let fallbackTemp = 28;
  if (hour >= 12 && hour <= 15) fallbackTemp = 35;
  else if (hour >= 9 && hour < 12) fallbackTemp = 31;
  else if (hour >= 16 && hour <= 18) fallbackTemp = 32;
  else if (hour >= 19 && hour <= 23) fallbackTemp = 27;
  else fallbackTemp = 24;

  return { temp_c: fallbackTemp, humidity_percent: 60, is_live: false };
}
