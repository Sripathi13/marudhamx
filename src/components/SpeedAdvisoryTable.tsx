import { useTranslation } from 'react-i18next';
import { Gauge, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { RoadStretch } from '../types';
import { formatDistance, formatDuration, formatSpeed } from '../utils/formatters';

interface SpeedAdvisoryTableProps {
  stretches: RoadStretch[];
  selectedStretchId?: string | null;
  onSelectStretch?: (stretch: RoadStretch) => void;
}

export default function SpeedAdvisoryTable({
  stretches,
  selectedStretchId,
  onSelectStretch,
}: SpeedAdvisoryTableProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  if (!stretches || stretches.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-emerald-700" />
          <h3 className="text-base font-bold text-slate-900">
            {t('speed_advisory.title')}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            {t('speed_advisory.band_high')}
          </span>
          <span className="flex items-center gap-1.5 text-amber-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            {t('speed_advisory.band_medium')}
          </span>
          <span className="flex items-center gap-1.5 text-rose-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            {t('speed_advisory.band_low')}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">{t('speed_advisory.table_stretch')}</th>
              <th className="py-3 px-4">{t('speed_advisory.table_from')}</th>
              <th className="py-3 px-4">{t('speed_advisory.table_to')}</th>
              <th className="py-3 px-4">{t('speed_advisory.table_length')}</th>
              <th className="py-3 px-4">{t('speed_advisory.table_recommended_speed')}</th>
              <th className="py-3 px-4">{t('speed_advisory.table_expected_time')}</th>
              <th className="py-3 px-4">{t('speed_advisory.table_reason')}</th>
              <th className="py-3 px-4">{t('speed_advisory.table_data_source')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stretches.map((s) => {
              const isSelected = selectedStretchId === s.id;
              const fromName = s.from_place[currentLang] || s.from_place.ta;
              const toName = s.to_place[currentLang] || s.to_place.ta;

              let bandBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              if (s.speed_band === 'medium') {
                bandBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
              } else if (s.speed_band === 'low') {
                bandBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
              }

              return (
                <tr
                  key={s.id}
                  onClick={() => onSelectStretch && onSelectStretch(s)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50/80 font-medium ring-1 ring-emerald-500' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    #{s.stretch_index}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-medium">
                    {fromName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 font-medium">
                    {toName}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {formatDistance(s.length_km)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${bandBadgeClass}`}
                    >
                      <Gauge className="w-3.5 h-3.5" />
                      {formatSpeed(s.recommended_speed_kmh)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDuration(s.stretch_time_min)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-xs">
                    <span className="inline-flex items-center gap-1">
                      {s.is_urban ? (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span>{t(`speed_advisory.reason_${s.reason_code}`)}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs">
                    {s.speed_limit_source === 'posted_limit'
                      ? t('speed_advisory.source_posted')
                      : t('speed_advisory.source_truck_default')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
