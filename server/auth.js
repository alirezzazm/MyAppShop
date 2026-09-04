/* =============================================================
   Password login with signed session cookies.

   Node's own crypto only — no dependencies to install or keep
   patched. Passwords are stored scrypt-hashed with a per-install
   salt; sessions are HMAC-signed tokens with an expiry.
   ============================================================= */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

const SESSION_HOURS = 12;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function read() {
  try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); } catch (e) { return null; }
}

function write(value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = AUTH_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, AUTH_FILE);
}

function hash(password, salt) {
  return crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT).toString('hex');
}

function isConfigured() {
  const a = read();
  return !!(a && a.hash && a.salt);
}

function setPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  const existing = read() || {};
  const salt = crypto.randomBytes(16).toString('hex');
  write({
    salt,
    hash: hash(password, salt),
    // Rotating the secret invalidates every existing session, which
    // is what you want when the password changes.
    secret: crypto.randomBytes(32).toString('hex'),
    username: existing.username || 'admin',
    updatedAt: new Date().toISOString()
  });
}

function verifyPassword(password) {
  const a = read();
  if (!a) return false;
  const candidate = Buffer.from(hash(String(password), a.salt), 'hex');
  const stored = Buffer.from(a.hash, 'hex');
  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function sign(value) {
  const a = read();
  return crypto.createHmac('sha256', a.secret).update(value).digest('hex');
}

function createSession() {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const body = String(expires) + '.' + crypto.randomBytes(12).toString('hex');
  return body + '.' + sign(body);
}

function validSession(token) {
  if (!token || !read()) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3) return false;
  const body = parts[0] + '.' + parts[1];
  const expected = Buffer.from(sign(body), 'hex');
  const given = Buffer.from(parts[2], 'hex');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return false;
  return Number(parts[0]) > Date.now();
}

/* ---------- brute-force slowdown ---------------------------- */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function tooManyAttempts(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) { attempts.delete(ip); return false; }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW_MS) attempts.set(ip, { first: Date.now(), count: 1 });
  else entry.count++;
}

function clearAttempts(ip) { attempts.delete(ip); }

module.exports = {
  AUTH_FILE, SESSION_HOURS,
  isConfigured, setPassword, verifyPassword,
  createSession, validSession,
  tooManyAttempts, recordFailure, clearAttempts
};
