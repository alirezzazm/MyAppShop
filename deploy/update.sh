#!/usr/bin/env bash
# Pull the latest commit, prerender again and republish. Run as root.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/myappshop}"
WEB_ROOT="${WEB_ROOT:-/var/www/myappshop}"

[[ -d "$APP_DIR/.git" ]] || { echo "No install at $APP_DIR — run server-setup.sh first." >&2; exit 1; }

BRANCH="$(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)"
git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
git -C "$APP_DIR" reset --hard "origin/$BRANCH"

# Reuse the address the site was built with, so URLs stay stable.
SITE_URL="$(grep -o 'https\?://[^/"]*' "$WEB_ROOT/sitemap.xml" 2>/dev/null | head -1 || true)"
if [[ -z "$SITE_URL" ]]; then
  SITE_URL="http://$(curl -fsS --max-time 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
fi

( cd "$APP_DIR" && node tools/prerender.js "$SITE_URL" )

rm -rf "$WEB_ROOT".new && mkdir -p "$WEB_ROOT".new
( cd "$APP_DIR" && tar -c \
    --exclude='./.git' --exclude='./.github' --exclude='./tools' \
    --exclude='./deploy' --exclude='./README.md' --exclude='./.gitignore' . ) \
  | tar -x -C "$WEB_ROOT".new
rm -rf "$WEB_ROOT".old
mv "$WEB_ROOT" "$WEB_ROOT".old
mv "$WEB_ROOT".new "$WEB_ROOT"
rm -rf "$WEB_ROOT".old
chown -R www-data:www-data "$WEB_ROOT"

nginx -t && systemctl reload nginx
echo "Updated: $SITE_URL"
