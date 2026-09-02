/* =============================================================
   Product catalogue.
   To add a product: append an entry here, then add the matching
   'p.<id>.name', 'p.<id>.tag' and 'p.<id>.desc' keys to every
   language in i18n-data.js.
   ============================================================= */
window.PRODUCTS = [
  {
    id: 'taskflow',
    cats: ['mobile', 'web'],
    accent: '#7c6cf6',
    platforms: ['iOS', 'Android', 'Web'],
    rating: '4.9',
    users: '120K',
    link: '#contact',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h4"/></svg>'
  },
  {
    id: 'medicare',
    cats: ['mobile'],
    accent: '#22c55e',
    platforms: ['iOS', 'Android'],
    rating: '4.8',
    users: '60K',
    link: '#contact',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-8-4.6-8-10a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.4-8 10-8 10z"/><path d="M12 8.5v5M9.5 11h5"/></svg>'
  },
  {
    id: 'shopmate',
    cats: ['web', 'desktop'],
    accent: '#f59e0b',
    platforms: ['Web', 'Windows', 'macOS'],
    rating: '4.7',
    users: '35K',
    link: '#contact',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h16l-1.3 12.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/></svg>'
  },
  {
    id: 'fitpulse',
    cats: ['mobile'],
    accent: '#ef4444',
    platforms: ['iOS', 'Android', 'watchOS'],
    rating: '4.8',
    users: '80K',
    link: '#contact',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 12h4l2-5 3 10 2.5-6 1.5 3h5"/></svg>'
  },
  {
    id: 'lingua',
    cats: ['ai', 'mobile', 'web'],
    accent: '#22d3ee',
    platforms: ['iOS', 'Android', 'Web'],
    rating: '4.9',
    users: '210K',
    link: '#contact',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/><circle cx="19" cy="5" r="2.2"/></svg>'
  },
  {
    id: 'vault',
    cats: ['desktop', 'mobile'],
    accent: '#a78bfa',
    platforms: ['Windows', 'macOS', 'Linux', 'iOS'],
    rating: '4.9',
    users: '45K',
    link: '#contact',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2.5"/></svg>'
  }
];

/* Logo strip shown in the trust marquee. Replace with client names. */
window.TRUST_LOGOS = ['Northwind', 'Cedar Health', 'Fermata', 'Bluepeak', 'Lumen Labs', 'Orbit Retail', 'Kite', 'Solaria'];
