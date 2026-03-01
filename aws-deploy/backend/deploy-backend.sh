#!/bin/bash
set -e

echo "=== AWS EC2 Backend Deployment Script ==="

# Configuration
APP_NAME="uptimeai-backend"
APP_DIR="/opt/${APP_NAME}"
SERVICE_USER="uptimeai"
REPO_URL="https://github.com/mohith182/Predictive-Maintenance.git"
BRANCH="main"
PYTHON_VERSION="3.11"

# Colors for output
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
log_info "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install Python and dependencies
log_info "Installing Python ${PYTHON_VERSION} and dependencies..."
apt-get install -y \
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
    python3-dev

# Create application user
log_info "Creating application user: ${SERVICE_USER}..."
if ! id -u ${SERVICE_USER} > /dev/null 2>&1; then
    useradd -r -s /bin/bash -d ${APP_DIR} -m ${SERVICE_USER}
    log_info "User ${SERVICE_USER} created"
else
    log_warn "User ${SERVICE_USER} already exists"
fi

# Create application directory
log_info "Creating application directory: ${APP_DIR}..."
mkdir -p ${APP_DIR}
chown ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}

# Clone or update repository
log_info "Cloning/updating repository..."
if [ -d "${APP_DIR}/.git" ]; then
    log_info "Repository exists, updating..."
    cd ${APP_DIR}
    sudo -u ${SERVICE_USER} git fetch origin
    sudo -u ${SERVICE_USER} git reset --hard origin/${BRANCH}
    sudo -u ${SERVICE_USER} git clean -fd
else
    log_info "Cloning repository..."
    sudo -u ${SERVICE_USER} git clone -b ${BRANCH} ${REPO_URL} ${APP_DIR}
fi

# Navigate to backend directory
cd ${APP_DIR}/python_backend

# Create virtual environment
log_info "Setting up virtual environment..."
if [ ! -d "venv" ]; then
    sudo -u ${SERVICE_USER} python${PYTHON_VERSION} -m venv venv
fi

# Activate virtual environment and install dependencies
log_info "Installing Python dependencies..."
sudo -u ${SERVICE_USER} ./venv/bin/pip install --upgrade pip setuptools wheel
sudo -u ${SERVICE_USER} ./venv/bin/pip install -r requirements.txt
sudo -u ${SERVICE_USER} ./venv/bin/pip install gunicorn uvicorn[standard]

# Create environment file if it doesn't exist
log_info "Setting up environment variables..."
if [ ! -f ".env" ]; then
    log_warn ".env file not found. Creating from .env.example if available..."
    if [ -f ".env.example" ]; then
        sudo -u ${SERVICE_USER} cp .env.example .env
        log_warn "Please edit ${APP_DIR}/python_backend/.env with production values"
    else
        sudo -u ${SERVICE_USER} touch .env
        log_warn "Created empty .env file. Please configure it manually"
    fi
fi

# Set proper permissions
log_info "Setting file permissions..."
chown -R ${SERVICE_USER}:${SERVICE_USER} ${APP_DIR}
chmod +x ${APP_DIR}/python_backend/venv/bin/*

# Create systemd service file
log_info "Creating systemd service..."
cat > /etc/systemd/system/${APP_NAME}.service <<EOF
[Unit]
Description=UptimeAI FastAPI Backend
After=network.target

[Service]
Type=notify
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${APP_DIR}/python_backend
Environment="PATH=${APP_DIR}/python_backend/venv/bin"
EnvironmentFile=${APP_DIR}/python_backend/.env
ExecStart=${APP_DIR}/python_backend/venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-connections 1000 \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    main:app
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

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
systemctl daemon-reload

# Configure firewall
log_info "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw --force reload

# Enable and start service
log_info "Enabling and starting service..."
systemctl enable ${APP_NAME}
systemctl restart ${APP_NAME}

# Wait for service to start
sleep 5

# Check service status
if systemctl is-active --quiet ${APP_NAME}; then
    log_info "Service ${APP_NAME} is running"
    systemctl status ${APP_NAME} --no-pager
else
    log_error "Service ${APP_NAME} failed to start"
    journalctl -u ${APP_NAME} -n 50 --no-pager
    exit 1
fi

# Health check
log_info "Performing health check..."
sleep 3
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    log_info "Backend health check passed"
else
    log_warn "Health check failed. Check logs: journalctl -u ${APP_NAME}"
fi

log_info "=== Deployment Complete ==="
log_info "Service: ${APP_NAME}"
log_info "Status: systemctl status ${APP_NAME}"
log_info "Logs: journalctl -u ${APP_NAME} -f"
log_info "Edit env: nano ${APP_DIR}/python_backend/.env"
log_info "Restart: systemctl restart ${APP_NAME}"


