/* =============================================================
   Admin panel.

   Plain DOM, no framework: the panel is small, and this keeps the
   server dependency-free end to end.
   ============================================================= */
(function () {
  'use strict';

  var root = document.getElementById('root');
  var state = { tab: 'products', data: null, lang: 'fa', requests: [], busy: false, editing: null };

  /* ---------- tiny DOM helper -------------------------------- */
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'selected' || k === 'disabled' || k === 'open') el[k] = !!v;
      else el.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : children != null ? [children] : []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  /* ---------- api -------------------------------------------- */
  function api(method, path, body) {
    return fetch(path, {
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (json) {
        if (!r.ok) throw new Error(json.error || ('HTTP ' + r.status));
        return json;
      });
    });
  }

  var statusEl = null;
  function status(kind, text) {
    if (!statusEl) return;
    statusEl.className = 'status ' + kind;
    statusEl.textContent = text;
  }

  /* Every save rebuilds the static site, so report both halves. */
  function save(promise) {
    state.busy = true;
    status('busy', 'در حال ذخیره و بازسازی سایت…');
    return promise.then(function (res) {
      state.busy = false;
      if (res && res.ok === true && res.error) status('err', 'ذخیره شد، اما بازسازی سایت شکست خورد: ' + res.error);
      else status('ok', 'ذخیره شد و سایت بازسازی شد ✓');
      return res;
    }).catch(function (e) {
      state.busy = false;
      status('err', 'خطا: ' + e.message);
      throw e;
    });
  }

  /* ---------- login ------------------------------------------ */
  function renderLogin(message) {
    clear(root);
    var pass = h('input', { type: 'password', id: 'p', autocomplete: 'current-password', required: 'required' });
    var msg = h('p', { class: message ? 'status err' : 'hint', text: message || 'برای ورود رمز مدیریت را وارد کنید.' });
    var form = h('form', {
      onsubmit: function (e) {
        e.preventDefault();
        api('POST', '/api/login', { password: pass.value })
          .then(boot)
          .catch(function (err) {
            renderLogin(err.message === 'too_many_attempts'
              ? 'تلاش‌های ناموفق زیاد. ۱۵ دقیقه دیگر دوباره امتحان کنید.'
              : err.message === 'not_configured'
                ? 'هنوز رمزی تنظیم نشده. روی سرور اجرا کنید: node server/set-password.js'
                : 'رمز اشتباه است.');
          });
      }
    }, [
      h('h1', { text: 'پنل مدیریت' }), msg,
      h('label', { class: 'field' }, [h('span', { text: 'رمز عبور' }), pass]),
      h('button', { class: 'btn primary', type: 'submit', style: 'width:100%', text: 'ورود' })
    ]);
    root.appendChild(h('div', { class: 'login' }, form));
    pass.focus();
  }

  /* ---------- shell ------------------------------------------ */
  var TABS = [
    { id: 'products', label: 'محصولات' },
    { id: 'texts', label: 'متن‌ها' },
    { id: 'settings', label: 'تنظیمات سایت' },
    { id: 'requests', label: 'درخواست‌ها' },
    { id: 'account', label: 'حساب' }
  ];

  function renderShell() {
    clear(root);
    var unread = state.requests.filter(function (r) { return !r.read; }).length;

    var side = h('nav', { class: 'side' }, [
      h('div', { class: 'brand' }, [h('span', { text: 'M' }), h('b', { text: 'MyAppShop' })])
    ].concat(TABS.map(function (t) {
      return h('button', {
        class: 'tab' + (state.tab === t.id ? ' on' : ''),
        onclick: function () { state.tab = t.id; state.editing = null; renderShell(); }
      }, [h('span', { text: t.label }),
          t.id === 'requests' && unread ? h('span', { class: 'badge-count', text: String(unread) }) : null]);
    })).concat([
      h('div', { class: 'spacer' }),
      h('div', { class: 'meta' }, [
        h('div', {}, [h('a', { href: state.data.siteUrl, target: '_blank', text: 'مشاهده سایت ↗' })]),
        h('div', { text: state.data.siteUrl.replace(/^https?:\/\//, '') })
      ])
    ]));

    var main = h('main', {});
    statusEl = h('span', { class: 'status', text: '' });
    root.appendChild(h('div', { class: 'shell' }, [side, main]));

    ({ products: renderProducts, texts: renderTexts, settings: renderSettings,
       requests: renderRequests, account: renderAccount })[state.tab](main);
  }

  function bar(children) {
    return h('div', { class: 'bar' }, (Array.isArray(children) ? children : [children]).concat([statusEl]));
  }

  /* ---------- products --------------------------------------- */
  var CATS = [['mobile', 'موبایل'], ['web', 'وب'], ['desktop', 'دسکتاپ'], ['ai', 'هوش مصنوعی']];
  var PTEXTS = [['name', 'نام'], ['tag', 'دسته‌بندی'], ['desc', 'توضیح کوتاه'], ['long', 'معرفی کامل'],
                ['h1', 'نقطه قوت ۱'], ['h2', 'نقطه قوت ۲'], ['h3', 'نقطه قوت ۳']];

  function textKey(id, field) { return field.charAt(0) === 'h' ? 'pd.' + id + '.' + field : 'p.' + id + '.' + field; }

  function renderProducts(main) {
    if (state.editing) return renderProductEditor(main);

    main.appendChild(h('h2', { class: 'page', text: 'محصولات' }));
    main.appendChild(h('p', { class: 'hint', text: 'هر محصول یک صفحه کامل در هر هشت زبان دارد. با تغییر اینجا، صفحات دوباره ساخته می‌شوند.' }));

    var list = h('div', { class: 'list' }, state.data.products.map(function (p, i) {
      return h('div', { class: 'item' }, [
        h('div', { class: 'swatch', style: 'background:' + p.accent }),
        h('div', { class: 'grow' }, [
          h('b', { text: state.data.i18n[state.lang]['p.' + p.id + '.name'] || p.id }),
          h('small', { text: p.id + ' · ' + p.platforms.join(', ') + ' · ★' + p.rating })
        ]),
        h('button', { class: 'btn small', text: '↑', disabled: i === 0, onclick: function () { move(i, -1); } }),
        h('button', { class: 'btn small', text: '↓', disabled: i === state.data.products.length - 1, onclick: function () { move(i, 1); } }),
        h('button', { class: 'btn small', text: 'ویرایش', onclick: function () { state.editing = JSON.parse(JSON.stringify(p)); renderShell(); } }),
        h('button', { class: 'btn small danger', text: 'حذف', onclick: function () { removeProduct(p.id); } })
      ]);
    }));

    main.appendChild(list);
    main.appendChild(bar([
      h('button', { class: 'btn primary', text: '+ محصول جدید', onclick: function () {
        state.editing = { id: '', cats: ['mobile'], accent: '#7c6cf6', platforms: ['iOS', 'Android'],
                          rating: '4.8', users: '10K', link: '#contact',
                          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h8M8 13h8"/></svg>',
                          _new: true };
        renderShell();
      } })
    ]));
  }

  function move(index, delta) {
    var arr = state.data.products.slice();
    var target = index + delta;
    if (target < 0 || target >= arr.length) return;
    var tmp = arr[index]; arr[index] = arr[target]; arr[target] = tmp;
    state.data.products = arr;
    renderShell();
    save(api('PUT', '/api/products', { products: arr }));
  }

  function removeProduct(id) {
    if (!confirm('محصول «' + id + '» حذف شود؟ صفحه‌های آن در همه زبان‌ها هم حذف می‌شوند.')) return;
    var arr = state.data.products.filter(function (p) { return p.id !== id; });
    state.data.products = arr;
    renderShell();
    save(api('PUT', '/api/products', { products: arr }));
  }

  function renderProductEditor(main) {
    var p = state.editing;
    var inputs = {};

    // Technical values (ids, URLs, SVG, platform names) read wrongly
    // when the panel's right-to-left direction is inherited.
    var LTR = { platforms: 1, link: 1, rating: 1, users: 1, icon: 1 };

    function field(key, label, value, type) {
      var attrs = type === 'textarea' ? { value: value || '' } : { type: 'text', value: value || '' };
      if (LTR[key]) { attrs.dir = 'ltr'; attrs.style = 'text-align:start'; }
      var input = h(type === 'textarea' ? 'textarea' : 'input', attrs);
      inputs[key] = input;
      return h('label', { class: 'field' }, [h('span', { text: label }), input]);
    }

    main.appendChild(h('h2', { class: 'page', text: p._new ? 'محصول جدید' : 'ویرایش محصول' }));
    main.appendChild(h('p', { class: 'hint', text: 'متن‌ها را برای هر زبان جداگانه وارد کنید. زبانی که پر نشود، از انگلیسی پر می‌شود.' }));

    var idInput = h('input', { type: 'text', value: p.id, disabled: !p._new, dir: 'ltr',
                               placeholder: 'مثلاً taskflow — فقط حروف کوچک انگلیسی و خط تیره' });
    inputs.id = idInput;

    var catBoxes = CATS.map(function (c) {
      var cb = h('input', { type: 'checkbox', checked: p.cats.indexOf(c[0]) !== -1 });
      inputs['cat_' + c[0]] = cb;
      return h('label', { style: 'display:inline-flex;gap:6px;align-items:center;margin-inline-end:16px' }, [cb, h('span', { text: c[1] })]);
    });

    var accent = h('input', { type: 'color', value: p.accent });
    inputs.accent = accent;

    main.appendChild(h('div', { class: 'card' }, [
      h('h3', { text: 'مشخصات' }),
      h('label', { class: 'field' }, [h('span', { text: 'شناسه (در آدرس صفحه استفاده می‌شود)' }), idInput]),
      h('div', { class: 'row' }, [
        field('platforms', 'پلتفرم‌ها (با کاما جدا کنید)', p.platforms.join(', ')),
        field('link', 'لینک دکمه کارت (خالی یا #contact یعنی صفحه جزئیات)', p.link)
      ]),
      h('div', { class: 'row-3' }, [
        field('rating', 'امتیاز', p.rating),
        field('users', 'تعداد کاربر', p.users),
        h('label', { class: 'field' }, [h('span', { text: 'رنگ' }), accent])
      ]),
      h('label', { class: 'field' }, [h('span', { text: 'دسته‌بندی‌ها (برای فیلتر)' }), h('div', {}, catBoxes)]),
      field('icon', 'آیکون (کد SVG)', p.icon, 'textarea')
    ]));

    var langBar = h('div', { class: 'lang-bar' }, state.data.langs.map(function (l) {
      return h('button', { class: state.lang === l.code ? 'on' : '', text: l.native,
        onclick: function () { collectTexts(p, inputs); state.lang = l.code; renderShell(); } });
    }));

    var textCard = h('div', { class: 'card' }, [h('h3', { text: 'متن‌ها — ' + langName(state.lang) })].concat(
      PTEXTS.map(function (t) {
        var key = textKey(p.id || '__new', t[0]);
        var current = (p._texts && p._texts[state.lang] && p._texts[state.lang][t[0]] != null)
          ? p._texts[state.lang][t[0]]
          : (state.data.i18n[state.lang][key] || '');
        return field('t_' + t[0], t[1], current, t[0] === 'long' ? 'textarea' : 'text');
      })
    ));

    main.appendChild(langBar);
    main.appendChild(textCard);

    main.appendChild(bar([
      h('button', { class: 'btn primary', text: 'ذخیره', onclick: function () { saveProduct(p, inputs); } }),
      h('button', { class: 'btn', text: 'انصراف', onclick: function () { state.editing = null; renderShell(); } })
    ]));
  }

  function langName(code) {
    var l = state.data.langs.filter(function (x) { return x.code === code; })[0];
    return l ? l.native : code;
  }

  function collectTexts(p, inputs) {
    p._texts = p._texts || {};
    p._texts[state.lang] = {};
    PTEXTS.forEach(function (t) {
      if (inputs['t_' + t[0]]) p._texts[state.lang][t[0]] = inputs['t_' + t[0]].value;
    });
  }

  function saveProduct(p, inputs) {
    collectTexts(p, inputs);
    var id = (inputs.id.value || p.id).trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(id)) { status('err', 'شناسه فقط می‌تواند حروف کوچک انگلیسی، عدد و خط تیره باشد.'); return; }

    var next = {
      id: id,
      cats: CATS.filter(function (c) { return inputs['cat_' + c[0]].checked; }).map(function (c) { return c[0]; }),
      accent: inputs.accent.value,
      platforms: inputs.platforms.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
      rating: inputs.rating.value.trim(),
      users: inputs.users.value.trim(),
      link: inputs.link.value.trim() || '#contact',
      icon: inputs.icon.value.trim()
    };
    if (!next.cats.length) next.cats = ['mobile'];

    var products = state.data.products.slice();
    var at = products.findIndex(function (x) { return x.id === p.id; });
    if (p._new || at === -1) products.push(next); else products[at] = next;

    // Product texts are ordinary translation keys.
    var i18n = {};
    Object.keys(p._texts || {}).forEach(function (lang) {
      i18n[lang] = {};
      PTEXTS.forEach(function (t) {
        var v = p._texts[lang][t[0]];
        if (v != null && v !== '') i18n[lang][textKey(id, t[0])] = v;
      });
      if (!Object.keys(i18n[lang]).length) delete i18n[lang];
    });

    save(api('PUT', '/api/products', { products: products, i18n: i18n })).then(function () {
      return api('GET', '/api/content');
    }).then(function (data) {
      state.data = data; state.editing = null; renderShell();
      status('ok', 'ذخیره شد و سایت بازسازی شد ✓');
    });
  }

  /* ---------- texts ------------------------------------------ */
  var GROUPS = [
    ['nav.', 'منو'], ['hero.', 'بخش اول صفحه'], ['trust.', 'نوار مشتریان'],
    ['products.', 'بخش محصولات'], ['features.', 'مزایا'], ['process.', 'روند کار'],
    ['reviews.', 'نظرات مشتریان'], ['contact.', 'بخش تماس'], ['form.', 'فرم درخواست'],
    ['faq.', 'پرسش‌های متداول'], ['cta.', 'بنر پایانی'], ['footer.', 'فوتر'],
    ['pd.', 'صفحه محصول'], ['modal.', 'برچسب‌های محصول'], ['p.', 'متن محصولات'], ['meta.', 'عنوان و توضیح سایت']
  ];

  function renderTexts(main) {
    main.appendChild(h('h2', { class: 'page', text: 'متن‌ها' }));
    main.appendChild(h('p', { class: 'hint', text: 'هر متنی که در سایت دیده می‌شود اینجا قابل تغییر است. فیلد خالی یعنی همان متن پیش‌فرض استفاده می‌شود.' }));

    main.appendChild(h('div', { class: 'lang-bar' }, state.data.langs.map(function (l) {
      var changed = countChanged(l.code);
      return h('button', { class: state.lang === l.code ? 'on' : '',
        onclick: function () { state.lang = l.code; renderShell(); } },
        [h('span', { text: l.native }), changed ? h('span', { class: 'n', text: '●' }) : null]);
    })));

    var search = h('input', { type: 'text', placeholder: 'جستجو در متن‌ها…' });
    main.appendChild(h('div', { class: 'card' }, [search]));

    var dict = state.data.i18n[state.lang];
    var defaults = state.data.defaults.i18n[state.lang] || {};
    var inputs = {};
    var container = h('div', {});

    function build(filter) {
      clear(container);
      var used = {};
      GROUPS.forEach(function (g) {
        var keys = Object.keys(dict).filter(function (k) {
          if (used[k] || k.indexOf(g[0]) !== 0) return false;
          if (filter && (k + ' ' + dict[k]).toLowerCase().indexOf(filter) === -1) return false;
          return true;
        });
        keys.forEach(function (k) { used[k] = 1; });
        if (!keys.length) return;

        var body = h('div', { class: 'body' }, keys.map(function (k) {
          var isLong = (dict[k] || '').length > 90;
          var input = h(isLong ? 'textarea' : 'input', isLong ? { value: dict[k] } : { type: 'text', value: dict[k] });
          inputs[k] = input;
          var changed = defaults[k] !== undefined && defaults[k] !== dict[k];
          return h('label', { class: 'field' }, [
            h('span', { class: 'tkey' + (changed ? ' changed' : ''), text: k + (changed ? '  (تغییر داده شده)' : '') }),
            input
          ]);
        }));
        container.appendChild(h('details', { class: 'group', open: !!filter }, [
          h('summary', { text: g[1] + '  (' + keys.length + ')' }), body
        ]));
      });
    }

    build('');
    search.addEventListener('input', function () { inputs = {}; build(search.value.trim().toLowerCase()); });
    main.appendChild(container);

    main.appendChild(bar([
      h('button', { class: 'btn primary', text: 'ذخیره متن‌های ' + langName(state.lang), onclick: function () {
        var entries = {};
        Object.keys(inputs).forEach(function (k) { entries[k] = inputs[k].value; });
        save(api('PUT', '/api/texts', { lang: state.lang, entries: entries })).then(function () {
          return api('GET', '/api/content');
        }).then(function (d) { state.data = d; });
      } })
    ]));
  }

  function countChanged(lang) {
    var dict = state.data.i18n[lang] || {};
    var def = (state.data.defaults.i18n[lang]) || {};
    return Object.keys(dict).filter(function (k) { return def[k] !== undefined && def[k] !== dict[k]; }).length;
  }

  /* ---------- settings --------------------------------------- */
  function renderSettings(main) {
    var s = state.data.site;
    var i = {};
    function f(key, label, value, type) {
      var input = h('input', { type: type || 'text', value: value == null ? '' : value, dir: type === 'url' || key === 'email' ? 'ltr' : null });
      i[key] = input;
      return h('label', { class: 'field' }, [h('span', { text: label }), input]);
    }

    main.appendChild(h('h2', { class: 'page', text: 'تنظیمات سایت' }));
    main.appendChild(h('p', { class: 'hint', text: 'اطلاعات تماس، شبکه‌های اجتماعی، آمار بالای صفحه و نام مشتریان.' }));

    main.appendChild(h('div', { class: 'card' }, [
      h('h3', { text: 'اطلاعات تماس' }),
      h('div', { class: 'row' }, [f('email', 'ایمیل', s.email), f('phone', 'تلفن', s.phone)])
    ]));

    main.appendChild(h('div', { class: 'card' }, [
      h('h3', { text: 'شبکه‌های اجتماعی (خالی بگذارید تا آیکون مخفی شود)' }),
      h('div', { class: 'row' }, [
        f('s_x', 'X (توییتر)', s.social.x === '#' ? '' : s.social.x, 'url'),
        f('s_linkedin', 'LinkedIn', s.social.linkedin === '#' ? '' : s.social.linkedin, 'url')
      ]),
      h('div', { class: 'row' }, [
        f('s_instagram', 'Instagram', s.social.instagram === '#' ? '' : s.social.instagram, 'url'),
        f('s_github', 'GitHub', s.social.github === '#' ? '' : s.social.github, 'url')
      ])
    ]));

    var stats = s.stats.map(function (st, n) {
      return h('div', { class: 'row-3' }, [
        f('st' + n + '_count', 'عدد ' + (n + 1), st.count),
        f('st' + n + '_suffix', 'پسوند ' + (n + 1), st.suffix),
        f('st' + n + '_decimals', 'رقم اعشار ' + (n + 1), st.decimals || 0)
      ]);
    });
    main.appendChild(h('div', { class: 'card' }, [
      h('h3', { text: 'آمار بالای صفحه' }),
      h('p', { class: 'hint', text: 'برچسب هر عدد را در تب متن‌ها (hero.stat1 تا hero.stat3) تغییر دهید.' })
    ].concat(stats)));

    var logos = h('textarea', { value: state.data.trustLogos.join('\n'), style: 'min-height:120px' });
    main.appendChild(h('div', { class: 'card' }, [
      h('h3', { text: 'نام مشتریان (نوار متحرک)' }),
      h('p', { class: 'hint', text: 'هر نام در یک خط.' }), logos
    ]));

    main.appendChild(bar([
      h('button', { class: 'btn primary', text: 'ذخیره تنظیمات', onclick: function () {
        var payload = {
          email: i.email.value.trim(), phone: i.phone.value.trim(),
          social: { x: i.s_x.value.trim() || '#', linkedin: i.s_linkedin.value.trim() || '#',
                    instagram: i.s_instagram.value.trim() || '#', github: i.s_github.value.trim() || '#' },
          stats: [0, 1, 2].map(function (n) {
            return { count: parseFloat(i['st' + n + '_count'].value) || 0,
                     suffix: i['st' + n + '_suffix'].value,
                     decimals: parseInt(i['st' + n + '_decimals'].value, 10) || 0 };
          })
        };
        save(api('PUT', '/api/site', payload))
          .then(function () { return save(api('PUT', '/api/trust-logos', { logos: logos.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) })); })
          .then(function () { return api('GET', '/api/content'); })
          .then(function (d) { state.data = d; });
      } })
    ]));
  }

  /* ---------- requests --------------------------------------- */
  function renderRequests(main) {
    main.appendChild(h('h2', { class: 'page', text: 'درخواست‌ها' }));
    main.appendChild(h('p', { class: 'hint', text: 'هر فرمی که از سایت پر شود اینجا می‌آید.' }));

    if (!state.requests.length) {
      main.appendChild(h('div', { class: 'card empty', text: 'هنوز درخواستی ثبت نشده.' }));
      return;
    }

    main.appendChild(h('div', { class: 'list' }, state.requests.map(function (r) {
      return h('div', { class: 'item req' + (r.read ? '' : ' unread'), style: 'display:block' }, [
        h('div', { style: 'display:flex;gap:12px;align-items:center' }, [
          h('div', { class: 'grow' }, [
            h('b', { text: r.name + ' — ' + (r.type === 'consultation' ? 'مشاوره' : r.type === 'app' ? 'ساخت اپلیکیشن' : 'موضوع دیگر') }),
            h('small', { dir: 'ltr', style: 'display:block;text-align:start', text: r.email + (r.phone ? ' · ' + r.phone : '') })
          ]),
          h('button', { class: 'btn small', text: r.read ? 'خوانده‌نشده' : 'خوانده شد', onclick: function () {
            api('POST', '/api/requests/read', { id: r.id, read: !r.read }).then(refreshRequests);
          } }),
          h('button', { class: 'btn small danger', text: 'حذف', onclick: function () {
            if (confirm('این درخواست حذف شود؟')) api('POST', '/api/requests/delete', { id: r.id }).then(refreshRequests);
          } })
        ]),
        h('div', { class: 'req-body', text: r.message }),
        h('div', { class: 'req-meta' }, [
          h('span', { text: new Date(r.at).toLocaleString('fa-IR') }),
          r.company ? h('span', { text: 'شرکت: ' + r.company }) : null,
          r.platform ? h('span', { text: 'پلتفرم: ' + r.platform }) : null,
          r.budget ? h('span', { text: 'بودجه: ' + r.budget }) : null,
          r.timeline ? h('span', { text: 'زمان: ' + r.timeline }) : null,
          r.language ? h('span', { text: 'زبان: ' + r.language }) : null
        ])
      ]);
    })));
  }

  function refreshRequests() {
    return api('GET', '/api/requests').then(function (d) { state.requests = d.requests; renderShell(); });
  }

  /* ---------- account ---------------------------------------- */
  function renderAccount(main) {
    var cur = h('input', { type: 'password', autocomplete: 'current-password' });
    var next = h('input', { type: 'password', autocomplete: 'new-password' });
    var again = h('input', { type: 'password', autocomplete: 'new-password' });

    main.appendChild(h('h2', { class: 'page', text: 'حساب' }));
    main.appendChild(h('div', { class: 'card' }, [
      h('h3', { text: 'تغییر رمز عبور' }),
      h('label', { class: 'field' }, [h('span', { text: 'رمز فعلی' }), cur]),
      h('div', { class: 'row' }, [
        h('label', { class: 'field' }, [h('span', { text: 'رمز جدید (حداقل ۸ کاراکتر)' }), next]),
        h('label', { class: 'field' }, [h('span', { text: 'تکرار رمز جدید' }), again])
      ]),
      h('div', { class: 'actions' }, [
        h('button', { class: 'btn primary', text: 'تغییر رمز', onclick: function () {
          if (next.value !== again.value) { status('err', 'تکرار رمز مطابقت ندارد.'); return; }
          api('POST', '/api/password', { current: cur.value, next: next.value })
            .then(function () { renderLogin('رمز عوض شد. با رمز جدید وارد شوید.'); })
            .catch(function (e) { status('err', e.message === 'bad_password' ? 'رمز فعلی اشتباه است.' : e.message); });
        } })
      ])
    ]));

    main.appendChild(h('div', { class: 'card' }, [
      h('h3', { text: 'بازسازی دستی سایت' }),
      h('p', { class: 'hint', text: 'معمولاً لازم نیست؛ هر ذخیره خودش سایت را می‌سازد. اگر چیزی از قلم افتاد این را بزنید.' }),
      h('div', { class: 'actions' }, [
        h('button', { class: 'btn', text: 'بازسازی همه صفحات', onclick: function () { save(api('POST', '/api/rebuild')); } }),
        h('button', { class: 'btn', text: 'خروج از حساب', onclick: function () {
          api('POST', '/api/logout').then(function () { renderLogin(); });
        } })
      ])
    ]));

    main.appendChild(bar([]));
  }

  /* ---------- boot ------------------------------------------- */
  function boot() {
    Promise.all([api('GET', '/api/content'), api('GET', '/api/requests')])
      .then(function (r) {
        state.data = r[0];
        state.requests = r[1].requests;
        if (!state.data.langs.some(function (l) { return l.code === state.lang; })) state.lang = state.data.langs[0].code;
        renderShell();
      })
      .catch(function () { renderLogin(); });
  }

  api('GET', '/api/session').then(function (s) {
    if (s.authenticated) boot();
    else renderLogin(s.configured ? null : 'هنوز رمزی تنظیم نشده. روی سرور اجرا کنید: node server/set-password.js');
  }).catch(function () { renderLogin(); });
})();
