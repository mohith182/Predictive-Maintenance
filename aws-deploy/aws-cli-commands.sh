#!/bin/bash
# AWS CLI Commands Reference
# Run these commands to set up infrastructure

BUCKET_NAME="uptimeai-frontend"
REGION="us-east-1"
EC2_INSTANCE_ID="i-xxxxxxxxxxxxx"
SECURITY_GROUP_ID="sg-xxxxxxxxxxxxx"

echo "=== AWS CLI Setup Commands ==="

echo ""
echo "1. Configure AWS CLI:"
echo "aws configure"

echo ""
echo "2. Create S3 Bucket:"
echo "aws s3 mb s3://${BUCKET_NAME} --region ${REGION}"

echo ""
echo "3. Enable Static Website Hosting:"
echo "aws s3 website s3://${BUCKET_NAME} --index-document index.html --error-document index.html"

echo ""
echo "4. Set Bucket Policy (Public Read):"
cat <<'POLICY'
aws s3api put-bucket-policy --bucket ${BUCKET_NAME} --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::'${BUCKET_NAME}'/*"
  }]
}'
POLICY

echo ""
echo "5. Remove Public Access Block:"
echo "aws s3api put-public-access-block --bucket ${BUCKET_NAME} --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo ""
echo "6. Upload Frontend Files:"
echo "aws s3 sync dist/ s3://${BUCKET_NAME} --delete --cache-control 'public, max-age=31536000, immutable' --exclude '*.html'"
echo "aws s3 sync dist/ s3://${BUCKET_NAME} --delete --cache-control 'public, max-age=0, must-revalidate' --include '*.html'"

echo ""
echo "7. Configure EC2 Security Group (Allow Port 8000):"
echo "aws ec2 authorize-security-group-ingress --group-id ${SECURITY_GROUP_ID} --protocol tcp --port 8000 --cidr 0.0.0.0/0"

echo ""
echo "8. Configure EC2 Security Group (Allow HTTP):"
echo "aws ec2 authorize-security-group-ingress --group-id ${SECURITY_GROUP_ID} --protocol tcp --port 80 --cidr 0.0.0.0/0"

echo ""
echo "9. Configure EC2 Security Group (Allow HTTPS):"
echo "aws ec2 authorize-security-group-ingress --group-id ${SECURITY_GROUP_ID} --protocol tcp --port 443 --cidr 0.0.0.0/0"

echo ""
echo "10. Get EC2 Instance Public IP:"
echo "aws ec2 describe-instances --instance-ids ${EC2_INSTANCE_ID} --query 'Reservations[0].Instances[0].PublicIpAddress' --output text"

echo ""
echo "11. Get S3 Website URL:"
echo "aws s3api get-bucket-website --bucket ${BUCKET_NAME}"

echo ""
echo "12. List S3 Bucket Contents:"
echo "aws s3 ls s3://${BUCKET_NAME} --recursive"

echo ""
echo "13. Delete S3 Bucket (Cleanup):"
echo "aws s3 rm s3://${BUCKET_NAME} --recursive"
echo "aws s3 rb s3://${BUCKET_NAME}"

echo ""
echo "14. Create CloudFront Distribution (Optional):"
echo "aws cloudfront create-distribution --distribution-config file://cloudfront-config.json"

echo ""
echo "=== Commands Complete ==="


