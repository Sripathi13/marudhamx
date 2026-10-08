import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mandiPricesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/mandi_prices.json'), 'utf-8')
);

export interface MarketEvaluation {
  market_id: string;
  market_name: { en: string; ta: string; hi: string };
  price_per_kg: number;
  price_date: string;
  data_source: string;
  is_demonstration: boolean;
  distance_km: number;
  duration_min: number;
  gross_value_inr: number;
  spoilage_fraction: number;
  spoilage_loss_inr: number;
  transport_cost_inr: number;
  net_value_inr: number;
  rank: number;
  reason: {
    en: string;
    ta: string;
    hi: string;
  };
}

export function getMandiPrice(marketId: string, cropId: string): {
  pricePerKg: number;
  priceDate: string;
  dataSource: string;
  isDemonstration: boolean;
} {
  const mkt = (mandiPricesData.prices as any[]).find((m: any) => m.market_id === marketId);
  const price = (mkt?.crop_prices as any)?.[cropId] || 32.0;
  return {
    pricePerKg: price,
    priceDate: mandiPricesData.price_date,
    dataSource: mandiPricesData.data_source,
    isDemonstration: mandiPricesData.is_demonstration
  };
}

/**
 * Net value formula:
 * Net value = Q * p_market * (1 - f) - Transport
 */
export function rankMarketsByNetValue(
  evaluations: Array<{
    market_id: string;
    market_name: { en: string; ta: string; hi: string };
    price_per_kg: number;
    price_date: string;
    data_source: string;
    is_demonstration: boolean;
    total_kg: number;
    distance_km: number;
    duration_min: number;
    spoilage_fraction: number;
    transport_cost_inr: number;
  }>
): MarketEvaluation[] {
  const scored = evaluations.map((item) => {
    const gross_value_inr = Math.round(item.total_kg * item.price_per_kg);
    const spoilage_loss_inr = Math.round(gross_value_inr * item.spoilage_fraction);
    const net_value_inr = Math.round(item.total_kg * item.price_per_kg * (1 - item.spoilage_fraction) - item.transport_cost_inr);

    return {
      ...item,
      gross_value_inr,
      spoilage_loss_inr,
      net_value_inr,
      rank: 0,
      reason: { en: '', ta: '', hi: '' }
    };
  });

  // Sort descending by net value
  scored.sort((a, b) => b.net_value_inr - a.net_value_inr);

  const best = scored[0];
  const second = scored[1];

  scored.forEach((m, idx) => {
    m.rank = idx + 1;
    if (idx === 0) {
      if (second) {
        const netDiff = best.net_value_inr - second.net_value_inr;
        const isFarther = best.distance_km > second.distance_km;
        if (isFarther) {
          m.reason = {
            en: `Yields the highest net profit (+₹${netDiff.toLocaleString()} estimated) because premium wholesale price (₹${m.price_per_kg}/kg) far outweighs the additional transport distance.`,
            ta: `கூடுதல் போக்குவரத்து தூரத்தை விட கூடுதல் மொத்த விலை (₹${m.price_per_kg}/கிலோ) அதிக லாபத்தைத் தருகிறது (+₹${netDiff.toLocaleString()} கணிக்கப்பட்டது).`,
            hi: `उच्च थोक मूल्य (₹${m.price_per_kg}/किग्रा) अतिरिक्त परिवहन दूरी की भरपाई करता है और अधिकतम शुद्ध लाभ (+₹${netDiff.toLocaleString()} अनुमानित) देता है।`
          };
        } else {
          m.reason = {
            en: `Offers the best net return (+₹${netDiff.toLocaleString()} estimated) with optimal price and transport cost.`,
            ta: `குறைந்த பயண செலவு மற்றும் உகந்த விலையுடன் அதிகபட்ச நிகர வருவாயை (+₹${netDiff.toLocaleString()} கணிக்கப்பட்டது) தருகிறது.`,
            hi: `इष्टतम मूल्य और कम परिवहन लागत के साथ सर्वोत्तम शुद्ध लाभ (+₹${netDiff.toLocaleString()} अनुमानित) प्रदान करता है।`
          };
        }
      } else {
        m.reason = {
          en: `Highest net farmer payout across evaluated destinations.`,
          ta: `மதிப்பீடு செய்யப்பட்ட சந்தைகளில் அதிகபட்ச நிகர வருவாய்.`,
          hi: `मूल्यांकित मंडियों में किसान के लिए उच्चतम शुद्ध भुगतान।`
        };
      }
    } else {
      const diffFromBest = best.net_value_inr - m.net_value_inr;
      m.reason = {
        en: `Generates ₹${diffFromBest.toLocaleString()} lower net return compared to top market.`,
        ta: `முதன்மை சந்தையை விட ₹${diffFromBest.toLocaleString()} குறைவான நிகர வருவாய்.`,
        hi: `शीर्ष मंडी की तुलना में ₹${diffFromBest.toLocaleString()} कम शुद्ध रिटर्न।`
      };
    }
  });

  return scored;
}

/**
 * Loads CSV rows formatted as market_id, crop_id, price_per_kg, price_date, source
 */
export function parseMandiPriceCsv(csvContent: string): Record<string, Record<string, number>> {
  const lines = csvContent.trim().split('\n');
  const result: Record<string, Record<string, number>> = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    if (parts.length >= 3) {
      const marketId = parts[0];
      const cropId = parts[1];
      const price = parseFloat(parts[2]);
      if (!result[marketId]) result[marketId] = {};
      if (!isNaN(price)) result[marketId][cropId] = price;
    }
  }
  return result;
}
