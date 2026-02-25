/**
 * Prediction Routes
 * 
 * Defines API endpoints for ML predictions operations.
 * Routes are prefixed with /api
 */

const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

/**
 * @route   POST /api/predict
 * @desc    Make a new prediction based on sensor readings
 * @access  Public
 */
router.post('/predict', predictionController.makePrediction);

/**
 * @route   GET /api/predictions
 * @desc    Get all predictions with their associated readings
 * @access  Public
 */
router.get('/predictions', predictionController.getAllPredictions);

/**
 * @route   GET /api/predictions/:id
 * @desc    Get a single prediction by ID
 * @access  Public
 */
router.get('/predictions/:id', predictionController.getPredictionById);

/**
 * @route   GET /api/predictions/reading/:readingId
 * @desc    Get predictions for a specific reading
 * @access  Public
 */
router.get('/predictions/reading/:readingId', predictionController.getPredictionsByReadingId);

module.exports = router;
