#!/usr/bin/env bash
# setup.sh — Full server bootstrap for Ubuntu 24.04 LTS
# Run as root: bash setup.sh
set -euo pipefail

echo "========================================"
echo " clevertree-tts-server setup"
echo "========================================"

# 1. System packages
echo "==> Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq nginx curl git

# 2. Install Node.js 22 LTS
if ! command -v node &>/dev/null; then
    echo "==> Installing Node.js 22 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
else
    echo "==> Node.js already installed: $(node -v)"
fi

# 3. Create tts user
if ! id -u tts &>/dev/null; then
    echo "==> Creating tts service user..."
    useradd --system --no-create-home --shell /usr/sbin/nologin tts
else
    echo "==> tts user already exists."
fi

# 4. Install Piper
echo "==> Installing Piper..."
bash /opt/clevertree-tts-server/scripts/install-piper.sh

# 5. Deploy the app
APP_DIR="/opt/clevertree-tts-server"
echo "==> Building app in ${APP_DIR}..."
cd "${APP_DIR}"
npm ci --omit=dev 2>/dev/null || npm install --omit=dev
npx tsc

# 6. Generate secret if .env doesn't exist
if [ ! -f "${APP_DIR}/.env" ]; then
    echo "==> Generating .env..."
    SECRET=$(openssl rand -hex 32)
    cat > "${APP_DIR}/.env" << EOF
PORT=3100
CLEVERTREE_TTS_SECRET=${SECRET}
PIPER_BIN=/opt/piper/piper
PIPER_MODELS_DIR=/opt/piper/voices
ALLOWED_ORIGINS=https://paradigm-threat.com,https://www.paradigm-threat.com,https://paradigm-threat-site.vercel.app,http://localhost:3000,http://localhost:3001
EOF
    echo "==> Secret generated. SAVE THIS:"
    echo "    CLEVERTREE_TTS_SECRET=${SECRET}"
else
    echo "==> .env already exists, keeping it."
fi

# 7. Set ownership
chown -R tts:tts "${APP_DIR}"

# 8. Install systemd service
echo "==> Installing systemd service..."
cp "${APP_DIR}/deploy/tts.service" /etc/systemd/system/clevertree-tts.service
systemctl daemon-reload
systemctl enable clevertree-tts
systemctl restart clevertree-tts

# Wait for startup
sleep 2
if systemctl is-active --quiet clevertree-tts; then
    echo "==> TTS service started successfully."
else
    echo "==> WARNING: TTS service failed to start. Check: journalctl -u clevertree-tts"
fi

# 9. Configure nginx
echo "==> Configuring nginx..."
cp "${APP_DIR}/deploy/nginx.conf" /etc/nginx/sites-available/tts.conf
ln -sf /etc/nginx/sites-available/tts.conf /etc/nginx/sites-enabled/tts.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "========================================"
echo " Setup complete!"
echo "========================================"
echo ""
echo "  TTS service: systemctl status clevertree-tts"
echo "  Logs:        journalctl -u clevertree-tts -f"
echo "  Test:        curl http://localhost/health"
echo ""
echo "  Next steps:"
echo "    1. Point DNS to this server"
echo "    2. Run: certbot --nginx"
echo "    3. Save CLEVERTREE_TTS_SECRET to your Vercel env"
echo ""
