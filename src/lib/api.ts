// API service for connecting to the FastAPI backend

// Dynamically determine the API URL based on current host
// This allows the frontend to work both locally and from network IPs
function getApiBaseUrl(): string {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In browser, use the same hostname but port 8001 for the backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:8001`;
  }
  
  // Fallback to localhost
  return 'http://localhost:8001';
}

const API_BASE_URL = getApiBaseUrl();

export interface SensorReading {
  timestamp: string;
  temperature: number;
  vibration: number;
  current: number;
  healthScore: number;
}

export interface MachineData {
  machineId: string;
  name: string;
  type: string;
  location: string;
  healthScore: number;
  rul: number;
  status: 'healthy' | 'warning' | 'critical';
  riskLevel: 'low' | 'medium' | 'high';
  rootCause: string | null;
  sensorHistory: SensorReading[];
  lastMaintenance: string;
  nextScheduled: string;
}

export interface Alert {
  id: string;
  machineId: string;
  machineName: string;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface FleetSummary {
  total: number;
  healthy: number;
  warning: number;
  critical: number;
  avgHealth: number;
}

export interface PredictionResult {
  engine_id: number;
  cycle: number;
  predicted_RUL: number;
  estimated_days_left: number;
  health_percentage: number;
  alert_level: string;
  probable_reason: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async getMachines(): Promise<MachineData[]> {
    return this.fetch<MachineData[]>('/api/machines');
  }

  async getMachine(machineId: string): Promise<MachineData> {
    return this.fetch<MachineData>(`/api/machines/${machineId}`);
  }

  async getAlerts(): Promise<Alert[]> {
    return this.fetch<Alert[]>('/api/alerts');
  }

  async getFleetSummary(): Promise<FleetSummary> {
    return this.fetch<FleetSummary>('/api/fleet/summary');
  }

  async getPrediction(engineId: number): Promise<PredictionResult> {
    return this.fetch<PredictionResult>(`/api/predict/${engineId}`);
  }

  async getLiveSensorData(machineId: string): Promise<SensorReading> {
    return this.fetch<SensorReading>(`/api/machines/${machineId}/live`);
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.fetch<{ message: string; status: string }>('/');
      return true;
    } catch {
      return false;
    }
  }
}

export const api = new ApiService();
export default api;
