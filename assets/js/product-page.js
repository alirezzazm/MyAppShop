/* =============================================================
   Drives product.html.

   On a prerendered page (<id>.<lang>.html) the markup is already
   in place and this only keeps the language switcher pointed at
   the right sibling files. On product.html?id=… it renders the
   page and re-renders whenever the visitor changes language.
   ============================================================= */
(function () {
  'use strict';

  var html = document.documentElement;
  var prerendered = !!html.getAttribute('data-page-lang');
  var params = new URLSearchParams(location.search);
  var id = params.get('id') || html.getAttribute('data-product-id');
  var product = (window.PRODUCTS || []).filter(function (p) { return p.id === id; })[0];

  // The language menu needs to know which files to navigate to.
  if (product) html.setAttribute('data-lang-template', product.id + '.{lang}.html');

  if (prerendered) return;

  var main = document.getElementById('pv-main');
  var nav = document.getElementById('pv-nav');

  function t(lang) {
    var dict = window.I18N[lang] || {};
    var en = window.I18N.en || {};
    return function (key) { return key in dict ? dict[key] : key in en ? en[key] : key; };
  }

  function render(lang) {
    var tr = t(lang);
    if (!product) {
      main.innerHTML = '<div class="pv-missing"><h1>' + tr('pd.notFound') + '</h1>' +
        '<a class="btn btn-primary btn-lg" href="index.html#products">' + tr('pd.back') + '</a></div>';
      nav.innerHTML = '';
      document.title = 'MyAppShop';
      return;
    }

    var view = window.buildProductView(product, tr, {
      lang: lang,
      langCount: (window.LANGS || []).length,
      productUrl: function (other) { return 'product.html?id=' + other + '&lang=' + lang; },
      homeUrl: function () { return 'index.html?lang=' + lang; },
      contactUrl: function () { return 'index.html?lang=' + lang + '#contact'; }
    });

    nav.innerHTML = view.nav;
    main.innerHTML = view.main;
    document.title = view.title;

    [['meta[name="description"]', view.description],
     ['meta[property="og:title"]', view.title],
     ['meta[name="twitter:title"]', view.title],
     ['meta[property="og:description"]', view.description],
     ['meta[name="twitter:description"]', view.description]].forEach(function (pair) {
      var el = document.head.querySelector(pair[0]);
      if (el) el.setAttribute('content', pair[1]);
    });
  }

  // app.js calls this after every language change.
  window.onLanguageApplied = render;
})();
