/**
 * Reading Routes
 * 
 * Defines API endpoints for machine readings operations.
 * Routes are prefixed with /api/readings
 */

const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');

/**
 * @route   POST /api/readings
 * @desc    Insert a new machine reading
 * @access  Public
 */
router.post('/', readingController.createReading);

/**
 * @route   GET /api/readings
 * @desc    Get all machine readings
 * @access  Public
 */
router.get('/', readingController.getAllReadings);

/**
 * @route   GET /api/readings/:id
 * @desc    Get a single reading by ID
 * @access  Public
 */
router.get('/:id', readingController.getReadingById);

/**
 * @route   DELETE /api/readings/:id
 * @desc    Delete a reading by ID
 * @access  Public
 */
router.delete('/:id', readingController.deleteReading);

module.exports = router;
