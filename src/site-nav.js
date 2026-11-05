// Site menu shared by the shop and the info pages (About, FAQ, Support, Contact).
export const NAV = {
  en: { home: 'Home', shop: 'Shop', about: 'About DAR', faq: 'FAQ', support: 'Support', contact: 'Contact us', menu: 'Menu', company: 'Company' },
  fr: { home: 'Accueil', shop: 'Boutique', about: 'À propos de DAR', faq: 'FAQ', support: 'Assistance', contact: 'Contact', menu: 'Menu', company: 'Société' },
  ar: { home: 'الرئيسية', shop: 'المتجر', about: 'من نحن', faq: 'الأسئلة الشائعة', support: 'الدعم', contact: 'اتصل بنا', menu: 'القائمة', company: 'الشركة' },
};
export const PAGES = ['about', 'faq', 'support', 'contact'];
const href = (key, lang) => key === 'home' ? `/?lang=${lang}` : key === 'shop' ? `/shop.html?brand=all&lang=${lang}` : `/${key}.html?lang=${lang}`;

// current: 'shop' | 'about' | 'faq' | 'support' | 'contact'
export function navHTML(lang, current) {
  const n = NAV[lang];
  const links = ['home', 'shop', ...PAGES].map(k => `<a href="${href(k, lang)}" class="${k === current ? 'on' : ''}">${n[k]}</a>`).join('');
  return `<button class="s-menu-btn" id="menuBtn" aria-label="${n.menu}" aria-expanded="false"><span></span><span></span><span></span></button>
    <nav class="s-nav" id="siteNav" aria-label="${n.menu}">${links}</nav>`;
}
export function companyLinksHTML(lang) {
  const n = NAV[lang];
  return `<nav class="f-col"><h4>${n.company}</h4>${PAGES.map(k => `<a href="${href(k, lang)}">${n[k]}</a>`).join('')}</nav>`;
}
// Phone: the menu button opens the links as a drop-down panel.
export function initMenu() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#menuBtn');
    const nav = document.getElementById('siteNav');
    if (!nav) return;
    if (btn) { const open = !nav.classList.contains('open'); nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); return; }
    if (!e.target.closest('#siteNav')) { nav.classList.remove('open'); document.getElementById('menuBtn')?.setAttribute('aria-expanded', 'false'); }
  });
}
