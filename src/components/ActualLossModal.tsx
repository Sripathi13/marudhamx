import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Check, X, Scale } from 'lucide-react';
import { api } from '../services/api.ts';
import { formatNumber } from '../utils/formatters.ts';

interface ActualLossModalProps {
  shipmentId: string;
  cropId: string;
  totalKg: number;
  durationHours: number;
  heatFactor?: number;
  onClose: () => void;
  onSuccess: (updatedStatus: any) => void;
}

export default function ActualLossModal({
  shipmentId,
  cropId,
  totalKg,
  durationHours,
  heatFactor = 1.2,
  onClose,
  onSuccess
}: ActualLossModalProps) {
  const { t } = useTranslation();
  const [actualLossKg, setActualLossKg] = useState<number>(Math.round(totalKg * 0.025));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualLossKg < 0 || actualLossKg > totalKg) {
      setError('Please enter a valid spoiled quantity.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.submitActualLoss({
        crop_id: cropId,
        shipment_id: shipmentId,
        actual_loss_kg: actualLossKg,
        total_kg: totalKg,
        duration_hours: durationHours,
        heat_factor: heatFactor
      });
      onSuccess(res.status);
      onClose();
    } catch (err: any) {
      setError(err.message || 'SUBMIT_ACTUAL_LOSS_FAILED');
      setIsSubmitting(false);
    }
  };

  const lossPercent = ((actualLossKg / totalKg) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-700 text-white shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">{t('calibration.modal_title')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {t('calibration.modal_subtitle')}
        </p>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              {t('calibration.field_actual_loss')} ({t('units.kg')})
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max={totalKg}
                step="any"
                value={actualLossKg}
                onChange={(e) => setActualLossKg(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400">
                {lossPercent}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total shipment quantity: {formatNumber(totalKg)} {t('units.kg')}
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              {isSubmitting ? <span>Saving...</span> : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('calibration.btn_submit')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
