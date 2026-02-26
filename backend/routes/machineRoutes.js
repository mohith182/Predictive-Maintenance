/**
 * Machine Routes
 * 
 * Defines API endpoints for machine data with LIVE SIMULATION
 * Health scores change dynamically based on simulated sensor data
 * Routes are prefixed with /api
 */

const express = require('express');
const router = express.Router();

// =====================================================
// LIVE ML SIMULATION ENGINE
// =====================================================

// Track the start time for simulation drift
const simulationStartTime = Date.now();

// Base machine configurations (starting points)
const machineConfigs = [
  {
    machineId: 'MCH-001',
    name: 'CNC Milling Unit Alpha',
    type: 'CNC Machine',
    location: 'Bay A — Floor 2',
    baseHealth: 87,
    degradationRate: 0.02,  // Slow degradation
    volatility: 0.5,        // Low volatility (stable machine)
    lastMaintenance: '2026-01-15',
    nextScheduled: '2026-03-28',
  },
  {
    machineId: 'MCH-002',
    name: 'Hydraulic Press Beta',
    type: 'Hydraulic Press',
    location: 'Bay B — Floor 1',
    baseHealth: 54,
    degradationRate: 0.08,  // Medium degradation
    volatility: 1.5,        // Higher volatility
    lastMaintenance: '2026-02-01',
    nextScheduled: '2026-03-01',
  },
  {
    machineId: 'MCH-003',
    name: 'Conveyor System Gamma',
    type: 'Conveyor',
    location: 'Assembly Line 3',
    baseHealth: 28,
    degradationRate: 0.15,  // Fast degradation (failing machine)
    volatility: 2.0,        // High volatility
    lastMaintenance: '2025-12-20',
    nextScheduled: '2026-02-28',
  },
  {
    machineId: 'MCH-004',
    name: 'Robotic Arm Delta',
    type: 'Robot',
    location: 'Cell 7 — Floor 3',
    baseHealth: 92,
    degradationRate: 0.01,  // Very slow degradation
    volatility: 0.3,        // Very stable
    lastMaintenance: '2026-02-10',
    nextScheduled: '2026-04-15',
  },
  {
    machineId: 'MCH-005',
    name: 'Injection Molder Epsilon',
    type: 'Injection Molder',
    location: 'Plastics Bay',
    baseHealth: 63,
    degradationRate: 0.06,  // Medium degradation
    volatility: 1.2,
    lastMaintenance: '2026-01-28',
    nextScheduled: '2026-03-10',
  },
  {
    machineId: 'MCH-006',
    name: 'Lathe Machine Zeta',
    type: 'Lathe',
    location: 'Bay A — Floor 1',
    baseHealth: 79,
    degradationRate: 0.03,
    volatility: 0.8,
    lastMaintenance: '2026-02-05',
    nextScheduled: '2026-03-20',
  },
];

/**
 * Simulate ML Prediction based on sensor readings
 * Same logic as predictionController but inline for routes
 */
function runPrediction(temperature, vibration, current) {
  const tempNorm = Math.min(Math.max((temperature - 20) / 80, 0), 1);
  const vibNorm = Math.min(Math.max(vibration / 10, 0), 1);
  const curNorm = Math.min(Math.max((current - 5) / 25, 0), 1);

  const degradationScore = (tempNorm * 0.35) + (vibNorm * 0.40) + (curNorm * 0.25);

  const maxRUL = 125;
  const predictedRUL = Math.max(0, maxRUL * (1 - degradationScore) + (Math.random() - 0.5) * 5);
  const healthPercentage = Math.round((predictedRUL / maxRUL) * 100);

  let status, riskLevel;
  if (healthPercentage > 70) {
    status = 'healthy';
    riskLevel = 'low';
  } else if (healthPercentage >= 40) {
    status = 'warning';
    riskLevel = 'medium';
  } else {
    status = 'critical';
    riskLevel = 'high';
  }

  return { healthPercentage, rul: Math.round(predictedRUL / 4), status, riskLevel };
}

