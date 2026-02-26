# Production Deployment - Quick Reference

## Quick Start

### 1. Environment Setup

```bash
# Backend
cd python_backend
cp .env.example .env
# Edit .env with your values

# Frontend
cd ..
cp .env.example .env
# Edit .env with your values
```

### 2. Generate Secrets

```bash
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_urlsafe(32))"
```

### 3. Deploy with Docker

```bash
docker-compose up -d
```

### 4. Verify

```bash
# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:8080
```

---

## Key Files

- `PRODUCTION_READINESS_AUDIT.md` - Full audit report
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- `PRODUCTION_CHECKLIST.md` - Pre-deployment checklist
- `FIXES_APPLIED.md` - List of all fixes

---

## Critical Environment Variables

### Backend (Required)
```
APP_ENV=production
DEBUG=false
SECRET_KEY=<32+ char random string>
JWT_SECRET_KEY=<32+ char random string>
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
```

### Frontend (Required)
```
VITE_API_URL=https://api.yourdomain.com
```

---

## Production Server Command

```bash
cd python_backend
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --config gunicorn_config.py
```

---

## Support

See `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

