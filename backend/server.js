/**
 * Machine Health Prediction System - Main Server
 * 
 * This is the entry point for the Express.js backend API.
 * It configures middleware, routes, and starts the HTTP server.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const readingRoutes = require('./routes/readingRoutes');
const predictionRoutes = require('./routes/predictionRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// ======================
// Middleware Configuration
// ======================

// Enable CORS for all origins (configure for production)
app.add_middleware = app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ======================
// API Routes
// ======================

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Machine Health Prediction API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      readings: '/api/readings',
      predictions: '/api/predictions',
      predict: '/api/predict',
    },
  });
});

// Mount route handlers
app.use('/api/readings', readingRoutes);
app.use('/api', predictionRoutes);

// ======================
// Error Handling
// ======================

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ======================
// Start Server
// ======================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   Machine Health Prediction API Server            ║
╠═══════════════════════════════════════════════════╣
║   Status:  Running                                ║
║   Port:    ${PORT}                                    ║
║   Mode:    ${process.env.NODE_ENV || 'production'}                          ║
╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
