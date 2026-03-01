#!/bin/bash
set -e

BUCKET_NAME="uptimeai-frontend"
DISTRIBUTION_ID=""

echo "Creating CloudFront distribution..."

# Create OAI for S3
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
    --cloud-front-origin-access-identity-config \
    CallerReference="$(date +%s)",Comment="OAI for ${BUCKET_NAME}" \
    --query 'CloudFrontOriginAccessIdentity.Id' --output text)

echo "OAI Created: ${OAI_ID}"

# Update bucket policy to use OAI
cat > /tmp/bucket-policy-oai.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
EOF

# Create CloudFront distribution
aws cloudfront create-distribution \
    --distribution-config file://aws-deploy/cloudfront/cloudfront-config.json

echo "CloudFront distribution created"
echo "Update bucket policy with OAI: ${OAI_ID}"


