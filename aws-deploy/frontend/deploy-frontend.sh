#!/bin/bash
set -e

# Configuration
BUCKET_NAME="uptimeai-frontend"
REGION="us-east-1"
BACKEND_URL="http://your-ec2-ip:8000"  # Update this
DIST_DIR="./dist"
CLOUDFRONT_DISTRIBUTION_ID=""  # Optional: Add CloudFront ID

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Install it first."
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Install it first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    log_error "npm not found. Install it first."
    exit 1
fi

# Install dependencies
log_info "Installing dependencies..."
npm ci

# Build React app
log_info "Building React application..."
export VITE_API_URL=${BACKEND_URL}
npm run build

if [ ! -d "${DIST_DIR}" ]; then
    log_error "Build failed. dist directory not found."
    exit 1
fi

log_info "Build successful. Files in ${DIST_DIR}"

# Create S3 bucket if it doesn't exist
log_info "Checking S3 bucket: ${BUCKET_NAME}..."
if ! aws s3 ls "s3://${BUCKET_NAME}" 2>&1 > /dev/null; then
    log_info "Creating S3 bucket: ${BUCKET_NAME}..."
    if [ "${REGION}" == "us-east-1" ]; then
        aws s3 mb "s3://${BUCKET_NAME}"
    else
        aws s3 mb "s3://${BUCKET_NAME}" --region "${REGION}"
    fi
else
    log_info "Bucket ${BUCKET_NAME} already exists"
fi

# Enable static website hosting
log_info "Configuring static website hosting..."
aws s3 website "s3://${BUCKET_NAME}" \
    --index-document index.html \
    --error-document index.html

# Upload files with proper cache headers
log_info "Uploading files to S3..."
aws s3 sync "${DIST_DIR}" "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "service-worker.js"

# Upload HTML files with no cache
aws s3 sync "${DIST_DIR}" "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "*.html" \
    --include "service-worker.js"

# Set bucket policy for public read access
log_info "Setting bucket policy..."
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket "${BUCKET_NAME}" \
    --policy file:///tmp/bucket-policy.json

# Block public access settings (allow public read)
log_info "Configuring public access settings..."
aws s3api put-public-access-block \
    --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Get website endpoint
WEBSITE_URL=$(aws s3api get-bucket-website --bucket "${BUCKET_NAME}" --query 'WebsiteConfiguration.IndexDocument' --output text 2>/dev/null || echo "")
if [ -z "${WEBSITE_URL}" ]; then
    WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
fi

log_info "=== Deployment Complete ==="
log_info "Website URL: ${WEBSITE_URL}"
log_info "Bucket: s3://${BUCKET_NAME}"
log_info "Backend URL: ${BACKEND_URL}"

if [ -n "${CLOUDFRONT_DISTRIBUTION_ID}" ]; then
    log_info "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
        --paths "/*"
    log_info "CloudFront cache invalidated"
fi

rm -f /tmp/bucket-policy.json


