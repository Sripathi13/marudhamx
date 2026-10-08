import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Download, History, ArrowRight, Eye, Filter } from 'lucide-react';
import { api } from '../services/api';
import { PlanResponse, Crop } from '../types';
import {
  formatCurrency,
  formatDateTime,
  formatNumber
} from '../utils/formatters';

export default function HistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [shipments, setShipments] = useState<PlanResponse[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getShipments(), api.getCrops()])
      .then(([shipmentList, cropList]) => {
        setShipments(shipmentList);
        setCrops(cropList.crops);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  const filteredShipments =
    selectedCropFilter === 'all'
      ? shipments
      : shipments.filter((s) => s.crop_id === selectedCropFilter);

  const handleExportCsv = (id: string) => {
    const url = api.getExportCsvUrl(id, currentLang);
    window.location.href = url;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('history.title')}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t('history.subtitle')}</p>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedCropFilter}
            onChange={(e) => setSelectedCropFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{t('history.filter_all')}</option>
            {crops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name[currentLang] || c.name.ta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {t('history.empty_title')}
          </h2>
          <p className="text-sm text-slate-600 mb-6">{t('history.empty_desc')}</p>
          <button
            onClick={() => navigate('/plan')}
            className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm hover:bg-emerald-800 transition-colors inline-flex items-center gap-2"
          >
            <span>{t('history.btn_plan_now')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">{t('history.col_date')}</th>
                  <th className="py-3.5 px-4">{t('history.col_crop')}</th>
                  <th className="py-3.5 px-4">{t('history.col_quantity')}</th>
                  <th className="py-3.5 px-4">{t('history.col_trucks')}</th>
                  <th className="py-3.5 px-4">{t('history.col_origin')}</th>
                  <th className="py-3.5 px-4">{t('history.col_destination')}</th>
                  <th className="py-3.5 px-4">{t('history.col_route')}</th>
                  <th className="py-3.5 px-4">{t('history.col_total_cost')}</th>
                  <th className="py-3.5 px-4 text-right">{t('history.col_view')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredShipments.map((item) => {
                  const recRoute =
                    item.routes.find((r) => r.id === item.recommended_route_id) || item.routes[0];
                  const cropName = item.crop_name[currentLang] || item.crop_name.ta;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {cropName}
                      </td>
                      <td className="py-3.5 px-4">
                        {formatNumber(item.total_kg)} {t('units.kg')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {formatNumber(item.truck_breakdown.trucks_needed)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[160px] truncate">
                        {item.origin.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 max-w-[160px] truncate">
                        {item.destination.name}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-800">
                        {recRoute.id}: {recRoute.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(recRoute.total_economic_cost_inr)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => handleExportCsv(item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title={t('history.export_csv')}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/results/${item.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('history.btn_view')}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
