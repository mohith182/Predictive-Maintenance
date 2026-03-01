#!/bin/bash
set -euo pipefail

BUCKET_NAME="${BUCKET_NAME:-uptimeai-frontend}"
REGION="${REGION:-us-east-1}"
BACKEND_URL="${BACKEND_URL:-http://your-ec2-ip:8000}"
DIST_DIR="./dist"
CLOUDFRONT_ID="${CLOUDFRONT_ID:-}"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"; }
log_error() { echo "[ERROR] $*" >&2; }
log_success() { echo "[SUCCESS] $*"; }

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI not found. Install: https://aws.amazon.com/cli/"
    exit 1
fi

if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm not found. Install npm first."
    exit 1
fi

log "Starting S3 frontend deployment..."
log "Bucket: ${BUCKET_NAME}"
log "Region: ${REGION}"
log "Backend URL: ${BACKEND_URL}"

log "Installing dependencies..."
npm ci --silent

log "Building React application..."
export VITE_API_URL="${BACKEND_URL}"
npm run build

if [ ! -d "${DIST_DIR}" ]; then
    log_error "Build failed. ${DIST_DIR} directory not found."
    exit 1
fi

if [ ! -f "${DIST_DIR}/index.html" ]; then
    log_error "Build incomplete. index.html not found in ${DIST_DIR}"
    exit 1
fi

log_success "Build completed. Files: $(find ${DIST_DIR} -type f | wc -l)"

log "Checking S3 bucket..."
if ! aws s3 ls "s3://${BUCKET_NAME}" 2>/dev/null; then
    log "Creating S3 bucket: ${BUCKET_NAME}..."
    if [ "${REGION}" == "us-east-1" ]; then
        aws s3 mb "s3://${BUCKET_NAME}" --region "${REGION}"
    else
        aws s3 mb "s3://${BUCKET_NAME}" --region "${REGION}"
    fi
    log_success "Bucket created"
else
    log "Bucket ${BUCKET_NAME} already exists"
fi

log "Configuring static website hosting..."
aws s3 website "s3://${BUCKET_NAME}" \
    --index-document index.html \
    --error-document index.html \
    --region "${REGION}"

log "Removing public access block..."
aws s3api put-public-access-block \
    --bucket "${BUCKET_NAME}" \
    --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
    --region "${REGION}"

log "Setting bucket policy..."
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
    --policy file:///tmp/bucket-policy.json \
    --region "${REGION}"

log "Uploading static assets (with cache headers)..."
aws s3 sync "${DIST_DIR}" "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "*.html" \
    --exclude "service-worker.js" \
    --exclude "manifest.json" \
    --region "${REGION}"

log "Uploading HTML files (no cache)..."
aws s3 sync "${DIST_DIR}" "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --content-type "text/html" \
    --include "*.html" \
    --region "${REGION}"

log "Uploading service worker and manifest (no cache)..."
aws s3 sync "${DIST_DIR}" "s3://${BUCKET_NAME}" \
    --delete \
    --cache-control "public, max-age=0, must-revalidate" \
    --include "service-worker.js" \
    --include "manifest.json" \
    --region "${REGION}"

log "Setting content types..."
aws s3 cp "${DIST_DIR}/index.html" "s3://${BUCKET_NAME}/index.html" \
    --content-type "text/html" \
    --cache-control "public, max-age=0, must-revalidate" \
    --region "${REGION}"

WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
if [ "${REGION}" == "us-east-1" ]; then
    WEBSITE_URL="http://${BUCKET_NAME}.s3-website-us-east-1.amazonaws.com"
fi

if [ -n "${CLOUDFRONT_ID}" ]; then
    log "Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id "${CLOUDFRONT_ID}" \
        --paths "/*" \
        --region "${REGION}" > /dev/null
    log_success "CloudFront cache invalidated"
fi

rm -f /tmp/bucket-policy.json

log_success "=== Frontend Deployment Complete ==="
log "Website URL: ${WEBSITE_URL}"
log "Bucket: s3://${BUCKET_NAME}"
log "Backend API: ${BACKEND_URL}"
log ""
log "Test: curl ${WEBSITE_URL}"


