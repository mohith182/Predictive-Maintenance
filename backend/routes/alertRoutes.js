/**
 * Alert Routes
 * 
 * Defines API endpoints for email alert subscriptions and monitoring
 */

const express = require('express');
const router = express.Router();
const { sendHealthAlert, sendTestEmail } = require('../services/emailService');

/**
 * Helper: Convert machine data to email data format
 */
function toEmailFormat(machine) {
  const history = machine.sensorHistory || [];
  const latest = history.length > 0 ? history[history.length - 1] : {};
  
  return {
    machine_id: machine.machineId,
    machine_name: machine.name,
    health_status: machine.status === 'critical' ? 'CRITICAL' : 'WARNING',
    predicted_rul: machine.rul,
    temperature: latest.temperature || 70,
    vibration: latest.vibration || 3.5,
    current: latest.current || 18,
    root_cause: machine.rootCause || 'Abnormal sensor readings detected',
  };
}

// In-memory storage for subscribed emails and sent alerts
// In production, use a database
const subscribedEmails = new Set();
const sentAlerts = new Map(); // machineId -> { email, timestamp }

// Machine data (imported from machineRoutes or could be shared)
function generateSensorHistory(healthScore, hours = 72) {
  const data = [];
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

const getMachines = () => [
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
    lastMaintenance: '2026-02-01',
    nextScheduled: '2026-03-01',
  },
  {
    machineId: 'MCH-003',
    name: 'Conveyor System Gamma',
    type: 'Conveyor',
    location: 'Assembly Line 3',
    healthScore: 28,
    rul: 3,
    status: 'critical',
    riskLevel: 'high',
    rootCause: 'Thermal overload — sustained high temperature readings',
    sensorHistory: generateSensorHistory(28),
    lastMaintenance: '2025-12-20',
    nextScheduled: '2026-02-28',
  },
  {
    machineId: 'MCH-004',
    name: 'Robotic Arm Delta',
    type: 'Robot',
    location: 'Cell 7 — Floor 3',
    healthScore: 92,
    rul: 68,
    status: 'healthy',
    riskLevel: 'low',
    rootCause: null,
    sensorHistory: generateSensorHistory(92),
    lastMaintenance: '2026-02-10',
    nextScheduled: '2026-04-15',
  },
  {
    machineId: 'MCH-005',
    name: 'Injection Molder Epsilon',
    type: 'Injection Molder',
    location: 'Plastics Bay',
    healthScore: 63,
    rul: 18,
    status: 'warning',
    riskLevel: 'medium',
    rootCause: 'Electrical imbalance — current draw exceeding nominal range',
    sensorHistory: generateSensorHistory(63),
    lastMaintenance: '2026-01-28',
    nextScheduled: '2026-03-10',
  },
  {
    machineId: 'MCH-006',
    name: 'Lathe Machine Zeta',
    type: 'Lathe',
    location: 'Bay A — Floor 1',
    healthScore: 79,
    rul: 35,
    status: 'healthy',
    riskLevel: 'low',
    rootCause: null,
    sensorHistory: generateSensorHistory(79),
    lastMaintenance: '2026-02-05',
    nextScheduled: '2026-03-20',
  },
];

/**
 * @route   POST /api/alerts/subscribe
 * @desc    Subscribe an email for alert notifications
 */
router.post('/subscribe', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  subscribedEmails.add(email);
  console.log(`[ALERTS] Email subscribed: ${email}`);
  
  // Send confirmation email
  const result = await sendTestEmail(email);
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: 'Email subscribed successfully. Confirmation email sent.',
      email 
    });
  } else {
    // Still subscribe even if confirmation email fails
    res.json({ 
      success: true, 
      message: 'Email subscribed successfully. Confirmation email could not be sent.',
      email,
      emailError: result.error
    });
  }
});

/**
 * @route   DELETE /api/alerts/unsubscribe
 * @desc    Unsubscribe an email from alert notifications
 */
router.delete('/unsubscribe', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  
  subscribedEmails.delete(email);
  console.log(`[ALERTS] Email unsubscribed: ${email}`);
  
  res.json({ success: true, message: 'Email unsubscribed successfully' });
});

/**
 * @route   GET /api/alerts/subscriptions
 * @desc    Get all subscribed emails (for admin)
 */
