# AWS Deployment - Quick Start

## Prerequisites

1. AWS Account
2. EC2 instance (Ubuntu 22.04)
3. AWS CLI installed and configured
4. Node.js and npm installed (for frontend build)

## Step 1: Deploy Backend to EC2

```bash
# Copy files to EC2
scp -i your-key.pem aws-deploy/backend/* ubuntu@your-ec2-ip:/tmp/

# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Run deployment
sudo bash /tmp/deploy-backend.sh
```

## Step 2: Configure Backend Environment

```bash
# Edit environment file
sudo nano /opt/uptimeai-backend/python_backend/.env

# Add required variables:
APP_ENV=production
DEBUG=false
SECRET_KEY=<generate-32-char-secret>
JWT_SECRET_KEY=<generate-32-char-secret>
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
FRONTEND_URL=https://your-s3-url
CORS_ORIGINS=https://your-s3-url

# Restart service
sudo systemctl restart uptimeai-backend
```

## Step 3: Deploy Frontend to S3

```bash
# Edit deployment script
nano aws-deploy/frontend/deploy-frontend.sh
# Update: BACKEND_URL="http://your-ec2-ip:8000"

# Run deployment
cd aws-deploy/frontend
bash deploy-frontend.sh
```

## Step 4: Verify

```bash
# Backend health check
curl http://your-ec2-ip:8000/health

# Frontend
# Visit: http://BUCKET_NAME.s3-website-REGION.amazonaws.com
```

## Useful Commands

```bash
# Backend logs
sudo journalctl -u uptimeai-backend -f

# Backend status
sudo systemctl status uptimeai-backend

# Update backend
sudo bash /opt/uptimeai-backend/update-backend.sh

# Frontend redeploy
bash aws-deploy/frontend/deploy-frontend.sh
```


