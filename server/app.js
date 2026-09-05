/* =============================================================
   Admin backend for MyAppShop.

   Listens on localhost only; Nginx proxies /admin and /api to it.
   Everything the panel changes is written to server/data and the
   static site is rebuilt, so visitors keep getting plain files.
   ============================================================= */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const auth = require('./auth');
const store = require('./store');
const build = require('./build');

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const SITE_URL = process.env.SITE_URL || 'http://localhost';
const WEB_ROOT = process.env.WEB_ROOT || '/var/www/myappshop';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 2 * 1024 * 1024;

/* ---------- helpers ------------------------------------------ */

function send(res, status, body, headers) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, Object.assign({
    'Content-Type': typeof body === 'object' && !Buffer.isBuffer(body) ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }, headers || {}));
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

/* Behind the Cloudflare proxy the socket address is Cloudflare's, so
   prefer the header it sets. Falls back to the usual forwarded chain,
   then the socket, so this works proxied or not. */
function clientIp(req) {
  return req.headers['cf-connecting-ip']
    || (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    || req.socket.remoteAddress
    || 'unknown';
}

function authed(req) {
  return auth.validSession(cookies(req).mas_session);
}

function requireAuth(req, res) {
  if (authed(req)) return true;
  send(res, 401, { error: 'unauthorized' });
  return false;
}

/* Rebuilds the static site, reporting failures rather than
   leaving the admin thinking a save went live. */
async function rebuild() {
  try {
    build.rebuild({ siteUrl: SITE_URL, webRoot: WEB_ROOT });
  } catch (e) {
    return { ok: false, error: String((e && e.stderr) || (e && e.message) || e).slice(0, 800) };
  }

  // Published successfully; the edge cache is a separate concern.
  const purge = await build.purgeCloudflare();
  if (purge && purge.ok === false) return { ok: true, warning: 'cache_purge_failed', error: purge.error };
  return { ok: true, purged: !!(purge && purge.ok) };
}

/* ---------- static files for the panel ----------------------- */

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function servePanel(res, file) {
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR) || !fs.existsSync(full)) return send(res, 404, 'Not found');
  send(res, 200, fs.readFileSync(full), { 'Content-Type': TYPES[path.extname(full)] || 'application/octet-stream' });
}

/* ---------- routes ------------------------------------------- */

