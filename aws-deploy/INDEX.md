# AWS Deployment - Complete File Index

## Core Deployment Scripts

### Backend (EC2)
- `ec2-backend-setup.sh` - Complete EC2 deployment script
- `backend/deploy-backend.sh` - Alternative deployment script
- `backend/update-backend.sh` - Update existing deployment

### Frontend (S3)
- `s3-frontend-deploy.sh` - Complete S3 deployment script
- `frontend/deploy-frontend.sh` - Alternative deployment script
- `frontend/setup-cloudfront.sh` - CloudFront setup

## Configuration Files

### Systemd
- `systemd/uptimeai-backend.service` - Production systemd service file
- `backend/uptimeai-backend.service` - Alternative service file

### Nginx
- `nginx/uptimeai-backend.conf` - Production Nginx reverse proxy config
- `nginx/nginx.conf` - Basic Nginx configuration

### Environment
- `env/backend.env.example` - Backend environment template
- `env/frontend.env.example` - Frontend environment template

### CloudFront
- `cloudfront/cloudfront-config.json` - CloudFront distribution config

### S3
- `frontend/s3-bucket-policy.json` - S3 bucket policy template

## Documentation

- `DEPLOYMENT_STEPS.md` - Step-by-step deployment guide
- `DEPLOY_COMMANDS.md` - Exact CLI commands reference
- `verification-checklist.md` - Complete verification checklist
- `QUICK_START.md` - Quick start guide
- `README.md` - General documentation

## Utility Scripts

- `aws-setup.sh` - AWS CLI installation
- `aws-cli-commands.sh` - AWS CLI command reference
- `complete-deploy.sh` - Automated full deployment

## File Structure

```
aws-deploy/
├── ec2-backend-setup.sh          # Main EC2 deployment
├── s3-frontend-deploy.sh          # Main S3 deployment
├── backend/
│   ├── deploy-backend.sh
│   ├── update-backend.sh
│   └── uptimeai-backend.service
├── frontend/
│   ├── deploy-frontend.sh
│   ├── s3-bucket-policy.json
│   └── setup-cloudfront.sh
├── systemd/
│   └── uptimeai-backend.service
├── nginx/
│   ├── uptimeai-backend.conf
│   └── nginx.conf
├── env/
│   ├── backend.env.example
│   └── frontend.env.example
├── cloudfront/
│   └── cloudfront-config.json
└── Documentation files
```

## Quick Start

1. **Backend**: `sudo bash aws-deploy/ec2-backend-setup.sh`
2. **Frontend**: `bash aws-deploy/s3-frontend-deploy.sh`
3. **Verify**: Check `verification-checklist.md`


