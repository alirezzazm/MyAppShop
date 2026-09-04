/* =============================================================
   Default site content.

   content.json (written by the admin panel) overrides this. Keeping
   the defaults here means a fresh install has a complete site, and
   the admin only ever stores what was actually changed.
   ============================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const w = {};
for (const file of ['i18n-data.js', 'products.js']) {
  new Function('window', fs.readFileSync(path.join(ROOT, 'assets/js', file), 'utf8'))(w);
}

module.exports = {
  ROOT,
  LANGS: w.LANGS,
  I18N: w.I18N,
  PRODUCTS: w.PRODUCTS,
  TRUST_LOGOS: w.TRUST_LOGOS,

  // Values that live in the markup today, lifted into data so the
  // admin can change them. Elements marked data-site="email" pick
  // them up, in the browser and when prerendering alike.
  SITE: {
    brand: 'MyAppShop',
    email: 'hello@myappshop.com',
    phone: '+1 000 000 0000',
    social: { x: '#', linkedin: '#', instagram: '#', github: '#' },
    stats: [
      { count: 40, decimals: 0, suffix: '+' },
      { count: 250, decimals: 0, suffix: 'K+' },
      { count: 4.9, decimals: 1, suffix: '★' }
    ]
  }
};
