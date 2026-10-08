import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Navigation,
  Truck,
  Calendar,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Clock,
  Layers,
  Scale
} from 'lucide-react';
import { api } from '../services/api';
import { Crop, Market, Vehicle, PlanRequest } from '../types';
import MapLocationPickerModal from '../components/MapLocationPickerModal';
import { formatNumber } from '../utils/formatters';

export default function PlanPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Data sets
  const [crops, setCrops] = useState<Crop[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [capacityPresets, setCapacityPresets] = useState<number[]>([1000, 3000, 6000, 10000]);

  // Form states
  const [selectedCropId, setSelectedCropId] = useState<string>('tomato');
  const [totalKg, setTotalKg] = useState<number>(5000);
  const [selectedCapacityPreset, setSelectedCapacityPreset] = useState<number | 'custom'>(3000);
  const [customCapacity, setCustomCapacity] = useState<number>(3000);
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('refrigerated_truck');
  const [departureTime, setDepartureTime] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Origin State
  const [origin, setOrigin] = useState<{ lat: number; lng: number; name: string }>({
    lat: 10.658,
    lng: 77.012,
    name: 'Pollachi Farm (பொள்ளாச்சி)',
  });
  const [locatingUser, setLocatingUser] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Destination State
  const [selectedMarketId, setSelectedMarketId] = useState<string>('cbe_central');
  const [customDestination, setCustomDestination] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  // Modals
  const [pickerModalType, setPickerModalType] = useState<'origin' | 'destination' | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch meta options
  useEffect(() => {
    api.getCrops().then((res) => {
      setCrops(res.crops);
      if (res.crops.length > 0 && !selectedCropId) {
        setSelectedCropId(res.crops[0].id);
      }
    }).catch(console.error);

    api.getMarkets().then((res) => {
      setMarkets(res.markets);
    }).catch(console.error);

    api.getVehicles().then((res) => {
      setVehicles(res.vehicles);
      if (res.capacity_presets) setCapacityPresets(res.capacity_presets);
    }).catch(console.error);

    api.getSettings().then((s) => {
      if (s.default_truck_capacity_kg) {
        setSelectedCapacityPreset(s.default_truck_capacity_kg);
      }
    }).catch(console.error);
  }, []);

  const effectiveCapacity =
    selectedCapacityPreset === 'custom' ? customCapacity : selectedCapacityPreset;

  // Truck Breakdown Calculation
  const trucksNeeded = Math.max(1, Math.ceil(totalKg / (effectiveCapacity || 1)));
  const fullTrucks = Math.floor(totalKg / (effectiveCapacity || 1));
  const lastTruckLoad = totalKg - fullTrucks * (effectiveCapacity || 1);

  // Geolocation handler
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError(t('plan.location_error_unavailable'));
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await api.reverseGeocode(lat, lng, i18n.language);
          setOrigin({
            lat,
            lng,
            name: res.address,
          });
        } catch {
          setOrigin({
            lat,
            lng,
            name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          });
        }
        setLocatingUser(false);
      },
      (err) => {
        setLocatingUser(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(t('plan.location_error_denied'));
        } else if (err.code === err.TIMEOUT) {
          setLocationError(t('plan.location_error_timeout'));
        } else {
          setLocationError(t('plan.location_error_unavailable'));
        }
      },
      { timeout: 8000 }
    );
  };

  // Demo scenario quick loader
  const handleLoadDemo = () => {
    setSelectedCropId('tomato');
    setTotalKg(5000);
    setSelectedCapacityPreset(3000);
    setSelectedVehicleType('refrigerated_truck');
    setOrigin({
      lat: 10.658,
      lng: 77.012,
      name: 'Pollachi Farm (பொள்ளாச்சி பண்ணை)',
    });
    setSelectedMarketId('cbe_central');
    setCustomDestination(null);
    setValidationError(null);
  };

  // Submit Handler
  const handleOptimize = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const safeTotalKg = totalKg > 0 ? totalKg : 5000;
    const safeCapacity = effectiveCapacity > 0 ? effectiveCapacity : 3000;

    let destinationPayload: { id?: string; name: string; lat: number; lng: number };
    if (customDestination) {
      destinationPayload = customDestination;
    } else {
      const market = markets.find((m) => m.id === selectedMarketId) || markets[0] || {
        id: 'cbe_central',
        name: { en: 'Coimbatore Market', ta: 'கோயம்புத்தூர் சந்தை', hi: 'कोयंबटूर मंडी' },
        lat: 11.002,
        lng: 76.963
      };
      const langKey = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';
      destinationPayload = {
        id: market.id,
        name: (market.name as any)[langKey] || (market.name as any).ta || 'Market',
        lat: market.lat,
        lng: market.lng,
      };
    }

    const payload: PlanRequest = {
      crop_id: selectedCropId || 'tomato',
      total_kg: safeTotalKg,
      truck_capacity_kg: safeCapacity,
      origin: origin || {
        lat: 10.658,
        lng: 77.012,
        name: 'Pollachi Farm (பொள்ளாச்சி பண்ணை)',
      },
      destination: destinationPayload,
      vehicle_type: selectedVehicleType || 'refrigerated_truck',
      departure_time: departureTime ? new Date(departureTime).toISOString() : new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      const planResult = await api.planShipment(payload);
      navigate(`/results/${planResult.id}`);
    } catch (err: any) {
      setIsSubmitting(false);
      const errorCode = err.message || 'ROUTING_FAILED';
      setValidationError(t(`errors.${errorCode}`, { defaultValue: t('errors.ROUTING_FAILED') }));
    }
  };

  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('plan.title')}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t('plan.subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={handleLoadDemo}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300/80 hover:bg-emerald-100 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>{t('plan.demo_button')}</span>
        </button>
      </div>

      {validationError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{validationError}</p>
        </div>
      )}

      <form onSubmit={handleOptimize} noValidate className="space-y-8">
        {/* SECTION 1: Produce and Vehicle */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <Scale className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">{t('plan.section_produce')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Crop Selector */}
            <div>
              <label htmlFor="crop-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('plan.crop_label')}
              </label>
              <select
                id="crop-select"
                value={selectedCropId}
                onChange={(e) => setSelectedCropId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name[currentLang] || c.name.ta}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Quantity */}
            <div>
              <label htmlFor="quantity-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('plan.quantity_label')} ({t('units.kg')})
              </label>
              <input
                id="quantity-input"
                type="number"
                min="0.1"
                step="any"
                value={totalKg || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTotalKg(isNaN(val) ? 0 : val);
                }}
                placeholder={t('plan.quantity_placeholder')}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Truck Capacity Preset */}
            <div>
              <label htmlFor="capacity-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('plan.truck_capacity_label')} ({t('units.kg')})
              </label>
              <select
                id="capacity-select"
                value={selectedCapacityPreset}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setSelectedCapacityPreset('custom');
                  } else {
                    setSelectedCapacityPreset(parseInt(val, 10));
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {capacityPresets.map((preset) => (
                  <option key={preset} value={preset}>
                    {formatNumber(preset)} {t('units.kg')}
                  </option>
                ))}
                <option value="custom">{t('plan.custom_capacity')}</option>
              </select>

              {selectedCapacityPreset === 'custom' && (
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={customCapacity || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCustomCapacity(isNaN(val) ? 0 : val);
                  }}
                  placeholder={t('plan.custom_capacity_placeholder')}
                  className="mt-2 w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>

            {/* Vehicle Type */}
            <div>
              <label htmlFor="vehicle-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('plan.vehicle_label')}
              </label>
              <select
                id="vehicle-select"
                value={selectedVehicleType}
                onChange={(e) => setSelectedVehicleType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name[currentLang] || v.name.ta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Truck Allocation Summary */}
          {totalKg > 0 && effectiveCapacity > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  {t('plan.truck_summary_title')}
                </h3>
              </div>
              <p className="text-sm font-semibold text-emerald-900 mb-3">
                {t('plan.truck_summary_formula', {
                  needed: formatNumber(trucksNeeded),
                  total: formatNumber(totalKg),
                  capacity: formatNumber(effectiveCapacity),
                  unit: t('units.kg'),
                })}
              </p>

              {/* Truck Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {Array.from({ length: fullTrucks }).map((_, idx) => (
                  <div
                    key={`truck-full-${idx}`}
                    className="bg-white px-3 py-2 rounded-lg border border-emerald-200 text-xs text-slate-800 flex items-center justify-between"
                  >
                    <span>
                      {t('plan.truck_item_full', {
                        number: formatNumber(idx + 1),
                        load: formatNumber(effectiveCapacity),
                        utilization: formatNumber(100),
                        unit: t('units.kg'),
                      })}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                ))}

                {lastTruckLoad > 0 && (
                  <div className="bg-white px-3 py-2 rounded-lg border border-amber-300 text-xs text-slate-800 flex items-center justify-between">
                    <span>
                      {t('plan.truck_item_partial', {
                        number: formatNumber(fullTrucks + 1),
                        load: formatNumber(lastTruckLoad),
                        utilization: formatNumber(Math.round((lastTruckLoad / effectiveCapacity) * 100)),
                        unit: t('units.kg'),
                      })}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Origin & Destination */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
            <MapPin className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">{t('plan.section_origin')} & {t('plan.section_destination')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('plan.origin_input_label')}
              </label>
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl mb-2.5">
                <p className="text-sm font-semibold text-slate-900 truncate">{origin.name}</p>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
                </p>
              </div>

              {locationError && (
                <p className="text-xs text-rose-600 mb-2 font-medium">{locationError}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locatingUser}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {locatingUser ? t('plan.btn_locating') : t('plan.btn_use_location')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickerModalType('origin')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/60 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t('plan.btn_pick_map')}</span>
                </button>
              </div>
            </div>

            {/* Destination Location */}
            <div>
              <label htmlFor="destination-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('plan.destination_label')}
              </label>

              {customDestination ? (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl mb-2.5">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {customDestination.name}
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {customDestination.lat.toFixed(5)}, {customDestination.lng.toFixed(5)}
                  </p>
                </div>
              ) : (
                <select
                  id="destination-select"
                  value={selectedMarketId}
                  onChange={(e) => setSelectedMarketId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2.5"
                >
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name[currentLang] || m.name.ta}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerModalType('destination')}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/60 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{t('plan.btn_pick_map')}</span>
                </button>

                {customDestination && (
                  <button
                    type="button"
                    onClick={() => setCustomDestination(null)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                  >
                    {t('plan.destination_select')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Departure Time */}
          <div className="mt-6 pt-5 border-t border-slate-100 max-w-sm">
            <label htmlFor="departure-time" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {t('plan.departure_label')}
              </span>
            </label>
            <input
              id="departure-time"
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-10 py-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <span>{t('plan.btn_optimizing')}</span>
            ) : (
              <>
                <span>{t('plan.btn_optimize')}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Map Picker Modal */}
      {pickerModalType && (
        <MapLocationPickerModal
          isOpen={true}
          title={
            pickerModalType === 'origin'
              ? t('map_picker.title_origin')
              : t('map_picker.title_destination')
          }
          initialLat={pickerModalType === 'origin' ? origin.lat : 10.9982}
          initialLng={pickerModalType === 'origin' ? origin.lng : 76.9632}
          onClose={() => setPickerModalType(null)}
          onConfirm={(loc) => {
            if (pickerModalType === 'origin') {
              setOrigin({ lat: loc.lat, lng: loc.lng, name: loc.address });
            } else {
              setCustomDestination({ lat: loc.lat, lng: loc.lng, name: loc.address });
            }
            setPickerModalType(null);
          }}
        />
      )}
    </div>
  );
}
