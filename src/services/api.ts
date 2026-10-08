import {
  Crop,
  Market,
  Vehicle,
  AppSettings,
  PlanRequest,
  PlanResponse
} from '../types';

export const api = {
  async getCrops(): Promise<{ crops: Crop[] }> {
    const res = await fetch('/api/meta/crops');
    if (!res.ok) throw new Error('FETCH_CROPS_FAILED');
    return res.json();
  },

  async getMarkets(): Promise<{ markets: Market[] }> {
    const res = await fetch('/api/meta/markets');
    if (!res.ok) throw new Error('FETCH_MARKETS_FAILED');
    return res.json();
  },

  async getVehicles(): Promise<{ vehicles: Vehicle[]; capacity_presets: number[] }> {
    const res = await fetch('/api/meta/vehicles');
    if (!res.ok) throw new Error('FETCH_VEHICLES_FAILED');
    return res.json();
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('FETCH_SETTINGS_FAILED');
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('UPDATE_SETTINGS_FAILED');
    return res.json();
  },

  async reverseGeocode(lat: number, lng: number, lang: string): Promise<{ address: string }> {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}&lang=${lang}`);
    if (!res.ok) throw new Error('GEOCODE_FAILED');
    return res.json();
  },

  async planShipment(request: PlanRequest): Promise<PlanResponse> {
    const res = await fetch('/api/shipments/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      const code = errorJson.code || 'ROUTING_FAILED';
      throw new Error(code);
    }
    return res.json();
  },

  async getShipments(): Promise<PlanResponse[]> {
    const res = await fetch('/api/shipments');
    if (!res.ok) throw new Error('FETCH_SHIPMENTS_FAILED');
    return res.json();
  },

  async getShipmentById(id: string): Promise<PlanResponse> {
    const res = await fetch(`/api/shipments/${id}`);
    if (!res.ok) throw new Error('SHIPMENT_NOT_FOUND');
    return res.json();
  },

  getExportCsvUrl(id: string, lang: string): string {
    return `/api/shipments/${id}/export.csv?lang=${lang}`;
  }
};
