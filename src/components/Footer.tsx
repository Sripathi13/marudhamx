import { useTranslation } from 'react-i18next';
import { Sprout } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-semibold text-base">{t('app_name')}</p>
              <p className="text-xs text-slate-400">{t('footer.tagline')}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center md:text-right max-w-md">
            {t('footer.description')}
          </p>
        </div>
      </div>
    </footer>
  );
}
