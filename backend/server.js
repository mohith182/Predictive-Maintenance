/**
 * AI-Based Machine Health Prediction System - Main Server
 * 
 * Features:
 * - Express.js REST API
 * - PostgreSQL database
 * - Socket.io for real-time updates
 * - Nodemailer for email alerts
 * - Auto-trigger ML prediction on sensor data insert
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const axios = require('axios');
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

// ======================
// Socket.io Configuration
// ======================
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ======================
// PostgreSQL Configuration
// ======================
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'machine_health_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

// ======================
// Nodemailer Configuration
// ======================
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ======================
// Middleware Configuration
// ======================
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach io to request for use in routes
app.use((req, res, next) => {
  req.io = io;
  req.pool = pool;
  next();
});

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ======================
// Socket.io Events
// ======================
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('subscribe_machine', (machineId) => {
    socket.join(`machine_${machineId}`);
    console.log(`📡 Socket ${socket.id} subscribed to machine: ${machineId}`);
  });
  
  socket.on('unsubscribe_machine', (machineId) => {
    socket.leave(`machine_${machineId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ======================
// Helper Functions
// ======================

/**
 * Call ML API to get prediction
 */
async function getPrediction(sensorData) {
  try {
    const response = await axios.post(`${ML_API_URL}/api/predict`, sensorData, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error('ML API error:', error.message);
    return null;
  }
}

/**
 * Send alert email
 */
async function sendAlertEmail(alert, recipients) {
  if (!process.env.SMTP_USER || recipients.length === 0) {
    console.log('📧 Email skipped (no SMTP config or recipients)');
    return false;
  }
  
  const statusColor = alert.alert_type === 'CRITICAL' ? '#dc2626' : '#f59e0b';
  
  const mailOptions = {
    from: `"Machine Health Alert" <${process.env.SMTP_USER}>`,
    to: recipients.join(', '),
    subject: `🚨 ${alert.alert_type} Alert - ${alert.machine_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${statusColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${alert.alert_type} ALERT</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Machine: ${alert.machine_name}</h2>
          <p style="color: #666; font-size: 16px;">${alert.message}</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #333;">Sensor Readings</h3>
            <ul style="color: #666;">
              <li>Temperature: ${alert.temperature}°C</li>
              <li>Vibration: ${alert.vibration} mm/s</li>
              <li>Current: ${alert.current} A</li>
              <li>Predicted RUL: ${alert.predicted_rul} cycles</li>
            </ul>
          </div>
          
          <p style="color: #999; font-size: 12px;">
            Alert generated at: ${new Date().toLocaleString()}
          </p>
          
          <a href="${process.env.DASHBOARD_URL || 'http://localhost:8081'}/dashboard" 
             style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Dashboard
          </a>
        </div>
      </div>
    `
  };
  
  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`📧 Alert email sent to ${recipients.length} recipients`);
    return true;
  } catch (error) {
    console.error('Email error:', error.message);
    return false;
  }
}

// ======================
// API Routes
// ======================

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'AI-Based Machine Health Prediction API',
    status: 'running',
    version: '2.0.0',
    features: ['PostgreSQL', 'Socket.io', 'ML Prediction', 'Email Alerts']
  });
});

