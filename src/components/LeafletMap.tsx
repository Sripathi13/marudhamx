import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { RouteCandidate, RoadStretch } from '../types';
import { formatDistance, formatDuration, formatSpeed } from '../utils/formatters';

interface LeafletMapProps {
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string };
  routes: RouteCandidate[];
  selectedRouteId: string;
  onSelectRoute?: (routeId: string) => void;
  onSelectStretch?: (stretch: RoadStretch) => void;
  selectedStretchId?: string | null;
  heightClass?: string;
}

export default function LeafletMap({
  origin,
  destination,
  routes,
  selectedRouteId,
  onSelectRoute,
  onSelectStretch,
  selectedStretchId,
  heightClass = 'h-[480px]',
}: LeafletMapProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.FeatureGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [origin.lat, origin.lng],
      zoom: 10,
      attributionControl: false,
    });

    L.control
      .attribution({
        prefix: false,
      })
      .addAttribution(t('map.layer_attribution'))
      .addTo(map);

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

  // Update Markers & Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layersGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Origin Marker (Green pin)
    const originIcon = L.divIcon({
      className: 'custom-map-pin origin-pin',
      html: `
        <div style="background-color: #047857; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    L.marker([origin.lat, origin.lng], { icon: originIcon })
      .bindPopup(`<strong>${t('map.pickup_point')}</strong><br/>${origin.name || ''}`)
      .addTo(layerGroup);

    // 2. Destination Marker (Red pin)
    const destIcon = L.divIcon({
      className: 'custom-map-pin dest-pin',
      html: `
        <div style="background-color: #b91c1c; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

    L.marker([destination.lat, destination.lng], { icon: destIcon })
      .bindPopup(`<strong>${t('map.delivery_point')}</strong><br/>${destination.name || ''}`)
      .addTo(layerGroup);

    // 3. Draw Routes
    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const baseOpacity = isSelected ? 0.95 : 0.35;
      const baseWeight = isSelected ? 6 : 4;

      if (isSelected && route.stretches && route.stretches.length > 0) {
        // Draw individual road stretches with speed band colors
        route.stretches.forEach((stretch) => {
          const isStretchActive = selectedStretchId === stretch.id;

          let color = '#059669'; // High speed (>50 km/h)
          if (stretch.speed_band === 'medium') color = '#d97706'; // 30-50 km/h
          if (stretch.speed_band === 'low') color = '#dc2626'; // <30 km/h

          const poly = L.polyline(stretch.coords, {
            color,
            weight: isStretchActive ? 9 : baseWeight,
            opacity: baseOpacity,
            smoothFactor: 1,
          });

          poly.on('click', () => {
            if (onSelectStretch) onSelectStretch(stretch);
          });

          const fromName = stretch.from_place[currentLang] || stretch.from_place.ta;
          const toName = stretch.to_place[currentLang] || stretch.to_place.ta;

          poly.bindTooltip(
            `#${stretch.stretch_index}: ${fromName} → ${toName} | ${formatSpeed(stretch.recommended_speed_kmh)} (${formatDistance(stretch.length_km)})`,
            { sticky: true }
          );

          poly.addTo(layerGroup);
        });
      } else {
        // Generic route rendering for non-selected routes or routes without stretches
        const segments = route.geometry_segments && route.geometry_segments.length > 0
          ? route.geometry_segments
          : [{ speed: 'NORMAL' as const, coords: route.geometry }];

        segments.forEach((seg) => {
          let color = isSelected ? '#059669' : '#64748b';
          if (seg.speed === 'SLOW') color = '#ea580c';
          if (seg.speed === 'TRAFFIC_JAM') color = '#dc2626';

          const poly = L.polyline(seg.coords, {
            color,
            weight: baseWeight,
            opacity: baseOpacity,
            dashArray: isSelected ? undefined : '6, 6',
            smoothFactor: 1,
          });

          poly.on('click', () => {
            if (onSelectRoute) onSelectRoute(route.id);
          });

          poly.bindTooltip(
            `${route.id} (${route.name}): ${formatDistance(route.distance_km)} • ${formatDuration(route.duration_min)}`,
            { sticky: true }
          );

          poly.addTo(layerGroup);
        });
      }
    });

    const bounds = layerGroup.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [origin, destination, routes, selectedRouteId, selectedStretchId, currentLang, t]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} />

      {/* Traffic & Speed Advisory Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl p-3 border border-slate-200/80 shadow-md text-xs pointer-events-auto max-w-[210px]">
        <p className="font-bold text-slate-900 mb-1.5">{t('map.legend_title')}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 bg-emerald-600 rounded-sm inline-block" />
            <span className="text-slate-700">{t('map.legend_speed_high')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 bg-amber-500 rounded-sm inline-block" />
            <span className="text-slate-700">{t('map.legend_speed_medium')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-2 bg-rose-600 rounded-full inline-block" />
            <span className="text-slate-700">{t('map.legend_speed_low')}</span>
          </div>
          <div className="pt-1 border-t border-slate-100 flex items-center gap-2">
            <span className="w-3.5 h-1 border-b-2 border-dashed border-slate-500 inline-block" />
            <span className="text-slate-500 text-[11px]">{t('map.legend_unknown')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
