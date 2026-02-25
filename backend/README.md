# Machine Health Prediction System - Backend API

## Overview

This is a Node.js + Express.js backend API for a Machine Health Prediction System using PostgreSQL.

## Project Structure

```
backend/
├── server.js              # Main entry point
├── db.js                   # PostgreSQL connection pool
├── package.json            # Dependencies
├── .env                    # Environment variables
├── routes/
│   ├── readingRoutes.js    # Routes for machine readings
│   └── predictionRoutes.js # Routes for predictions
├── controllers/
│   ├── readingController.js    # Business logic for readings
│   └── predictionController.js # Business logic for predictions
└── database/
    └── init.sql            # Database setup script
```

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup PostgreSQL Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE machine_health_db;"

# Run the init script
psql -U postgres -d machine_health_db -f database/init.sql
```

### 3. Configure Environment Variables

Edit `.env` file with your PostgreSQL credentials:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=machine_health_db
DB_PASSWORD=your_password_here
DB_PORT=5432
PORT=3001
```

### 4. Start the Server

```bash
# Production
npm start

# Development (with auto-reload)
npm run dev
```

## API Endpoints

### Health Check

```
GET /
```

### Machine Readings

```
POST /api/readings          # Create new reading
GET  /api/readings          # Get all readings
GET  /api/readings/:id      # Get reading by ID
DELETE /api/readings/:id    # Delete reading
```

### Predictions

```
POST /api/predict           # Make prediction (creates reading + prediction)
GET  /api/predictions       # Get all predictions
GET  /api/predictions/:id   # Get prediction by ID
```

## Example Requests

### Create a Prediction

```bash
curl -X POST http://localhost:3001/api/predict \
  -H "Content-Type: application/json" \
  -d '{"temperature": 55.5, "vibration": 2.3, "current": 14.5}'
```

### Get All Predictions

```bash
curl http://localhost:3001/api/predictions
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Description",
  "data": { ... }
}
```

## License

ISC
