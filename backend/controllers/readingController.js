/**
 * Reading Controller
 * 
 * Handles business logic for machine readings CRUD operations.
 * Each function is an async handler for Express routes.
 */

const pool = require('../db');

/**
 * Create a new machine reading
 * 
 * @route   POST /api/readings
 * @body    { temperature, vibration, current, rul? }
 */
const createReading = async (req, res) => {
  try {
    const { temperature, vibration, current, rul } = req.body;

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

    // Insert into database
    const query = `
      INSERT INTO machine_readings (temperature, vibration, current, rul)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [temperature, vibration, current, rul || null];
    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Reading created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating reading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reading',
      details: error.message,
    });
  }
};

/**
 * Get all machine readings
 * 
 * @route   GET /api/readings
 * @query   limit (optional) - Number of records to return
 * @query   offset (optional) - Number of records to skip
 */
const getAllReadings = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const query = `
      SELECT * FROM machine_readings
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);

    // Get total count for pagination
    const countResult = await pool.query('SELECT COUNT(*) FROM machine_readings');
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      count: result.rows.length,
      total: totalCount,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch readings',
      details: error.message,
    });
  }
};

/**
 * Get a single reading by ID
 * 
 * @route   GET /api/readings/:id
 */
const getReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'SELECT * FROM machine_readings WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reading not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching reading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reading',
      details: error.message,
    });
  }
};

/**
 * Delete a reading by ID
 * 
 * @route   DELETE /api/readings/:id
 */
const deleteReading = async (req, res) => {
  try {
    const { id } = req.params;

    // First delete associated predictions
    await pool.query('DELETE FROM predictions WHERE reading_id = $1', [id]);

    // Then delete the reading
    const query = 'DELETE FROM machine_readings WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reading not found',
      });
    }

    res.json({
      success: true,
      message: 'Reading deleted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error deleting reading:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete reading',
      details: error.message,
    });
  }
};

module.exports = {
  createReading,
  getAllReadings,
  getReadingById,
  deleteReading,
};