const routes = {
  'GET /api/session': (req, res) => {
    send(res, 200, { authenticated: authed(req), configured: auth.isConfigured() });
  },

  'POST /api/login': async (req, res) => {
    const ip = clientIp(req);
    if (auth.tooManyAttempts(ip)) return send(res, 429, { error: 'too_many_attempts' });

    const body = await readBody(req);
    if (!auth.isConfigured()) return send(res, 400, { error: 'not_configured' });

    if (!auth.verifyPassword(body.password || '')) {
      auth.recordFailure(ip);
      return send(res, 401, { error: 'bad_password' });
    }
    auth.clearAttempts(ip);
    const token = auth.createSession();
    send(res, 200, { ok: true }, {
      'Set-Cookie': `mas_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${auth.SESSION_HOURS * 3600}` +
        (SITE_URL.startsWith('https') ? '; Secure' : '')
    });
  },

  'POST /api/logout': (req, res) => {
    send(res, 200, { ok: true }, { 'Set-Cookie': 'mas_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  },

  'POST /api/password': async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    if (!auth.verifyPassword(body.current || '')) return send(res, 401, { error: 'bad_password' });
    try {
      auth.setPassword(body.next || '');
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    // Changing the password rotates the signing secret, so this
    // session is gone too — the panel sends the admin back to login.
    send(res, 200, { ok: true }, { 'Set-Cookie': 'mas_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  },

  'GET /api/content': (req, res) => {
    if (!requireAuth(req, res)) return;
    const resolvedContent = store.resolved();
    send(res, 200, {
      site: resolvedContent.site,
      products: resolvedContent.products,
      trustLogos: resolvedContent.trustLogos,
      i18n: resolvedContent.i18n,
      langs: resolvedContent.langs,
      defaults: { i18n: store.defaults.I18N },
      siteUrl: SITE_URL
    });
  },

  'PUT /api/site': async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    const c = store.rawContent();
    c.site = Object.assign({}, c.site, body || {});
    store.saveContent(c);
    send(res, 200, Object.assign({ ok: true }, await rebuild()));
  },

  'PUT /api/products': async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    if (!Array.isArray(body.products)) return send(res, 400, { error: 'products must be an array' });

    const seen = new Set();
    for (const p of body.products) {
      if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) return send(res, 400, { error: `Invalid id: ${p.id}` });
      if (seen.has(p.id)) return send(res, 400, { error: `Duplicate id: ${p.id}` });
      seen.add(p.id);
    }

    const c = store.rawContent();
    c.products = body.products;
    if (body.i18n) {
      c.i18n = c.i18n || {};
      for (const [lang, entries] of Object.entries(body.i18n)) {
        c.i18n[lang] = Object.assign({}, c.i18n[lang] || {}, entries);
      }
    }
    store.saveContent(c);
    send(res, 200, Object.assign({ ok: true }, await rebuild()));
  },

  'PUT /api/texts': async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    if (!body.lang || typeof body.entries !== 'object') return send(res, 400, { error: 'lang and entries required' });
    store.setTexts(body.lang, body.entries);
    send(res, 200, Object.assign({ ok: true }, await rebuild()));
  },

  'PUT /api/trust-logos': async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    if (!Array.isArray(body.logos)) return send(res, 400, { error: 'logos must be an array' });
    const c = store.rawContent();
    c.trustLogos = body.logos.map(String).filter(Boolean);
    store.saveContent(c);
    send(res, 200, Object.assign({ ok: true }, await rebuild()));
  },

  'POST /api/rebuild': async (req, res) => {
    if (!requireAuth(req, res)) return;
    send(res, 200, Object.assign({ ok: true }, await rebuild()));
  },

  'GET /api/requests': (req, res) => {
    if (!requireAuth(req, res)) return;
    send(res, 200, { requests: store.listRequests() });
  },

  'POST /api/requests/read': async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    store.markRequestRead(body.id, body.read !== false);
    send(res, 200, { ok: true });
  },

  'POST /api/requests/delete': async (req, res) => {
    if (!requireAuth(req, res)) return;
    const body = await readBody(req);
    store.deleteRequest(body.id);
    send(res, 200, { ok: true });
  },

  /* The public contact form posts here. No auth, so keep it strict. */
  'POST /api/contact': async (req, res) => {
    const body = await readBody(req);
    if (body.website) return send(res, 200, { ok: true });   // honeypot

    const str = (v, max) => String(v == null ? '' : v).slice(0, max).trim();
    const email = str(body.email, 200);
    const message = str(body.message, 5000);
    const name = str(body.name, 200);

    if (name.length < 2 || message.length < 5 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return send(res, 400, { error: 'invalid' });
    }

    store.addRequest({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      read: false,
      ip: clientIp(req),
      type: str(body.type, 40),
      name, email,
      phone: str(body.phone, 100),
      company: str(body.company, 200),
      platform: str(body.platform, 200),
      budget: str(body.budget, 60),
      timeline: str(body.timeline, 60),
      language: str(body.language, 10),
      message
    });
    send(res, 200, { ok: true });
  }
};

/* ---------- server ------------------------------------------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const key = req.method + ' ' + url.pathname;

  try {
    if (routes[key]) return await routes[key](req, res);

    if (req.method === 'GET' && (url.pathname === '/admin' || url.pathname === '/admin/')) {
      return servePanel(res, 'admin.html');
    }
    if (req.method === 'GET' && url.pathname.startsWith('/admin/')) {
      return servePanel(res, path.basename(url.pathname));
    }
    send(res, 404, { error: 'not_found' });
  } catch (e) {
    send(res, 500, { error: String(e && e.message || e).slice(0, 300) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`admin backend on http://${HOST}:${PORT}  (site ${SITE_URL}, web root ${WEB_ROOT})`);
  if (!auth.isConfigured()) console.log('! No admin password set yet — run: node server/set-password.js <password>');
});
