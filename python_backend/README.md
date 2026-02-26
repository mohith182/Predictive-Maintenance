# UptimeAI - Python Backend

AI-Powered Predictive Maintenance Dashboard - FastAPI Backend

## Features

- 🔐 **Authentication System**
  - Email/Password Sign Up with verification
  - JWT-based session handling
  - Google OAuth 2.0
  - Multi-Factor Authentication (MFA/OTP)
  - Secure password hashing (bcrypt)
  - Rate limiting

- 🤖 **Machine Learning**
  - RandomForest model for RUL prediction
  - Real-time health scoring
  - Root cause analysis
  - Batch predictions

- 📊 **Machine Monitoring**
  - Live sensor data simulation
  - Fleet overview statistics
  - Alert generation

## Quick Start

### 1. Install Dependencies

```bash
cd python_backend
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `.env` file with your settings:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uptimeai_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Secret (generate a secure random string)
JWT_SECRET_KEY=your-secret-key-min-32-chars

# Email SMTP (Gmail)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
```

### 3. Setup Database

```bash
python setup_db.py
```

### 4. Train ML Model

```bash
python ml_model.py
```

### 5. Run Server

```bash
python main.py
# or
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Server runs at: http://localhost:8000

API Docs: http://localhost:8000/docs

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| GET | `/api/auth/verify-email` | Verify email |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/verify-otp` | Verify MFA code |
| POST | `/api/auth/google` | Google OAuth |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get profile |
| POST | `/api/auth/mfa/setup` | Setup MFA |
| POST | `/api/auth/mfa/enable` | Enable MFA |
| POST | `/api/auth/mfa/disable` | Disable MFA |

### Predictions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict` | Make prediction |
| POST | `/api/predict/batch` | Batch predictions |
| GET | `/api/model/status` | Model status |
| POST | `/api/model/train` | Retrain model (admin) |

### Machines

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/machines` | Get all machines |
| GET | `/api/machines/{id}` | Get machine by ID |
| GET | `/api/machines/{id}/live` | Live sensor data |
| POST | `/api/machines` | Create machine |
| GET | `/api/fleet/summary` | Fleet statistics |
| GET | `/api/alerts` | Get alerts |

## Prediction API

### Request
```json
POST /api/predict
{
  "vibration": 3.5,
  "temperature": 72,
  "current": 18
}
```

### Response
```json
{
  "predicted_RUL": 45.5,
  "health_percentage": 72.8,
  "risk_level": "medium",
  "root_cause": "Elevated temperature - check cooling system",
  "confidence": 0.87,
  "timestamp": "2026-02-26T12:00:00Z"
}
```

## Health Calculation

```
health_percentage = (predicted_RUL / max_RUL) * 100
```

### Risk Levels
- 🟢 **Green (Low)**: > 70%
- 🟡 **Yellow (Medium)**: 40-70%
- 🔴 **Red (High)**: < 40%

## Security

- JWT tokens with expiry
- HTTP-only cookies for refresh tokens
- bcrypt password hashing
- OTP valid for 5 minutes
- Rate limiting on login/signup
- CORS configuration

## Project Structure

```
python_backend/
├── main.py              # FastAPI app entry
├── config.py            # Settings/environment
├── database.py          # Database connection
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic schemas
├── auth.py              # Auth utilities
├── email_service.py     # Email sending
├── ml_model.py          # ML prediction
├── setup_db.py          # Database setup
├── requirements.txt     # Dependencies
├── .env                 # Configuration
├── ml/
│   ├── model.pkl        # Trained model
│   └── scaler.pkl       # Feature scaler
└── routes/
    ├── __init__.py
    ├── auth_routes.py   # Auth endpoints
    ├── prediction_routes.py
    └── machine_routes.py
```

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL + SQLAlchemy
- **Auth**: JWT + bcrypt + TOTP
- **Email**: aiosmtplib
- **ML**: scikit-learn, pandas, numpy
- **Server**: Uvicorn

## License

MIT
