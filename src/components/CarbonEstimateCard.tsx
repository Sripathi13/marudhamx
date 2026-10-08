import { useTranslation } from 'react-i18next';
import { Leaf, Fuel, Info, TrendingDown, TrendingUp } from 'lucide-react';
import { RouteCandidate } from '../types.ts';
import { calculateCarbonEstimate } from '../algorithms/carbon.ts';

interface CarbonEstimateCardProps {
  route: RouteCandidate;
  allRoutes: RouteCandidate[];
  fuelEfficiencyKmpl: number;
  trucksNeeded: number;
}

export default function CarbonEstimateCard({
  route,
  allRoutes,
  fuelEfficiencyKmpl,
  trucksNeeded
}: CarbonEstimateCardProps) {
  const { t } = useTranslation();

  const shortestDistance = Math.min(...allRoutes.map((r) => r.distance_km));
  const carbon = calculateCarbonEstimate(
    route.distance_km,
    fuelEfficiencyKmpl,
    trucksNeeded,
    shortestDistance,
    2.68
  );

  const isSaving = carbon.baseline_difference_co2_kg <= 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-700 text-white shadow-2xs">
            <Leaf className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('carbon.title')}</h3>
            <p className="text-xs text-slate-500">{t('carbon.subtitle')}</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          {t('common.estimated')}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <p className="text-slate-500 mb-1 flex items-center gap-1 font-medium">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              {t('carbon.col_emissions')}
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {carbon.co2_kg} <span className="text-xs font-semibold text-slate-500">kg CO₂</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{t('common.estimated')}</p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <p className="text-slate-500 mb-1 flex items-center gap-1 font-medium">
              <Fuel className="w-3.5 h-3.5 text-amber-600" />
              {t('carbon.col_fuel')}
            </p>
            <p className="text-lg font-extrabold text-slate-900">
              {carbon.fuel_litres} <span className="text-xs font-semibold text-slate-500">L</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{trucksNeeded} {t('plan.trucks_needed')}</p>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <p className="text-slate-500 mb-1 flex items-center gap-1 font-medium">
              {isSaving ? <TrendingDown className="w-3.5 h-3.5 text-emerald-600" /> : <TrendingUp className="w-3.5 h-3.5 text-amber-600" />}
              {t('carbon.col_vs_baseline')}
            </p>
            <p className={`text-lg font-extrabold ${isSaving ? 'text-emerald-700' : 'text-slate-900'}`}>
              {isSaving ? `${carbon.baseline_difference_co2_kg} kg` : `+${carbon.baseline_difference_co2_kg} kg`}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">vs {shortestDistance} km {t('carbon.shortest_route')}</p>
          </div>
        </div>

        {/* Assumption Footnote */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {t('carbon.emission_factor_note', { factor: carbon.emission_factor_kg_per_l })}
          </p>
        </div>
      </div>
    </div>
  );
}
