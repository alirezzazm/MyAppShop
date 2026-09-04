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
for (const file of ['i18n-data.js', 'products.js', 'overrides.js', 'product-view.js', 'product-card.js']) {
  const full = path.join(ROOT, 'assets/js', file);
  // overrides.js only exists once the admin panel has generated it.
  if (!fs.existsSync(full)) continue;
  new Function('window', fs.readFileSync(full, 'utf8'))(sandbox.window);
}
const { LANGS, I18N, PRODUCTS } = sandbox.window;
const SITE = sandbox.window.SITE || {};
const TRUST_LOGOS = sandbox.window.TRUST_LOGOS || [];

/* A card links to that product's page in the language being rendered,
   unless the product points somewhere else (an app store, say). */
function productHref(p, lang) {
  return p.link && p.link !== '#contact' ? p.link : `${p.id}.${lang}.html`;
}

const { buildProductView, buildProductGrid, buildMarquee } = sandbox.window;

const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const productTemplate = fs.readFileSync(path.join(ROOT, 'product.html'), 'utf8');

/* ---------- helpers ------------------------------------------- */
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function translator(lang) {
  const dict = I18N[lang] || {};
  const en = I18N.en || {};
  return (key) => (key in dict ? dict[key] : key in en ? en[key] : key);
}

