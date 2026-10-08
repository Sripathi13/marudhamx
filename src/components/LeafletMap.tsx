import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { RouteCandidate } from '../types.ts';
import { generateTrafficSegments } from '../utils/trafficSegments.ts';
import { calculateSpeedTimeline } from '../utils/speedAdvisory.ts';

interface LeafletMapProps {
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string };
  routes: RouteCandidate[];
  selectedRouteId: string;
  onSelectRoute?: (routeId: string) => void;
  selectedPeriodIndex?: number | null;
  onSelectPeriodIndex?: (periodIndex: number | null) => void;
  cropCategory?: string;
  heightClass?: string;
}

export default function LeafletMap({
  origin,
  destination,
  routes,
  selectedRouteId,
  onSelectRoute,
  selectedPeriodIndex,
  onSelectPeriodIndex,
  cropCategory = 'highly_perishable',
  heightClass = 'h-[480px]',
}: LeafletMapProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.FeatureGroup | null>(null);
  const [showSpeedBadges, setShowSpeedBadges] = useState<boolean>(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [origin.lat, origin.lng],
      zoom: 10,
      attributionControl: false,
    });

    // Custom attribution
    L.control
      .attribution({
        prefix: false,
      })
      .addAttribution(t('map.layer_attribution'))
      .addTo(map);

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.featureGroup().addTo(map);
    layersGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers, Routes, Traffic Segments, and Feasible Speed Badges
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layersGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Origin Marker (Green pin)
    const originIcon = L.divIcon({
      className: 'custom-map-pin origin-pin',
      html: `
        <div style="background-color: #047857; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 8px -1px rgba(0,0,0,0.35); border: 2.5px solid white; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
          <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });

    L.marker([origin.lat, origin.lng], { icon: originIcon })
      .bindPopup(`<strong>${t('map.pickup_point')}</strong><br/>${origin.name || ''}`)
      .addTo(layerGroup);

    // 2. Destination Marker (Red pin)
    const destIcon = L.divIcon({
      className: 'custom-map-pin dest-pin',
      html: `
        <div style="background-color: #dc2626; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 8px -1px rgba(0,0,0,0.35); border: 2.5px solid white; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
          <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -34],
    });

    L.marker([destination.lat, destination.lng], { icon: destIcon })
      .bindPopup(`<strong>${t('map.delivery_point')}</strong><br/>${destination.name || ''}`)
      .addTo(layerGroup);

    // 3. Draw Routes
    // Draw unselected routes first, and selected route last so it renders prominently on top
    const sortedRoutes = [...routes].sort((a, b) => {
      if (a.id === selectedRouteId) return 1;
      if (b.id === selectedRouteId) return -1;
      return 0;
    });

    sortedRoutes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const baseOpacity = isSelected ? 1.0 : 0.40;
      const baseWeight = isSelected ? 8 : 4;

      // Extract or compute traffic segments:
      // Red: Congestion / Traffic Jam
      // Yellow: Mild / Slow Traffic
      // Green: Normal / Free-flowing Traffic
      let segments =
        route.geometry_segments &&
        route.geometry_segments.length > 1 &&
        route.geometry_segments[0].speed !== 'UNKNOWN'
          ? route.geometry_segments
          : generateTrafficSegments(
              route.geometry,
              routes.findIndex((r) => r.id === route.id)
            );

      // Add a dark underlay casing for selected route to enhance contrast against map tiles
      if (isSelected) {
        const casing = L.polyline(route.geometry, {
          color: '#0f172a',
          weight: baseWeight + 4,
          opacity: 0.65,
          smoothFactor: 1,
        });
        casing.addTo(layerGroup);
      }

      segments.forEach((seg, sIdx) => {
        let color = '#16a34a'; // Vibrant Green (Normal Traffic)
        let trafficLabel = t('map.legend_normal');

        if (seg.speed === 'TRAFFIC_JAM') {
          color = isSelected ? '#ef4444' : '#f87171'; // Red (Heavy Traffic Jam / Bottleneck)
          trafficLabel = t('map.legend_heavy');
        } else if (seg.speed === 'SLOW') {
          color = isSelected ? '#f59e0b' : '#fbbf24'; // Yellow/Amber (Mild Traffic / Slowdown)
          trafficLabel = t('map.legend_slow');
        } else if (seg.speed === 'NORMAL') {
          color = isSelected ? '#16a34a' : '#4ade80'; // Green (Free Flow)
          trafficLabel = t('map.legend_normal');
        }

        const poly = L.polyline(seg.coords, {
          color,
          weight: baseWeight,
          opacity: baseOpacity,
          smoothFactor: 1,
        });

        poly.on('click', () => {
          if (onSelectRoute) onSelectRoute(route.id);
          if (onSelectPeriodIndex) {
            // Map segment index to period index (1 to 5)
            const periodIdx = Math.min(5, sIdx + 1);
            onSelectPeriodIndex(periodIdx);
          }
        });

        poly.bindTooltip(
          `<strong>${route.id}: ${route.name}</strong><br/>` +
            `${route.distance_km} ${t('units.km')} • ${route.duration_min} ${t('units.min')}<br/>` +
            `<span style="color:${color};font-weight:700;">● ${trafficLabel}</span>`,
          { sticky: true }
        );

        poly.addTo(layerGroup);
      });

      // 4. If this is the active selected route, render interactive Feasible Speed Waypoint Badges along the corridor
      if (isSelected && showSpeedBadges) {
        const { periods } = calculateSpeedTimeline(route, cropCategory);

        periods.forEach((p) => {
          const isPeriodSelected = selectedPeriodIndex === p.periodIndex;
          const isJam = p.trafficLevel === 'TRAFFIC_JAM';
          const isSlow = p.trafficLevel === 'SLOW';

          const badgeBg = isJam
            ? 'background: #dc2626; color: #ffffff;'
            : isSlow
            ? 'background: #f59e0b; color: #0f172a;'
            : 'background: #16a34a; color: #ffffff;';

          const ringClass = isPeriodSelected
            ? 'box-shadow: 0 0 0 3px #0f172a, 0 4px 10px rgba(0,0,0,0.5); transform: scale(1.15);'
            : 'box-shadow: 0 2px 6px rgba(0,0,0,0.3);';

          const dot = isJam ? '🔴' : isSlow ? '🟡' : '🟢';

          const speedBadgeIcon = L.divIcon({
            className: 'custom-speed-badge-marker',
            html: `
              <div style="${badgeBg} ${ringClass} font-family: ui-sans-serif, system-ui, sans-serif; font-size: 11px; font-weight: 800; border-radius: 9999px; padding: 3px 8px; border: 2px solid white; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; cursor: pointer; transition: transform 0.15s ease;">
                <span>${dot}</span>
                <span>${p.feasibleSpeedKmph} km/h</span>
              </div>
            `,
            iconSize: [80, 24],
            iconAnchor: [40, 12],
            popupAnchor: [0, -14],
          });

          const marker = L.marker([p.midpointCoord[0], p.midpointCoord[1]], {
            icon: speedBadgeIcon,
          });

          marker.on('click', () => {
            if (onSelectPeriodIndex) {
              onSelectPeriodIndex(selectedPeriodIndex === p.periodIndex ? null : p.periodIndex);
            }
          });

          const popupContent = `
            <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
              <div style="font-weight: 800; color: #0f172a; margin-bottom: 3px; font-size: 13px;">
                ${p.periodIndex}. ${p.stretchName[currentLang] || p.stretchName.en}
              </div>
              <div style="color: #475569; margin-bottom: 6px;">
                ⏱ ${p.timeRange} (${p.distanceKm} km)
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="font-weight: 700; font-size: 14px; color: ${isJam ? '#dc2626' : isSlow ? '#d97706' : '#16a34a'};">
                  ${p.feasibleSpeedKmph} km/h
                </span>
                <span style="font-size: 11px; color: #64748b;">(${p.speedRange})</span>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 6px; font-size: 11px; color: #334155;">
                🛡️ ${p.cargoSafetyAdvice[currentLang] || p.cargoSafetyAdvice.en}
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.addTo(layerGroup);
        });

        // 5. If a period is highlighted, add an animated pulse highlight on its stretch
        if (selectedPeriodIndex) {
          const selectedPeriod = periods.find((p) => p.periodIndex === selectedPeriodIndex);
          if (selectedPeriod && selectedPeriod.coords && selectedPeriod.coords.length >= 2) {
            const highlightGlow = L.polyline(selectedPeriod.coords, {
              color: '#38bdf8',
              weight: baseWeight + 8,
              opacity: 0.75,
              smoothFactor: 1,
            });
            highlightGlow.addTo(layerGroup);

            const highlightCore = L.polyline(selectedPeriod.coords, {
              color: '#ffffff',
              weight: baseWeight + 2,
              opacity: 0.95,
              smoothFactor: 1,
            });
            highlightCore.addTo(layerGroup);
          }
        }
      }
    });

    // Fit bounds smoothly with margin
    const bounds = layerGroup.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [
    origin,
    destination,
    routes,
    selectedRouteId,
    selectedPeriodIndex,
    showSpeedBadges,
    cropCategory,
    currentLang,
    t,
  ]);

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const { stats } = calculateSpeedTimeline(activeRoute, cropCategory);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} />

      {/* Traffic & Map Legend Overlay with Badges Toggle */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl p-3 border border-slate-200/80 shadow-md text-xs pointer-events-auto max-w-xs sm:max-w-sm">
        <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-100">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <span>{t('map.legend_title')}</span>
          </p>
          <button
            type="button"
            onClick={() => setShowSpeedBadges(!showSpeedBadges)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer border ${
              showSpeedBadges
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {showSpeedBadges ? '✓ Speeds Shown' : 'Show Speeds'}
          </button>
        </div>

        {/* Multi-color traffic indicators */}
        <div className="space-y-1.5 font-medium">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-2.5 bg-emerald-600 rounded-full inline-block shadow-2xs"></span>
              <span className="text-slate-800 font-semibold">{t('map.legend_normal')}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-bold">{stats.freeFlowPercentage}% flow</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-2.5 bg-amber-500 rounded-full inline-block shadow-2xs"></span>
              <span className="text-slate-800 font-semibold">{t('map.legend_slow')}</span>
            </div>
            <span className="text-[11px] text-amber-700 font-bold">~30 km/h</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-2.5 bg-rose-600 rounded-full inline-block shadow-2xs"></span>
              <span className="text-slate-800 font-semibold">{t('map.legend_heavy')}</span>
            </div>
            <span className="text-[11px] text-rose-700 font-bold">{stats.minBottleneckSpeedKmph} km/h min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
