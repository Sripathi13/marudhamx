import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { MapPin, Navigation, Check, X } from 'lucide-react';
import { api } from '../services/api';

interface MapLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: { lat: number; lng: number; address: string }) => void;
  initialLat?: number;
  initialLng?: number;
  title: string;
}

export default function MapLocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLat = 10.9982, // Coimbatore center default
  initialLng = 76.9632,
  title,
}: MapLocationPickerModalProps) {
  const { t, i18n } = useTranslation();
  const [selectedPos, setSelectedPos] = useState<[number, number]>([initialLat, initialLng]);
  const [address, setAddress] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);

  // Fetch reverse geocode whenever position changes
  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;
    setLoadingAddress(true);

    api
      .reverseGeocode(selectedPos[0], selectedPos[1], i18n.language)
      .then((res) => {
        if (isCurrent) {
          setAddress(res.address);
          setLoadingAddress(false);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setAddress(`${selectedPos[0].toFixed(6)}, ${selectedPos[1].toFixed(6)}`);
          setLoadingAddress(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedPos, isOpen, i18n.language]);

  // Try fetching current location for reference
  useEffect(() => {
    if (!isOpen) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          // ignore error
        },
        { timeout: 5000 }
      );
    }
  }, [isOpen]);

  // Setup Leaflet map when modal opens
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small delay to ensure modal DOM is mounted and sized
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: selectedPos,
        zoom: 12,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom draggable marker
      const pinIcon = L.divIcon({
        className: 'custom-picker-pin',
        html: `
          <div style="background-color: #047857; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4); border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
            <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker(selectedPos, {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const latLng = marker.getLatLng();
        setSelectedPos([latLng.lat, latLng.lng]);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setSelectedPos([e.latlng.lat, e.latlng.lng]);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Update user location marker if available
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLocation) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.circleMarker(userLocation, {
        radius: 8,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      })
        .bindTooltip(t('map_picker.you_are_here'))
        .addTo(map);
    } else {
      userMarkerRef.current.setLatLng(userLocation);
    }
  }, [userLocation, t]);

  if (!isOpen) return null;

  const handleCenterUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView(userLocation, 14);
      if (markerRef.current) {
        markerRef.current.setLatLng(userLocation);
      }
      setSelectedPos(userLocation);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setSelectedPos(coords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(coords, 14);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng(coords);
        }
      });
    }
  };

  const handleConfirm = () => {
    onConfirm({
      lat: selectedPos[0],
      lng: selectedPos[1],
      address: address || `${selectedPos[0].toFixed(6)}, ${selectedPos[1].toFixed(6)}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-6 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
          <span>{t('map_picker.instruction')}</span>
          <button
            onClick={handleCenterUser}
            className="flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded-md"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{t('map_picker.btn_center_current')}</span>
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 min-h-[340px] bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-[360px]" />
        </div>

        {/* Address and Coordinate display */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-1 text-sm">
          <p className="text-xs text-slate-500 font-mono">
            {t('map_picker.selected_coords', {
              lat: selectedPos[0].toFixed(6),
              lng: selectedPos[1].toFixed(6),
            })}
          </p>
          <p className="text-slate-800 font-medium truncate">
            {loadingAddress ? '...' : t('map_picker.reverse_address', { address: address || '-' })}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            {t('map_picker.btn_cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 text-sm font-medium shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{t('map_picker.btn_confirm')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
