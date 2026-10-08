import { useTranslation } from 'react-i18next';
import { Snowflake, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters.ts';

interface ColdChainCardProps {
  totalKg: number;
  wholesalePrice: number;
  fOpen: number;
  fReefer: number;
  extraReeferCost: number;
}

export default function ColdChainCard({
  totalKg,
  wholesalePrice,
  fOpen,
  fReefer,
  extraReeferCost
}: ColdChainCardProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language as 'en' | 'ta' | 'hi') || 'ta';

  const expectedLossOpen = Math.round(totalKg * wholesalePrice * fOpen);
  const expectedLossReefer = Math.round(totalKg * wholesalePrice * fReefer);
  const spoilageSavings = Math.round(totalKg * wholesalePrice * (fOpen - fReefer));
  const netBenefit = spoilageSavings - extraReeferCost;
  const paysOff = spoilageSavings >= extraReeferCost;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/60 to-white">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-sky-600 text-white shadow-2xs">
            <Snowflake className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('cold_chain.title')}</h3>
            <p className="text-xs text-slate-500">{t('cold_chain.subtitle')}</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
          paysOff ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}>
          {paysOff ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-slate-500" />}
          <span>{paysOff ? t('cold_chain.verdict_pays_off') : t('cold_chain.verdict_open_better')}</span>
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Open Truck */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-800 pb-1 border-b border-slate-200/80">
              <span>{t('cold_chain.col_open_truck')}</span>
              <span className="text-[11px] text-slate-500 font-normal">Standard Tarp</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t('cold_chain.col_spoilage_rate')}:</span>
              <span className="font-semibold text-rose-600">{(fOpen * 100).toFixed(1)}% ({t('common.estimated')})</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t('cold_chain.col_spoilage_loss')}:</span>
              <span className="font-bold text-rose-700">{formatCurrency(expectedLossOpen)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
              <span>{t('cold_chain.col_extra_cost')}:</span>
              <span className="font-medium text-slate-800">₹0</span>
            </div>
          </div>

          {/* Refrigerated Truck */}
          <div className={`p-3.5 rounded-xl border space-y-2 ${
            paysOff ? 'bg-sky-50/70 border-sky-300 ring-1 ring-sky-200' : 'bg-slate-50/60 border-slate-200'
          }`}>
            <div className="flex items-center justify-between font-bold text-sky-950 pb-1 border-b border-sky-200/80">
              <span className="flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                {t('cold_chain.col_reefer_truck')}
              </span>
              <span className="text-[11px] text-sky-700 font-normal">Active Chiller</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t('cold_chain.col_spoilage_rate')}:</span>
              <span className="font-semibold text-emerald-700">{(fReefer * 100).toFixed(1)}% ({t('common.estimated')})</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{t('cold_chain.col_spoilage_loss')}:</span>
              <span className="font-bold text-emerald-800">{formatCurrency(expectedLossReefer)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 border-t border-sky-200/60">
              <span>{t('cold_chain.col_extra_cost')}:</span>
              <span className="font-semibold text-slate-800">+{formatCurrency(extraReeferCost)}</span>
            </div>
          </div>
        </div>

        {/* Verdict Explanation Banner */}
        <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2.5 ${
          paysOff ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
        }`}>
          <TrendingUp className={`w-4 h-4 shrink-0 mt-0.5 ${paysOff ? 'text-emerald-700' : 'text-amber-700'}`} />
          <div>
            <p className="font-bold mb-0.5">
              {paysOff
                ? `${t('cold_chain.verdict_pays_off')}: +${formatCurrency(netBenefit)} ${t('cold_chain.net_advantage')}`
                : `${t('cold_chain.verdict_open_better')}: -${formatCurrency(Math.abs(netBenefit))} ${t('cold_chain.net_disadvantage')}`}
            </p>
            <p className="opacity-90 leading-relaxed">
              {paysOff
                ? t('cold_chain.desc_pays_off', {
                    savings: formatCurrency(spoilageSavings),
                    cost: formatCurrency(extraReeferCost),
                    net: formatCurrency(netBenefit)
                  })
                : t('cold_chain.desc_open_better', {
                    savings: formatCurrency(spoilageSavings),
                    cost: formatCurrency(extraReeferCost)
                  })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
