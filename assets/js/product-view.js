/* =============================================================
   Builds the markup for a product detail page.

   The same function runs in the browser (product.html?id=…) and in
   Node during prerendering (tools/prerender.js), so a detail page
   looks identical whether or not JavaScript is available.

   buildProductView(product, t, ctx) -> { title, description, nav, main }
     t    translation lookup for the active language
     ctx  { lang, langCount, productUrl(id), homeUrl(), contactUrl() }
   ============================================================= */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var ARROW = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 12.5l5 5L20 6.5"/></svg>';

  /* Three abstract screens, tinted with the product's accent colour.
     They stand in for real screenshots until you drop yours in. */
  function gallery() {
    return [
      '<figure class="pv-shot">' +
        '<div class="pv-screen">' +
          '<span class="pv-bar w40"></span>' +
          '<div class="pv-tile"><i class="w70"></i><i class="w45"></i></div>' +
          '<div class="pv-tile"><i class="w55"></i><i class="w80"></i></div>' +
          '<div class="pv-tile"><i class="w65"></i><i class="w35"></i></div>' +
          '<div class="pv-tile"><i class="w50"></i><i class="w70"></i></div>' +
          '<div class="pv-pill"></div>' +
        '</div></figure>',
      '<figure class="pv-shot">' +
        '<div class="pv-screen">' +
          '<span class="pv-bar w55"></span>' +
          '<div class="pv-chart"><span style="--h:45%"></span><span style="--h:72%"></span><span style="--h:58%"></span><span style="--h:88%"></span><span style="--h:64%"></span><span style="--h:40%"></span></div>' +
          '<div class="pv-tile"><i class="w60"></i><i class="w40"></i></div>' +
          '<div class="pv-tile"><i class="w75"></i><i class="w50"></i></div>' +
          '<div class="pv-tile"><i class="w45"></i><i class="w65"></i></div>' +
        '</div></figure>',
      '<figure class="pv-shot">' +
        '<div class="pv-screen">' +
          '<span class="pv-bar w35"></span>' +
          '<div class="pv-avatar-row"><span class="pv-avatar"></span><span class="pv-lines"><i class="w70"></i><i class="w40"></i></span></div>' +
          '<div class="pv-avatar-row"><span class="pv-avatar"></span><span class="pv-lines"><i class="w55"></i><i class="w65"></i></span></div>' +
          '<div class="pv-avatar-row"><span class="pv-avatar"></span><span class="pv-lines"><i class="w80"></i><i class="w35"></i></span></div>' +
          '<div class="pv-avatar-row"><span class="pv-avatar"></span><span class="pv-lines"><i class="w45"></i><i class="w60"></i></span></div>' +
          '<div class="pv-pill"></div>' +
        '</div></figure>'
    ].join('');
  }

  function buildProductView(p, t, ctx) {
    var name = t('p.' + p.id + '.name');
    var tag = t('p.' + p.id + '.tag');
    var desc = t('p.' + p.id + '.desc');

    var nav =
      '<a class="brand" href="' + esc(ctx.homeUrl()) + '">' +
        '<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 100 100" width="34" height="34"><rect width="100" height="100" rx="26" fill="url(#pvbg)"/><path d="M28 68V32h10l12 20 12-20h10v36H62V49L52 66h-4L38 49v19z" fill="#fff"/><defs><linearGradient id="pvbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c6cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg></span>' +
        '<span class="brand-name">MyApp<span>Shop</span></span>' +
      '</a>' +
      '<a class="pv-back" href="' + esc(ctx.homeUrl()) + '#products">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>' +
        '<span>' + esc(t('pd.back')) + '</span>' +
      '</a>';

    var highlights = ['h1', 'h2', 'h3'].map(function (k) {
      return '<li>' + CHECK + '<span>' + esc(t('pd.' + p.id + '.' + k)) + '</span></li>';
    }).join('');

    var platforms = p.platforms.map(function (pl) { return '<li>' + esc(pl) + '</li>'; }).join('');

    var related = (root.PRODUCTS || []).filter(function (x) { return x.id !== p.id; }).map(function (x, i) {
      return '<a class="pv-card" style="--accent:' + esc(x.accent) + '; --i:' + i + '" href="' + esc(ctx.productUrl(x.id)) + '">' +
        '<span class="product-ico">' + x.icon + '</span>' +
        '<span class="pv-card-text"><b>' + esc(t('p.' + x.id + '.name')) + '</b>' +
        '<i>' + esc(t('p.' + x.id + '.tag')) + '</i></span>' + ARROW +
      '</a>';
    }).join('');

    var main =
      '<article class="pv-page" style="--accent:' + esc(p.accent) + '">' +
        '<header class="pv-hero">' +
          '<span class="pv-ico">' + p.icon + '</span>' +
          '<span class="product-tag">' + esc(tag) + '</span>' +
          '<h1>' + esc(name) + '</h1>' +
          '<p class="pv-lead">' + esc(desc) + '</p>' +
          '<ul class="platforms pv-platforms">' + platforms + '</ul>' +
          '<div class="pv-actions">' +
            '<a class="btn btn-primary btn-lg" href="' + esc(ctx.contactUrl()) + '">' + esc(t('modal.cta')) + '</a>' +
            '<a class="btn btn-ghost btn-lg" href="' + esc(ctx.homeUrl()) + '#products">' + esc(t('pd.back')) + '</a>' +
          '</div>' +
        '</header>' +

        '<section class="pv-section">' +
          '<h2 class="pv-h">' + esc(t('pd.gallery')) + '</h2>' +
          '<div class="pv-gallery">' + gallery() + '</div>' +
        '</section>' +

        '<div class="pv-columns">' +
          '<section class="pv-section">' +
            '<h2 class="pv-h">' + esc(t('pd.overview')) + '</h2>' +
            '<p class="pv-long">' + esc(t('p.' + p.id + '.long')) + '</p>' +
            '<h2 class="pv-h">' + esc(t('pd.highlights')) + '</h2>' +
            '<ul class="pv-highlights">' + highlights + '</ul>' +
          '</section>' +

          '<aside class="pv-specs">' +
            '<h2 class="pv-h">' + esc(t('pd.specs')) + '</h2>' +
            '<dl>' +
              '<div><dt>' + esc(t('pd.category')) + '</dt><dd>' + esc(tag) + '</dd></div>' +
              '<div><dt>' + esc(t('pd.available')) + '</dt><dd>' + esc(p.platforms.join(' · ')) + '</dd></div>' +
              '<div><dt>' + esc(t('modal.rating')) + '</dt><dd class="pv-rating">★ ' + esc(p.rating) + '</dd></div>' +
              '<div><dt>' + esc(t('modal.users')) + '</dt><dd>' + esc(p.users) + '</dd></div>' +
              '<div><dt>' + esc(t('pd.languages')) + '</dt><dd>' + esc(String(ctx.langCount)) + '</dd></div>' +
              '<div><dt>' + esc(t('pd.support')) + '</dt><dd>' + esc(t('pd.supportValue')) + '</dd></div>' +
            '</dl>' +
          '</aside>' +
        '</div>' +

        '<section class="cta-band pv-cta">' +
          '<div class="cta-inner">' +
            '<div><h2>' + esc(t('pd.cta')) + '</h2><p>' + esc(t('pd.ctaSub')) + '</p></div>' +
            '<a class="btn btn-invert btn-lg" href="' + esc(ctx.contactUrl()) + '">' + esc(t('nav.cta')) + '</a>' +
          '</div>' +
        '</section>' +

        '<section class="pv-section">' +
          '<h2 class="pv-h">' + esc(t('pd.related')) + '</h2>' +
          '<div class="pv-related">' + related + '</div>' +
        '</section>' +
      '</article>';

    return {
      title: name + ' — MyAppShop',
      description: desc,
      nav: nav,
      main: main
    };
  }

  root.buildProductView = buildProductView;
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildProductView: buildProductView };
})(typeof window !== 'undefined' ? window : global);
