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
  },

  async compareMarkets(payload: any): Promise<any> {
    const res = await fetch('/api/markets/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('COMPARE_MARKETS_FAILED');
    return res.json();
  },

  async optimizeDeparture(payload: any): Promise<any> {
    const res = await fetch('/api/departure/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('DEPARTURE_OPTIMIZE_FAILED');
    return res.json();
  },

  async checkColdChainBreakEven(payload: any): Promise<any> {
    const res = await fetch('/api/cold-chain/break-even', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('BREAK_EVEN_FAILED');
    return res.json();
  },

  async planGroupShipment(payload: any): Promise<any> {
    const res = await fetch('/api/group-shipment/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('GROUP_SHIPMENT_FAILED');
    return res.json();
  },

  async getPlaces(): Promise<any[]> {
    const res = await fetch('/api/places');
    if (!res.ok) throw new Error('FETCH_PLACES_FAILED');
    return res.json();
  },

  async createPlace(place: any): Promise<any> {
    const res = await fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place),
    });
    if (!res.ok) throw new Error('CREATE_PLACE_FAILED');
    return res.json();
  },

  async deletePlace(id: string): Promise<any> {
    const res = await fetch(`/api/places/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('DELETE_PLACE_FAILED');
    return res.json();
  },

  async updatePlaceInputNeed(id: string, inputNeed: any): Promise<any> {
    const res = await fetch(`/api/places/${id}/input_need`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_need: inputNeed }),
    });
    if (!res.ok) throw new Error('UPDATE_INPUT_NEED_FAILED');
    return res.json();
  },

  async matchBackhaul(routeGeometry: [number, number][], maxCorridorKm = 5): Promise<any[]> {
    const res = await fetch('/api/backhaul/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_geometry: routeGeometry, max_corridor_km: maxCorridorKm }),
    });
    if (!res.ok) throw new Error('MATCH_BACKHAUL_FAILED');
    return res.json();
  },

  async getCalibration(cropId: string): Promise<any> {
    const res = await fetch(`/api/calibration/records?crop_id=${cropId}`);
    if (!res.ok) throw new Error('FETCH_CALIBRATION_FAILED');
    return res.json();
  },

  async submitActualLoss(payload: any): Promise<any> {
    const res = await fetch('/api/calibration/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('SUBMIT_ACTUAL_LOSS_FAILED');
    return res.json();
  },

  async updateShipmentStatus(id: string, status: string, note?: string): Promise<any> {
    const res = await fetch(`/api/shipments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    if (!res.ok) throw new Error('UPDATE_STATUS_FAILED');
    return res.json();
  },

  async uploadWeighbridge(id: string, payload: any): Promise<any> {
    const res = await fetch(`/api/shipments/${id}/weighbridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('UPLOAD_WEIGHBRIDGE_FAILED');
    return res.json();
  },

  async getAdminDashboard(token: string): Promise<any> {
    const res = await fetch('/api/admin/dashboard', {
      headers: { 'X-Admin-Token': token },
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('UNAUTHORIZED_ADMIN_TOKEN');
      throw new Error('FETCH_ADMIN_METRICS_FAILED');
    }
    return res.json();
  }
};
