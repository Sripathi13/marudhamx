import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { PlanResponse, RouteCandidate } from '../types';
import { formatDistance, formatDuration, formatNumber } from '../utils/formatters';

interface ShareSummaryModalProps {
  plan: PlanResponse;
  route: RouteCandidate;
  onClose: () => void;
}

export default function ShareSummaryModal({ plan, route, onClose }: ShareSummaryModalProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';
  const [copied, setCopied] = useState<boolean>(false);

  const cropName = plan.crop_name[currentLang] || plan.crop_name.ta;
  const speedAdvice = route.speed_advisory_summary
    ? `${route.speed_advisory_summary.city_advised_speed_kmh} ${t('units.kmh')} / ${route.speed_advisory_summary.highway_advised_speed_kmh} ${t('units.kmh')}`
    : '40/60 km/h';

  const summaryText = `[${t('app_name')}]
${t('load_sheet.cargo')}: ${cropName} (${formatNumber(plan.total_kg)} ${t('units.kg')})
${t('history.col_trucks')}: ${plan.truck_breakdown.trucks_needed}
${t('plan.section_origin')}: ${plan.origin.name}
${t('plan.section_destination')}: ${plan.destination.name}
${t('results.col_route')}: ${route.id} (${route.name})
${t('results.col_distance')}: ${formatDistance(route.distance_km)}
${t('results.col_duration')}: ${formatDuration(route.duration_min)}
${t('speed_advisory.table_recommended_speed')}: ${speedAdvice}
Maps: https://www.google.com/maps/dir/?api=1&origin=${plan.origin.lat},${plan.origin.lng}&destination=${plan.destination.lat},${plan.destination.lng}&travelmode=driving`;

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">{t('share.btn')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <textarea
          readOnly
          value={summaryText}
          rows={10}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-800 focus:outline-none select-all"
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500 font-medium">
            {copied ? t('share.copied') : ''}
          </span>
          <button
            onClick={handleCopy}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? t('share.copied') : t('share.btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
