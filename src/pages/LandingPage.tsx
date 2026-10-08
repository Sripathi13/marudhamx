import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Route, Truck, TrendingDown, ArrowRight, PlayCircle } from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handlePlanClick = () => {
    navigate('/plan');
  };

  const handleDemoClick = () => {
    navigate('/results/demo-pollachi-cbe');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem-120px)]">
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          {t('landing.headline')}
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
          {t('landing.subheadline')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={handlePlanClick}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>{t('landing.cta_plan')}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={handleDemoClick}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 font-semibold text-base shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlayCircle className="w-5 h-5 text-emerald-600" />
            <span>{t('nav.demo_scenario')}</span>
          </button>
        </div>
      </section>

      {/* 3 Core Feature Cards */}
      <section className="py-12 bg-white border-y border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Real Road Routing */}
            <div className="bg-slate-50 rounded-2xl p-7 border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                <Route className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {t('landing.features.routes_title')}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t('landing.features.routes_desc')}
              </p>
            </div>

            {/* Feature 2: Automated Truck Allocation */}
            <div className="bg-slate-50 rounded-2xl p-7 border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                <Truck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {t('landing.features.trucks_title')}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t('landing.features.trucks_desc')}
              </p>
            </div>

            {/* Feature 3: Spoilage & Loss Model */}
            <div className="bg-slate-50 rounded-2xl p-7 border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {t('landing.features.spoilage_title')}
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                {t('landing.features.spoilage_desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="bg-emerald-900 text-white rounded-3xl p-8 sm:p-12 shadow-lg relative overflow-hidden">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            {t('landing.cta_plan')}
          </h2>
          <p className="text-emerald-200 text-sm sm:text-base max-w-xl mx-auto mb-8">
            {t('landing.subheadline')}
          </p>
          <button
            onClick={handlePlanClick}
            className="px-8 py-3.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-base shadow-sm hover:shadow transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>{t('landing.cta_plan')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
