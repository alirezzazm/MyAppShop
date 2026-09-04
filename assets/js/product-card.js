/* =============================================================
   Builds the product cards and the client marquee.

   Shared by app.js (in the browser) and tools/prerender.js, so the
   landing page ships its products in the HTML instead of waiting
   for JavaScript — which crawlers and no-JS visitors never run.
   ============================================================= */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var ARROW = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

  function buildProductCard(p, t, href, index) {
    return '' +
      '<article class="product reveal is-in" style="--accent:' + esc(p.accent) + '; --i:' + index + '">' +
        '<div class="product-top">' +
          '<span class="product-ico">' + p.icon + '</span>' +
          '<span class="product-tag">' + esc(t('p.' + p.id + '.tag')) + '</span>' +
        '</div>' +
        '<h3>' + esc(t('p.' + p.id + '.name')) + '</h3>' +
        '<p>' + esc(t('p.' + p.id + '.desc')) + '</p>' +
        '<ul class="platforms">' + p.platforms.map(function (pl) {
          return '<li>' + esc(pl) + '</li>';
        }).join('') + '</ul>' +
        '<div class="product-foot">' +
          '<span class="rating">★ ' + esc(p.rating) + '<i>· ' + esc(p.users) + '</i></span>' +
          '<a class="product-link" href="' + esc(href) + '">' + esc(t('products.view')) + ARROW + '</a>' +
        '</div>' +
      '</article>';
  }

  function buildProductGrid(products, t, hrefFor) {
    return products.map(function (p, i) {
      return buildProductCard(p, t, hrefFor(p), i);
    }).join('');
  }

  function buildMarquee(names) {
    var row = (names || []).map(function (n) {
      return '<span class="logo-pill">' + esc(n) + '</span>';
    }).join('');
    return row + row;   // duplicated so the loop has no visible seam
  }

  root.buildProductCard = buildProductCard;
  root.buildProductGrid = buildProductGrid;
  root.buildMarquee = buildMarquee;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildProductCard: buildProductCard, buildProductGrid: buildProductGrid, buildMarquee: buildMarquee };
  }
})(typeof window !== 'undefined' ? window : global);
