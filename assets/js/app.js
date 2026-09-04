/* =============================================================
   MyAppShop — application script
   Everything is dependency-free and works from a static host.
   ============================================================= */
(function (root) {
  'use strict';

  /* ---------- configuration ---------------------------------- */
  var CONFIG = {
    // Paste a form endpoint here (Formspree, Getform, Basin, your own API).
    // Leave empty to fall back to opening the visitor's email client.
    // Set by the admin panel's build step; empty means fall back to
    // opening the visitor's email client.
    formEndpoint: (typeof window !== 'undefined' && window.SITE && window.SITE.formEndpoint) || '',
    contactEmail: (typeof window !== 'undefined' && window.SITE && window.SITE.email) || 'hello@myappshop.com',
    defaultLang: 'en'
  };

  var LANGS = window.LANGS || [];
  var I18N = window.I18N || {};
  var LANG_BY_CODE = {};
  LANGS.forEach(function (l) { LANG_BY_CODE[l.code] = l; });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  var state = { lang: CONFIG.defaultLang, filter: 'all' };

  // Set by tools/prerender.js on the per-language static pages (fa.html …).
  // Absent on index.html, where the language is switched in place.
  var PAGE_LANG = document.documentElement.getAttribute('data-page-lang') || null;
  var PAGE_DIR = location.pathname.replace(/[^/]*$/, '');

  /* ---------- i18n ------------------------------------------- */
  function t(key) {
    var dict = I18N[state.lang] || {};
    if (key in dict) return dict[key];
    var en = I18N.en || {};
    return key in en ? en[key] : key;
  }

  function pickInitialLang() {
    var url = new URLSearchParams(location.search).get('lang');
    if (url && LANG_BY_CODE[url]) return url;
    if (PAGE_LANG && LANG_BY_CODE[PAGE_LANG]) return PAGE_LANG;
    var saved = store.get('mas.lang');
    if (saved && LANG_BY_CODE[saved]) return saved;
    var navs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < navs.length; i++) {
      var code = String(navs[i]).slice(0, 2).toLowerCase();
      if (LANG_BY_CODE[code]) return code;
    }
    return CONFIG.defaultLang;
  }

  function applyLang(code, persist) {
    if (!LANG_BY_CODE[code]) code = CONFIG.defaultLang;
    state.lang = code;
    var meta = LANG_BY_CODE[code];

    document.documentElement.lang = code;
    document.documentElement.dir = meta.dir;
    document.documentElement.setAttribute('data-lang', code);

    $$('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, t(key));
      else el.textContent = t(key);
    });

    var codeLabel = $('#lang-code');
    if (codeLabel) codeLabel.textContent = code.toUpperCase();
    $$('#lang-menu [role="option"]').forEach(function (li) {
      var on = li.dataset.code === code;
      li.setAttribute('aria-selected', on ? 'true' : 'false');
      li.classList.toggle('is-active', on);
    });

    renderProducts();
    if (typeof root.onLanguageApplied === 'function') root.onLanguageApplied(code);
    updateSeo();
    if (persist !== false) store.set('mas.lang', code);
    if (!PAGE_LANG) {
      var u = new URL(location.href);
      u.searchParams.set('lang', code);
      history.replaceState(null, '', u);
    }
  }

  function buildLangMenu() {
    var menu = $('#lang-menu');
    var btn = $('#lang-btn');
    if (!menu || !btn) return;

    menu.innerHTML = LANGS.map(function (l) {
      return '<li role="option" tabindex="0" data-code="' + l.code + '">' +
             '<span class="flag">' + l.flag + '</span>' +
             '<span class="native">' + l.native + '</span>' +
             '<span class="latin">' + l.label + '</span></li>';
    }).join('');

    function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    function open() { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden ? open() : close();
    });
    function choose(code) {
      // On a prerendered page each language is its own URL, so navigate
      // instead of swapping the text in place.
      if (PAGE_LANG) {
        store.set('mas.lang', code);
        var template = document.documentElement.getAttribute('data-lang-template') || '{lang}.html';
        location.href = PAGE_DIR + template.replace('{lang}', code);
        return;
      }
      applyLang(code);
    }

    menu.addEventListener('click', function (e) {
      var li = e.target.closest('[role="option"]');
      if (!li) return;
      choose(li.dataset.code);
      close();
    });
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var li = e.target.closest('[role="option"]');
      if (!li) return;
      e.preventDefault();
      choose(li.dataset.code);
      close();
      btn.focus();
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== btn) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ---------- editable site values ---------------------------- */
  // Filled from window.SITE (assets/js/overrides.js, written by the
  // admin panel). The prerenderer applies exactly the same values, so
  // these elements are already correct before any script runs.
  function applySiteValues() {
    var site = root.SITE;
    if (!site) return;

    $$('[data-site]').forEach(function (el) {
      var key = el.getAttribute('data-site');
      var value = site[key];
      if (value == null) return;
      var attr = el.getAttribute('data-site-attr');
      if (attr === 'href') {
        el.setAttribute('href', key === 'email' ? 'mailto:' + value
          : key === 'phone' ? 'tel:' + String(value).replace(/[^\d+]/g, '')
          : value);
        var bdi = el.querySelector('bdi');
        if (bdi) bdi.textContent = value; else el.textContent = value;
      } else {
        el.textContent = value;
      }
    });

    if (site.social) {
      $$('[data-social]').forEach(function (a) {
        var url = site.social[a.getAttribute('data-social')];
        if (url) a.href = url;
        a.hidden = !url || url === '#';
      });
    }

    if (site.stats) {
      $$('[data-stat]').forEach(function (dt) {
        var stat = site.stats[parseInt(dt.getAttribute('data-stat'), 10)];
        if (!stat) return;
        dt.setAttribute('data-count', stat.count);
        dt.setAttribute('data-suffix', stat.suffix || '');
        dt.setAttribute('data-decimals', stat.decimals || 0);
      });
    }
  }

  /* ---------- SEO: canonical, hreflang, structured data -------- */
  function upsertLink(rel, href, hreflang) {
    var sel = 'link[rel="' + rel + '"]' + (hreflang ? '[hreflang="' + hreflang + '"]' : '');
    var el = document.head.querySelector(sel);
    if (!el) {
      el = document.createElement('link');
      el.rel = rel;
      if (hreflang) el.hreflang = hreflang;
      document.head.appendChild(el);
    }
    el.href = href;
  }

  function setMeta(selector, value) {
    var el = document.head.querySelector(selector);
    if (el) el.setAttribute('content', value);
  }

  function updateSeo() {
    var base = location.origin + location.pathname;
    var dir = location.origin + PAGE_DIR;
    var img = dir + 'assets/img/og.png';

    // Prerendered deployments give each language its own file; otherwise
    // the single page distinguishes languages with ?lang=.
    var template = document.documentElement.getAttribute('data-lang-template') || '{lang}.html';
    var urlFor = function (code) {
      return PAGE_LANG ? dir + template.replace('{lang}', code) : base + '?lang=' + code;
    };

    upsertLink('canonical', urlFor(state.lang));
    setMeta('meta[property="og:url"]', urlFor(state.lang));
    setMeta('meta[property="og:image"]', img);
    setMeta('meta[name="twitter:image"]', img);
    setMeta('meta[property="og:locale"]', state.lang);
    LANGS.forEach(function (l) { upsertLink('alternate', urlFor(l.code), l.code); });
    upsertLink('alternate', PAGE_LANG ? dir : base, 'x-default');

    var faq = [];
    for (var i = 1; i <= 6; i++) {
      faq.push({
        '@type': 'Question',
        name: t('faq.' + i + '.q'),
        acceptedAnswer: { '@type': 'Answer', text: t('faq.' + i + '.a') }
      });
    }

    var data = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': base + '#org',
          name: 'MyAppShop',
          url: base,
          description: t('meta.desc'),
          email: CONFIG.contactEmail,
          slogan: t('footer.tagline'),
          knowsLanguage: LANGS.map(function (l) { return l.code; })
        },
        {
          '@type': 'WebSite',
          '@id': base + '#site',
          url: base,
          name: 'MyAppShop',
          inLanguage: state.lang,
          publisher: { '@id': base + '#org' }
        },
        {
          '@type': 'ItemList',
          name: t('products.title'),
          itemListElement: (window.PRODUCTS || []).map(function (p, i) {
            return {
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'SoftwareApplication',
                name: t('p.' + p.id + '.name'),
                description: t('p.' + p.id + '.desc'),
                applicationCategory: t('p.' + p.id + '.tag'),
                operatingSystem: p.platforms.join(', '),
                aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, bestRating: '5', ratingCount: 100 }
              }
            };
          })
        },
        { '@type': 'FAQPage', mainEntity: faq }
      ]
    };

    var tag = document.getElementById('ld-json');
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.id = 'ld-json';
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(data);
  }

  /* ---------- theme ------------------------------------------ */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0d17' : '#f7f8fc');
    store.set('mas.theme', theme);
  }

  function initTheme() {
    var saved = store.get('mas.theme');
    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(saved || (prefersLight ? 'light' : 'dark'));
    var btn = $('#theme-btn');
    if (btn) btn.addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------- products --------------------------------------- */
  // Prerendered deployments have a page per product per language;
  // otherwise the shared template renders it from the query string.
  function productHref(p) {
    if (p.link && p.link !== '#contact') return p.link;
    return PAGE_LANG
      ? p.id + '.' + state.lang + '.html'
      : 'product.html?id=' + p.id + '&lang=' + state.lang;
  }

  function renderProducts() {
    var grid = $('#product-grid');
    if (!grid) return;
    var list = (window.PRODUCTS || []).filter(function (p) {
      return state.filter === 'all' || p.cats.indexOf(state.filter) !== -1;
    });

    grid.innerHTML = root.buildProductGrid(list, t, productHref);

    var note = $('#empty-note');
    if (note) note.hidden = list.length > 0;
  }

  function initFilters() {
    var bar = $('#filters');
    if (!bar) return;
    bar.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', bar).forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      state.filter = chip.dataset.filter;
      renderProducts();
    });
  }

  /* ---------- trust marquee ---------------------------------- */
  function initMarquee() {
    var track = $('#marquee-track');
    if (!track) return;
    track.innerHTML = root.buildMarquee(root.TRUST_LOGOS || []);
  }

  /* ---------- reveal on scroll -------------------------------- */
  function initReveal() {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- animated counters ------------------------------- */
  function initCounters() {
    var nodes = $$('[data-count]');
    if (!nodes.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function run(el) {
      var target = parseFloat(el.dataset.count);
      var decimals = parseInt(el.dataset.decimals || '0', 10);
      var suffix = el.dataset.suffix || '';
      if (reduce) { el.textContent = target.toFixed(decimals) + suffix; return; }
      var start = performance.now(), dur = 1400;
      (function step(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(start);
    }

    if (!('IntersectionObserver' in window)) { nodes.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ---------- header + mobile nav ----------------------------- */
  function initHeader() {
    var header = $('#header');
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var btn = $('#menu-btn'), nav = $('#site-nav');
    if (btn && nav) {
      btn.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          document.body.classList.remove('nav-open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Highlight the section currently in view.
    var links = $$('#site-nav a');
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
    if ('IntersectionObserver' in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id);
          });
        });
      }, { threshold: 0.25, rootMargin: '-30% 0px -50% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }
  }

  /* ---------- request / consultation form --------------------- */
  function initForm() {
    var form = $('#request-form');
    if (!form) return;
    var success = $('#form-success');
    var fail = $('#form-fail');
    var submit = $('#submit-btn');
    var submitLabel = submit.querySelector('span');

    function setError(field, msg) {
      var slot = form.querySelector('[data-err="' + field + '"]');
      var input = form.querySelector('[name="' + field + '"]');
      if (slot) slot.textContent = msg || '';
      if (input) input.classList.toggle('is-invalid', !!msg);
    }

    function validate(data) {
      var ok = true;
      ['name', 'email', 'message'].forEach(function (f) { setError(f, ''); });
      if (!data.name || data.name.trim().length < 2) { setError('name', t('form.err.name')); ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email || '')) { setError('email', t('form.err.email')); ok = false; }
      if (!data.message || data.message.trim().length < 10) { setError('message', t('form.err.message')); ok = false; }
      return ok;
    }

    function collect() {
      var fd = new FormData(form);
      return {
        type: fd.get('type') || '',
        name: (fd.get('name') || '').toString(),
        email: (fd.get('email') || '').toString(),
        phone: (fd.get('phone') || '').toString(),
        company: (fd.get('company') || '').toString(),
        platform: fd.getAll('platform').join(', '),
        budget: (fd.get('budget') || '').toString(),
        timeline: (fd.get('timeline') || '').toString(),
        message: (fd.get('message') || '').toString(),
        language: state.lang,
        website: (fd.get('website') || '').toString()
      };
    }

    function showSuccess() {
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function mailtoFallback(data) {
      var body = [
        'Request type: ' + data.type,
        'Name: ' + data.name,
        'Email: ' + data.email,
        'Phone: ' + data.phone,
        'Company: ' + data.company,
        'Platforms: ' + data.platform,
        'Budget: ' + data.budget,
        'Timeline: ' + data.timeline,
        'Language: ' + data.language,
        '',
        data.message
      ].join('\n');
      var href = 'mailto:' + CONFIG.contactEmail +
        '?subject=' + encodeURIComponent('New ' + data.type + ' request — ' + data.name) +
        '&body=' + encodeURIComponent(body);
      window.location.href = href;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      fail.hidden = true;
      var data = collect();
      if (data.website) return;            // bot filled the honeypot
      if (!validate(data)) {
        var firstBad = form.querySelector('.is-invalid');
        if (firstBad) firstBad.focus();
        return;
      }
      delete data.website;

      // Keep a local copy so nothing is lost if the network fails.
      try {
        var log = JSON.parse(store.get('mas.requests') || '[]');
        log.push(Object.assign({ at: new Date().toISOString() }, data));
        store.set('mas.requests', JSON.stringify(log.slice(-25)));
      } catch (err) {}

      if (!CONFIG.formEndpoint) { mailtoFallback(data); showSuccess(); return; }

      submit.disabled = true;
      submitLabel.textContent = t('form.sending');
      fetch(CONFIG.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showSuccess();
      }).catch(function () {
        fail.hidden = false;
      }).then(function () {
        submit.disabled = false;
        submitLabel.textContent = t('form.submit');
      });
    });

    var reset = $('#reset-form');
    if (reset) reset.addEventListener('click', function () {
      form.reset();
      ['name', 'email', 'message'].forEach(function (f) { setError(f, ''); });
      success.hidden = true;
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Pre-select "consultation" when the visitor arrives from a consultation CTA.
    $$('a[href="#contact"]').forEach(function (a) {
      a.addEventListener('click', function () {
        if (!/cta\.button|consult/i.test(a.getAttribute('data-i18n') || '')) return;
        var radio = form.querySelector('input[name="type"][value="consultation"]');
        if (radio) radio.checked = true;
      });
    });
  }

  /* ---------- smooth anchor scrolling ------------------------- */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------- boot -------------------------------------------- */
  function init() {
    var y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
    applySiteValues();
    initTheme();
    buildLangMenu();
    initMarquee();
    initFilters();
    applyLang(pickInitialLang(), false);
    initHeader();
    initReveal();
    initCounters();
    initForm();
    initAnchors();
    document.body.classList.add('is-ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
