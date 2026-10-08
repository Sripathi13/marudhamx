import { useTranslation } from 'react-i18next';
import { X, Gauge, Clock, ShieldCheck, MapPin } from 'lucide-react';
import { RoadStretch } from '../types';
import { formatDistance, formatDuration, formatSpeed } from '../utils/formatters';

interface StretchCardModalProps {
  stretch: RoadStretch | null;
  onClose: () => void;
}

export default function StretchCardModal({ stretch, onClose }: StretchCardModalProps) {
  const { t, i18n } = useTranslation();
  if (!stretch) return null;

  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';
  const fromName = stretch.from_place[currentLang] || stretch.from_place.ta;
  const toName = stretch.to_place[currentLang] || stretch.to_place.ta;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-emerald-700" />
            <h3 className="text-base font-bold text-slate-900">
              {t('speed_advisory.stretch_card_title')} #{stretch.stretch_index}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-semibold text-slate-800">
              {fromName} → {toName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block mb-0.5">
                {t('speed_advisory.table_length')}
              </span>
              <span className="text-base font-bold text-slate-900">
                {formatDistance(stretch.length_km)}
              </span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-800 block mb-0.5">
                {t('speed_advisory.table_recommended_speed')}
              </span>
              <span className="text-base font-extrabold text-emerald-900">
                {formatSpeed(stretch.recommended_speed_kmh)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t('speed_advisory.table_expected_time')}:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatDuration(stretch.stretch_time_min)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{t('speed_advisory.table_data_source')}:</span>
              <span className="font-medium text-slate-800">
                {stretch.speed_limit_source === 'posted_limit'
                  ? t('speed_advisory.source_posted')
                  : t('speed_advisory.source_truck_default')}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500">{t('speed_advisory.table_reason')}:</span>
              <span className="font-semibold text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {t(`speed_advisory.reason_${stretch.reason_code}`)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
        >
          {t('map_picker.btn_confirm')}
        </button>
      </div>
    </div>
  );
}
