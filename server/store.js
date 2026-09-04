/* =============================================================
   Reads and writes the editable content.

   Only differences from the defaults are stored, so a value the
   admin never touched keeps following the code, and the file stays
   small and readable.
   ============================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const defaults = require('./defaults');

const DATA_DIR = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

/* Writes through a temporary file so a crash mid-write cannot leave
   a truncated file behind. */
function writeJson(file, value) {
  ensureDir();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

function emptyContent() {
  return { site: {}, products: null, i18n: {}, trustLogos: null };
}

function rawContent() {
  const c = readJson(CONTENT_FILE, emptyContent());
  return Object.assign(emptyContent(), c);
}

/* The defaults with the stored overrides applied. */
function resolved() {
  const c = rawContent();

  const site = Object.assign({}, defaults.SITE, c.site || {});
  site.social = Object.assign({}, defaults.SITE.social, (c.site && c.site.social) || {});
  site.stats = (c.site && c.site.stats) || defaults.SITE.stats;

  const products = c.products || defaults.PRODUCTS;
  const trustLogos = c.trustLogos || defaults.TRUST_LOGOS;

  const i18n = {};
  for (const lang of Object.keys(defaults.I18N)) {
    i18n[lang] = Object.assign({}, defaults.I18N[lang], (c.i18n && c.i18n[lang]) || {});
  }

  return { site, products, trustLogos, i18n, langs: defaults.LANGS };
}

function saveContent(next) {
  writeJson(CONTENT_FILE, next);
}

/* ---------- text overrides -------------------------------- */

/* Keeps only values that actually differ from the default, so
   reverting an edit removes it from the file rather than pinning
   the old default forever. */
function setTexts(lang, entries) {
  const c = rawContent();
  c.i18n = c.i18n || {};
  const bucket = Object.assign({}, c.i18n[lang] || {});
  const base = defaults.I18N[lang] || {};

  for (const [key, value] of Object.entries(entries)) {
    if (typeof value !== 'string') continue;
    if (base[key] !== undefined && base[key] === value) delete bucket[key];
    else bucket[key] = value;
  }

  if (Object.keys(bucket).length) c.i18n[lang] = bucket;
  else delete c.i18n[lang];

  saveContent(c);
}

/* ---------- contact requests ------------------------------- */

function listRequests() {
  return readJson(REQUESTS_FILE, []);
}

function addRequest(entry) {
  const all = listRequests();
  all.unshift(entry);
  // Keep the file bounded; the admin can export before it fills up.
  writeJson(REQUESTS_FILE, all.slice(0, 500));
  return entry;
}

function deleteRequest(id) {
  const all = listRequests().filter((r) => r.id !== id);
  writeJson(REQUESTS_FILE, all);
}

function markRequestRead(id, read) {
  const all = listRequests().map((r) => (r.id === id ? Object.assign({}, r, { read: !!read }) : r));
  writeJson(REQUESTS_FILE, all);
}

module.exports = {
  DATA_DIR, CONTENT_FILE, REQUESTS_FILE,
  rawContent, resolved, saveContent, setTexts,
  listRequests, addRequest, deleteRequest, markRequestRead,
  defaults
};
