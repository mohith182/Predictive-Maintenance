# Predictive-Maintenance

Machine Health Prediction System with NASA Turbofan Engine Dataset (FD002)

## Features

- **Real-time Dashboard**: Live sensor data visualization
- **ML Predictions**: Remaining Useful Life (RUL) predictions
- **Health Status**: HEALTHY / WARNING / CRITICAL classifications
- **NASA FD002 Dataset**: 34,491 sensor readings loaded

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- shadcn-ui
- TanStack React Query

### Backend
- Node.js + Express
- SQLite (better-sqlite3)
- RESTful API

## Quick Start

```sh
# Clone the repository
git clone https://github.com/mohith182/Predictive-Maintenance.git
cd Predictive-Maintenance

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Load NASA FD002 dataset (requires dataset files in Downloads/archive)
node loadData.js

# Start backend server (port 3001)
node server.js

# In another terminal, start frontend (port 8080)
cd ..
npm run dev
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/readings | Sensor readings (temperature, vibration, current, RUL) |
| GET /api/predictions | Health predictions with status |
| POST /api/predict | Make new prediction |

## Dataset

Uses NASA C-MAPSS Turbofan Engine Degradation dataset (FD002):
- 259 engines
- 33,991 test readings
- 3,516 predictions

## Project Structure

```
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── lib/             # API client, React Query hooks
│   └── pages/           # Dashboard, Login, etc.
├── backend/             # Node.js backend
│   ├── controllers/     # Business logic
│   ├── routes/          # API routes
│   ├── db.js           # SQLite connection
│   └── server.js       # Express server
└── public/              # Static assets
```