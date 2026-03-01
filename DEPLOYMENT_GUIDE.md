# Production Deployment Guide
## Predictive Maintenance System

This guide provides step-by-step instructions for deploying the Predictive Maintenance system to production.

---

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Secrets changed from defaults
- [ ] Database migrated to PostgreSQL
- [ ] ML models trained and tested
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Monitoring configured

---

## Deployment Options

### Option 1: Docker Compose (Recommended for VPS/Cloud)

**Best for**: Single server deployments, VPS, DigitalOcean, Linode

#### Steps:

1. **Clone repository**
```bash
git clone <your-repo>
cd sentinel-watch
```

2. **Configure environment**
```bash
# Backend
cp python_backend/.env.example python_backend/.env
# Edit python_backend/.env with your values

# Frontend
cp .env.example .env
# Edit .env with your values
```

3. **Generate secrets**
```bash
# Generate secure secrets
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Use output for SECRET_KEY and JWT_SECRET_KEY
```

4. **Start services**
```bash
docker-compose up -d
```

5. **Verify deployment**
```bash
# Check backend
curl http://localhost:8000/health

# Check frontend
curl http://localhost:8080
```

---

### Option 2: Render.com (PaaS)

**Best for**: Quick deployment, managed services

#### Backend Setup:

1. Create new **Web Service**
2. Connect GitHub repository
3. Configure:
   - **Build Command**: `cd python_backend && pip install -r requirements.txt`
   - **Start Command**: `cd python_backend && gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`
   - **Environment**: Python 3.11

4. Add environment variables (from `.env.example`)

5. Add PostgreSQL database (Render provides managed PostgreSQL)

#### Frontend Setup:

1. Create new **Static Site**
2. Connect GitHub repository
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`

---

### Option 3: Railway.app

**Best for**: Simple deployments, good for startups

1. Connect GitHub repository
2. Railway auto-detects services
3. Add PostgreSQL plugin
4. Configure environment variables
5. Deploy

---

### Option 4: AWS (ECS/EKS)

**Best for**: Enterprise, high scale

#### Architecture:
- **Frontend**: S3 + CloudFront
- **Backend**: ECS Fargate or EKS
- **Database**: RDS PostgreSQL
- **Load Balancer**: ALB

#### Steps:

1. **Build Docker images**
```bash
docker build -f python_backend/Dockerfile -t uptimeai-backend .
docker build -f Dockerfile.frontend -t uptimeai-frontend .
```

2. **Push to ECR**
```bash
aws ecr create-repository --repository-name uptimeai-backend
docker tag uptimeai-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/uptimeai-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/uptimeai-backend:latest
```

3. **Create ECS Task Definition**
4. **Create ECS Service**
5. **Configure ALB**
6. **Deploy Frontend to S3**

---

## Environment Configuration

### Backend (.env)

```bash
# Required
APP_ENV=production
DEBUG=false
SECRET_KEY=<generate-secure-32-char-string>
JWT_SECRET_KEY=<generate-secure-32-char-string>
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Frontend (.env)

```bash
VITE_API_URL=https://api.yourdomain.com
```

---

## Database Migration (SQLite → PostgreSQL)

### Step 1: Install PostgreSQL client

```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

### Step 2: Create database

```bash
psql -U postgres
CREATE DATABASE uptimeai_db;
CREATE USER uptimeai_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE uptimeai_db TO uptimeai_user;
\q
```

### Step 3: Update DATABASE_URL

```bash
DATABASE_URL=postgresql+asyncpg://uptimeai_user:secure_password@localhost:5432/uptimeai_db
```

### Step 4: Run migrations

```bash
cd python_backend
python setup_db.py
```

---

## Production Server Setup

### Using Gunicorn + Uvicorn

```bash
cd python_backend
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
```

### Using systemd (Linux)

Create `/etc/systemd/system/uptimeai.service`:

```ini
[Unit]
Description=UptimeAI FastAPI Backend
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/app/python_backend
Environment="PATH=/usr/local/bin"
ExecStart=/usr/local/bin/gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --config gunicorn_config.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable uptimeai
sudo systemctl start uptimeai
```

---

## Frontend Production Build

### Build optimized bundle

```bash
npm run build
```

### Serve with Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Monitoring & Observability

### Recommended Tools:

1. **Application Monitoring**: Sentry, Datadog, New Relic
2. **Logging**: ELK Stack, Loki, CloudWatch
3. **Metrics**: Prometheus + Grafana
4. **Uptime**: UptimeRobot, Pingdom

### Health Check Endpoints:

- Backend: `GET /health`
- Frontend: `GET /health` (if configured)

---

## Security Hardening

### 1. SSL/TLS

Use Let's Encrypt:
```bash
sudo certbot --nginx -d yourdomain.com
```

### 2. Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 3. Rate Limiting

Already configured in `main.py` using slowapi.

### 4. Security Headers

Add to Nginx:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000" always;
```

---

## Backup Strategy

### Database Backups

```bash
# Daily backup script
pg_dump -U uptimeai_user uptimeai_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U uptimeai_user uptimeai_db < backup_20240101.sql
```

### ML Model Backups

```bash
# Backup models
tar -czf models_backup_$(date +%Y%m%d).tar.gz python_backend/ml/
```

---

## Troubleshooting

### Backend won't start

1. Check logs: `docker logs uptimeai-backend`
2. Verify environment variables
3. Check database connection
4. Verify model files exist

### Frontend can't connect to API

1. Check `VITE_API_URL` is set correctly
2. Verify CORS configuration
3. Check network connectivity
4. Review browser console for errors

### Database connection errors

1. Verify DATABASE_URL format
2. Check PostgreSQL is running
3. Verify user permissions
4. Check firewall rules

---

## Post-Deployment

1. **Verify all endpoints**
2. **Test authentication flow**
3. **Monitor error rates**
4. **Check performance metrics**
5. **Set up alerts**

---

## Support

For issues, check:
- Application logs
- System logs
- Database logs
- Monitoring dashboards

---

**Last Updated**: 2024


