import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import {
  Award,
  Truck,
  MapPin,
  Clock,
  ArrowRight,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Settings as SettingsIcon,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { PlanResponse, RouteCandidate } from '../types';
import LeafletMap from '../components/LeafletMap';
import {
  formatCurrency,
  formatDistance,
  formatDuration,
  formatNumber
} from '../utils/formatters';

export default function ResultsPage() {
  const { t, i18n } = useTranslation();
  const { shipmentId } = useParams<{ shipmentId: string }>();

  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [showSteps, setShowSteps] = useState<boolean>(false);

  useEffect(() => {
    if (!shipmentId) return;
    setLoading(true);
    api
      .getShipmentById(shipmentId)
      .then((data) => {
        setPlan(data);
        setSelectedRouteId(data.recommended_route_id || data.routes[0]?.id || 'A');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'SHIPMENT_NOT_FOUND');
        setLoading(false);
      });
  }, [shipmentId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium">{t('plan.btn_optimizing')}</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('errors.ROUTING_FAILED')}</h2>
        <p className="text-sm text-slate-600 mb-6">{t('errors.SERVER_ERROR')}</p>
        <Link
          to="/plan"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-xl font-semibold text-sm hover:bg-emerald-800"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t('history.btn_plan_now')}</span>
        </Link>
      </div>
    );
  }

  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';
  const cropTitle = plan.crop_name[currentLang] || plan.crop_name.ta;

  const activeRoute: RouteCandidate =
    plan.routes.find((r) => r.id === selectedRouteId) || plan.routes[0];
  const recommendedRoute: RouteCandidate =
    plan.routes.find((r) => r.id === plan.recommended_route_id) || plan.routes[0];

  // External Google Maps directions URL
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${plan.origin.lat},${plan.origin.lng}&destination=${plan.destination.lat},${plan.destination.lng}&travelmode=driving`;

  // Build truck summary string
  const truckDetails = plan.truck_breakdown.trucks
    .map(
      (tk) =>
        `#${tk.truck_index}: ${formatNumber(tk.load_kg)} ${t('units.kg')} (${formatNumber(
          tk.utilization_percent
        )}%)`
    )
    .join(' • ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header & Summary Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {cropTitle} • {formatNumber(plan.total_kg)} {t('units.kg')}
            </span>
            <span className="text-xs text-slate-500">
              {plan.origin.name} → {plan.destination.name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('results.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{t('results.subtitle')}</p>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs sm:text-sm shadow-2xs transition-colors self-start md:self-auto cursor-pointer"
        >
          <ExternalLink className="w-4 h-4 text-emerald-700" />
          <span>{t('results.btn_open_google_maps')}</span>
        </a>
      </div>

      {/* Truck Allocation Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <h2 className="text-base font-bold">
              {t('results.truck_banner', {
                count: formatNumber(plan.truck_breakdown.trucks_needed),
                details: '',
              })}
            </h2>
            <p className="text-xs text-emerald-200 mt-0.5 font-medium">{truckDetails}</p>
          </div>
        </div>
      </div>

      {/* Notice banner if live traffic is not active */}
      {!activeRoute.traffic_is_live && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{t('results.no_live_traffic_banner')}</span>
        </div>
      )}

      {/* 2. Map and Recommended Route Card Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Interactive Map */}
        <div className="lg:col-span-7 space-y-4">
          <LeafletMap
            origin={plan.origin}
            destination={plan.destination}
            routes={plan.routes}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(id) => setSelectedRouteId(id)}
            heightClass="h-[460px]"
          />

          {/* Route selector buttons for keyboard accessibility */}
          <div className="flex flex-wrap items-center gap-2 pt-1" role="tablist">
            {plan.routes.map((r) => {
              const isSelected = r.id === selectedRouteId;
              const isRec = r.id === plan.recommended_route_id;
              return (
                <button
                  key={r.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedRouteId(r.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-500'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isRec && <Award className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{r.id}: {r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: Recommendation & Why this route Card */}
        <div className="lg:col-span-5 space-y-5">
          {/* Recommendation Card */}
          <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                <Award className="w-4 h-4 text-emerald-700" />
                {t('results.recommended_badge')} ({recommendedRoute.id})
              </span>
              <span className="text-xl font-black text-emerald-800">
                {recommendedRoute.score}/100
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {recommendedRoute.name}
            </h3>

            {/* Trade-off Explanation Sentence */}
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
              {t('tradeoff.explanation', {
                recommended: recommendedRoute.id,
                extra_cost: formatCurrency(plan.tradeoff.extra_cost_inr),
                loss_savings: formatCurrency(plan.tradeoff.loss_savings_inr),
                time_savings: formatDuration(plan.tradeoff.time_savings_min),
              })}
            </p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="text-slate-500 mb-0.5">{t('results.col_distance')}</p>
                <p className="font-bold text-slate-900 text-sm">
                  {formatDistance(recommendedRoute.distance_km)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="text-slate-500 mb-0.5">{t('results.col_duration')}</p>
                <p className="font-bold text-slate-900 text-sm">
                  {formatDuration(recommendedRoute.duration_min)}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <p className="text-slate-500 mb-0.5">{t('results.col_transport_cost')}</p>
                <p className="font-bold text-slate-900 text-sm">
                  {formatCurrency(recommendedRoute.transport_cost_inr)}
                </p>
              </div>
              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-200/80">
                <p className="text-rose-700 mb-0.5">{t('results.col_spoilage_loss')}</p>
                <p className="font-bold text-rose-950 text-sm">
                  {formatCurrency(recommendedRoute.expected_loss_inr)}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-950">
                {t('results.col_total_cost')}
              </span>
              <span className="text-base font-extrabold text-emerald-900">
                {formatCurrency(recommendedRoute.total_economic_cost_inr)}
              </span>
            </div>
          </div>

          {/* "Why This Route?" Factor Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {t('results.why_title')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{t('results.why_subtitle')}</p>

            {/* Horizontal Stacked Bar */}
            <div className="w-full h-4 rounded-full overflow-hidden flex mb-4 bg-slate-100 shadow-inner">
              <div
                style={{ width: `${recommendedRoute.weight_contributions.time * 100}%` }}
                className="bg-sky-600 h-full"
                title={t('results.factor_time')}
              />
              <div
                style={{ width: `${recommendedRoute.weight_contributions.spoilage * 100}%` }}
                className="bg-rose-600 h-full"
                title={t('results.factor_spoilage')}
              />
              <div
                style={{ width: `${recommendedRoute.weight_contributions.cost * 100}%` }}
                className="bg-amber-600 h-full"
                title={t('results.factor_cost')}
              />
              <div
                style={{ width: `${recommendedRoute.weight_contributions.traffic * 100}%` }}
                className="bg-indigo-600 h-full"
                title={t('results.factor_traffic')}
              />
            </div>

            {/* Factor Labels */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-600 shrink-0" />
                <span className="text-slate-700">
                  {t('results.factor_time')} ({Math.round(recommendedRoute.weight_contributions.time * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 shrink-0" />
                <span className="text-slate-700">
                  {t('results.factor_spoilage')} ({Math.round(recommendedRoute.weight_contributions.spoilage * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 shrink-0" />
                <span className="text-slate-700">
                  {t('results.factor_cost')} ({Math.round(recommendedRoute.weight_contributions.cost * 100)}%)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 shrink-0" />
                <span className="text-slate-700">
                  {t('results.factor_traffic')} ({Math.round(recommendedRoute.weight_contributions.traffic * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">{t('results.comparison_title')}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">{t('results.col_route')}</th>
                <th className="py-3 px-4">{t('results.col_distance')}</th>
                <th className="py-3 px-4">{t('results.col_duration')}</th>
                <th className="py-3 px-4">{t('results.col_traffic_delay')}</th>
                <th className="py-3 px-4">{t('results.col_transport_cost')}</th>
                <th className="py-3 px-4">{t('results.col_spoilage_loss')}</th>
                <th className="py-3 px-4">{t('results.col_total_cost')}</th>
                <th className="py-3 px-4">{t('results.col_score')}</th>
                <th className="py-3 px-4 text-right">{t('results.col_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.routes.map((r) => {
                const isSelected = r.id === selectedRouteId;
                const isRec = r.id === plan.recommended_route_id;

                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRouteId(r.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/70 font-medium' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {isRec && (
                          <span className="p-1 rounded bg-amber-100 text-amber-800" title={t('results.recommended_badge')}>
                            <Award className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span>{r.id}: {r.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{formatDistance(r.distance_km)}</td>
                    <td className="py-3.5 px-4">{formatDuration(r.duration_min)}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDuration(r.traffic_delay_min)} ({t('results.estimated_badge')})
                    </td>
                    <td className="py-3.5 px-4">{formatCurrency(r.transport_cost_inr)}</td>
                    <td className="py-3.5 px-4 text-rose-700">
                      {formatCurrency(r.expected_loss_inr)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(r.total_economic_cost_inr)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                        isRec ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.score}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRouteId(r.id);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {t('results.col_action')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Turn-by-Turn Navigation Steps (Expandable) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm">
              {showSteps
                ? t('results.steps_hide')
                : t('results.steps_show', { count: formatNumber(activeRoute.steps.length) })}
            </span>
            <span className="text-xs text-slate-500">({activeRoute.id})</span>
          </div>
          {showSteps ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showSteps && (
          <div className="px-6 pb-6 pt-2 border-t border-slate-100">
            <ol className="relative border-l border-slate-200 ml-3 space-y-4">
              {activeRoute.steps.map((st, idx) => (
                <li key={idx} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 w-3 h-3 bg-emerald-600 rounded-full border-2 border-white" />
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    {st.instruction}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDistance(st.distance_m / 1000)} • {formatDuration(Math.round(st.duration_sec / 60))}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* 5. Model Assumptions Panel */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {t('results.assumptions_title')}
          </h3>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>{t('results.assumptions_edit')}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-700">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            {t('results.assumption_fuel_price', {
              val: `${formatCurrency(plan.assumptions.fuel_price_per_litre)} / ${t('units.per_litre')}`,
            })}
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            {t('results.assumption_wholesale', {
              val: `${formatCurrency(plan.assumptions.wholesale_price_per_kg)} / ${t('units.kg')}`,
            })}
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            {t('results.assumption_base_rate', {
              val: plan.assumptions.base_spoilage_rate,
            })}
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            {t('results.assumption_temp_factor', {
              val: plan.assumptions.temp_factor,
            })}
          </div>
        </div>

        <p className="text-xs text-slate-500 italic pt-1">{t('results.disclaimer')}</p>
      </div>
    </div>
  );
}
