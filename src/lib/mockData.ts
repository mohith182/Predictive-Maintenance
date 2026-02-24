// Simulated sensor data and ML predictions for the dashboard

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
  rul: number; // Remaining Useful Life in days
  status: 'healthy' | 'warning' | 'critical';
  riskLevel: 'low' | 'medium' | 'high';
  rootCause: string | null;
  sensorHistory: SensorReading[];
  lastMaintenance: string;
  nextScheduled: string;
}

function generateSensorHistory(healthScore: number, hours: number = 72): SensorReading[] {
  const data: SensorReading[] = [];
  const now = Date.now();
  const degradation = (100 - healthScore) / 100;

  for (let i = hours; i >= 0; i--) {
    const t = new Date(now - i * 3600000);
    const noise = () => (Math.random() - 0.5) * 2;
    const trend = (hours - i) / hours;

    const temp = 45 + degradation * 35 + trend * degradation * 15 + noise() * 3;
    const vib = 0.5 + degradation * 4 + trend * degradation * 2 + noise() * 0.3;
    const cur = 12 + degradation * 8 + trend * degradation * 4 + noise() * 0.5;
    const health = Math.max(0, Math.min(100, healthScore + (1 - trend) * 15 + noise() * 2));

    data.push({
      timestamp: t.toISOString(),
      temperature: Math.round(temp * 10) / 10,
      vibration: Math.round(vib * 100) / 100,
      current: Math.round(cur * 10) / 10,
      healthScore: Math.round(health),
    });
  }
  return data;
}

function getStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score > 70) return 'healthy';
  if (score >= 40) return 'warning';
  return 'critical';
}

function getRisk(score: number): 'low' | 'medium' | 'high' {
  if (score > 70) return 'low';
  if (score >= 40) return 'medium';
  return 'high';
}

function getRootCause(score: number): string | null {
  if (score > 70) return null;
  const causes = [
    'Bearing degradation detected — abnormal vibration pattern',
    'Thermal overload — sustained high temperature readings',
    'Electrical imbalance — current draw exceeding nominal range',
    'Mechanical misalignment — vibration frequency shift detected',
    'Lubrication failure — friction coefficient increasing',
  ];
  return causes[Math.floor(Math.random() * causes.length)];
}

export const machines: MachineData[] = [
  {
    machineId: 'MCH-001',
    name: 'CNC Milling Unit Alpha',
    type: 'CNC Machine',
    location: 'Bay A — Floor 2',
    healthScore: 87,
    rul: 42,
    status: 'healthy',
    riskLevel: 'low',
    rootCause: null,
    sensorHistory: generateSensorHistory(87),
    lastMaintenance: '2026-01-15',
    nextScheduled: '2026-03-28',
  },
  {
    machineId: 'MCH-002',
    name: 'Hydraulic Press Beta',
    type: 'Hydraulic Press',
    location: 'Bay B — Floor 1',
    healthScore: 54,
    rul: 11,
    status: 'warning',
    riskLevel: 'medium',
    rootCause: 'Bearing degradation detected — abnormal vibration pattern',
    sensorHistory: generateSensorHistory(54),
    lastMaintenance: '2025-12-20',
    nextScheduled: '2026-03-01',
  },
  {
    machineId: 'MCH-003',
    name: 'Conveyor Motor Gamma',
    type: 'Electric Motor',
    location: 'Bay C — Floor 1',
    healthScore: 28,
    rul: 4,
    status: 'critical',
    riskLevel: 'high',
    rootCause: 'Thermal overload — sustained high temperature readings',
    sensorHistory: generateSensorHistory(28),
    lastMaintenance: '2025-11-10',
    nextScheduled: '2026-02-25',
  },
  {
    machineId: 'MCH-004',
    name: 'Robotic Arm Delta',
    type: 'Robotic Arm',
    location: 'Bay A — Floor 3',
    healthScore: 92,
    rul: 68,
    status: 'healthy',
    riskLevel: 'low',
    rootCause: null,
    sensorHistory: generateSensorHistory(92),
    lastMaintenance: '2026-02-01',
    nextScheduled: '2026-05-15',
  },
  {
    machineId: 'MCH-005',
    name: 'Compressor Unit Epsilon',
    type: 'Air Compressor',
    location: 'Bay D — Floor 1',
    healthScore: 45,
    rul: 9,
    status: 'warning',
    riskLevel: 'medium',
    rootCause: 'Electrical imbalance — current draw exceeding nominal range',
    sensorHistory: generateSensorHistory(45),
    lastMaintenance: '2025-12-05',
    nextScheduled: '2026-03-10',
  },
];

export function getMachineById(id: string): MachineData | undefined {
  return machines.find(m => m.machineId.toLowerCase() === id.toLowerCase() || m.name.toLowerCase().includes(id.toLowerCase()));
}

export function getFleetSummary() {
  const total = machines.length;
  const healthy = machines.filter(m => m.status === 'healthy').length;
  const warning = machines.filter(m => m.status === 'warning').length;
  const critical = machines.filter(m => m.status === 'critical').length;
  const avgHealth = Math.round(machines.reduce((sum, m) => sum + m.healthScore, 0) / total);
  return { total, healthy, warning, critical, avgHealth };
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

export const alerts: Alert[] = [
  {
    id: 'ALT-001',
    machineId: 'MCH-003',
    machineName: 'Conveyor Motor Gamma',
    severity: 'critical',
    message: 'Machine likely to fail within 4 days. Schedule maintenance immediately.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'ALT-002',
    machineId: 'MCH-002',
    machineName: 'Hydraulic Press Beta',
    severity: 'warning',
    message: 'Machine likely to fail within 11 days. Schedule maintenance.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'ALT-003',
    machineId: 'MCH-005',
    machineName: 'Compressor Unit Epsilon',
    severity: 'warning',
    message: 'Machine likely to fail within 9 days. Schedule maintenance.',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    acknowledged: true,
  },
];
