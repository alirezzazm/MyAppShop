/* =============================================================
   Admin panel wording, in Persian and English.

   The panel switches with the toggle in the sidebar; the choice is
   remembered per browser. Keys missing from a language fall back to
   English, so a half-finished translation never blanks a label.
   ============================================================= */
(function (w) {
  'use strict';

  w.ADMIN_LANGS = [
    { code: 'fa', label: 'فارسی', dir: 'rtl' },
    { code: 'en', label: 'English', dir: 'ltr' }
  ];

  w.ADMIN_T = {
    fa: {
      'login.title': 'پنل مدیریت',
      'login.hint': 'برای ورود رمز مدیریت را وارد کنید.',
      'login.password': 'رمز عبور',
      'login.submit': 'ورود',
      'login.wrong': 'رمز اشتباه است.',
      'login.throttled': 'تلاش‌های ناموفق زیاد. ۱۵ دقیقه دیگر دوباره امتحان کنید.',
      'login.notConfigured': 'هنوز رمزی تنظیم نشده. روی سرور اجرا کنید: node server/set-password.js',
      'login.changed': 'رمز عوض شد. با رمز جدید وارد شوید.',

      'tab.products': 'محصولات',
      'tab.texts': 'متن‌ها',
      'tab.settings': 'تنظیمات سایت',
      'tab.requests': 'درخواست‌ها',
      'tab.account': 'حساب',
      'nav.viewSite': 'مشاهده سایت ↗',

      'status.saving': 'در حال ذخیره و بازسازی سایت…',
      'status.saved': 'ذخیره شد و سایت بازسازی شد ✓',
      'status.savedNoBuild': 'ذخیره شد، اما بازسازی سایت شکست خورد: ',
      'status.savedPurgeFailed': 'ذخیره و بازسازی شد، اما پاک‌کردن کش کلادفلر ناموفق بود: ',
      'status.error': 'خطا: ',

      'products.title': 'محصولات',
      'products.hint': 'هر محصول یک صفحه کامل در هر زبان دارد. با تغییر اینجا، صفحات دوباره ساخته می‌شوند.',
      'products.new': '+ محصول جدید',
      'products.edit': 'ویرایش',
      'products.delete': 'حذف',
      'products.confirmDelete': 'محصول «{id}» حذف شود؟ صفحه‌های آن در همه زبان‌ها هم حذف می‌شوند.',

      'editor.new': 'محصول جدید',
      'editor.edit': 'ویرایش محصول',
      'editor.hint': 'متن‌ها را برای هر زبان جداگانه وارد کنید. زبانی که پر نشود، از انگلیسی پر می‌شود.',
      'editor.specs': 'مشخصات',
      'editor.id': 'شناسه (در آدرس صفحه استفاده می‌شود)',
      'editor.idPlaceholder': 'مثلاً taskflow — فقط حروف کوچک انگلیسی و خط تیره',
      'editor.idInvalid': 'شناسه فقط می‌تواند حروف کوچک انگلیسی، عدد و خط تیره باشد.',
      'editor.platforms': 'پلتفرم‌ها (با کاما جدا کنید)',
      'editor.link': 'لینک دکمه کارت (خالی یا #contact یعنی صفحه جزئیات)',
      'editor.rating': 'امتیاز',
      'editor.users': 'تعداد کاربر',
      'editor.color': 'رنگ',
      'editor.cats': 'دسته‌بندی‌ها (برای فیلتر)',
      'editor.icon': 'آیکون (کد SVG)',
      'editor.texts': 'متن‌ها — ',
      'editor.save': 'ذخیره',
      'editor.cancel': 'انصراف',

      'cat.mobile': 'موبایل', 'cat.web': 'وب', 'cat.desktop': 'دسکتاپ', 'cat.ai': 'هوش مصنوعی',
      'pt.name': 'نام', 'pt.tag': 'دسته‌بندی', 'pt.desc': 'توضیح کوتاه', 'pt.long': 'معرفی کامل',
      'pt.h1': 'نقطه قوت ۱', 'pt.h2': 'نقطه قوت ۲', 'pt.h3': 'نقطه قوت ۳',

      'texts.title': 'متن‌ها',
      'texts.hint': 'هر متنی که در سایت دیده می‌شود اینجا قابل تغییر است. فیلد خالی یعنی همان متن پیش‌فرض استفاده می‌شود.',
      'texts.search': 'جستجو در متن‌ها…',
      'texts.save': 'ذخیره متن‌های ',
      'texts.changed': '  (تغییر داده شده)',

      'g.nav': 'منو', 'g.hero': 'بخش اول صفحه', 'g.trust': 'نوار مشتریان', 'g.products': 'بخش محصولات',
      'g.features': 'مزایا', 'g.process': 'روند کار', 'g.reviews': 'نظرات مشتریان', 'g.contact': 'بخش تماس',
      'g.form': 'فرم درخواست', 'g.faq': 'پرسش‌های متداول', 'g.cta': 'بنر پایانی', 'g.footer': 'فوتر',
      'g.pd': 'صفحه محصول', 'g.modal': 'برچسب‌های محصول', 'g.p': 'متن محصولات', 'g.meta': 'عنوان و توضیح سایت',

      'settings.title': 'تنظیمات سایت',
      'settings.hint': 'اطلاعات تماس، شبکه‌های اجتماعی، آمار بالای صفحه و نام مشتریان.',
      'settings.contact': 'اطلاعات تماس',
      'settings.email': 'ایمیل',
      'settings.phone': 'تلفن',
      'settings.social': 'شبکه‌های اجتماعی (خالی بگذارید تا آیکون مخفی شود)',
      'settings.stats': 'آمار بالای صفحه',
      'settings.statsHint': 'برچسب هر عدد را در تب متن‌ها (hero.stat1 تا hero.stat3) تغییر دهید.',
      'settings.num': 'عدد ', 'settings.suffix': 'پسوند ', 'settings.decimals': 'رقم اعشار ',
      'settings.logos': 'نام مشتریان (نوار متحرک)',
      'settings.logosHint': 'هر نام در یک خط.',
      'settings.save': 'ذخیره تنظیمات',

      'requests.title': 'درخواست‌ها',
      'requests.hint': 'هر فرمی که از سایت پر شود اینجا می‌آید.',
      'requests.empty': 'هنوز درخواستی ثبت نشده.',
      'requests.markRead': 'خوانده شد',
      'requests.markUnread': 'خوانده‌نشده',
      'requests.delete': 'حذف',
      'requests.confirmDelete': 'این درخواست حذف شود؟',
      'requests.typeApp': 'ساخت اپلیکیشن',
      'requests.typeConsult': 'مشاوره',
      'requests.typeOther': 'موضوع دیگر',
      'requests.company': 'شرکت: ', 'requests.platform': 'پلتفرم: ', 'requests.budget': 'بودجه: ',
      'requests.timeline': 'زمان: ', 'requests.language': 'زبان: ',

      'account.title': 'حساب',
      'account.changePassword': 'تغییر رمز عبور',
      'account.current': 'رمز فعلی',
      'account.new': 'رمز جدید (حداقل ۸ کاراکتر)',
      'account.again': 'تکرار رمز جدید',
      'account.mismatch': 'تکرار رمز مطابقت ندارد.',
      'account.currentWrong': 'رمز فعلی اشتباه است.',
      'account.change': 'تغییر رمز',
      'account.rebuildTitle': 'بازسازی دستی سایت',
      'account.rebuildHint': 'معمولاً لازم نیست؛ هر ذخیره خودش سایت را می‌سازد. اگر چیزی از قلم افتاد این را بزنید.',
      'account.rebuild': 'بازسازی همه صفحات',
      'account.logout': 'خروج از حساب',

      'locale': 'fa-IR'
    },

    en: {
      'login.title': 'Admin panel',
      'login.hint': 'Enter the admin password to sign in.',
      'login.password': 'Password',
      'login.submit': 'Sign in',
      'login.wrong': 'Wrong password.',
      'login.throttled': 'Too many failed attempts. Try again in 15 minutes.',
      'login.notConfigured': 'No password set yet. On the server run: node server/set-password.js',
      'login.changed': 'Password changed. Sign in with the new one.',

      'tab.products': 'Products',
      'tab.texts': 'Texts',
      'tab.settings': 'Site settings',
      'tab.requests': 'Requests',
      'tab.account': 'Account',
      'nav.viewSite': 'View site ↗',

      'status.saving': 'Saving and rebuilding the site…',
      'status.saved': 'Saved and the site was rebuilt ✓',
      'status.savedNoBuild': 'Saved, but rebuilding the site failed: ',
      'status.savedPurgeFailed': 'Saved and rebuilt, but clearing the Cloudflare cache failed: ',
      'status.error': 'Error: ',

      'products.title': 'Products',
      'products.hint': 'Each product gets a full page in every language. Changes here rebuild those pages.',
      'products.new': '+ New product',
      'products.edit': 'Edit',
      'products.delete': 'Delete',
      'products.confirmDelete': 'Delete “{id}”? Its pages in every language go too.',

      'editor.new': 'New product',
      'editor.edit': 'Edit product',
      'editor.hint': 'Fill the texts per language. Anything left empty falls back to English.',
      'editor.specs': 'Details',
      'editor.id': 'ID (used in the page address)',
      'editor.idPlaceholder': 'e.g. taskflow — lowercase letters, digits and hyphens only',
      'editor.idInvalid': 'The ID may only contain lowercase letters, digits and hyphens.',
      'editor.platforms': 'Platforms (comma separated)',
      'editor.link': 'Card button link (empty or #contact means the detail page)',
      'editor.rating': 'Rating',
      'editor.users': 'Users',
      'editor.color': 'Colour',
      'editor.cats': 'Categories (for the filter)',
      'editor.icon': 'Icon (SVG markup)',
      'editor.texts': 'Texts — ',
      'editor.save': 'Save',
      'editor.cancel': 'Cancel',

      'cat.mobile': 'Mobile', 'cat.web': 'Web', 'cat.desktop': 'Desktop', 'cat.ai': 'AI',
      'pt.name': 'Name', 'pt.tag': 'Category', 'pt.desc': 'Short description', 'pt.long': 'Full overview',
      'pt.h1': 'Highlight 1', 'pt.h2': 'Highlight 2', 'pt.h3': 'Highlight 3',

      'texts.title': 'Texts',
      'texts.hint': 'Every string the site shows is editable here. Leave a field as it is to keep the default.',
      'texts.search': 'Search the texts…',
      'texts.save': 'Save texts for ',
      'texts.changed': '  (changed)',

      'g.nav': 'Navigation', 'g.hero': 'Hero section', 'g.trust': 'Client strip', 'g.products': 'Products section',
      'g.features': 'Features', 'g.process': 'Process', 'g.reviews': 'Testimonials', 'g.contact': 'Contact section',
      'g.form': 'Request form', 'g.faq': 'FAQ', 'g.cta': 'Closing banner', 'g.footer': 'Footer',
      'g.pd': 'Product page', 'g.modal': 'Product labels', 'g.p': 'Product texts', 'g.meta': 'Page title and description',

      'settings.title': 'Site settings',
      'settings.hint': 'Contact details, social links, the hero figures and client names.',
      'settings.contact': 'Contact details',
      'settings.email': 'Email',
      'settings.phone': 'Phone',
      'settings.social': 'Social links (leave empty to hide an icon)',
      'settings.stats': 'Hero figures',
      'settings.statsHint': 'Change each label under Texts (hero.stat1 to hero.stat3).',
      'settings.num': 'Number ', 'settings.suffix': 'Suffix ', 'settings.decimals': 'Decimals ',
      'settings.logos': 'Client names (moving strip)',
      'settings.logosHint': 'One name per line.',
      'settings.save': 'Save settings',

      'requests.title': 'Requests',
      'requests.hint': 'Every form submitted from the site lands here.',
      'requests.empty': 'No requests yet.',
      'requests.markRead': 'Mark read',
      'requests.markUnread': 'Mark unread',
      'requests.delete': 'Delete',
      'requests.confirmDelete': 'Delete this request?',
      'requests.typeApp': 'Build an app',
      'requests.typeConsult': 'Consultation',
      'requests.typeOther': 'Something else',
      'requests.company': 'Company: ', 'requests.platform': 'Platforms: ', 'requests.budget': 'Budget: ',
      'requests.timeline': 'Timeline: ', 'requests.language': 'Language: ',

      'account.title': 'Account',
      'account.changePassword': 'Change password',
      'account.current': 'Current password',
      'account.new': 'New password (at least 8 characters)',
      'account.again': 'Repeat new password',
      'account.mismatch': 'The two passwords do not match.',
      'account.currentWrong': 'The current password is wrong.',
      'account.change': 'Change password',
      'account.rebuildTitle': 'Rebuild the site by hand',
      'account.rebuildHint': 'Rarely needed — every save rebuilds already. Use it if something looks stale.',
      'account.rebuild': 'Rebuild every page',
      'account.logout': 'Sign out',

      'locale': 'en-GB'
    }
  };
})(window);
