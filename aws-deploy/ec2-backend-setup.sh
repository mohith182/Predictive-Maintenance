#!/bin/bash
set -euo pipefail

APP_NAME="uptimeai-backend"
APP_DIR="/opt/${APP_NAME}"
SERVICE_USER="uptimeai"
REPO_URL="https://github.com/mohith182/Predictive-Maintenance.git"
BRANCH="main"
PYTHON_VERSION="3.11"
PORT="8000"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"; }
log_error() { echo "[ERROR] $*" >&2; }
log_success() { echo "[SUCCESS] $*"; }

if [ "$EUID" -ne 0 ]; then
    log_error "Must run as root. Use: sudo $0"
    exit 1
fi

log "Starting EC2 backend deployment..."

log "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

log "Installing system dependencies..."
apt-get install -y -qq \
    python${PYTHON_VERSION} \
    python${PYTHON_VERSION}-venv \
    python3-pip \
    git \
    nginx \
    ufw \
    curl \
    wget \
    build-essential \
    libpq-dev \
    python3-dev \
    postgresql-client \
    supervisor \
    logrotate

log "Creating application user..."
if ! id -u ${SERVICE_USER} > /dev/null 2>&1; then
    useradd -r -s /bin/bash -d ${APP_DIR} -m -U ${SERVICE_USER}
    log_success "User ${SERVICE_USER} created"
else
    log "User ${SERVICE_USER} already exists"
fi

log "Creating application directory..."
mkdir -p ${APP_DIR}
chown ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}

log "Cloning/updating repository..."
if [ -d "${APP_DIR}/.git" ]; then
    log "Updating existing repository..."
    cd ${APP_DIR}
    sudo -u ${SERVICE_USER} git fetch origin ${BRANCH}
    sudo -u ${SERVICE_USER} git reset --hard origin/${BRANCH}
    sudo -u ${SERVICE_USER} git clean -fd
else
    log "Cloning repository..."
    sudo -u ${SERVICE_USER} git clone -b ${BRANCH} ${REPO_URL} ${APP_DIR}
fi

cd ${APP_DIR}/python_backend

log "Creating virtual environment..."
if [ ! -d "venv" ]; then
    sudo -u ${SERVICE_USER} python${PYTHON_VERSION} -m venv venv
fi

log "Installing Python dependencies..."
sudo -u ${SERVICE_USER} ./venv/bin/pip install --upgrade --quiet pip setuptools wheel
sudo -u ${SERVICE_USER} ./venv/bin/pip install --quiet -r requirements.txt
sudo -u ${SERVICE_USER} ./venv/bin/pip install --quiet gunicorn uvicorn[standard]

log "Setting up environment file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        sudo -u ${SERVICE_USER} cp .env.example .env
        log "Created .env from .env.example"
    else
        sudo -u ${SERVICE_USER} touch .env
        log "Created empty .env file"
    fi
    chmod 600 .env
    log "IMPORTANT: Edit ${APP_DIR}/python_backend/.env with production values"
fi

log "Setting file permissions..."
chown -R ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}
chmod 755 ${APP_DIR}
chmod 700 ${APP_DIR}/python_backend/.env

log "Creating systemd service..."
cat > /etc/systemd/system/${APP_NAME}.service <<EOF
[Unit]
Description=UptimeAI FastAPI Backend Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=notify
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${APP_DIR}/python_backend
Environment="PATH=${APP_DIR}/python_backend/venv/bin"
EnvironmentFile=${APP_DIR}/python_backend/.env
ExecStart=${APP_DIR}/python_backend/venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT} \
    --workers 4 \
    --worker-connections 1000 \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --capture-output \
    main:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${APP_NAME}

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${APP_DIR}
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true
LockPersonality=true
MemoryDenyWriteExecute=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictSUIDSGID=true
RemoveIPC=true
PrivateDevices=false

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

log "Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow ${PORT}/tcp comment 'FastAPI Backend'
ufw --force reload

log "Reloading systemd..."
systemctl daemon-reload

log "Enabling and starting service..."
systemctl enable ${APP_NAME}
systemctl restart ${APP_NAME}

log "Waiting for service to start..."
sleep 5

if systemctl is-active --quiet ${APP_NAME}; then
    log_success "Service ${APP_NAME} is running"
    systemctl status ${APP_NAME} --no-pager -l
else
    log_error "Service failed to start"
    journalctl -u ${APP_NAME} -n 50 --no-pager
    exit 1
fi

log "Performing health check..."
sleep 3
if curl -f -s http://localhost:${PORT}/health > /dev/null; then
    log_success "Health check passed"
    curl -s http://localhost:${PORT}/health | jq . || curl -s http://localhost:${PORT}/health
else
    log_error "Health check failed"
    journalctl -u ${APP_NAME} -n 20 --no-pager
fi

log_success "=== Backend Deployment Complete ==="
log "Service: ${APP_NAME}"
log "Status: systemctl status ${APP_NAME}"
log "Logs: journalctl -u ${APP_NAME} -f"
log "Restart: systemctl restart ${APP_NAME}"
log "Environment: ${APP_DIR}/python_backend/.env"
log "Health: curl http://localhost:${PORT}/health"


