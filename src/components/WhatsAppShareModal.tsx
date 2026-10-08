import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Check, Copy, X } from 'lucide-react';
import { PlanResponse, RouteCandidate } from '../types.ts';
import { formatNumber } from '../utils/formatters.ts';

interface WhatsAppShareModalProps {
  plan: PlanResponse;
  route: RouteCandidate;
  onClose: () => void;
}

export function generateLocalizedShareMessage(
  plan: PlanResponse,
  route: RouteCandidate,
  lang: string
): string {
  const crop = plan.crop_name[lang as 'en' | 'ta' | 'hi'] || plan.crop_name.ta;
  const trucks = plan.truck_breakdown.trucks_needed;
  const qty = formatNumber(plan.total_kg);
  const dist = route.distance_km;
  const timeMin = route.duration_min;

  if (lang === 'ta') {
    // STRICT ZERO LATIN LETTERS IN TAMIL
    return `விளைபொருள் போக்குவரத்து திட்டம்
பயிர்: ${crop}
எடை: ${qty} கிலோ
லாரிகள்: ${trucks}
பாதை: ${route.name.replace(/[A-Za-z0-9]/g, '').trim() || 'நேரடி நெடுஞ்சாலை'}
தூரம்: ${dist} கி.மீ.
பயண நேரம்: ${timeMin} நிமிடங்கள்
தரவு ஆதாரம்: கணிக்கப்பட்ட சாலை நெட்வொர்க் (ஓபன்ஸ்ட்ரீட்மேப்)`;
  } else if (lang === 'hi') {
    return `कृषि उपज परिवहन योजना
फसल: ${crop}
मात्रा: ${qty} किग्रा
ट्रक: ${trucks}
मार्ग: ${route.name}
दूरी: ${dist} किमी
समय: ${timeMin} मिनट
डेटा स्रोत: ओएसआरएम अनुमानित सड़क नेटवर्क`;
  } else {
    return `AgriRoute Shipment Plan
Crop: ${crop}
Quantity: ${qty} kg
Trucks: ${trucks}
Route: ${route.id} - ${route.name}
Distance: ${dist} km
Duration: ${timeMin} min
Data Source: OSRM Road Network (Estimated)`;
  }
}

export default function WhatsAppShareModal({ plan, route, onClose }: WhatsAppShareModalProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';
  const [copied, setCopied] = useState<boolean>(false);

  const message = generateLocalizedShareMessage(plan, route, currentLang);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDeviceShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('share.title'),
          text: message
        });
      } catch {
        // Dismissed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-700 text-white shadow-2xs">
              <Share2 className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">{t('share.title')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs whitespace-pre-line text-slate-800 leading-relaxed max-h-48 overflow-y-auto">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <span>{t('share.btn_whatsapp')}</span>
          </a>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t('common.copied') : t('share.btn_copy')}</span>
            </button>

            <button
              type="button"
              onClick={handleDeviceShare}
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('share.btn_device_share')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