// Get all machines with latest status
app.get('/api/machines', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id,
        m.machine_id,
        m.name,
        m.type,
        m.location,
        m.status,
        p.health_status,
        p.predicted_rul,
        p.confidence_score,
        sr.temperature,
        sr.vibration,
        sr.current,
        sr.pressure,
        sr.timestamp as last_reading_time,
        (SELECT COUNT(*) FROM alerts a WHERE a.machine_id = m.id AND a.is_acknowledged = false) as unack_alerts
      FROM machines m
      LEFT JOIN LATERAL (
        SELECT * FROM predictions WHERE machine_id = m.id ORDER BY created_at DESC LIMIT 1
      ) p ON true
      LEFT JOIN LATERAL (
        SELECT * FROM sensor_readings WHERE machine_id = m.id ORDER BY timestamp DESC LIMIT 1
      ) sr ON true
      ORDER BY m.machine_id
    `);
    
    const machines = result.rows.map(m => ({
      machineId: m.machine_id,
      name: m.name,
      type: m.type,
      location: m.location,
      status: m.status?.toLowerCase() || 'unknown',
      healthStatus: m.health_status || 'NORMAL',
      healthScore: m.predicted_rul ? Math.min(100, (m.predicted_rul / 150) * 100) : 100,
      rul: m.predicted_rul || 150,
      confidenceScore: m.confidence_score || 0.95,
      sensors: {
        temperature: m.temperature || 55,
        vibration: m.vibration || 2.5,
        current: m.current || 12,
        pressure: m.pressure || 100
      },
      lastReadingTime: m.last_reading_time,
      unacknowledgedAlerts: m.unack_alerts || 0
    }));
    
    res.json(machines);
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// Get single machine details
app.get('/api/machines/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;
    
    const machineResult = await pool.query(
      'SELECT * FROM machines WHERE machine_id = $1',
      [machineId]
    );
    
    if (machineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    const machine = machineResult.rows[0];
    
    // Get recent readings
    const readingsResult = await pool.query(
      `SELECT * FROM sensor_readings 
       WHERE machine_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 50`,
      [machine.id]
    );
    
    // Get recent predictions
    const predictionsResult = await pool.query(
      `SELECT * FROM predictions 
       WHERE machine_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [machine.id]
    );
    
    // Get recent alerts
    const alertsResult = await pool.query(
      `SELECT * FROM alerts 
       WHERE machine_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [machine.id]
    );
    
    res.json({
      ...machine,
      readings: readingsResult.rows,
      predictions: predictionsResult.rows,
      alerts: alertsResult.rows
    });
  } catch (error) {
    console.error('Error fetching machine:', error);
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
});

// Insert sensor reading and trigger prediction
app.post('/api/sensor-data', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { machine_id, temperature, vibration, current, pressure, runtime_hours } = req.body;
    
    await client.query('BEGIN');
    
    // Get machine UUID
    const machineResult = await client.query(
      'SELECT id, name FROM machines WHERE machine_id = $1',
      [machine_id]
    );
    
    if (machineResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    const machine = machineResult.rows[0];
    
    // Insert sensor reading
    const readingResult = await client.query(
      `INSERT INTO sensor_readings (machine_id, temperature, vibration, current, pressure, runtime_hours)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, timestamp`,
      [machine.id, temperature, vibration, current, pressure || 100, runtime_hours || 0]
    );
    
    const reading = readingResult.rows[0];
    
    // Call ML API for prediction
    const prediction = await getPrediction({
      temperature,
      vibration,
      current,
      pressure: pressure || 100,
      runtime_hours: runtime_hours || 0
    });
    
    if (prediction) {
      // Store prediction
      const predResult = await client.query(
        `INSERT INTO predictions (machine_id, sensor_reading_id, health_status, predicted_rul, confidence_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [machine.id, reading.id, prediction.health_status, prediction.predicted_RUL, prediction.confidence]
      );
      
      // Update machine status
      const newStatus = prediction.health_status === 'NORMAL' ? 'NORMAL' 
        : prediction.health_status === 'WARNING' ? 'WARNING' : 'CRITICAL';
      
      await client.query(
        `UPDATE machines SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [newStatus, machine.id]
      );
      
      // Create alert if WARNING or CRITICAL
      if (prediction.health_status !== 'NORMAL') {
        const alertResult = await client.query(
          `INSERT INTO alerts (machine_id, prediction_id, alert_type, message)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [machine.id, predResult.rows[0].id, prediction.health_status, prediction.root_cause]
        );
        
        // Get alert recipients
        const recipientsResult = await client.query(
          `SELECT u.email FROM users u
           JOIN alert_recipients ar ON ar.user_id = u.id
           WHERE ar.machine_id = $1 AND u.email_notifications = true
           AND $2 = ANY(ar.alert_types)`,
          [machine.id, prediction.health_status]
        );
        
        const recipients = recipientsResult.rows.map(r => r.email);
        
        // Send alert email
        const emailSent = await sendAlertEmail({
          alert_type: prediction.health_status,
          machine_name: machine.name,
          message: prediction.root_cause,
          temperature,
          vibration,
          current,
          predicted_rul: prediction.predicted_RUL
        }, recipients);
        
        // Update alert with email status
        await client.query(
          `UPDATE alerts SET email_sent = $1, email_sent_at = CASE WHEN $1 THEN CURRENT_TIMESTAMP ELSE NULL END
           WHERE id = $2`,
          [emailSent, alertResult.rows[0].id]
        );
        
        // Emit alert via Socket.io
        io.emit('new_alert', {
          machineId: machine_id,
          machineName: machine.name,
          alertType: prediction.health_status,
          message: prediction.root_cause,
          rul: prediction.predicted_RUL,
          timestamp: new Date().toISOString()
        });
      }
      
      // Emit real-time update via Socket.io
      io.emit('machine_update', {
        machineId: machine_id,
        healthStatus: prediction.health_status,
        healthScore: Math.min(100, (prediction.predicted_RUL / 150) * 100),
        rul: prediction.predicted_RUL,
        confidence: prediction.confidence,
        sensors: { temperature, vibration, current, pressure },
        timestamp: new Date().toISOString()
      });
      
      io.to(`machine_${machine_id}`).emit('sensor_update', {
        temperature,
        vibration,
        current,
        pressure,
        prediction
      });
    }
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      reading_id: reading.id,
      timestamp: reading.timestamp,
      prediction
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing sensor data:', error);
    res.status(500).json({ error: 'Failed to process sensor data' });
  } finally {
    client.release();
  }
});

