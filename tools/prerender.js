#!/usr/bin/env node
/* =============================================================
   Prerenders one static HTML file per language.

   Search engines and social scrapers (WhatsApp, Telegram, X,
   LinkedIn, Slack) do not run JavaScript, so the runtime language
   switch is invisible to them. This bakes each language into its
   own file — en.html, fa.html, ar.html … — with the right <html
   lang>, <title>, description, Open Graph tags and JSON-LD.

   Usage:  node tools/prerender.js [siteUrl]
           SITE_URL=https://example.com node tools/prerender.js

   No dependencies. Run it before deploying; the workflow in
   .github/workflows/pages.yml already does.
   ============================================================= */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PLACEHOLDER = 'https://YOUR-DOMAIN.example';

const siteUrl = String(process.argv[2] || process.env.SITE_URL || PLACEHOLDER).replace(/\/+$/, '');

/* ---------- load the dictionaries and product data ------------ */
const sandbox = { window: {} };
for (const file of ['i18n-data.js', 'products.js']) {
  const code = fs.readFileSync(path.join(ROOT, 'assets/js', file), 'utf8');
  new Function('window', code)(sandbox.window);
}
const { LANGS, I18N, PRODUCTS } = sandbox.window;

const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ---------- helpers ------------------------------------------- */
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function translator(lang) {
  const dict = I18N[lang] || {};
  const en = I18N.en || {};
  return (key) => (key in dict ? dict[key] : key in en ? en[key] : key);
}

/* ---------- structured data ----------------------------------- */
function buildJsonLd(lang, t, pageUrl) {
  const faq = [];
  for (let i = 1; i <= 6; i++) {
    faq.push({
      '@type': 'Question',
      name: t(`faq.${i}.q`),
      acceptedAnswer: { '@type': 'Answer', text: t(`faq.${i}.a`) }
    });
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#org`,
        name: 'MyAppShop',
        url: siteUrl + '/',
        description: t('meta.desc'),
        slogan: t('footer.tagline'),
        knowsLanguage: LANGS.map((l) => l.code)
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#site`,
        url: pageUrl,
        name: 'MyAppShop',
        inLanguage: lang,
        publisher: { '@id': `${siteUrl}/#org` }
      },
      {
        '@type': 'ItemList',
        name: t('products.title'),
        itemListElement: PRODUCTS.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareApplication',
            name: t(`p.${p.id}.name`),
            description: t(`p.${p.id}.desc`),
            applicationCategory: t(`p.${p.id}.tag`),
            operatingSystem: p.platforms.join(', '),
            aggregateRating: {
              '@type': 'AggregateRating', ratingValue: p.rating, bestRating: '5', ratingCount: 100
            }
          }
        }))
      },
      { '@type': 'FAQPage', mainEntity: faq }
    ]
  };
}

/* ---------- one page ------------------------------------------ */
function render(meta) {
  const lang = meta.code;
  const t = translator(lang);
  const pageUrl = `${siteUrl}/${lang}.html`;
  let html = template;

  // Every element carrying data-i18n: rewrite the named attribute,
  // or the text content when no attribute is named.
  html = html.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*\bdata-i18n=(["'])(.*?)\3[^>]*)>/g,
    (tag, name, attrs, _q, key) => {
      const attrMatch = attrs.match(/\bdata-i18n-attr=(["'])(.*?)\1/);
      const value = escapeHtml(t(key));
      if (attrMatch) {
        const target = attrMatch[2];
        const re = new RegExp(`\\b${target}=(["'])(.*?)\\1`);
        const nextAttrs = re.test(attrs)
          ? attrs.replace(re, `${target}="${value}"`)
          : `${attrs} ${target}="${value}"`;
        return `<${name}${nextAttrs}>`;
      }
      // Leaf element: mark it so the text pass below knows where to write.
      return `<${name}${attrs} data-prerender="${escapeHtml(key)}">`;
    });

  html = html.replace(/ data-prerender="(.*?)">([^<]*)</g,
    (_m, key, _text) => `>${escapeHtml(t(key.replace(/&#39;/g, "'").replace(/&amp;/g, '&')))}<`);

  // Document language and direction.
  html = html.replace(/<html lang="[^"]*" dir="[^"]*">/,
    `<html lang="${lang}" dir="${meta.dir}" data-page-lang="${lang}">`);

  // Canonical, alternates and social URLs.
  const alternates = LANGS
    .map((l) => `<link rel="alternate" hreflang="${l.code}" href="${siteUrl}/${l.code}.html">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${siteUrl}/">`)
    .join('\n');

  const head = [
    `<link rel="canonical" href="${pageUrl}">`,
    alternates,
    `<script type="application/ld+json" id="ld-json">${JSON.stringify(buildJsonLd(lang, t, pageUrl))}</script>`
  ].join('\n');

  html = html.replace('<meta property="og:url" content="">', `<meta property="og:url" content="${pageUrl}">`);
  html = html.replace('<meta property="og:locale" content="en">', `<meta property="og:locale" content="${lang}">`);
  html = html.replace(/(<meta property="og:image" content=")[^"]*(">)/, `$1${siteUrl}/assets/img/og.png$2`);
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(">)/, `$1${siteUrl}/assets/img/og.png$2`);
  html = html.replace('</head>', `${head}\n</head>`);

  return html;
}

/* ---------- sitemap and robots -------------------------------- */
function writeSitemap() {
  const alternates = LANGS
    .map((l) => `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${siteUrl}/${l.code}.html"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/"/>`)
    .join('\n');

  const urls = [`  <url>
    <loc>${siteUrl}/</loc>
${alternates}
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`].concat(LANGS.map((l) => `  <url>
    <loc>${siteUrl}/${l.code}.html</loc>
${alternates}
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`));

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`);

  fs.writeFileSync(path.join(ROOT, 'robots.txt'),
`User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`);
}

/* ---------- write everything ---------------------------------- */
if (siteUrl === PLACEHOLDER) {
  console.warn(`! SITE_URL not set — using ${PLACEHOLDER}. Pass your real domain:`);
  console.warn('  node tools/prerender.js https://myappshop.com\n');
}

for (const meta of LANGS) {
  const out = path.join(ROOT, `${meta.code}.html`);
  fs.writeFileSync(out, render(meta));
  console.log(`  ${meta.code}.html  ${meta.native}${meta.dir === 'rtl' ? '  (rtl)' : ''}`);
}
writeSitemap();
console.log('  sitemap.xml\n  robots.txt');
console.log(`\n${LANGS.length} pages prerendered for ${siteUrl}`);
