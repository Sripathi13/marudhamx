import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Truck, PackageCheck, MapPin, ChevronRight } from 'lucide-react';
import { ShipmentEvent, ShipmentStatus } from '../types.ts';
import { api } from '../services/api.ts';

interface ShipmentTimelineCardProps {
  shipmentId: string;
  initialStatus?: ShipmentStatus;
  initialTimeline?: ShipmentEvent[];
  isDriverView?: boolean;
  onStatusChange?: (newStatus: ShipmentStatus) => void;
}

const statusOrder: ShipmentStatus[] = ['PLANNED', 'LOADED', 'IN_TRANSIT', 'DELIVERED'];

export default function ShipmentTimelineCard({
  shipmentId,
  initialStatus = 'PLANNED',
  initialTimeline = [],
  isDriverView = false,
  onStatusChange
}: ShipmentTimelineCardProps) {
  const { t } = useTranslation();
  const [currentStatus, setCurrentStatus] = useState<ShipmentStatus>(initialStatus);
  const [timeline, setTimeline] = useState<ShipmentEvent[]>(
    initialTimeline.length > 0
      ? initialTimeline
      : [{ status: initialStatus, timestamp: new Date().toISOString() }]
  );
  const [updating, setUpdating] = useState<boolean>(false);

  const currentIndex = statusOrder.indexOf(currentStatus);
  const nextStatus = currentIndex < statusOrder.length - 1 ? statusOrder[currentIndex + 1] : null;

  const handleAdvanceStatus = async (statusToSet: ShipmentStatus) => {
    setUpdating(true);
    try {
      const res = await api.updateShipmentStatus(shipmentId, statusToSet);
      setCurrentStatus(statusToSet);
      if (res.timeline) setTimeline(res.timeline);
      if (onStatusChange) onStatusChange(statusToSet);
    } catch (err) {
      console.error('Failed to advance status:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-slate-800 text-white shadow-2xs">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t('timeline.title')}</h3>
            <p className="text-xs text-slate-500">{t('timeline.subtitle')}</p>
          </div>
        </div>

        {/* Current status pill */}
        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
          {t(`timeline.status_${currentStatus.toLowerCase()}`)}
        </span>
      </div>

      <div className="p-5 space-y-6">
        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 relative">
          {statusOrder.map((st, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const eventMatch = timeline.find((e) => e.status === st);

            return (
              <div key={st} className="flex flex-col items-center text-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                    isCurrent
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-sm'
                      : isCompleted
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-emerald-900' : 'text-slate-700'}`}>
                  {t(`timeline.status_${st.toLowerCase()}`)}
                </p>
                {eventMatch && (
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(eventMatch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Driver One-Tap Advance Button */}
        {isDriverView && nextStatus && (
          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              disabled={updating}
              onClick={() => handleAdvanceStatus(nextStatus)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>{t(`timeline.btn_advance_to`)}: {t(`timeline.status_${nextStatus.toLowerCase()}`)}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
