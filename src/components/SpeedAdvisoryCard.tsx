import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gauge,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Zap,
  MapPin,
  TrendingDown,
  Activity,
  LocateFixed,
  Filter
} from 'lucide-react';
import { RouteCandidate } from '../types.ts';
import { calculateSpeedTimeline } from '../utils/speedAdvisory.ts';

interface SpeedAdvisoryCardProps {
  route: RouteCandidate;
  cropCategory?: string;
  selectedPeriodIndex?: number | null;
  onSelectPeriodIndex?: (index: number | null) => void;
}

export default function SpeedAdvisoryCard({
  route,
  cropCategory = 'highly_perishable',
  selectedPeriodIndex: externalSelectedPeriodIndex,
  onSelectPeriodIndex: externalOnSelectPeriodIndex,
}: SpeedAdvisoryCardProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'HEAVY' | 'SLOW' | 'NORMAL'>('ALL');

  const selectedIndex =
    externalSelectedPeriodIndex !== undefined
      ? externalSelectedPeriodIndex
      : internalSelectedIndex;

  const handleSelectPeriod = (index: number | null) => {
    if (externalOnSelectPeriodIndex) {
      externalOnSelectPeriodIndex(index);
    } else {
      setInternalSelectedIndex(index);
    }
  };

  const { periods, stats } = calculateSpeedTimeline(route, cropCategory);

  // Filter periods if user clicks filter chips
  const filteredPeriods = periods.filter((p) => {
    if (filterMode === 'HEAVY') return p.trafficLevel === 'TRAFFIC_JAM';
    if (filterMode === 'SLOW') return p.trafficLevel === 'SLOW';
    if (filterMode === 'NORMAL') return p.trafficLevel === 'NORMAL';
    return true;
  });

  // Calculate SVG curve dimensions
  const svgWidth = 800;
  const svgHeight = 160;
  const paddingX = 40;
  const paddingY = 25;
  const plotWidth = svgWidth - paddingX * 2;
  const plotHeight = svgHeight - paddingY * 2;

  const maxSpeedReference = 80; // km/h max scale
  const points = periods.map((p) => {
    const midMin = (p.startMin + p.endMin) / 2;
    const x = paddingX + (midMin / stats.totalDurationMin) * plotWidth;
    const y = svgHeight - paddingY - (p.feasibleSpeedKmph / maxSpeedReference) * plotHeight;
    return { x, y, speed: p.feasibleSpeedKmph, period: p };
  });

  // Build SVG path
  let pathD = `M ${paddingX} ${svgHeight - paddingY - (periods[0].feasibleSpeedKmph / maxSpeedReference) * plotHeight}`;
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    pathD += ` L ${pt.x} ${pt.y}`;
  }
  pathD += ` L ${svgWidth - paddingX} ${points[points.length - 1].y}`;

  // Area under curve path
  const areaD = `${pathD} L ${svgWidth - paddingX} ${svgHeight - paddingY} L ${paddingX} ${svgHeight - paddingY} Z`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      {/* 1. Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/60 via-slate-50 to-amber-50/30">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
              <Gauge className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              {t('speed_advisory.title')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-900">
              {route.id}: {route.name}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {t('speed_advisory.subtitle')}
          </p>
        </div>

        {/* Route Duration & Distance Pill */}
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          <span className="flex items-center gap-1 text-emerald-800">
            <Clock className="w-3.5 h-3.5" />
            {route.duration_min} {t('units.min')}
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {route.distance_km} {t('units.km')}
          </span>
        </div>
      </div>

      {/* 2. KPI Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            {t('speed_advisory.stat_avg_speed')}
          </p>
          <p className="text-xl font-extrabold text-slate-900">
            {stats.averageFeasibleSpeedKmph}{' '}
            <span className="text-xs font-semibold text-slate-500">km/h</span>
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-sky-600" />
            {t('speed_advisory.stat_max_speed')}
          </p>
          <p className="text-xl font-extrabold text-sky-700">
            {stats.maxFeasibleSpeedKmph}{' '}
            <span className="text-xs font-semibold text-slate-500">km/h</span>
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            {t('speed_advisory.stat_bottleneck_speed')}
          </p>
          <p className="text-xl font-extrabold text-rose-600">
            {stats.minBottleneckSpeedKmph}{' '}
            <span className="text-xs font-semibold text-slate-500">km/h</span>
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {t('speed_advisory.stat_freeflow')}
          </p>
          <p className="text-xl font-extrabold text-emerald-700">
            {stats.freeFlowPercentage}%
          </p>
        </div>
      </div>

      {/* 3. Feasible Speed Profile Curve (Speed vs Transit Timeline Chart) */}
      <div className="p-6 border-b border-slate-100 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-700" />
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              {t('speed_advisory.curve_title')}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            0 → {route.duration_min} {t('units.min')} ({route.distance_km} {t('units.km')})
          </span>
        </div>

        {/* SVG Speed vs Time Curve */}
        <div className="w-full bg-slate-50 rounded-xl p-3 border border-slate-200 overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-36 min-w-[500px]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="speedAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.10" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guidelines */}
            <line
              x1={paddingX}
              y1={svgHeight - paddingY - (20 / maxSpeedReference) * plotHeight}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY - (20 / maxSpeedReference) * plotHeight}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={svgHeight - paddingY - (40 / maxSpeedReference) * plotHeight}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY - (40 / maxSpeedReference) * plotHeight}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <line
              x1={paddingX}
              y1={svgHeight - paddingY - (60 / maxSpeedReference) * plotHeight}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingY - (60 / maxSpeedReference) * plotHeight}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />

            {/* Left Y-axis labels */}
            <text x={paddingX - 8} y={svgHeight - paddingY - (20 / maxSpeedReference) * plotHeight + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">20</text>
            <text x={paddingX - 8} y={svgHeight - paddingY - (40 / maxSpeedReference) * plotHeight + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">40</text>
            <text x={paddingX - 8} y={svgHeight - paddingY - (60 / maxSpeedReference) * plotHeight + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">60</text>

            {/* Shaded Area under Curve */}
            <path d={areaD} fill="url(#speedAreaGradient)" />

            {/* Speed Curve Stroke */}
            <path
              d={pathD}
              fill="none"
              stroke="#0f766e"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Data Point Dots */}
            {points.map((pt) => {
              const isSelected = selectedIndex === pt.period.periodIndex;
              const isJam = pt.period.trafficLevel === 'TRAFFIC_JAM';
              const isSlow = pt.period.trafficLevel === 'SLOW';
              const dotColor = isJam ? '#ef4444' : isSlow ? '#f59e0b' : '#10b981';

              return (
                <g
                  key={pt.period.periodIndex}
                  onClick={() => handleSelectPeriod(isSelected ? null : pt.period.periodIndex)}
                  className="cursor-pointer transition-transform"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 7 : 5}
                    fill={dotColor}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="12"
                      fill="none"
                      stroke={dotColor}
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  )}
                  {/* Speed text label on top of point */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill={isJam ? '#dc2626' : isSlow ? '#d97706' : '#047857'}
                  >
                    {pt.speed} km/h
                  </text>
                  {/* Period badge below */}
                  <text
                    x={pt.x}
                    y={svgHeight - paddingY + 16}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#64748b"
                  >
                    P{pt.period.periodIndex} ({pt.period.durationMin}m)
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 4. Proportional Segment Timeline Bar */}
        <div className="mt-4">
          <div className="w-full h-8 rounded-xl overflow-hidden flex bg-slate-100 p-1 gap-1 border border-slate-200 shadow-inner">
            {periods.map((p) => {
              const widthPercent = (p.durationMin / stats.totalDurationMin) * 100;
              const isJam = p.trafficLevel === 'TRAFFIC_JAM';
              const isSlow = p.trafficLevel === 'SLOW';
              const isSelected = selectedIndex === p.periodIndex;

              const bgClass = isJam
                ? 'bg-rose-500 text-white'
                : isSlow
                ? 'bg-amber-400 text-slate-900'
                : 'bg-emerald-600 text-white';

              return (
                <button
                  key={p.periodIndex}
                  type="button"
                  onClick={() => handleSelectPeriod(isSelected ? null : p.periodIndex)}
                  style={{ width: `${widthPercent}%` }}
                  className={`h-full rounded-lg transition-all flex items-center justify-center text-xs font-extrabold overflow-hidden px-1 cursor-pointer hover:opacity-95 ${bgClass} ${
                    isSelected ? 'ring-3 ring-slate-900 ring-offset-1 scale-[1.02]' : ''
                  }`}
                  title={`${p.timeRange}: ${p.feasibleSpeedKmph} km/h (${p.stretchName[currentLang] || p.stretchName.en})`}
                >
                  <span className="truncate">{p.feasibleSpeedKmph} km/h</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-0.5">
            <span>00:00 (0m) Origin</span>
            <span>Mid-Corridor</span>
            <span>Destination ({route.duration_min}m)</span>
          </div>
        </div>
      </div>

      {/* 5. Filter Chips */}
      <div className="p-4 sm:px-6 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              filterMode === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {t('speed_advisory.filter_all')} ({periods.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('HEAVY')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              filterMode === 'HEAVY'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
            }`}
          >
            🔴 {t('speed_advisory.filter_heavy')} ({periods.filter((p) => p.trafficLevel === 'TRAFFIC_JAM').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('SLOW')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              filterMode === 'SLOW'
                ? 'bg-amber-500 text-slate-950 border-amber-500'
                : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
            }`}
          >
            🟡 {t('speed_advisory.filter_slow')} ({periods.filter((p) => p.trafficLevel === 'SLOW').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('NORMAL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
              filterMode === 'NORMAL'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            🟢 {t('speed_advisory.filter_normal')} ({periods.filter((p) => p.trafficLevel === 'NORMAL').length})
          </button>
        </div>
      </div>

      {/* 6. Period-by-Period Comprehensive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-3 px-4">{t('speed_advisory.col_period')}</th>
              <th className="py-3 px-4">{t('speed_advisory.col_stretch')}</th>
              <th className="py-3 px-4">{t('speed_advisory.col_traffic')}</th>
              <th className="py-3 px-4">{t('speed_advisory.col_speed')}</th>
              <th className="py-3 px-4">{t('speed_advisory.col_distance')}</th>
              <th className="py-3 px-4">{t('speed_advisory.col_cargo_advice')}</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPeriods.map((p) => {
              const isJam = p.trafficLevel === 'TRAFFIC_JAM';
              const isSlow = p.trafficLevel === 'SLOW';
              const isSelected = selectedIndex === p.periodIndex;

              const badgeColor = isJam
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : isSlow
                ? 'bg-amber-100 text-amber-900 border-amber-200'
                : 'bg-emerald-100 text-emerald-800 border-emerald-200';

              const barColor = isJam
                ? 'bg-rose-500'
                : isSlow
                ? 'bg-amber-400'
                : 'bg-emerald-600';

              return (
                <tr
                  key={p.periodIndex}
                  onClick={() => handleSelectPeriod(isSelected ? null : p.periodIndex)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/90 font-medium ring-1 ring-inset ring-emerald-300'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Period & Time Range */}
                  <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                          isSelected
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {p.periodIndex}
                      </span>
                      <div>
                        <div>{p.timeRange}</div>
                        <div className="text-[11px] text-slate-500 font-normal">
                          +{p.startMin}m → +{p.endMin}m ({p.durationMin}m)
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Stretch & Road Type */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="font-bold text-slate-800">
                      {p.stretchName[currentLang] || p.stretchName.en}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.roadType[currentLang] || p.roadType.en}
                    </p>
                  </td>

                  {/* Traffic Level Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badgeColor}`}
                    >
                      {isJam
                        ? `● ${t('map.legend_heavy')}`
                        : isSlow
                        ? `● ${t('map.legend_slow')}`
                        : `● ${t('map.legend_normal')}`}
                    </span>
                  </td>

                  {/* Feasible Speed + Visual Bar */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-extrabold text-slate-900">
                            {p.feasibleSpeedKmph}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">km/h</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.speedRange}
                        </div>
                      </div>
                      <div className="w-14 h-2 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        <div
                          style={{ width: `${p.speedPercentage}%` }}
                          className={`h-full rounded-full ${barColor}`}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Distance */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-semibold text-slate-800">{p.distanceKm} km</span>
                    <span className="text-xs text-slate-500 block">
                      (Σ {p.cumulativeKm} km)
                    </span>
                  </td>

                  {/* Produce Safety Advice */}
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="flex items-start gap-1.5 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{p.cargoSafetyAdvice[currentLang] || p.cargoSafetyAdvice.en}</span>
                    </div>
                  </td>

                  {/* Locate on Map Button */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPeriod(isSelected ? null : p.periodIndex);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <LocateFixed className="w-3.5 h-3.5" />
                      <span>{t('speed_advisory.btn_locate')}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 7. Bottom Produce Protection Explanation Note */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex items-start gap-2">
        <TrendingDown className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {t('speed_advisory.explanation_note')}
        </p>
      </div>
    </div>
  );
}
