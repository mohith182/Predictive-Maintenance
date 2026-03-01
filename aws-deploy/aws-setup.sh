#!/bin/bash
set -e

echo "=== AWS Setup Script ==="

# Install AWS CLI
if ! command -v aws &> /dev/null; then
    echo "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    echo "AWS CLI installed"
else
    echo "AWS CLI already installed"
fi

# Configure AWS CLI
echo "Configure AWS credentials:"
aws configure

# Test AWS connection
echo "Testing AWS connection..."
aws sts get-caller-identity

echo "=== AWS Setup Complete ==="


