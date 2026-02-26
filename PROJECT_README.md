# AI-Based Machine Health Prediction System

## Final Year Project

A comprehensive predictive maintenance system using Machine Learning to predict machine failures in advance and provide real-time health monitoring with automatic alerts.

## Features

- **GradientBoosting ML Model** for health prediction (NORMAL/WARNING/CRITICAL)
- **RUL Prediction** (Remaining Useful Life in cycles)
- **Real-time Dashboard** with Socket.io for live updates
- **Automatic Email Alerts** for WARNING/CRITICAL conditions
- **PostgreSQL Database** for persistent storage
- **5-Feature Prediction**: temperature, vibration, current, pressure, runtime_hours

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React.js + TypeScript + Vite |
| Backend API | Node.js + Express + Socket.io |
| ML API | Python + FastAPI |
| ML Algorithm | GradientBoosting (Classifier + Regressor) |
| Database | PostgreSQL |
| Real-time | Socket.io |
| Email | Nodemailer |

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React.js      │────▶│   Node.js       │────▶│   FastAPI       │
│   Dashboard     │◀────│   + Socket.io   │◀────│   ML API        │
│   (Port 8081)   │     │   (Port 3001)   │     │   (Port 8000)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │                        │
                              ▼                        ▼
                        ┌──────────┐            ┌──────────┐
                        │PostgreSQL│            │ ML Model │
                        │ Database │            │(.pkl)    │
                        └──────────┘            └──────────┘
```

## ML Model Metrics

### GradientBoosting Classifier (Health Status)
- **Accuracy**: 99.8%
- **Precision**: 99.8%
- **Recall**: 99.8%
- **F1-Score**: 99.8%

### GradientBoosting Regressor (RUL Prediction)
- **MAE**: 15.15 cycles
- **RMSE**: 18.18 cycles
- **R²**: 0.817

## Installation

### 1. Clone and Install Dependencies

```bash
# Frontend dependencies
cd sentinel-watch
npm install

# Backend dependencies
cd backend
npm install

# Python ML API dependencies
cd python_backend
pip install -r requirements.txt
```

### 2. Database Setup (PostgreSQL)

```bash
# Create database
createdb machine_health_db

# Run schema
psql -U postgres -d machine_health_db -f backend/database/schema.sql
```

### 3. Environment Configuration

Create `.env` files:

**backend/.env**:
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=machine_health_db
DB_USER=postgres
DB_PASSWORD=your_password
ML_API_URL=http://localhost:8000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. Train ML Model

```bash
cd python_backend/notebooks
python train_xgboost.py
```

### 5. Start Services

```bash
# Terminal 1: Start ML API
cd python_backend
uvicorn main:app --reload --port 8000

# Terminal 2: Start Node.js Backend
cd backend
npm run dev

# Terminal 3: Start React Frontend
npm run dev
```

## API Endpoints

### ML Prediction API (FastAPI - Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict` | Predict health status and RUL |
| GET | `/api/model/status` | Get model metadata and metrics |
| GET | `/api/machines` | Get all machines with predictions |

### Node.js API (Express - Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/machines` | Get all machines |
| POST | `/api/sensor-data` | Insert sensor reading + trigger ML |
| GET | `/api/alerts` | Get alert history |
| GET | `/api/analytics` | Get dashboard analytics |

## Prediction Request

```json
POST /api/predict
{
  "temperature": 55,
  "vibration": 2.5,
  "current": 12,
  "pressure": 100,
  "runtime_hours": 500
}
```

## Prediction Response

```json
{
  "health_status": "NORMAL",
  "predicted_RUL": 119.83,
  "health_percentage": 79.88,
  "risk_level": "low",
  "confidence": 1.0,
  "root_cause": "No issues detected - machine operating normally",
  "timestamp": "2026-02-26T15:12:23.460822"
}
```

## Health Status Thresholds

| Status | RUL Range | Health % |
|--------|-----------|----------|
| NORMAL | > 80 cycles | > 53% |
| WARNING | 30-80 cycles | 20-53% |
| CRITICAL | < 30 cycles | < 20% |

## Real-time Features

- **Socket.io Events**:
  - `machine_update`: Machine health changes
  - `new_alert`: New WARNING/CRITICAL alert
  - `sensor_update`: Real-time sensor data

- **Auto Email Alerts**: Sent when health_status is WARNING or CRITICAL

## Dataset Features

| Feature | Unit | Normal Range | Critical Range |
|---------|------|--------------|----------------|
| temperature | °C | 45-65 | > 85 |
| vibration | mm/s | 1.5-3.5 | > 8.0 |
| current | A | 10-15 | > 25 |
| pressure | PSI | 90-110 | > 135 |
| runtime_hours | hours | 0-2000 | > 5000 |

## Project Structure

```
sentinel-watch/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom hooks (use-socket.ts)
│   ├── pages/              # Dashboard, Login
│   └── lib/                # API, queries
├── backend/                # Node.js backend
│   ├── server.js           # Express + Socket.io
│   └── database/           # PostgreSQL schema
└── python_backend/         # FastAPI ML API
    ├── ml/                 # Trained models
    ├── notebooks/          # Training scripts
    └── routes/             # API endpoints
```

## Author

Final Year Project - AI-Based Machine Health Prediction and Real-Time Alert System
