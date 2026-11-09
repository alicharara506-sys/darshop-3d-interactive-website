// The end of every page, as on Sater's site: a closing band open to the page, centred, on a
// soft orange glow, then the footer on a dark blueprint grid, laid out
// like Sater's: the brand and every way to reach DAR on one side, categories, brands
// and pages on the other, then the copyright line.
import { SHOP } from './shop-i18n.js';
import { NAV, PAGES } from './site-nav.js';
import { CONTACT, ICONS, waLink } from './checkout.js';
import './site-footer.css';

const COPY = {
  en: { kicker: 'Ready when you are', title: ['Build something', 'stronger.'], body: 'Order online, message us on WhatsApp, or come and see the tools at the shop in Beirut.', shop: 'Shop the tools', chat: 'Chat on WhatsApp', hoursLabel: 'Opening hours', brands: 'Brands', soon: 'Coming soon', categories: 'Categories' },
  fr: { kicker: 'Quand vous voulez', title: ['Construisez', 'plus solide.'], body: 'Commandez en ligne, écrivez-nous sur WhatsApp, ou venez voir les outils à la boutique à Beyrouth.', shop: 'Voir les outils', chat: 'Discuter sur WhatsApp', hoursLabel: 'Horaires', brands: 'Marques', soon: 'Bientôt', categories: 'Catégories' },
  ar: { kicker: 'نحن جاهزون', title: ['ابنِ شيئاً', 'أقوى.'], body: 'اطلب عبر الإنترنت، راسلنا على واتساب، أو تعال لرؤية الأدوات في متجرنا في بيروت.', shop: 'تسوّق الأدوات', chat: 'تحدّث على واتساب', hoursLabel: 'ساعات العمل', brands: 'العلامات', soon: 'قريباً', categories: 'الفئات' },
};
const CATS = ['power', 'accessories', 'hand', 'measure', 'garden', 'construction'];
const MAP = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Sfeir Raya Center, Beirut, Lebanon');
const page = (k, lang) => `/${k}?lang=${lang}`;
const shop = (lang, q = '') => `/shop?brand=all&lang=${lang}${q}`;
const arrow = '<span class="sf-arw" aria-hidden="true">→</span>';
const row = (href, label, extra = '', attrs = '') => `<a class="sf-row" href="${href}" ${attrs}><span>${label}</span>${extra}${arrow}</a>`;
// A way to reach DAR: its icon on a small tile, a label above the detail.
const contact = (icon, label, value, href) => {
  const inner = `<i class="sf-ic">${icon}</i><span><small>${label}</small><b>${value}</b></span>`;
  return href ? `<a class="sf-contact" href="${href}" target="_blank" rel="noopener">${inner}</a>` : `<div class="sf-contact">${inner}</div>`;
};

export function siteFooterHTML(lang, { cta = true } = {}) {
  const c = COPY[lang], sh = SHOP[lang], f = sh.foot, n = NAV[lang];
  return `${cta ? `
  <section class="sf-cta">
    <span class="sf-beam" aria-hidden="true"></span>
    <div class="sf-cta-in">
      <p class="sf-kicker sf-rise" style="--i:0"><i></i>${c.kicker}</p>
      <h2 class="sf-rise" style="--i:1">${c.title[0]} <span class="sf-hl">${c.title[1]}</span></h2>
      <p class="sf-body sf-rise" style="--i:2">${c.body}</p>
      <div class="sf-ctas sf-rise" style="--i:3">
        <a class="sf-btn" href="${shop(lang)}"><span class="sf-sheen"></span>${c.shop} ${arrow}</a>
        <a class="sf-btn ghost" href="${waLink(sh.waAsk)}" target="_blank" rel="noopener"><span class="sf-sheen"></span>${ICONS.whatsapp}${c.chat}</a>
      </div>
    </div>
  </section>` : ''}
  <div class="sf-main"><div class="sf-in">
    <div class="sf-grid">
      <div class="sf-brand">
        <a class="sf-logo" href="/?lang=${lang}" aria-label="DAR Building Materials Shop">
          <svg viewBox="0 0 34 56" aria-hidden="true"><circle cx="8" cy="10" r="6" fill="none" stroke="#ff5a1f" stroke-width="3"/><rect x="22" y="0" width="4.5" height="56" fill="#ff5a1f"/></svg>
          <span><b>DAR</b><small>Building Materials <em>Shop</em></small></span>
        </a>
        <p>${f.tagline}</p>
        <div class="sf-contacts">
          ${contact(ICONS.pin, f.visit, f.address, MAP)}
          ${contact(ICONS.clock, c.hoursLabel, CONTACT.hours?.[lang] || f.hours)}
          ${contact(ICONS.whatsapp, 'WhatsApp', f.chat, waLink(sh.waAsk))}
          ${CONTACT.instagram ? contact(ICONS.instagram, 'Instagram', '@darshop.lb', CONTACT.instagram) : ''}
        </div>
      </div>
      <div class="sf-cols">
        <nav class="sf-col"><h4>${c.categories}</h4>${CATS.map(k => row(shop(lang, `&cat=${k}`), sh.cats[k])).join('')}${row(shop(lang), sh.all)}</nav>
        <nav class="sf-col"><h4>${c.brands}</h4>
          ${row(`/shop?brand=total&lang=${lang}`, '<b class="sf-b total" dir="ltr">TOTAL</b>')}
          ${row(`/shop?brand=jadever&lang=${lang}`, '<b class="sf-b jadever" dir="ltr">Jadever</b>')}
          <p class="sf-soon"><span dir="ltr">Schneider · ABB · Parkside</span><em>${c.soon}</em></p>
        </nav>
        <nav class="sf-col"><h4>${n.company}</h4>${PAGES.map(k => row(page(k, lang), n[k])).join('')}</nav>
      </div>
    </div>
    <div class="sf-bar">
      <p>© ${new Date().getFullYear()} DAR Building Materials Shop · ${f.rights}</p>
      <p class="sf-pay"><span>${ICONS.whatsapp}${f.payWa}</span><span>${ICONS.card}${f.payWhish}</span><span>${ICONS.pin}${f.payStore}</span></p>
    </div>
  </div></div>`;
}

// The band's words rise in once it scrolls into view. The footer below it stays still.
export function mountFooter(el, lang, opts) {
  el.classList.add('sf');
  el.innerHTML = siteFooterHTML(lang, opts);
  if (el.dataset.sfWired) return;
  el.dataset.sfWired = '1';
  new IntersectionObserver(([e]) => { if (e.isIntersecting) el.classList.add('in'); }, { threshold: 0.2 }).observe(el);
}