// Get alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { acknowledged } = req.query;
    
    let query = `
      SELECT a.*, m.machine_id, m.name as machine_name
      FROM alerts a
      JOIN machines m ON m.id = a.machine_id
    `;
    
    if (acknowledged !== undefined) {
      query += ` WHERE a.is_acknowledged = ${acknowledged === 'true'}`;
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT 100';
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Acknowledge alert
app.patch('/api/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { userId } = req.body;
    
    const result = await pool.query(
      `UPDATE alerts 
       SET is_acknowledged = true, acknowledged_by = $1, acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [userId, alertId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    // Emit update
    io.emit('alert_acknowledged', { alertId });
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Get sensor readings for a machine
app.get('/api/machines/:machineId/readings', async (req, res) => {
  try {
    const { machineId } = req.params;
    const { limit = 100 } = req.query;
    
    const machineResult = await pool.query(
      'SELECT id FROM machines WHERE machine_id = $1',
      [machineId]
    );
    
    if (machineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    
    const result = await pool.query(
      `SELECT * FROM sensor_readings 
       WHERE machine_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [machineResult.rows[0].id, parseInt(limit)]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// Get analytics/trends
app.get('/api/analytics', async (req, res) => {
  try {
    // Machine status distribution
    const statusDist = await pool.query(`
      SELECT status, COUNT(*) as count FROM machines GROUP BY status
    `);
    
    // Alert trends (last 7 days)
    const alertTrends = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        alert_type,
        COUNT(*) as count
      FROM alerts
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(created_at), alert_type
      ORDER BY date
    `);
    
    // Average health metrics
    const healthMetrics = await pool.query(`
      SELECT 
        AVG(predicted_rul) as avg_rul,
        MIN(predicted_rul) as min_rul,
        MAX(predicted_rul) as max_rul,
        COUNT(CASE WHEN health_status = 'CRITICAL' THEN 1 END) as critical_count
      FROM predictions
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
    `);
    
    res.json({
      statusDistribution: statusDist.rows,
      alertTrends: alertTrends.rows,
      healthMetrics: healthMetrics.rows[0]
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ======================
// Advanced Feature Routes
// ======================

/**
 * Fleet Status - Overview of all machines with sorting/filtering
 */
app.get('/api/fleet/status', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.machine_id,
        m.name,
        m.machine_type as type,
        m.location,
        COALESCE(
          (SELECT health_score FROM predictions WHERE machine_id = m.machine_id ORDER BY created_at DESC LIMIT 1),
          85
        ) as health_score,
        COALESCE(
          (SELECT predicted_rul FROM predictions WHERE machine_id = m.machine_id ORDER BY created_at DESC LIMIT 1),
          30
        ) as rul,
        CASE 
          WHEN (SELECT health_score FROM predictions WHERE machine_id = m.machine_id ORDER BY created_at DESC LIMIT 1) < 40 THEN 'critical'
          WHEN (SELECT health_score FROM predictions WHERE machine_id = m.machine_id ORDER BY created_at DESC LIMIT 1) < 70 THEN 'warning'
          ELSE 'healthy'
        END as status
      FROM machines m
      WHERE m.is_active = true
      ORDER BY health_score ASC
    `);

    const machines = result.rows.map(m => ({
      machineId: m.machine_id,
      name: m.name,
      type: m.type,
      location: m.location,
      healthScore: parseInt(m.health_score) || 85,
      rul: parseInt(m.rul) || 30,
      status: m.status || 'healthy'
    }));

    // Generate fleet summary
    const summary = {
      totalMachines: machines.length,
      healthyCount: machines.filter(m => m.status === 'healthy').length,
      warningCount: machines.filter(m => m.status === 'warning').length,
      criticalCount: machines.filter(m => m.status === 'critical').length,
      averageHealth: machines.length > 0 
        ? Math.round(machines.reduce((sum, m) => sum + m.healthScore, 0) / machines.length)
        : 0
    };

    res.json({ machines, summary });
  } catch (error) {
    console.error('Error fetching fleet status:', error);
    res.status(500).json({ error: 'Failed to fetch fleet status' });
  }
});

/**
 * What-If Simulation - Predict health based on simulated sensor values
 */
app.post('/api/simulate', async (req, res) => {
  try {
    const { machineId, temperature, vibration, current, loadFactor = 100, runtimeHours = 2000 } = req.body;

    // Simple simulation logic based on sensor thresholds
    let healthImpact = 100;
    
    // Temperature impact (optimal: 40-70°C)
    if (temperature > 90) healthImpact -= 30;
    else if (temperature > 80) healthImpact -= 20;
    else if (temperature > 70) healthImpact -= 10;
    else if (temperature < 30) healthImpact -= 5;
    
    // Vibration impact (optimal: 0-3 mm/s)
    if (vibration > 6) healthImpact -= 25;
    else if (vibration > 4.5) healthImpact -= 15;
    else if (vibration > 3) healthImpact -= 8;
    
    // Current impact (optimal: 10-20A)
    if (current > 30) healthImpact -= 20;
    else if (current > 25) healthImpact -= 12;
    else if (current > 20) healthImpact -= 5;
    else if (current < 8) healthImpact -= 10;
    
    // Load factor impact
    if (loadFactor > 120) healthImpact -= 15;
    else if (loadFactor > 100) healthImpact -= 8;
    
    // Runtime hours impact
    if (runtimeHours > 4000) healthImpact -= 10;
    else if (runtimeHours > 3000) healthImpact -= 5;

    const predictedHealth = Math.max(0, Math.min(100, healthImpact));
    
    // Determine status
    let status = 'healthy';
    if (predictedHealth < 40) status = 'critical';
    else if (predictedHealth < 70) status = 'warning';

    // Calculate estimated RUL
    const estimatedRUL = Math.max(1, Math.round(predictedHealth * 0.5));

    res.json({
      machineId,
      simulatedHealth: predictedHealth,
      currentHealth: predictedHealth, // Would fetch from DB in production
      healthDelta: 0, // Would calculate difference
      status,
      estimatedRUL,
      recommendations: generateSimulationRecommendations(temperature, vibration, current)
    });
  } catch (error) {
    console.error('Error running simulation:', error);
    res.status(500).json({ error: 'Simulation failed' });
  }
});

// Helper function to generate simulation recommendations
function generateSimulationRecommendations(temperature, vibration, current) {
  const recommendations = [];
  
  if (temperature > 80) {
    recommendations.push({
      type: 'temperature',
      message: 'Consider improving cooling system or reducing load',
      impact: 'high'
    });
  }
  
  if (vibration > 4) {
    recommendations.push({
      type: 'vibration',
      message: 'Schedule bearing inspection and alignment check',
      impact: 'high'
    });
  }
  
  if (current > 22) {
    recommendations.push({
      type: 'current',
      message: 'Check for electrical issues or motor overload',
      impact: 'medium'
    });
  }
  
  return recommendations;
}

/**
 * Get Maintenance Recommendations for a machine
 */
app.get('/api/recommendations/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;
    
    // Fetch latest sensor data and prediction
    const sensorResult = await pool.query(`
      SELECT temperature, vibration, current_draw as current, pressure
      FROM sensor_readings 
      WHERE machine_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [machineId]);

    const predictionResult = await pool.query(`
      SELECT health_score, predicted_rul, risk_level, probable_reasons
      FROM predictions 
      WHERE machine_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [machineId]);

    const sensor = sensorResult.rows[0] || { temperature: 65, vibration: 2.5, current: 15, pressure: 100 };
    const prediction = predictionResult.rows[0] || { health_score: 75, predicted_rul: 20, risk_level: 'low' };

    const recommendations = [];
    let priority = 1;

    // Temperature-based recommendations
    if (sensor.temperature > 85) {
      recommendations.push({
        id: `rec-${priority++}`,
        title: 'Critical Temperature Alert',
        description: 'Temperature exceeds safe operating limits. Immediate attention required.',
        priority: 'critical',
        estimatedCost: 25000,
        estimatedTime: '2-4 hours',
        actions: ['Shut down if temperature continues rising', 'Check coolant levels', 'Inspect thermal system']
      });
    } else if (sensor.temperature > 75) {
      recommendations.push({
        id: `rec-${priority++}`,
        title: 'Temperature Warning',
        description: 'Temperature is elevated. Monitor closely and plan maintenance.',
        priority: 'high',
        estimatedCost: 15000,
        estimatedTime: '1-2 hours',
        actions: ['Clean air filters', 'Check ventilation', 'Schedule thermal inspection']
      });
    }

    // Vibration-based recommendations
    if (sensor.vibration > 5) {
      recommendations.push({
        id: `rec-${priority++}`,
        title: 'Critical Vibration Detected',
        description: 'Abnormal vibration levels indicate potential bearing or alignment issues.',
        priority: 'critical',
        estimatedCost: 35000,
        estimatedTime: '4-8 hours',
        actions: ['Stop machine for inspection', 'Check bearing condition', 'Verify shaft alignment']
      });
    } else if (sensor.vibration > 3.5) {
      recommendations.push({
        id: `rec-${priority++}`,
        title: 'Elevated Vibration',
        description: 'Vibration levels are above normal. Schedule preventive maintenance.',
        priority: 'medium',
        estimatedCost: 20000,
        estimatedTime: '2-3 hours',
        actions: ['Lubricate bearings', 'Check for loose components', 'Monitor trends']
      });
    }

    // Current-based recommendations
    if (sensor.current > 25) {
      recommendations.push({
        id: `rec-${priority++}`,
        title: 'High Current Draw',
        description: 'Motor is drawing excess current. May indicate electrical or mechanical issues.',
        priority: 'high',
        estimatedCost: 18000,
        estimatedTime: '2-4 hours',
        actions: ['Check for mechanical binding', 'Inspect electrical connections', 'Verify motor windings']
      });
    }

    // RUL-based recommendations
    if (prediction.predicted_rul < 7) {
      recommendations.push({
        id: `rec-${priority++}`,
        title: 'Imminent Failure Risk',
        description: `Predicted remaining useful life is only ${prediction.predicted_rul} days. Plan replacement.`,
        priority: 'critical',
        estimatedCost: 100000,
        estimatedTime: '8-16 hours',
        actions: ['Order replacement parts immediately', 'Schedule emergency maintenance', 'Prepare backup machine']
      });
    } else if (prediction.predicted_rul < 14) {
      recommendations.push({
        id: `rec-${priority++}`,
        title: 'Schedule Major Maintenance',
        description: `Remaining useful life estimated at ${prediction.predicted_rul} days. Plan maintenance soon.`,
        priority: 'high',
        estimatedCost: 50000,
        estimatedTime: '4-8 hours',
        actions: ['Order spare parts', 'Schedule maintenance window', 'Review maintenance history']
      });
    }

    // General maintenance if no critical issues
    if (recommendations.length === 0) {
      recommendations.push({
        id: `rec-${priority++}`,
        title: 'Routine Maintenance',
        description: 'Machine is operating normally. Continue routine maintenance schedule.',
        priority: 'low',
        estimatedCost: 5000,
        estimatedTime: '1 hour',
        actions: ['Follow regular maintenance checklist', 'Log current readings', 'Schedule next inspection']
      });
    }

    res.json({
      machineId,
      healthScore: prediction.health_score,
      recommendations,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * SHAP Values - Feature contribution analysis
 */
app.get('/api/shap/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;
    
    // Fetch latest sensor data
    const sensorResult = await pool.query(`
      SELECT temperature, vibration, current_draw as current, pressure, rpm
      FROM sensor_readings 
      WHERE machine_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [machineId]);

    const sensor = sensorResult.rows[0] || { 
      temperature: 65, 
      vibration: 2.5, 
      current: 15, 
      pressure: 100,
      rpm: 1450 
    };

    // Calculate SHAP-like contributions (simplified model)
    const baseline = 75; // Average expected health
    
    // Temperature contribution
    const tempContribution = sensor.temperature > 70 
      ? -(sensor.temperature - 70) * 0.8 
      : Math.min((70 - sensor.temperature) * 0.3, 5);
    
    // Vibration contribution
    const vibContribution = sensor.vibration > 3 
      ? -(sensor.vibration - 3) * 4 
      : Math.min((3 - sensor.vibration) * 2, 5);
    
    // Current contribution
    const currContribution = sensor.current > 20 
      ? -(sensor.current - 20) * 1.5 
      : (sensor.current < 10 ? -(10 - sensor.current) : 3);
    
    // Pressure contribution
    const pressContribution = Math.abs(sensor.pressure - 100) > 10 
      ? -Math.abs(sensor.pressure - 100) * 0.3 
      : 2;
    
    // Runtime contribution (simulated)
    const runtimeContribution = -3;

    const contributions = [
      { 
        feature: 'temperature', 
        contribution: Math.round(tempContribution * 10) / 10, 
        value: sensor.temperature, 
        unit: '°C',
        description: sensor.temperature > 70 ? 'Above optimal range' : 'Within safe range'
      },
      { 
        feature: 'vibration', 
        contribution: Math.round(vibContribution * 10) / 10, 
        value: sensor.vibration, 
        unit: 'mm/s',
        description: sensor.vibration > 3 ? 'Elevated vibration detected' : 'Normal vibration levels'
      },
      { 
        feature: 'current', 
        contribution: Math.round(currContribution * 10) / 10, 
        value: sensor.current, 
        unit: 'A',
        description: sensor.current > 20 ? 'High current draw' : 'Normal current draw'
      },
      { 
        feature: 'pressure', 
        contribution: Math.round(pressContribution * 10) / 10, 
        value: sensor.pressure, 
        unit: 'PSI',
        description: Math.abs(sensor.pressure - 100) > 10 ? 'Pressure deviation' : 'Optimal pressure'
      },
      { 
        feature: 'runtime_hours', 
        contribution: runtimeContribution, 
        value: 2500, 
        unit: 'hrs',
        description: 'Accumulated wear factor'
      }
    ];

    const predictedHealth = Math.max(0, Math.min(100, 
      baseline + contributions.reduce((sum, c) => sum + c.contribution, 0)
    ));

    res.json({
      machineId,
      baselineHealth: baseline,
      predictedHealth: Math.round(predictedHealth),
      contributions: contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating SHAP values:', error);
    res.status(500).json({ error: 'Failed to calculate feature contributions' });
  }
});

/**
 * Cost Estimation for machine maintenance
 */
app.get('/api/cost-estimate/:machineId', async (req, res) => {
  try {
    const { machineId } = req.params;
    
    // Fetch machine and prediction data
    const predictionResult = await pool.query(`
      SELECT health_score, predicted_rul, risk_level
      FROM predictions 
      WHERE machine_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [machineId]);

    const prediction = predictionResult.rows[0] || { health_score: 75, predicted_rul: 20, risk_level: 'low' };
    
    // Base cost calculations (in INR)
    const downtimeCostPerHour = 5000; // ₹5,000 per hour
    
    // Estimate repair time based on health
    let estimatedRepairHours;
    if (prediction.health_score < 30) estimatedRepairHours = 12;
    else if (prediction.health_score < 50) estimatedRepairHours = 8;
    else if (prediction.health_score < 70) estimatedRepairHours = 4;
    else estimatedRepairHours = 2;
    
    // Calculate costs
    const laborCost = estimatedRepairHours * downtimeCostPerHour;
    const partsCost = prediction.health_score < 50 ? 40000 : prediction.health_score < 70 ? 20000 : 8000;
    const estimatedLoss = laborCost + partsCost;
    
    // Preventive maintenance savings
    const preventiveSavings = Math.round(estimatedLoss * 0.6);

    res.json({
      machineId,
      healthScore: prediction.health_score,
      downtimeCostPerHour,
      estimatedRepairHours,
      laborCost,
      partsCost,
      estimatedLoss,
      preventiveSavings,
      isHighCost: estimatedLoss > 50000,
      currency: 'INR',
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating cost estimate:', error);
    res.status(500).json({ error: 'Failed to calculate cost estimate' });
  }
});

// ======================
// Error Handling
// ======================

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ======================
// Start Server
// ======================

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   AI-Based Machine Health Prediction API Server           ║
╠═══════════════════════════════════════════════════════════╣
║   Version: 2.0.0                                          ║
║   Port: ${PORT}                                              ║
║   PostgreSQL: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}                         ║
║   ML API: ${ML_API_URL}                        ║
║   Socket.io: Enabled                                      ║
╠═══════════════════════════════════════════════════════════╣
║   Endpoints:                                              ║
║   GET  /api/machines          - List all machines         ║
║   GET  /api/machines/:id      - Machine details           ║
║   POST /api/sensor-data       - Insert sensor data        ║
║   GET  /api/alerts            - List alerts               ║
║   GET  /api/analytics         - Dashboard analytics       ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, io, pool };
