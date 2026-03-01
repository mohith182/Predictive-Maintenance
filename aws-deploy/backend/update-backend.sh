#!/bin/bash
set -e

APP_NAME="uptimeai-backend"
APP_DIR="/opt/${APP_NAME}"
SERVICE_USER="uptimeai"
BRANCH="main"

echo "=== Updating Backend ==="

cd ${APP_DIR}
sudo -u ${SERVICE_USER} git fetch origin
sudo -u ${SERVICE_USER} git reset --hard origin/${BRANCH}
sudo -u ${SERVICE_USER} git clean -fd

cd ${APP_DIR}/python_backend
sudo -u ${SERVICE_USER} ./venv/bin/pip install --upgrade -r requirements.txt

systemctl restart ${APP_NAME}
systemctl status ${APP_NAME} --no-pager

echo "=== Update Complete ==="


