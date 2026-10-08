import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import {
  Navigation,
  Volume2,
  VolumeX,
  Compass,
  X,
  Gauge,
  Clock,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  CornerUpRight,
  CornerUpLeft,
  RotateCw,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { RouteCandidate, NavigationManeuver, ManeuverType, PlanResponse } from '../types';
import { api } from '../services/api';
import { formatDistance, formatDuration, formatMeters, formatSpeed } from '../utils/formatters';

interface LiveNavigationModalProps {
  plan: PlanResponse;
  route: RouteCandidate;
  onClose: () => void;
}

export default function LiveNavigationModal({
  plan,
  route: initialRoute,
  onClose,
}: LiveNavigationModalProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  const [activeRoute, setActiveRoute] = useState<RouteCandidate>(initialRoute);
  const [currentPosition, setCurrentPosition] = useState<[number, number]>(
    initialRoute.geometry[0] || [plan.origin.lat, plan.origin.lng]
  );
  const [heading, setHeading] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(45);
  const [rotationMode, setRotationMode] = useState<'heading_up' | 'north_up'>('heading_up');
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(true);

  // Manoeuvre & Progress
  const [activeManeuverIdx, setActiveManeuverIdx] = useState<number>(0);
  const [distanceToManeuver, setDistanceToManeuver] = useState<number>(350);
  const [remainingDistKm, setRemainingDistKm] = useState<number>(initialRoute.distance_km);
  const [remainingDurationMin, setRemainingDurationMin] = useState<number>(initialRoute.duration_min);
  const [currentStretchIdx, setCurrentStretchIdx] = useState<number>(0);

  // States for alerts
  const [isOffRoute, setIsOffRoute] = useState<boolean>(false);
  const [offRouteSeconds, setOffRouteSeconds] = useState<number>(0);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [recalculatedBanner, setRecalculatedBanner] = useState<boolean>(false);
  const [hasArrived, setHasArrived] = useState<boolean>(false);

  // Simulation mode
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const simStepRef = useRef<number>(0);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineAheadRef = useRef<L.Polyline | null>(null);
  const routePolylineBehindRef = useRef<L.Polyline | null>(null);

  // Voice speech synthesis
  const lastSpokenManeuverRef = useRef<number>(-1);

  const speakInstruction = (text: string) => {
    if (isVoiceMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (currentLang === 'ta') utterance.lang = 'ta-IN';
      else if (currentLang === 'hi') utterance.lang = 'hi-IN';
      else utterance.lang = 'en-US';

      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Screen WakeLock
  useEffect(() => {
    let wakeLockSentinel: any = null;
    if ('wakeLock' in navigator && isWakeLockActive) {
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLockSentinel = lock;
      }).catch(() => {
        // WakeLock request denied/unsupported
      });
    }
    return () => {
      if (wakeLockSentinel) wakeLockSentinel.release();
    };
  }, [isWakeLockActive]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: currentPosition,
      zoom: 16,
      attributionControl: false,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Truck Icon with arrow
    const truckIcon = L.divIcon({
      className: 'custom-nav-truck',
      html: `
        <div id="truck-heading-indicator" style="transform: rotate(${heading}deg); transition: transform 0.3s ease; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="background-color: #0284c7; color: white; border-radius: 9999px; padding: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 3px solid white; display: flex; align-items: center; justify-content: center;">
            <svg style="width: 22px; height: 22px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polygon points="12 2 19 21 12 17 5 21 12 2" fill="currentColor"></polygon>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const vMarker = L.marker(currentPosition, { icon: truckIcon, zIndexOffset: 1000 }).addTo(map);
    vehicleMarkerRef.current = vMarker;

    // Ahead polyline (bright emerald green)
    const polyAhead = L.polyline(activeRoute.geometry, {
      color: '#059669',
      weight: 7,
      opacity: 0.95,
      lineCap: 'round',
    }).addTo(map);
    routePolylineAheadRef.current = polyAhead;

    // Travelled polyline (faded grey)
    const polyBehind = L.polyline([], {
      color: '#94a3b8',
      weight: 5,
      opacity: 0.5,
      dashArray: '6, 6',
    }).addTo(map);
    routePolylineBehindRef.current = polyBehind;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // Live Geolocation Watcher (when not in simulation mode)
  useEffect(() => {
    if (isSimulated || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const newPos: [number, number] = [lat, lng];
        const newHeading = pos.coords.heading || heading;
        const newSpeed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : speedKmh;

        updateNavigationPosition(newPos, newHeading, newSpeed);
      },
      () => {
        // Geolocation fallback
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSimulated, activeRoute]);

  // Function to update vehicle position and check off-route / arrival
  const updateNavigationPosition = (
    newPos: [number, number],
    newHeading: number,
    newSpeed: number
  ) => {
    setCurrentPosition(newPos);
    setHeading(newHeading);
    setSpeedKmh(newSpeed);

    // Update marker
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng(newPos);
      const indicator = document.getElementById('truck-heading-indicator');
      if (indicator) {
        indicator.style.transform = `rotate(${rotationMode === 'heading_up' ? 0 : newHeading}deg)`;
      }
    }

    // Pan map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo(newPos, { animate: true, duration: 0.5 });
    }

    // Distance to destination
    const dest = plan.destination;
    const distToDestKm = haversineDistanceKm(newPos[0], newPos[1], dest.lat, dest.lng);

    if (distToDestKm < 0.08) {
      handleArrival();
      return;
    }

    setRemainingDistKm(parseFloat(distToDestKm.toFixed(1)));
    setRemainingDurationMin(Math.max(1, Math.round((distToDestKm / Math.max(20, newSpeed)) * 60)));

    // Check distance to nearest point on route (off-route detection)
    let minDistanceToRouteMeters = 999999;
    let closestCoordIdx = 0;

    activeRoute.geometry.forEach((pt, idx) => {
      const d = haversineDistanceKm(newPos[0], newPos[1], pt[0], pt[1]) * 1000;
      if (d < minDistanceToRouteMeters) {
        minDistanceToRouteMeters = d;
        closestCoordIdx = idx;
      }
    });

    // Update ahead vs behind polyline
    if (routePolylineAheadRef.current && routePolylineBehindRef.current) {
      routePolylineAheadRef.current.setLatLngs(activeRoute.geometry.slice(closestCoordIdx));
      routePolylineBehindRef.current.setLatLngs(activeRoute.geometry.slice(0, closestCoordIdx + 1));
    }

    // Off-route check (> 50m)
    if (minDistanceToRouteMeters > 50) {
      setIsOffRoute(true);
      setOffRouteSeconds((prev) => {
        const next = prev + 1;
        if (next >= 10 && !recalculating) {
          triggerRecalculation(newPos);
          return 0;
        }
        return next;
      });
    } else {
      setIsOffRoute(false);
      setOffRouteSeconds(0);
    }

    // Update active stretch
    if (activeRoute.stretches && activeRoute.stretches.length > 0) {
      const stretchFraction = closestCoordIdx / Math.max(1, activeRoute.geometry.length);
      const sIdx = Math.min(
        activeRoute.stretches.length - 1,
        Math.floor(stretchFraction * activeRoute.stretches.length)
      );
      setCurrentStretchIdx(sIdx);
    }

    // Update active manoeuvre
    if (activeRoute.maneuvers && activeRoute.maneuvers.length > 0) {
      let nextMIdx = activeRoute.maneuvers.findIndex(
        (m) => haversineDistanceKm(newPos[0], newPos[1], m.location[0], m.location[1]) * 1000 > 30
      );
      if (nextMIdx === -1) nextMIdx = activeRoute.maneuvers.length - 1;

      setActiveManeuverIdx(nextMIdx);

      const targetManeuver = activeRoute.maneuvers[nextMIdx];
      const distM = Math.round(
        haversineDistanceKm(newPos[0], newPos[1], targetManeuver.location[0], targetManeuver.location[1]) * 1000
      );
      setDistanceToManeuver(distM);

      // Voice trigger
      if (lastSpokenManeuverRef.current !== nextMIdx && distM < 450) {
        lastSpokenManeuverRef.current = nextMIdx;
        const spokenText = `${t('navigation.distance_in_m', { distance: distM })} ${targetManeuver.instruction[currentLang] || targetManeuver.instruction.ta}`;
        speakInstruction(spokenText);
      }
    }
  };

  // Off-route trigger recalculation
  const triggerRecalculation = async (pos: [number, number]) => {
    setRecalculating(true);
    speakInstruction(t('navigation.off_route_alert'));

    try {
      const res = await api.recalculateRoute(activeRoute.id, pos[0], pos[1], plan.id);
      setActiveRoute((prev) => ({
        ...prev,
        geometry: res.geometry,
        distance_km: res.distance_km,
        duration_min: res.duration_min,
        maneuvers: res.maneuvers,
        stretches: res.stretches,
        speed_advisory_summary: res.speed_advisory_summary,
      }));

      if (routePolylineAheadRef.current) {
        routePolylineAheadRef.current.setLatLngs(res.geometry);
      }

      setRecalculatedBanner(true);
      setTimeout(() => setRecalculatedBanner(false), 5000);
      speakInstruction(t('navigation.route_recalculated'));
    } catch {
      // Fallback
    } finally {
      setRecalculating(false);
    }
  };

  // Arrival Handler
  const handleArrival = () => {
    if (hasArrived) return;
    setHasArrived(true);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    speakInstruction(t('navigation.arrived_title'));

    api.recordArrival(plan.id, {
      arrival_time: new Date().toISOString(),
      actual_duration_min: Math.max(1, Math.round(initialRoute.duration_min * 0.95)),
      actual_kg: plan.total_kg,
      notes: 'Completed via live turn-by-turn navigation',
    }).catch(console.error);
  };

  // Demo Simulation Driver
  const handleToggleSimulation = () => {
    if (isSimulated) {
      setIsSimulated(false);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    } else {
      setIsSimulated(true);
      simStepRef.current = 0;

      const geom = activeRoute.geometry;
      simIntervalRef.current = setInterval(() => {
        simStepRef.current++;
        if (simStepRef.current >= geom.length) {
          handleArrival();
          return;
        }

        const curr = geom[simStepRef.current];
        const prev = geom[Math.max(0, simStepRef.current - 1)];

        // Calculate heading bearing
        const dLon = (curr[1] - prev[1]) * (Math.PI / 180);
        const y = Math.sin(dLon) * Math.cos(curr[0] * (Math.PI / 180));
        const x =
          Math.cos(prev[0] * (Math.PI / 180)) * Math.sin(curr[0] * (Math.PI / 180)) -
          Math.sin(prev[0] * (Math.PI / 180)) * Math.cos(curr[0] * (Math.PI / 180)) * Math.cos(dLon);
        let brng = Math.atan2(y, x) * (180 / Math.PI);
        brng = (brng + 360) % 360;

        const currentStretch = activeRoute.stretches[currentStretchIdx] || activeRoute.stretches[0];
        const targetSpeed = currentStretch?.recommended_speed_kmh || 50;

        updateNavigationPosition(curr, Math.round(brng), targetSpeed);
      }, 1200);
    }
  };

  // Test drift off-route button (for judges demo)
  const handleSimulateOffRoute = () => {
    const drifted: [number, number] = [
      currentPosition[0] + 0.003, // ~330 meters away
      currentPosition[1] + 0.003,
    ];
    updateNavigationPosition(drifted, heading, speedKmh);
  };

  const currentManeuver =
    activeRoute.maneuvers && activeRoute.maneuvers[activeManeuverIdx]
      ? activeRoute.maneuvers[activeManeuverIdx]
      : {
          type: 'straight' as ManeuverType,
          instruction: {
            en: 'Continue on planned corridor',
            ta: 'திட்டமிட்ட பாதையில் தொடரவும்',
            hi: 'नियोजित मार्ग पर आगे बढ़ें'
          },
          road_name: 'Highway'
        };

  const currentStretch =
    activeRoute.stretches && activeRoute.stretches[currentStretchIdx]
      ? activeRoute.stretches[currentStretchIdx]
      : null;

  const googleMapsAppUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentPosition[0]},${currentPosition[1]}&destination=${plan.destination.lat},${plan.destination.lng}&travelmode=driving`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-white overflow-hidden select-none">
      {/* 1. TOP MANOEUVRE CARD (Google Maps Style) */}
      <div className="absolute top-4 left-4 right-4 z-[1000] max-w-xl mx-auto">
        <div className="bg-emerald-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-emerald-600/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-white text-emerald-900 flex items-center justify-center shrink-0 shadow-md">
              <ManeuverIcon type={currentManeuver.type as ManeuverType} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                {formatMeters(distanceToManeuver)}
              </p>
              <p className="text-xs sm:text-sm text-emerald-100 font-semibold mt-0.5 line-clamp-1">
                {currentManeuver.instruction[currentLang] || currentManeuver.instruction.ta}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsVoiceMuted(!isVoiceMuted)}
              className="p-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 transition-colors cursor-pointer"
              title={isVoiceMuted ? t('navigation.unmute') : t('navigation.mute')}
            >
              {isVoiceMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setRotationMode(rotationMode === 'heading_up' ? 'north_up' : 'heading_up')}
              className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                rotationMode === 'heading_up' ? 'bg-emerald-700 text-white' : 'bg-emerald-800/80 text-emerald-300'
              }`}
              title={rotationMode === 'heading_up' ? t('navigation.heading_up') : t('navigation.north_up')}
            >
              <Compass className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Off-Route Alert & Recalculating Banner */}
        {isOffRoute && (
          <div className="mt-2 bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg animate-pulse">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{t('navigation.off_route_alert')}</span>
          </div>
        )}

        {recalculatedBanner && (
          <div className="mt-2 bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{t('navigation.route_recalculated')}</span>
          </div>
        )}
      </div>

      {/* 2. MAP CONTAINER */}
      <div
        className={`relative flex-1 w-full h-full bg-slate-950 transition-transform duration-300 ${
          rotationMode === 'heading_up' ? 'rotate-map-heading' : ''
        }`}
        style={{
          transform: rotationMode === 'heading_up' ? `rotate(${-heading}deg)` : 'none',
        }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* 3. FLOATING ACTION CONTROLS (Demo Controls & Open in Google Maps) */}
      <div className="absolute right-4 bottom-32 z-[1000] flex flex-col gap-2">
        <a
          href={googleMapsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-3 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl shadow-xl flex items-center justify-center font-bold text-xs gap-1.5 transition-all cursor-pointer"
          title={t('navigation.open_in_gmaps')}
        >
          <ExternalLink className="w-5 h-5 text-emerald-700" />
        </a>

        <button
          onClick={handleToggleSimulation}
          className={`p-3 rounded-2xl shadow-xl flex items-center justify-center font-bold text-xs gap-1.5 transition-all cursor-pointer ${
            isSimulated ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white hover:bg-emerald-800'
          }`}
          title={isSimulated ? t('navigation.demo_stop_btn') : t('navigation.demo_btn')}
        >
          {isSimulated ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        {isSimulated && (
          <button
            onClick={handleSimulateOffRoute}
            className="p-2.5 bg-rose-700 text-white rounded-2xl shadow-xl text-[10px] font-bold text-center leading-tight hover:bg-rose-800 cursor-pointer"
            title="Drift Off-Route (triggers 50m recalculation)"
          >
            <span>Drift Off</span>
          </button>
        )}
      </div>

      {/* 4. BOTTOM STATUS BAR (Distance, ETA, Stretch Speed, Exit) */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] max-w-xl mx-auto">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-center justify-between gap-4">
          {/* Remaining Trip Info */}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">
                {formatDuration(remainingDurationMin)}
              </p>
              <p className="text-xs text-slate-300 font-semibold mt-0.5">
                {formatDistance(remainingDistKm)} • {t('navigation.eta')}{' '}
                {new Date(Date.now() + remainingDurationMin * 60000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Current Stretch Speed Limit Advisory */}
            {currentStretch && (
              <div className="border-l border-slate-700 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-8 h-8 rounded-full bg-slate-800 border-2 border-emerald-400 flex items-center justify-center font-black text-xs text-white">
                    {currentStretch.recommended_speed_kmh}
                  </span>
                  <div className="hidden sm:block">
                    <p className="text-[10px] text-slate-400 font-semibold leading-none">
                      {t('navigation.current_stretch_speed')}
                    </p>
                    <p className="text-xs text-emerald-300 font-bold mt-0.5">
                      {formatSpeed(currentStretch.recommended_speed_kmh)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* End Navigation Button */}
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer shrink-0"
          >
            {t('navigation.stop_btn')}
          </button>
        </div>
      </div>

      {/* 5. ARRIVAL MODAL */}
      {hasArrived && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center text-slate-900 shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">
              {t('navigation.arrived_title')}
            </h2>
            <p className="text-sm text-slate-600">
              {t('navigation.arrived_desc')}
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span>{plan.destination.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>{plan.crop_name[currentLang] || plan.crop_name.ta}</span>
                <span>{plan.total_kg} {t('units.kg')}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
            >
              {t('navigation.stop_btn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ManeuverIcon({ type }: { type: ManeuverType }) {
  switch (type) {
    case 'turn_right':
      return <CornerUpRight className="w-8 h-8 text-emerald-800 stroke-[3]" />;
    case 'turn_left':
      return <CornerUpLeft className="w-8 h-8 text-emerald-800 stroke-[3]" />;
    case 'slight_right':
      return <ArrowRight className="w-8 h-8 text-emerald-800 stroke-[3]" />;
    case 'slight_left':
      return <ArrowLeft className="w-8 h-8 text-emerald-800 stroke-[3]" />;
    case 'u_turn':
      return <RotateCw className="w-8 h-8 text-emerald-800 stroke-[3]" />;
    case 'roundabout':
      return <RotateCw className="w-8 h-8 text-emerald-800 stroke-[3]" />;
    case 'destination':
      return <MapPin className="w-8 h-8 text-rose-600 stroke-[3]" />;
    default:
      return <ArrowUp className="w-8 h-8 text-emerald-800 stroke-[3]" />;
  }
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
