#!/bin/bash
# Render.com Backend Start Script
# This script ensures proper startup for Render deployment

cd python_backend

# Check if models exist, if not, use fallback
if [ ! -f "ml/health_classifier.pkl" ]; then
    echo "Warning: ML models not found. Using simulation mode."
fi

# Start with Gunicorn
exec gunicorn main:app \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level info


