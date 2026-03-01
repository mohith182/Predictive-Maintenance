#!/bin/bash
set -e

echo "=== Complete AWS Deployment ==="

# Configuration
EC2_HOST="ec2-user@your-ec2-ip"
EC2_KEY="~/.ssh/your-key.pem"
BACKEND_URL="http://your-ec2-ip:8000"

# Deploy backend
echo "Deploying backend to EC2..."
scp -i ${EC2_KEY} -r aws-deploy/backend/* ${EC2_HOST}:/tmp/
ssh -i ${EC2_KEY} ${EC2_HOST} "sudo bash /tmp/deploy-backend.sh"

# Deploy frontend
echo "Deploying frontend to S3..."
cd aws-deploy/frontend
sed -i "s|BACKEND_URL=.*|BACKEND_URL=${BACKEND_URL}|" deploy-frontend.sh
bash deploy-frontend.sh

echo "=== Deployment Complete ==="


