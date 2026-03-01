# Production Deployment Verification Checklist

## Pre-Deployment

- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] EC2 instance launched (Ubuntu 22.04 LTS)
- [ ] Security group configured (ports 22, 80, 443, 8000)
- [ ] SSH key pair created and downloaded
- [ ] Backend repository is accessible
- [ ] Secrets generated (SECRET_KEY, JWT_SECRET_KEY)

## Backend Deployment (EC2)

### Initial Setup
- [ ] EC2 instance accessible via SSH
- [ ] `deploy-backend.sh` script uploaded to EC2
- [ ] Script executed successfully
- [ ] All dependencies installed
- [ ] Virtual environment created
- [ ] Requirements installed from requirements.txt
- [ ] Gunicorn and Uvicorn installed

### Service Configuration
- [ ] Systemd service file created (`/etc/systemd/system/uptimeai-backend.service`)
- [ ] Service enabled (`systemctl enable uptimeai-backend`)
- [ ] Service started (`systemctl start uptimeai-backend`)
- [ ] Service status: active (running)
- [ ] Service auto-starts on reboot

### Environment Variables
- [ ] `.env` file created at `/opt/uptimeai-backend/python_backend/.env`
- [ ] File permissions set (600)
- [ ] APP_ENV=production
- [ ] DEBUG=false
- [ ] SECRET_KEY set (not default)
- [ ] JWT_SECRET_KEY set (not default)
- [ ] DATABASE_URL configured
- [ ] FRONTEND_URL set
- [ ] CORS_ORIGINS configured

### Network & Security
- [ ] Firewall (UFW) enabled
- [ ] Port 22 (SSH) open
- [ ] Port 8000 (Backend) open
- [ ] Port 80 (HTTP) open
- [ ] Port 443 (HTTPS) open
- [ ] Security group rules configured in AWS

### Health Checks
- [ ] Backend responds: `curl http://localhost:8000/health`
- [ ] Health endpoint returns 200 OK
- [ ] JSON response valid
- [ ] Database connection working
- [ ] ML model loaded successfully

### Logs
- [ ] Service logs accessible: `journalctl -u uptimeai-backend`
- [ ] No critical errors in logs
- [ ] Access logs showing requests
- [ ] Error logs clean

## Frontend Deployment (S3)

### Build
- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm ci`)
- [ ] VITE_API_URL set before build
- [ ] Build successful (`npm run build`)
- [ ] `dist/` directory created
- [ ] `dist/index.html` exists
- [ ] All assets in dist directory

### S3 Setup
- [ ] S3 bucket created
- [ ] Bucket name configured in script
- [ ] Region set correctly
- [ ] Static website hosting enabled
- [ ] Index document: index.html
- [ ] Error document: index.html
- [ ] Public access block removed
- [ ] Bucket policy applied (public read)

### Upload
- [ ] Files uploaded to S3
- [ ] HTML files have no-cache headers
- [ ] Static assets have cache headers
- [ ] All files synced (--delete flag used)
- [ ] File count matches local dist

### Access
- [ ] Website URL accessible
- [ ] Frontend loads in browser
- [ ] No 404 errors
- [ ] API calls work (check browser console)
- [ ] CORS headers present
- [ ] SPA routing works (test direct URL access)

## Nginx (Optional)

- [ ] Nginx installed
- [ ] Configuration file created
- [ ] Symlink created in sites-enabled
- [ ] Nginx configuration tested (`nginx -t`)
- [ ] Nginx restarted
- [ ] Reverse proxy working (port 80 → 8000)
- [ ] Rate limiting configured
- [ ] Security headers present
- [ ] SSL certificate configured (if using HTTPS)

## Integration Tests

### API Connectivity
- [ ] Frontend can reach backend API
- [ ] CORS configured correctly
- [ ] Authentication endpoints work
- [ ] Prediction endpoints work
- [ ] Health check accessible from frontend

### Functionality
- [ ] User can login/register
- [ ] Dashboard loads
- [ ] ML predictions work
- [ ] Real-time updates work (if applicable)
- [ ] File uploads work (if applicable)

## Performance

- [ ] Backend response time < 500ms
- [ ] Frontend loads < 3 seconds
- [ ] Static assets cached properly
- [ ] Gzip compression enabled
- [ ] No memory leaks (monitor over time)

## Security

- [ ] No secrets in code
- [ ] Environment variables secured
- [ ] HTTPS configured (if using domain)
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] Firewall rules minimal
- [ ] Non-root user for service
- [ ] File permissions correct

## Monitoring

- [ ] CloudWatch logs configured (optional)
- [ ] Health check endpoint monitored
- [ ] Error alerts configured (optional)
- [ ] Uptime monitoring set up (optional)

## Post-Deployment

- [ ] Documentation updated
- [ ] Team notified
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Monitoring dashboards set up

## Quick Verification Commands

```bash
# Backend
curl http://EC2_IP:8000/health
systemctl status uptimeai-backend
journalctl -u uptimeai-backend -n 50

# Frontend
curl http://BUCKET_NAME.s3-website-REGION.amazonaws.com
aws s3 ls s3://BUCKET_NAME --recursive

# Nginx
nginx -t
systemctl status nginx
curl http://EC2_IP/
```

## Rollback Plan

- [ ] Previous version tagged in git
- [ ] Database backup available
- [ ] Rollback script prepared
- [ ] Rollback tested in staging


