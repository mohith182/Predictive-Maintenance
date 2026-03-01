# AWS Deployment - Exact Commands

## Backend Deployment (EC2)

### 1. Transfer files to EC2
```bash
scp -i ~/.ssh/your-key.pem -r aws-deploy/backend/* ubuntu@YOUR_EC2_IP:/tmp/
```

### 2. SSH into EC2
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP
```

### 3. Run deployment script
```bash
sudo bash /tmp/deploy-backend.sh
```

### 4. Configure environment
```bash
sudo nano /opt/uptimeai-backend/python_backend/.env
```

Add:
```
APP_ENV=production
DEBUG=false
SECRET_KEY=your-32-char-secret-here
JWT_SECRET_KEY=your-32-char-secret-here
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
FRONTEND_URL=https://your-s3-url
CORS_ORIGINS=https://your-s3-url
```

### 5. Restart service
```bash
sudo systemctl restart uptimeai-backend
sudo systemctl status uptimeai-backend
```

### 6. Check logs
```bash
sudo journalctl -u uptimeai-backend -f
```

### 7. Test health endpoint
```bash
curl http://localhost:8000/health
```

---

## Frontend Deployment (S3)

### 1. Edit deployment script
```bash
nano aws-deploy/frontend/deploy-frontend.sh
```

Update:
```bash
BACKEND_URL="http://YOUR_EC2_IP:8000"
BUCKET_NAME="your-bucket-name"
REGION="us-east-1"
```

### 2. Run deployment
```bash
cd aws-deploy/frontend
bash deploy-frontend.sh
```

### 3. Get website URL
```bash
aws s3api get-bucket-website --bucket your-bucket-name
```

---

## Manual S3 Commands

### Create bucket
```bash
aws s3 mb s3://your-bucket-name --region us-east-1
```

### Enable static hosting
```bash
aws s3 website s3://your-bucket-name \
    --index-document index.html \
    --error-document index.html
```

### Set bucket policy
```bash
aws s3api put-bucket-policy \
    --bucket your-bucket-name \
    --policy file://aws-deploy/frontend/s3-bucket-policy.json
```

### Upload files
```bash
aws s3 sync dist/ s3://your-bucket-name \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html"
```

### Upload HTML (no cache)
```bash
aws s3 sync dist/ s3://your-bucket-name \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html"
```

---

## Service Management

### Start service
```bash
sudo systemctl start uptimeai-backend
```

### Stop service
```bash
sudo systemctl stop uptimeai-backend
```

### Restart service
```bash
sudo systemctl restart uptimeai-backend
```

### Enable auto-start
```bash
sudo systemctl enable uptimeai-backend
```

### Disable auto-start
```bash
sudo systemctl disable uptimeai-backend
```

### View status
```bash
sudo systemctl status uptimeai-backend
```

### View logs
```bash
sudo journalctl -u uptimeai-backend -n 100
sudo journalctl -u uptimeai-backend -f
```

---

## Update Backend

### Quick update
```bash
sudo bash /opt/uptimeai-backend/update-backend.sh
```

### Manual update
```bash
cd /opt/uptimeai-backend
sudo -u uptimeai git pull origin main
cd python_backend
sudo -u uptimeai ./venv/bin/pip install --upgrade -r requirements.txt
sudo systemctl restart uptimeai-backend
```

---

## Security Group (EC2)

### Allow port 8000
```bash
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxx \
    --protocol tcp \
    --port 8000 \
    --cidr 0.0.0.0/0
```

### Allow HTTP
```bash
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxx \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0
```

### Allow HTTPS
```bash
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxx \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

---

## Generate Secrets

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Run twice for SECRET_KEY and JWT_SECRET_KEY.


