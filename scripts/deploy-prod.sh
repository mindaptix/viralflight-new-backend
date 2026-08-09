#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Stopping PM2 app (if present)"
pm2 stop viralflight-backend >/dev/null 2>&1 || true

if [[ -f /var/www/package-lock.json ]]; then
  echo "==> Moving stray /var/www/package-lock.json"
  mv /var/www/package-lock.json "/var/www/package-lock.json.bak.$(date +%s)"
fi

echo "==> Pulling latest"
git pull --ff-only

echo "==> Installing deps"
npm install --omit=dev

echo "==> Cleaning old Next build"
rm -rf .next

echo "==> Building production Next.js app"
export NODE_ENV=production
npm run build

if [[ ! -f .next/BUILD_ID ]]; then
  echo "ERROR: .next/BUILD_ID missing after build"
  exit 1
fi

echo "==> Build OK: $(cat .next/BUILD_ID)"
echo "==> Starting PM2"
pm2 start viralflight-backend --update-env || pm2 restart viralflight-backend --update-env
pm2 save >/dev/null 2>&1 || true

echo "==> Done. Recent logs:"
pm2 logs viralflight-backend --lines 30 --nostream
