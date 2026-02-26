// API service for connecting to the FastAPI backend

// Dynamically determine the API URL based on environment
function getApiBaseUrl(): string {
  // Production: Use environment variable (required)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Development fallback: Use same hostname with port 8000
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const hostname = window.location.hostname;
    // Only use localhost fallback in development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:8000`;
    }
  }
  
  // Production should never reach here - throw error
  if (import.meta.env.PROD) {
    console.error('VITE_API_URL is not set in production environment!');
    throw new Error('API URL not configured. Set VITE_API_URL environment variable.');
  }
  
  // Development fallback
  return 'http://localhost:8000';
}

const API_BASE_URL = getApiBaseUrl();
export { API_BASE_URL };

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
  totalMachines?: number;
  healthyCount?: number;
  warningCount?: number;
  criticalCount?: number;
}

export interface SimulationRequest {
  machineId: string;
  temperature: number;
  vibration: number;
  current: number;
  loadFactor?: number;
  runtimeHours?: number;
}

export interface SimulationResult {
  machineId: string;
  simulatedHealth: number;
  currentHealth: number;
  healthDelta: number;
  status: string;
  estimatedRUL: number;
  recommendations: Array<{
    type: string;
    message: string;
    impact: string;
  }>;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
  estimatedTime: string;
  actions: string[];
}

export interface SHAPContribution {
  feature: string;
  contribution: number;
  value: number;
  unit: string;
  description?: string;
}

export interface CostEstimate {
  machineId: string;
  healthScore: number;
  downtimeCostPerHour: number;
  estimatedRepairHours: number;
  laborCost: number;
  partsCost: number;
  estimatedLoss: number;
  preventiveSavings: number;
  isHighCost: boolean;
  currency: string;
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

  // Subscribe email for alerts
  async subscribeEmail(email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/alerts/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  }

  // Check for critical machines and send alerts
  async checkAndSendAlerts(email: string): Promise<{ success: boolean; alertsSent: number }> {
    const response = await fetch(`${this.baseUrl}/api/alerts/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  }

  // Send test alert
  async sendTestAlert(email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/alerts/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  }

  // Fleet status with all machines
  async getFleetStatus(): Promise<{ machines: MachineData[]; summary: FleetSummary }> {
    return this.fetch('/api/fleet/status');
  }

  // What-If Simulation
  async runSimulation(request: SimulationRequest): Promise<SimulationResult> {
    const response = await fetch(`${this.baseUrl}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(`Simulation failed: ${response.status}`);
    }
    return response.json();
  }

  // Get maintenance recommendations
  async getRecommendations(machineId: string): Promise<{ machineId: string; healthScore: number; recommendations: Recommendation[] }> {
    return this.fetch(`/api/recommendations/${machineId}`);
  }

  // Get SHAP values for explainable AI
  async getSHAPValues(machineId: string): Promise<{ 
    machineId: string;
    baselineHealth: number;
    predictedHealth: number;
    contributions: SHAPContribution[];
  }> {
    return this.fetch(`/api/shap/${machineId}`);
  }

  // Get cost estimate
  async getCostEstimate(machineId: string): Promise<CostEstimate> {
    return this.fetch(`/api/cost-estimate/${machineId}`);
  }
}

export const api = new ApiService();
export default api;
