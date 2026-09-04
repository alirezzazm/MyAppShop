#!/usr/bin/env bash
# =============================================================
#  MyAppShop — one-shot server setup (Ubuntu / Debian)
#
#  Run as root on a fresh server:
#
#    bash server-setup.sh --repo https://github.com/USER/REPO.git \
#                         [--branch main] \
#                         [--domain example.com --email you@example.com]
#
#  Without --domain the site is served over plain HTTP on the
#  server's IP. With one, Nginx is configured for that hostname and
#  a Let's Encrypt certificate is requested.
#
#  Safe to re-run: it updates an existing install in place.
# =============================================================
set -euo pipefail

REPO=""
BRANCH="main"
DOMAIN=""
EMAIL=""
NO_FETCH=0
SITE_URL_OVERRIDE=""
APP_DIR="/opt/myappshop"
WEB_ROOT="/var/www/myappshop"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)   REPO="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --email)  EMAIL="$2"; shift 2 ;;
    --no-fetch) NO_FETCH=1; shift ;;   # use the files already in $APP_DIR
    --site-url) SITE_URL_OVERRIDE="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ $NO_FETCH -eq 0 && -z "$REPO" ]]; then
  echo "--repo is required (or pass --no-fetch to use $APP_DIR as it is)" >&2
  exit 1
fi
[[ $EUID -ne 0 ]] && { echo "Run this as root." >&2; exit 1; }

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

say "Installing packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx git curl ca-certificates ufw >/dev/null

if ! command -v node >/dev/null 2>&1; then
  say "Installing Node.js (needed to prerender the language pages)"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node --version)"

if [[ $NO_FETCH -eq 1 ]]; then
  say "Using the files already in $APP_DIR"
  [[ -f "$APP_DIR/tools/prerender.js" ]] || { echo "No site found in $APP_DIR" >&2; exit 1; }
elif true; then
say "Fetching the site"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" remote set-url origin "$REPO"
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  rm -rf "$APP_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$APP_DIR"
fi
fi

# The public address decides canonical, hreflang and Open Graph URLs.
# Detection prefers IPv4: a bare IPv6 address is not valid in a URL
# without brackets, and is rarely the address visitors will use.
detect_ipv4() {
  curl -fsS4 --max-time 5 ifconfig.me 2>/dev/null \
    || curl -fsS4 --max-time 5 https://api.ipify.org 2>/dev/null \
    || hostname -I | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | grep -v '^127\.' | head -1
}

if [[ -n "$SITE_URL_OVERRIDE" ]]; then
  SITE_URL="${SITE_URL_OVERRIDE%/}"
elif [[ -n "$DOMAIN" ]]; then
  SITE_URL="https://$DOMAIN"
else
  IPV4="$(detect_ipv4 || true)"
  [[ -z "$IPV4" ]] && { echo "Could not detect a public IPv4 address — pass --site-url http://your.ip" >&2; exit 1; }
  SITE_URL="http://$IPV4"
fi

say "Prerendering for $SITE_URL"
( cd "$APP_DIR" && node tools/prerender.js "$SITE_URL" )

say "Publishing to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
# Copy the site, leaving development-only files behind.
rm -rf "$WEB_ROOT".new && mkdir -p "$WEB_ROOT".new
( cd "$APP_DIR" && tar -c \
    --exclude='./.git' --exclude='./.github' --exclude='./tools' \
    --exclude='./deploy' --exclude='./README.md' --exclude='./.gitignore' . ) \
  | tar -x -C "$WEB_ROOT".new
rm -rf "$WEB_ROOT".old
[[ -d "$WEB_ROOT" ]] && mv "$WEB_ROOT" "$WEB_ROOT".old
mv "$WEB_ROOT".new "$WEB_ROOT"
rm -rf "$WEB_ROOT".old
chown -R www-data:www-data "$WEB_ROOT"

say "Configuring Nginx"
SERVER_NAME="${DOMAIN:-_}"
cat > /etc/nginx/sites-available/myappshop <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME}${DOMAIN:+ www.$DOMAIN};

    root ${WEB_ROOT};
    index index.html;

    # /fa serves fa.html, /taskflow.fa serves taskflow.fa.html
    location / {
        try_files \$uri \$uri.html \$uri/ =404;
    }

    error_page 404 /404.html;

    gzip on;
    gzip_comp_level 6;
    gzip_min_length 512;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml;

    location ~* \.(css|js|png|jpg|jpeg|gif|svg|webp|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    location ~* \.html$ {
        add_header Cache-Control "public, max-age=300";
    }

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
}
NGINX

ln -sf /etc/nginx/sites-available/myappshop /etc/nginx/sites-enabled/myappshop
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx || systemctl restart nginx

say "Opening the firewall"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

if [[ -n "$DOMAIN" ]]; then
  say "Requesting an HTTPS certificate for $DOMAIN"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
    --non-interactive --agree-tos --redirect \
    ${EMAIL:+-m "$EMAIL"} ${EMAIL:---register-unsafely-without-email} \
    || echo "! Certificate request failed — check that $DOMAIN points at this server, then rerun."
fi

say "Done"
echo "Site:      $SITE_URL"
echo "Files:     $WEB_ROOT"
echo "Source:    $APP_DIR"
echo "To update: bash $APP_DIR/deploy/update.sh"