router.get('/subscriptions', (req, res) => {
  res.json({ 
    success: true, 
    count: subscribedEmails.size,
    emails: Array.from(subscribedEmails)
  });
});

/**
 * @route   POST /api/alerts/check
 * @desc    Check machines and send alerts for critical ones
 */
router.post('/check', async (req, res) => {
  const { email } = req.body;
  const machines = getMachines();
  
  // Find critical machines (status === 'critical' or healthScore < 30)
  const criticalMachines = machines.filter(m => 
    m.status === 'critical' || m.healthScore < 30
  );
  
  if (criticalMachines.length === 0) {
    return res.json({ 
      success: true, 
      message: 'No critical machines found',
      alertsSent: 0 
    });
  }
  
  const emailsToNotify = email ? [email] : Array.from(subscribedEmails);
  
  if (emailsToNotify.length === 0) {
    return res.json({ 
      success: true, 
      message: 'No subscribed emails to notify',
      alertsSent: 0 
    });
  }
  
  const results = [];
  
  for (const machine of criticalMachines) {
    for (const recipientEmail of emailsToNotify) {
      // Check if we already sent an alert for this machine to this email in the last 3 minutes
      const alertKey = `${machine.machineId}-${recipientEmail}`;
      const lastAlert = sentAlerts.get(alertKey);
      const threeMinutesAgo = Date.now() - 3 * 60 * 1000;
      
      if (lastAlert && lastAlert.timestamp > threeMinutesAgo) {
        results.push({
          machineId: machine.machineId,
          email: recipientEmail,
          status: 'skipped',
          reason: 'Alert already sent within last 3 minutes'
        });
        continue;
      }
      
      const result = await sendHealthAlert(recipientEmail, toEmailFormat(machine));
      
      if (result.success) {
        sentAlerts.set(alertKey, { email: recipientEmail, timestamp: Date.now() });
      }
      
      results.push({
        machineId: machine.machineId,
        machineName: machine.name,
        email: recipientEmail,
        status: result.success ? 'sent' : 'failed',
        error: result.error
      });
    }
  }
  
  const sentCount = results.filter(r => r.status === 'sent').length;
  
  res.json({ 
    success: true, 
    message: `Checked ${criticalMachines.length} critical machines`,
    alertsSent: sentCount,
    results 
  });
});

/**
 * @route   POST /api/alerts/test
 * @desc    Send a test alert email
 */
router.post('/test', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  
  // Send test alert with mock critical machine
  const testMachine = {
    machineId: 'MCH-TEST',
    name: 'Test Machine',
    type: 'Test Equipment',
    location: 'Test Bay',
    healthScore: 15,
    rul: 1,
    status: 'critical',
    rootCause: 'This is a test alert - no action required',
  };
  
  const result = await sendHealthAlert(email, toEmailFormat(testMachine));
  
  if (result.success) {
    res.json({ success: true, message: 'Test alert sent successfully', messageId: result.messageId });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

// Background monitoring function
let monitoringInterval = null;

const startMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  // Check every minute for critical machines
  monitoringInterval = setInterval(async () => {
    const machines = getMachines();
    const criticalMachines = machines.filter(m => 
      m.status === 'critical' || m.healthScore < 30
    );
    
    if (criticalMachines.length === 0 || subscribedEmails.size === 0) {
      return;
    }
    
    console.log(`[MONITOR] Found ${criticalMachines.length} critical machines, ${subscribedEmails.size} subscribers`);
    
    for (const machine of criticalMachines) {
      for (const email of subscribedEmails) {
        const alertKey = `${machine.machineId}-${email}`;
        const lastAlert = sentAlerts.get(alertKey);
        const threeMinutesAgo = Date.now() - 3 * 60 * 1000;
        
        if (!lastAlert || lastAlert.timestamp <= threeMinutesAgo) {
          const result = await sendHealthAlert(email, toEmailFormat(machine));
          if (result.success) {
            sentAlerts.set(alertKey, { email, timestamp: Date.now() });
            console.log(`[MONITOR] Alert sent to ${email} for ${machine.machineId}`);
          }
        }
      }
    }
  }, 60000); // Check every minute
  
  console.log('[MONITOR] Machine health monitoring started');
};

// Start monitoring when this module loads
startMonitoring();

module.exports = router;
module.exports.startMonitoring = startMonitoring;
