import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Zap, TrendingDown, Check, X } from 'lucide-react';
import { api } from '../services/api.ts';
import { formatCurrency } from '../utils/formatters.ts';

interface DepartureOptimizerModalProps {
  cropId: string;
  totalKg: number;
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string };
  vehicleType: string;
  currentDepartureIso: string;
  onClose: () => void;
  onSelectDeparture: (departureIso: string) => void;
}

export default function DepartureOptimizerModal({
  cropId,
  totalKg,
  origin,
  destination,
  vehicleType,
  currentDepartureIso,
  onClose,
  onSelectDeparture
}: DepartureOptimizerModalProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [selectedIso, setSelectedIso] = useState<string>(currentDepartureIso);

  useEffect(() => {
    setLoading(true);
    api.optimizeDeparture({
      crop_id: cropId,
      total_kg: totalKg,
      origin,
      destination,
      vehicle_type: vehicleType,
      departure_time: currentDepartureIso
    })
    .then((res) => {
      setData(res);
      setSelectedIso(res.optimal_slot.departure_time);
      setLoading(false);
    })
    .catch((err) => {
      console.error('Departure optimization failed:', err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-700 text-white shadow-2xs">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{t('departure_opt.title')}</h3>
              <p className="text-xs text-slate-500">{t('departure_opt.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500 font-medium">Analyzing 12-hour departure traffic and thermal curves...</p>
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Recommendation Highlight Banner */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3 text-xs leading-relaxed">
              <Zap className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">
                  Optimal Window: {data.optimal_slot.hour_label} (Saves ~{data.savings_min} min / ₹{data.savings_inr.toLocaleString()} estimated)
                </p>
                <p className="text-slate-600">
                  {data.recommendation_note[currentLang] || data.recommendation_note.en}
                </p>
              </div>
            </div>

            {/* Visual Travel Time Chart across 12 Hours */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-3">
                <span>{t('departure_opt.chart_title')}</span>
                <span className="text-slate-400 font-normal">Height = Total Transit Duration (min)</span>
              </div>

              {/* Bar Chart */}
              <div className="h-32 flex items-end gap-1.5 pt-4 pb-2 border-b border-slate-200 overflow-x-auto">
                {data.slots.map((s: any) => {
                  const maxDur = Math.max(...data.slots.map((x: any) => x.duration_min));
                  const heightPercent = Math.max(25, Math.round((s.duration_min / maxDur) * 100));
                  const isOpt = s.is_optimal;
                  const isSel = s.departure_time === selectedIso;

                  return (
                    <button
                      key={s.departure_time}
                      type="button"
                      onClick={() => setSelectedIso(s.departure_time)}
                      className="flex-1 min-w-[28px] h-full flex flex-col items-center justify-end group cursor-pointer"
                      title={`${s.hour_label}: ${s.duration_min} min, ${s.ambient_temp_c}°C`}
                    >
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t transition-all ${
                          isSel
                            ? 'bg-emerald-600 ring-2 ring-emerald-900'
                            : isOpt
                            ? 'bg-emerald-400 hover:bg-emerald-500'
                            : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                      <span className="text-[10px] text-slate-500 font-mono mt-1 transform -rotate-45 origin-top-left sm:rotate-0">
                        {s.hour_label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
              {data.slots.map((s: any) => {
                const isSel = s.departure_time === selectedIso;
                const isOpt = s.is_optimal;

                return (
                  <button
                    key={s.departure_time}
                    type="button"
                    onClick={() => setSelectedIso(s.departure_time)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSel
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500'
                        : isOpt
                        ? 'border-emerald-300 bg-white hover:bg-emerald-50/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>{s.hour_label}</span>
                      {isOpt && <span className="text-[10px] text-emerald-700 font-extrabold">BEST</span>}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {s.duration_min} min • {s.ambient_temp_c}°C
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectDeparture(selectedIso);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('departure_opt.btn_apply')}</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