/**
 * Generate LIVE sensor readings based on machine health and time
 * Adds realistic drift, noise, and degradation patterns
 */
function generateLiveSensorData(config) {
  const now = Date.now();
  const elapsedMinutes = (now - simulationStartTime) / 60000;
  
  // Calculate current health with degradation and random walk
  const degradation = config.degradationRate * (elapsedMinutes / 10);  // Degrade every 10 mins
  const randomWalk = (Math.sin(now / 30000) + Math.cos(now / 45000)) * config.volatility * 3;
  const noise = (Math.random() - 0.5) * config.volatility * 4;
  
  let currentHealth = config.baseHealth - degradation + randomWalk + noise;
  currentHealth = Math.max(5, Math.min(98, currentHealth));  // Clamp between 5-98
  
  // Generate sensor readings based on health (inverse relationship)
  const healthFactor = (100 - currentHealth) / 100;
  
  const temperature = 40 + healthFactor * 45 + (Math.random() - 0.5) * 8;
  const vibration = 0.3 + healthFactor * 6 + (Math.random() - 0.5) * 0.8;
  const current = 10 + healthFactor * 12 + (Math.random() - 0.5) * 2;
  
  return {
    temperature: Math.round(temperature * 10) / 10,
    vibration: Math.round(vibration * 100) / 100,
    current: Math.round(current * 10) / 10,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get root cause analysis based on sensor readings
 */
function getRootCause(status, temperature, vibration, current) {
  if (status === 'healthy') return null;
  
  // Determine primary issue based on sensor values
  if (vibration > 4) {
    return 'Bearing degradation detected — abnormal vibration pattern';
  } else if (temperature > 75) {
    return 'Thermal overload — sustained high temperature readings';
  } else if (current > 20) {
    return 'Electrical imbalance — current draw exceeding nominal range';
  } else if (vibration > 3) {
    return 'Mechanical misalignment — vibration frequency shift detected';
  } else {
    return 'Multiple stress factors — combined sensor anomaly detected';
  }
}

/**
 * Generate sensor history with LIVE data points
 * History moves forward in time, showing recent changes
 */
function generateSensorHistory(config, hours = 72) {
  const data = [];
  const now = Date.now();
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now - i * 3600000);
    const elapsedMinutes = (now - i * 3600000 - simulationStartTime) / 60000;
    
    // Calculate health at this historical point
    const degradation = Math.max(0, config.degradationRate * (elapsedMinutes / 10));
    const cycleNoise = (Math.sin(timestamp.getTime() / 30000) + Math.cos(timestamp.getTime() / 45000)) * config.volatility;
    const randomNoise = (Math.random() - 0.5) * config.volatility * 2;
    
    let historicalHealth = config.baseHealth - degradation + cycleNoise + randomNoise;
    historicalHealth = Math.max(5, Math.min(98, historicalHealth));
    
    const healthFactor = (100 - historicalHealth) / 100;
    
    data.push({
      timestamp: timestamp.toISOString(),
      temperature: Math.round((40 + healthFactor * 45 + (Math.random() - 0.5) * 5) * 10) / 10,
      vibration: Math.round((0.3 + healthFactor * 6 + (Math.random() - 0.5) * 0.5) * 100) / 100,
      current: Math.round((10 + healthFactor * 12 + (Math.random() - 0.5) * 1.5) * 10) / 10,
      healthScore: Math.round(historicalHealth),
    });
  }
  
  return data;
}

/**
 * Build full machine data with LIVE predictions
 */
function buildMachineData(config) {
  const sensorData = generateLiveSensorData(config);
  const prediction = runPrediction(sensorData.temperature, sensorData.vibration, sensorData.current);
  const sensorHistory = generateSensorHistory(config);
  
  return {
    machineId: config.machineId,
    name: config.name,
    type: config.type,
    location: config.location,
    healthScore: prediction.healthPercentage,
    rul: prediction.rul,
    status: prediction.status,
    riskLevel: prediction.riskLevel,
    rootCause: getRootCause(prediction.status, sensorData.temperature, sensorData.vibration, sensorData.current),
    sensorHistory,
    lastMaintenance: config.lastMaintenance,
    nextScheduled: config.nextScheduled,
    // Include current sensor readings
    currentSensors: sensorData,
  };
}

