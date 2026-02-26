/**
 * Prediction Controller
 * 
 * Handles business logic for ML predictions.
 * Includes a simulated ML prediction function that can be
 * replaced with actual model calls.
 * 
 * Automatically sends email alerts for WARNING and CRITICAL status.
 */

const pool = require('../db');
const { sendHealthAlert } = require('../services/emailService');

/**
 * Simulate ML Prediction
 * 
 * This function simulates an ML model prediction.
 * In production, this would call the actual ML model API
 * (e.g., the FastAPI backend running on port 8001)
 * 
 * @param {number} temperature - Temperature reading
 * @param {number} vibration - Vibration reading
 * @param {number} current - Current reading
 * @returns {object} Prediction result with RUL and health status
 */
const simulatePrediction = (temperature, vibration, current) => {
  // Normalize inputs (simulating feature scaling)
  const tempNorm = Math.min(Math.max((temperature - 20) / 80, 0), 1);
  const vibNorm = Math.min(Math.max(vibration / 10, 0), 1);
  const curNorm = Math.min(Math.max((current - 5) / 25, 0), 1);

  // Weighted average for health score (higher = worse condition)
  const degradationScore = (tempNorm * 0.35) + (vibNorm * 0.40) + (curNorm * 0.25);

  // Calculate RUL (Remaining Useful Life) in days
  // Max RUL is 125 cycles, approx 31 days (4 cycles per day)
  const maxRUL = 125;
  const predictedRUL = Math.max(0, maxRUL * (1 - degradationScore) + (Math.random() - 0.5) * 10);
  const daysRemaining = predictedRUL / 4;

  // Determine health status based on RUL
  let healthStatus;
  if (predictedRUL > 80) {
    healthStatus = 'HEALTHY';
  } else if (predictedRUL > 40) {
    healthStatus = 'WARNING';
  } else {
    healthStatus = 'CRITICAL';
  }

  return {
    predictedRUL: Math.round(predictedRUL * 100) / 100,
    daysRemaining: Math.round(daysRemaining * 100) / 100,
    healthStatus,
    healthPercentage: Math.round((predictedRUL / maxRUL) * 100),
    confidence: Math.round((0.85 + Math.random() * 0.1) * 100) / 100,
  };
};

/**
 * Make a new prediction
 * 
 * Accepts sensor readings, runs prediction, stores result,
 * and automatically sends email alert if WARNING or CRITICAL
 * 
 * @route   POST /api/predict
 * @body    { machine_id, temperature, vibration, current, user_email }
 */
const makePrediction = async (req, res) => {
  try {
    const { machine_id, temperature, vibration, current, user_email } = req.body;

    // Validate required fields
    if (temperature === undefined || vibration === undefined || current === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: temperature, vibration, and current are required',
      });
    }

    // Validate data types
    if (isNaN(temperature) || isNaN(vibration) || isNaN(current)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data types: temperature, vibration, and current must be numbers',
      });
    }

    // Step 1: Store the reading
    const readingQuery = `
      INSERT INTO machine_readings (temperature, vibration, current)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const readingResult = await pool.query(readingQuery, [temperature, vibration, current]);
    const reading = readingResult.rows[0];

    // Step 2: Run prediction
    const prediction = simulatePrediction(temperature, vibration, current);

    // Step 3: Update reading with RUL
    await pool.query(
      'UPDATE machine_readings SET rul = $1 WHERE id = $2',
      [prediction.predictedRUL, reading.id]
    );

    // Step 4: Store prediction
    const predictionQuery = `
      INSERT INTO predictions (reading_id, predicted_rul, health_status)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const predictionResult = await pool.query(predictionQuery, [
      reading.id,
      prediction.predictedRUL,
      prediction.healthStatus,
    ]);

    // Step 5: Send email alert if WARNING or CRITICAL (automatic)
    let emailResult = null;
    if (user_email && (prediction.healthStatus === 'WARNING' || prediction.healthStatus === 'CRITICAL')) {
      console.log(`[PREDICTION] Health status is ${prediction.healthStatus}, sending email to ${user_email}`);
      
      emailResult = await sendHealthAlert(user_email, {
        machine_id: machine_id || `MCH-${reading.id}`,
        temperature,
        vibration,
        current,
        predicted_rul: prediction.predictedRUL,
        health_status: prediction.healthStatus,
        health_percentage: prediction.healthPercentage,
        confidence: prediction.confidence,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Prediction completed successfully',
      data: {
        reading: {
          id: reading.id,
          machine_id: machine_id || `MCH-${reading.id}`,
          temperature,
          vibration,
          current,
          rul: prediction.predictedRUL,
          created_at: reading.created_at,
        },
        prediction: {
          id: predictionResult.rows[0].id,
          predicted_rul: prediction.predictedRUL,
          days_remaining: prediction.daysRemaining,
          health_status: prediction.healthStatus,
          health_percentage: prediction.healthPercentage,
          confidence: prediction.confidence,
          created_at: predictionResult.rows[0].created_at,
        },
        email_alert: emailResult ? {
          sent: emailResult.success && !emailResult.skipped,
          type: emailResult.type || null,
          skipped: emailResult.skipped || false,
          reason: emailResult.reason || null,
        } : {
          sent: false,
          reason: user_email ? 'Status is NORMAL/HEALTHY' : 'No user email provided',
        },
      },
    });
  } catch (error) {
    console.error('Error making prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to make prediction',
      details: error.message,
    });
  }
};

/**
 * Get all predictions with associated readings
 * 
 * @route   GET /api/predictions
 * @query   limit (optional) - Number of records to return
 * @query   offset (optional) - Number of records to skip
 */
const getAllPredictions = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const query = `
      SELECT 
        p.id,
        p.reading_id,
        p.predicted_rul,
        p.health_status,
        p.created_at,
        r.temperature,
        r.vibration,
        r.current,
        r.rul as actual_rul
      FROM predictions p
      JOIN machine_readings r ON p.reading_id = r.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM predictions');
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      count: result.rows.length,
      total: totalCount,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictions',
      details: error.message,
    });
  }
};

/**
 * Get a single prediction by ID
 * 
 * @route   GET /api/predictions/:id
 */
const getPredictionById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.id,
        p.reading_id,
        p.predicted_rul,
        p.health_status,
        p.created_at,
        r.temperature,
        r.vibration,
        r.current,
        r.rul as actual_rul
      FROM predictions p
      JOIN machine_readings r ON p.reading_id = r.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Prediction not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prediction',
      details: error.message,
    });
  }
};

/**
 * Get predictions for a specific reading
 * 
 * @route   GET /api/predictions/reading/:readingId
 */
const getPredictionsByReadingId = async (req, res) => {
  try {
    const { readingId } = req.params;

    const query = `
      SELECT * FROM predictions
      WHERE reading_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [readingId]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictions',
      details: error.message,
    });
  }
};

module.exports = {
  makePrediction,
  getAllPredictions,
  getPredictionById,
  getPredictionsByReadingId,
};
