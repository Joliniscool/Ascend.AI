#!/bin/bash
# One-time setup script — run this on a fresh EC2 Ubuntu instance
# Usage: bash setup.sh

set -e

echo "==> Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "==> Installing PM2 and nginx..."
sudo npm install -g pm2
sudo apt-get install -y nginx

echo "==> Cloning repo..."
cd /home/ubuntu
git clone https://github.com/kelleyliang/Ascend.AI.git
cd Ascend.AI

echo "==> Building app..."
npm run build

echo "==> Creating .env..."
echo ""
echo "  IMPORTANT: create your .env file now:"
echo "  nano /home/ubuntu/Ascend.AI/server/.env"
echo ""
echo "  Paste in all your env vars and change these two:"
echo "    NODE_ENV=production"
echo "    CLIENT_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
read -p "  Press Enter once you've saved your .env file..."

echo "==> Starting server with PM2..."
cd /home/ubuntu/Ascend.AI/server
pm2 start app.js --name ascend-ai
pm2 save
pm2 startup | tail -1 | sudo bash

echo "==> Configuring nginx..."
sudo cp /home/ubuntu/Ascend.AI/deploy/nginx.conf /etc/nginx/sites-available/ascend
sudo ln -sf /etc/nginx/sites-available/ascend /etc/nginx/sites-enabled/ascend
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo ""
echo "==> Done! Your app is live at: http://$PUBLIC_IP"
echo ""
echo "  Next: update Google OAuth in the Google Cloud Console:"
echo "    Authorized JavaScript origins: http://$PUBLIC_IP"
echo "    Authorized redirect URIs:      http://$PUBLIC_IP/auth/google/callback"
