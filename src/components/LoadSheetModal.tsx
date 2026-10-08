import { useTranslation } from 'react-i18next';
import { X, Printer, Truck, Calendar, MapPin, Gauge } from 'lucide-react';
import { PlanResponse, RouteCandidate } from '../types';
import { formatDistance, formatDuration, formatNumber, formatSpeed } from '../utils/formatters';

interface LoadSheetModalProps {
  plan: PlanResponse;
  route: RouteCandidate;
  onClose: () => void;
}

export default function LoadSheetModal({ plan, route, onClose }: LoadSheetModalProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  const handlePrint = () => {
    window.print();
  };

  const cropName = plan.crop_name[currentLang] || plan.crop_name.ta;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:p-0">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">{t('load_sheet.title')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('load_sheet.print_btn')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Content */}
        <div className="space-y-6 text-slate-900">
          <div className="text-center pb-4 border-b border-slate-300">
            <h1 className="text-2xl font-black text-emerald-950 tracking-tight">{t('app_name')}</h1>
            <p className="text-xs text-slate-600 font-medium">{t('tagline')}</p>
            <p className="text-xs text-slate-500 font-mono mt-1">ID: {plan.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">{t('plan.departure_label')}</span>
              <span className="font-bold text-slate-900 text-sm">
                {new Date(plan.departure_time).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">{t('load_sheet.cargo')}</span>
              <span className="font-bold text-slate-900 text-sm">
                {cropName} ({formatNumber(plan.total_kg)} {t('units.kg')})
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>{plan.origin.name} → {plan.destination.name}</span>
            </div>
            <p className="text-emerald-800">
              {route.id}: {route.name} ({formatDistance(route.distance_km)} • {formatDuration(route.duration_min)})
            </p>
          </div>

          {/* Truck breakdown rows */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t('plan.truck_summary_title')} ({plan.truck_breakdown.trucks_needed} {t('history.col_trucks')})
            </h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden text-xs">
              {plan.truck_breakdown.trucks.map((tk) => (
                <div key={tk.truck_index} className="p-3 bg-white flex items-center justify-between">
                  <span className="font-bold">#{tk.truck_index} ({plan.vehicle_type})</span>
                  <span>{formatNumber(tk.load_kg)} {t('units.kg')} ({tk.utilization_percent}%)</span>
                  <span className="text-slate-500 font-mono">Sign: ___________________</span>
                </div>
              ))}
            </div>
          </div>

          {/* Speed advisory corridor summary */}
          {route.speed_advisory_summary && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Gauge className="w-4 h-4 text-emerald-700" />
                <span>{t('speed_advisory.title')}</span>
              </div>
              <p className="text-slate-700">
                {t('speed_advisory.planner_advice', {
                  city_speed: route.speed_advisory_summary.city_advised_speed_kmh,
                  highway_speed: route.speed_advisory_summary.highway_advised_speed_kmh,
                  unit_speed: t('units.kmh')
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