/**
 * Get all machines with LIVE data
 */
function getMachines() {
  return machineConfigs.map(config => buildMachineData(config));
}

/**
 * Generate LIVE alerts based on current machine states
 */
function generateAlerts() {
  const machines = getMachines();
  const alerts = [];
  
  machines.forEach((machine, index) => {
    if (machine.status === 'critical') {
      alerts.push({
        id: `ALT-${machine.machineId}-CRIT`,
        machineId: machine.machineId,
        machineName: machine.name,
        severity: 'critical',
        message: `CRITICAL: Immediate maintenance required — Health at ${machine.healthScore}%`,
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        acknowledged: false,
      });
    } else if (machine.status === 'warning') {
      alerts.push({
        id: `ALT-${machine.machineId}-WARN`,
        machineId: machine.machineId,
        machineName: machine.name,
        severity: 'warning',
        message: `WARNING: ${machine.rootCause || 'Schedule maintenance soon'} — Health at ${machine.healthScore}%`,
        timestamp: new Date(Date.now() - Math.random() * 8 * 3600000).toISOString(),
        acknowledged: false,
      });
    }
  });
  
  return alerts;
}

/**
 * @route   GET /api/machines
 * @desc    Get all machines with LIVE ML predictions
 */
router.get('/machines', (req, res) => {
  const machines = getMachines();
  console.log(`[ML] Generated predictions for ${machines.length} machines`);
  console.log(`[ML] Health scores: ${machines.map(m => `${m.machineId}=${m.healthScore}%`).join(', ')}`);
  res.json(machines);
});

/**
 * @route   GET /api/machines/:id
 * @desc    Get a single machine by ID with LIVE prediction
 */
router.get('/machines/:id', (req, res) => {
  const config = machineConfigs.find(c => c.machineId === req.params.id);
  if (!config) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  const machine = buildMachineData(config);
  console.log(`[ML] ${machine.machineId}: Health=${machine.healthScore}%, Status=${machine.status}`);
  res.json(machine);
});

/**
 * @route   GET /api/machines/:id/live
 * @desc    Get LIVE sensor data for a machine (real-time)
 */
router.get('/machines/:id/live', (req, res) => {
  const config = machineConfigs.find(c => c.machineId === req.params.id);
  if (!config) {
    return res.status(404).json({ error: 'Machine not found' });
  }
  
  const sensorData = generateLiveSensorData(config);
  const prediction = runPrediction(sensorData.temperature, sensorData.vibration, sensorData.current);
  
  res.json({
    ...sensorData,
    healthScore: prediction.healthPercentage,
    status: prediction.status,
    rul: prediction.rul,
  });
});

/**
 * @route   GET /api/alerts
 * @desc    Get all alerts based on LIVE machine states
 */
router.get('/alerts', (req, res) => {
  const alerts = generateAlerts();
  res.json(alerts);
});

/**
 * @route   GET /api/fleet/summary
 * @desc    Get fleet summary with LIVE statistics
 */
router.get('/fleet/summary', (req, res) => {
  const machines = getMachines();
  const total = machines.length;
  const healthy = machines.filter(m => m.status === 'healthy').length;
  const warning = machines.filter(m => m.status === 'warning').length;
  const critical = machines.filter(m => m.status === 'critical').length;
  const avgHealth = Math.round(machines.reduce((sum, m) => sum + m.healthScore, 0) / total);
  
  console.log(`[ML] Fleet Summary: Healthy=${healthy}, Warning=${warning}, Critical=${critical}, Avg=${avgHealth}%`);
  
  res.json({
    total,
    healthy,
    warning,
    critical,
    avgHealth,
  });
});

module.exports = router;
