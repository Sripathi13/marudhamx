import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, RotateCcw, Check, Sliders, Fuel, TrafficCone, DollarSign } from 'lucide-react';
import { api } from '../services/api';
import { AppSettings, Crop, Language } from '../types';
import { setAppLanguage } from '../i18n';
import { formatNumber } from '../utils/formatters';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getSettings(), api.getCrops()])
      .then(([settingsData, cropsData]) => {
        setSettings(settingsData);
        setCrops(cropsData.crops);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLanguageChange = (lang: Language) => {
    setAppLanguage(lang);
    if (settings) {
      setSettings({ ...settings, language: lang });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      showToast(t('settings.saved_toast'));
    } catch {
      // Handle error
    }
  };

  const handleReset = async () => {
    const defaultVals: Partial<AppSettings> = {
      fuel_price_per_litre: 98.5,
      default_truck_capacity_kg: 3000,
      traffic_profile: 'typical',
      units: 'km',
      fuel_efficiency_kmpl: {
        open_truck: 5.5,
        closed_truck: 4.8,
        refrigerated_truck: 3.8,
      },
    };
    try {
      const updated = await api.updateSettings(defaultVals);
      setSettings(updated);
      showToast(t('settings.reset_toast'));
    } catch {
      // Handle error
    }
  };

  if (loading || !settings) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-slate-600 mt-1">{t('settings.subtitle')}</p>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. General & Locale */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Sliders className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              {t('settings.section_general')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="settings-lang" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('settings.language_label')}
              </label>
              <select
                id="settings-lang"
                value={currentLang}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ta">தமிழ்</option>
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>

            <div>
              <label htmlFor="settings-units" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('settings.units_label')}
              </label>
              <select
                id="settings-units"
                value={settings.units}
                onChange={(e) =>
                  setSettings({ ...settings, units: e.target.value as 'km' | 'mi' })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="km">{t('settings.units_km')}</option>
                <option value="mi">{t('settings.units_mi')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Fuel & Vehicle Parameters */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Fuel className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              {t('settings.section_fuel')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div>
              <label htmlFor="fuel-price-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('settings.fuel_price_label')}
              </label>
              <input
                id="fuel-price-input"
                type="number"
                step="0.5"
                min="50"
                max="250"
                value={settings.fuel_price_per_litre}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    fuel_price_per_litre: parseFloat(e.target.value) || 98.5,
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="default-cap-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('settings.default_capacity_label')}
              </label>
              <input
                id="default-cap-input"
                type="number"
                step="500"
                min="500"
                value={settings.default_truck_capacity_kg}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_truck_capacity_kg: parseInt(e.target.value, 10) || 3000,
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Crop Wholesale Prices */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <DollarSign className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              {t('settings.section_produce')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {crops.map((c) => {
              const currentPrice =
                settings.crop_prices[c.id] !== undefined
                  ? settings.crop_prices[c.id]
                  : c.default_price_per_kg;

              return (
                <div key={c.id}>
                  <label htmlFor={`crop-price-${c.id}`} className="block text-xs font-medium text-slate-700 mb-1">
                    {c.name[currentLang] || c.name.ta} ({t('units.per_kg')})
                  </label>
                  <input
                    id={`crop-price-${c.id}`}
                    type="number"
                    min="1"
                    value={currentPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setSettings({
                        ...settings,
                        crop_prices: {
                          ...settings.crop_prices,
                          [c.id]: val,
                        },
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Traffic & Routing Intelligence */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <TrafficCone className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              {t('settings.section_traffic')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="traffic-profile-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('settings.traffic_profile_label')}
              </label>
              <select
                id="traffic-profile-select"
                value={settings.traffic_profile}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    traffic_profile: e.target.value as 'off_peak' | 'typical' | 'heavy',
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="off_peak">{t('traffic_profile.off_peak')}</option>
                <option value="typical">{t('traffic_profile.typical')}</option>
                <option value="heavy">{t('traffic_profile.heavy')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('settings.traffic_source_label')}
              </label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-semibold text-slate-800">
                  {settings.google_maps_configured
                    ? t('settings.traffic_source_live')
                    : t('settings.traffic_source_estimated')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('settings.btn_reset')}</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{t('settings.btn_save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
