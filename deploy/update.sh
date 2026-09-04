#!/usr/bin/env bash
# Pull the latest commit and republish, keeping everything the admin
# panel has changed. Run as root.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/myappshop}"
WEB_ROOT="${WEB_ROOT:-/var/www/myappshop}"

[[ -d "$APP_DIR" ]] || { echo "No install at $APP_DIR — run server-setup.sh first." >&2; exit 1; }

if [[ -d "$APP_DIR/.git" ]]; then
  BRANCH="$(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)"
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  echo "No git checkout in $APP_DIR — rebuilding from the files already there."
fi

# Reuse the address the site was built with, so URLs stay stable.
SITE_URL="$(grep -o 'https\?://[^/"]*' "$WEB_ROOT/sitemap.xml" 2>/dev/null | head -1 || true)"
if [[ -z "$SITE_URL" ]]; then
  SITE_URL="http://$(curl -fsS4 --max-time 5 ifconfig.me 2>/dev/null \
    || hostname -I | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | grep -v '^127\.' | head -1)"
fi

# server/build.js applies the admin's saved content, prerenders every
# page and swaps the web root — the same path the panel itself uses.
( cd "$APP_DIR" && node server/build.js "$SITE_URL" "$WEB_ROOT" )

chown -R www-data:www-data "$WEB_ROOT"
systemctl restart myappshop-admin 2>/dev/null || true
nginx -t && systemctl reload nginx

echo "Updated: $SITE_URL"