/* ---------- editable site values ------------------------------ */
function applySite(html) {
  if (!SITE || !Object.keys(SITE).length) return html;

  html = html.replace(/<a\b([^>]*\bdata-site=(["'])(.*?)\2[^>]*)>([\s\S]*?)<\/a>/g,
    (whole, attrs, _q, key, inner) => {
      const value = SITE[key];
      if (value == null) return whole;
      let next = attrs;
      if (/\bdata-site-attr=(["'])href\1/.test(attrs)) {
        const href = key === 'email' ? 'mailto:' + value
          : key === 'phone' ? 'tel:' + String(value).replace(/[^\d+]/g, '')
          : String(value);
        next = attrs.replace(/\bhref=(["'])(.*?)\1/, `href="${escapeHtml(href)}"`);
      }
      const body = inner.includes('<bdi')
        ? inner.replace(/(<bdi[^>]*>)[^<]*(<\/bdi>)/, `$1${escapeHtml(value)}$2`)
        : escapeHtml(value);
      return `<a${next}>${body}</a>`;
    });

  if (SITE.social) {
    html = html.replace(/<a\b([^>]*\bdata-social=(["'])(.*?)\2[^>]*)>/g, (whole, attrs, _q, name) => {
      const url = SITE.social[name];
      if (!url || url === '#') return `<a${attrs} hidden>`;
      return `<a${attrs.replace(/\bhref=(["'])(.*?)\1/, `href="${escapeHtml(url)}"`)}>`;
    });
  }

  if (Array.isArray(SITE.stats)) {
    html = html.replace(/<dt\b([^>]*\bdata-stat=(["'])(\d+)\2[^>]*)>/g, (whole, attrs, _q, index) => {
      const stat = SITE.stats[Number(index)];
      if (!stat) return whole;
      const next = attrs
        .replace(/\bdata-count=(["'])(.*?)\1/, `data-count="${escapeHtml(stat.count)}"`)
        .replace(/\bdata-suffix=(["'])(.*?)\1/, `data-suffix="${escapeHtml(stat.suffix || '')}"`)
        .replace(/\bdata-decimals=(["'])(.*?)\1/, `data-decimals="${escapeHtml(stat.decimals || 0)}"`);
      return `<dt${next}>`;
    });
  }

  return html;
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

  // Values the admin can edit (contact details, social links, stats).
  html = applySite(html);

  // Bake the product grid and client strip; without this the landing
  // page ships an empty grid to anything that does not run scripts.
  html = html.replace('<div class="product-grid" id="product-grid"></div>',
    '<div class="product-grid" id="product-grid">' +
      buildProductGrid(PRODUCTS, t, (p) => productHref(p, lang)) +
    '</div>');
  html = html.replace('<div class="marquee-track" id="marquee-track"></div>',
    '<div class="marquee-track" id="marquee-track">' + buildMarquee(TRUST_LOGOS) + '</div>');

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

/* ---------- one product page ---------------------------------- */
function renderProduct(product, meta) {
  const lang = meta.code;
  const t = translator(lang);
  const pageUrl = `${siteUrl}/${product.id}.${lang}.html`;

  const view = buildProductView(product, t, {
    lang,
    langCount: LANGS.length,
    productUrl: (other) => `${other}.${lang}.html`,
    homeUrl: () => `${lang}.html`,
    contactUrl: () => `${lang}.html#contact`
  });

  let html = applySite(productTemplate);

  html = html.replace('<html lang="en" dir="ltr">',
    `<html lang="${lang}" dir="${meta.dir}" data-page-lang="${lang}" data-product-id="${product.id}" data-lang-template="${product.id}.{lang}.html">`);

  // The shared builder produced the same markup the browser would.
  html = html.replace('<div class="pv-nav" id="pv-nav"></div>',
    `<div class="pv-nav" id="pv-nav">${view.nav}</div>`);
  html = html.replace('<main class="container" id="pv-main"></main>',
    `<main class="container" id="pv-main">${view.main}</main>`);

  // Head: title, description, social cards, canonical, alternates.
  html = html.replace('<title>Product — MyAppShop</title>', `<title>${escapeHtml(view.title)}</title>`);
  const setMeta = (attr, name, value) => {
    html = html.replace(new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(">)`),
      `$1${escapeHtml(value)}$2`);
  };
  setMeta('name', 'description', view.description);
  setMeta('property', 'og:title', view.title);
  setMeta('property', 'og:description', view.description);
  setMeta('name', 'twitter:title', view.title);
  setMeta('name', 'twitter:description', view.description);
  setMeta('property', 'og:url', pageUrl);
  setMeta('property', 'og:locale', lang);
  setMeta('property', 'og:image', `${siteUrl}/assets/img/og.png`);
  setMeta('name', 'twitter:image', `${siteUrl}/assets/img/og.png`);

  const alternates = LANGS
    .map((l) => `<link rel="alternate" hreflang="${l.code}" href="${siteUrl}/${product.id}.${l.code}.html">`)
    .concat(`<link rel="alternate" hreflang="x-default" href="${siteUrl}/${product.id}.en.html">`)
    .join('\n');

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t(`p.${product.id}.name`),
    description: t(`p.${product.id}.long`),
    applicationCategory: t(`p.${product.id}.tag`),
    operatingSystem: product.platforms.join(', '),
    inLanguage: lang,
    url: pageUrl,
    image: `${siteUrl}/assets/img/og.png`,
    publisher: { '@type': 'Organization', name: 'MyAppShop', url: `${siteUrl}/` },
    aggregateRating: {
      '@type': 'AggregateRating', ratingValue: product.rating, bestRating: '5', ratingCount: 100
    }
  };

  html = html.replace('</head>', [
    `<link rel="canonical" href="${pageUrl}">`,
    alternates,
    `<script type="application/ld+json" id="ld-json">${JSON.stringify(ld)}</script>`,
    '</head>'
  ].join('\n'));

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

  for (const product of PRODUCTS) {
    const productAlts = LANGS
      .map((l) => `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${siteUrl}/${product.id}.${l.code}.html"/>`)
      .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/${product.id}.en.html"/>`)
      .join('\n');
    for (const l of LANGS) {
      urls.push(`  <url>
    <loc>${siteUrl}/${product.id}.${l.code}.html</loc>
${productAlts}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
  }

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
let productPages = 0;
for (const product of PRODUCTS) {
  for (const meta of LANGS) {
    fs.writeFileSync(path.join(ROOT, `${product.id}.${meta.code}.html`), renderProduct(product, meta));
    productPages++;
  }
}
console.log(`  ${productPages} product pages (${PRODUCTS.length} products x ${LANGS.length} languages)`);

writeSitemap();
console.log('  sitemap.xml\n  robots.txt');
console.log(`\n${LANGS.length + productPages} pages prerendered for ${siteUrl}`);
