import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Sprout, Route, History, Settings, Globe } from 'lucide-react';
import { Language } from '../types';
import { setAppLanguage } from '../i18n';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const currentLang = (i18n.language as Language) || 'ta';

  const handleLanguageChange = (newLang: Language) => {
    setAppLanguage(newLang);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-emerald-900 text-white shadow-md border-b border-emerald-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg p-1"
            aria-label={t('app_name')}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/30 flex items-center justify-center text-emerald-200 group-hover:scale-105 transition-transform shadow-inner">
              <Sprout className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1">
                {t('app_name')}
              </span>
              <span className="text-[11px] text-emerald-300 font-medium hidden sm:inline leading-none">
                {t('tagline')}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/plan"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/plan')
                  ? 'bg-emerald-800 text-emerald-100 shadow-sm'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <Route className="w-4 h-4" />
              <span>{t('nav.plan')}</span>
            </Link>

            <Link
              to="/history"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/history')
                  ? 'bg-emerald-800 text-emerald-100 shadow-sm'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{t('nav.history')}</span>
            </Link>

            <Link
              to="/settings"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/settings')
                  ? 'bg-emerald-800 text-emerald-100 shadow-sm'
                  : 'text-emerald-200 hover:bg-emerald-800/60 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{t('nav.settings')}</span>
            </Link>

            {/* Language Selector Dropdown */}
            <div className="relative ml-2 sm:ml-4 flex items-center">
              <Globe className="w-4 h-4 text-emerald-300 mr-1.5 pointer-events-none" />
              <label htmlFor="language-select" className="sr-only">
                {t('settings.language_label')}
              </label>
              <select
                id="language-select"
                value={currentLang}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="bg-emerald-800/90 text-white font-medium text-sm rounded-lg px-2.5 py-1.5 border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm hover:bg-emerald-800"
              >
                <option value="ta">தமிழ்</option>
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
              </select>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
