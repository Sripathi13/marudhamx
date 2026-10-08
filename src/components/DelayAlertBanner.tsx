import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bell, BellRing, Route, X } from 'lucide-react';

interface DelayAlertBannerProps {
  delayMin?: number;
  newEta?: string;
  onViewAlternative?: () => void;
}

export default function DelayAlertBanner({
  delayMin = 20,
  newEta = '11:45 AM',
  onViewAlternative
}: DelayAlertBannerProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [notificationGranted, setNotificationGranted] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [showPermissionPrompt, setShowPermissionPrompt] = useState<boolean>(false);

  if (dismissed || delayMin < 15) return null;

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotificationGranted(true);
        new Notification(t('alerts.notification_title'), {
          body: t('alerts.banner_message', { delay: delayMin, eta: newEta }),
          icon: '/favicon.ico'
        });
      }
    } catch {
      // Permission rejected
    } finally {
      setShowPermissionPrompt(false);
    }
  };

  return (
    <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 sm:p-5 shadow-sm text-slate-900 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-amber-500 text-white shadow-xs shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-amber-950">
                {t('alerts.banner_title')}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900">
                +{delayMin} {t('units.min')}
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              {t('alerts.banner_message', { delay: delayMin, eta: newEta })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-700 hover:text-amber-900 p-1 rounded-lg cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="mt-3.5 pt-3 border-t border-amber-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!notificationGranted && (
            <button
              type="button"
              onClick={() => setShowPermissionPrompt(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-amber-700" />
              <span>{t('alerts.btn_enable_notifications')}</span>
            </button>
          )}
          {notificationGranted && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
              <BellRing className="w-3 h-3" />
              {t('alerts.notifications_enabled')}
            </span>
          )}
        </div>

        {onViewAlternative && (
          <button
            type="button"
            onClick={onViewAlternative}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            <Route className="w-3.5 h-3.5" />
            <span>{t('alerts.btn_view_alternative')}</span>
          </button>
        )}
      </div>

      {/* Permission Explanation Modal */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">{t('alerts.permission_title')}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('alerts.permission_explanation')}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPermissionPrompt(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer"
              >
                {t('alerts.permission_grant')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
