# AWS Deployment Guide

## Quick Start

### 1. EC2 Backend Deployment

```bash
# On EC2 instance
sudo bash aws-deploy/backend/deploy-backend.sh
```

### 2. S3 Frontend Deployment

```bash
# On local machine or CI/CD
# Edit deploy-frontend.sh: Update BACKEND_URL
bash aws-deploy/frontend/deploy-frontend.sh
```

## Manual Steps

### EC2 Setup

1. Launch EC2 instance (Ubuntu 22.04 LTS)
2. Configure security group:
   - Port 22 (SSH)
   - Port 8000 (Backend API)
   - Port 80/443 (If using Nginx)
3. Connect via SSH
4. Run deployment script

### S3 Setup

1. Install AWS CLI
2. Configure credentials: `aws configure`
3. Edit `deploy-frontend.sh`: Set BACKEND_URL
4. Run deployment script

## Commands

### Backend Management

```bash
# Status
sudo systemctl status uptimeai-backend

# Logs
sudo journalctl -u uptimeai-backend -f

# Restart
sudo systemctl restart uptimeai-backend

# Update
sudo bash aws-deploy/backend/update-backend.sh
```

### Frontend Management

```bash
# Deploy
bash aws-deploy/frontend/deploy-frontend.sh

# Manual upload
aws s3 sync dist/ s3://BUCKET_NAME --delete
```

## Environment Variables

Backend `.env` file location: `/opt/uptimeai-backend/python_backend/.env`

Required variables:
```
APP_ENV=production
DEBUG=false
SECRET_KEY=<generate>
JWT_SECRET_KEY=<generate>
DATABASE_URL=postgresql+asyncpg://...
FRONTEND_URL=https://your-s3-url
CORS_ORIGINS=https://your-s3-url
```

## Security

- Firewall configured (UFW)
- Systemd security hardening
- Non-root user execution
- Private environment files


