#!/bin/bash
# Re-deploy script — run on EC2 after pushing new code to GitHub
# Usage: bash deploy.sh

set -e

echo "==> Pulling latest code..."
cd /home/ubuntu/Ascend.AI
git pull

echo "==> Rebuilding..."
npm run build

echo "==> Restarting server..."
pm2 restart ascend-ai

echo "==> Done!"
pm2 status
