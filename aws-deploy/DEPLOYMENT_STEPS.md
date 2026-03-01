# Complete AWS Deployment Steps

## Step 1: EC2 Backend Deployment

```bash
# 1. Launch EC2 instance (Ubuntu 22.04 LTS)
# 2. Configure security group: ports 22, 80, 443, 8000
# 3. Connect via SSH

# 4. Upload deployment script
scp -i ~/.ssh/key.pem aws-deploy/ec2-backend-setup.sh ubuntu@EC2_IP:/tmp/

# 5. SSH into instance
ssh -i ~/.ssh/key.pem ubuntu@EC2_IP

# 6. Run deployment script
sudo bash /tmp/ec2-backend-setup.sh

# 7. Configure environment
sudo nano /opt/uptimeai-backend/python_backend/.env
# Add production values

# 8. Restart service
sudo systemctl restart uptimeai-backend

# 9. Verify
curl http://localhost:8000/health
```

## Step 2: Configure Nginx (Optional)

```bash
# 1. Copy Nginx config
sudo cp aws-deploy/nginx/uptimeai-backend.conf /etc/nginx/sites-available/uptimeai-backend

# 2. Edit server_name
sudo nano /etc/nginx/sites-available/uptimeai-backend

# 3. Create symlink
sudo ln -s /etc/nginx/sites-available/uptimeai-backend /etc/nginx/sites-enabled/

# 4. Test configuration
sudo nginx -t

# 5. Restart Nginx
sudo systemctl restart nginx
```

## Step 3: S3 Frontend Deployment

```bash
# 1. Install AWS CLI (if not installed)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 2. Configure AWS CLI
aws configure

# 3. Edit deployment script
nano aws-deploy/s3-frontend-deploy.sh
# Update: BUCKET_NAME, REGION, BACKEND_URL

# 4. Run deployment
bash aws-deploy/s3-frontend-deploy.sh
```

## Step 4: Environment Variables

### Backend (.env)
```bash
sudo nano /opt/uptimeai-backend/python_backend/.env
```

Required:
```
APP_ENV=production
DEBUG=false
SECRET_KEY=<32-char-random>
JWT_SECRET_KEY=<32-char-random>
DATABASE_URL=postgresql+asyncpg://...
FRONTEND_URL=https://bucket.s3-website-region.amazonaws.com
CORS_ORIGINS=https://bucket.s3-website-region.amazonaws.com
```

### Frontend (Build-time)
```bash
export VITE_API_URL=http://EC2_IP:8000
npm run build
```

## Step 5: Verification

```bash
# Backend health
curl http://EC2_IP:8000/health

# Frontend
curl http://BUCKET_NAME.s3-website-REGION.amazonaws.com

# Service status
sudo systemctl status uptimeai-backend

# Logs
sudo journalctl -u uptimeai-backend -f
```

## Quick Commands Reference

```bash
# Backend management
sudo systemctl start uptimeai-backend
sudo systemctl stop uptimeai-backend
sudo systemctl restart uptimeai-backend
sudo systemctl status uptimeai-backend

# Update backend
cd /opt/uptimeai-backend
sudo -u uptimeai git pull
cd python_backend
sudo -u uptimeai ./venv/bin/pip install -r requirements.txt
sudo systemctl restart uptimeai-backend

# Frontend redeploy
bash aws-deploy/s3-frontend-deploy.sh

# View logs
sudo journalctl -u uptimeai-backend -n 100
sudo journalctl -u uptimeai-backend -f
```


