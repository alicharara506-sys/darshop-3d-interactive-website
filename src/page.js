// Info pages: about.html, faq.html, support.html, contact.html (?lang=en|fr|ar).
// The page key comes from <body data-page="...">. Header, menu and footer match the shop.
import { SHOP } from './shop-i18n.js';
import { PAGE } from './pages-i18n.js';
import { navHTML, initMenu, NAV } from './site-nav.js';
import { footerHTML, ICONS, CONTACT, waLink } from './checkout.js';
import { CAT_ICONS } from './cat-icons.js';
import { LIVE, sendContactMessage } from './api.js';
import './shop.css';
import './page.css';

const q = new URLSearchParams(location.search);
const page = document.body.dataset.page;
let lang = ['en', 'fr', 'ar'].includes(q.get('lang')) ? q.get('lang') : 'en';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cartCount = () => Object.values(JSON.parse(localStorage.getItem('dar-order') || '{}')).reduce((a, b) => a + b, 0);
const MAP = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Sfeir Raya Center, Beirut, Lebanon');
const SUPPORT_ICON = { order: CAT_ICONS.all, warranty: CAT_ICONS.safety, returns: CAT_ICONS.accessories, advice: CAT_ICONS.hand, bulk: CAT_ICONS.construction };

function header() {
  const sh = SHOP[lang];
  return `<div class="s-head-in">
      <a class="s-logo" href="/?lang=${lang}" aria-label="DAR Building Materials Shop">
        <svg viewBox="0 0 34 56" aria-hidden="true"><circle cx="8" cy="10" r="6" fill="none" stroke="#ff5a1f" stroke-width="3"/><rect x="22" y="0" width="4.5" height="56" fill="#ff5a1f"/></svg>
        <span><b>DAR</b><small>Building Materials <em>Shop</em></small></span>
      </a>
      ${navHTML(lang, page)}
      <span class="p-spacer"></span>
      <nav class="s-langs" aria-label="Language">${['en', 'fr', 'ar'].map(l => `<button data-l="${l}" class="${l === lang ? 'on' : ''}">${l === 'ar' ? 'ع' : l.toUpperCase()}</button>`).join('')}</nav>
      <a class="s-cart ${cartCount() ? 'has' : ''}" href="/shop.html?brand=all&lang=${lang}" aria-label="${sh.order}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg><span>${cartCount()}</span></a>
    </div>`;
}
const hero = (p) => `<section class="p-hero"><div class="p-hero-in"><p class="s-kicker">${p.kicker}</p><h1>${p.title}</h1><p class="p-intro">${p.intro}</p></div></section>`;

const RENDER = {
  about(p) {
    return `${hero(p)}
    <section class="p-sec p-story"><div><h2>${p.storyH}</h2>${p.story.map(x => `<p>${x}</p>`).join('')}</div>
      <blockquote><span>Results First.</span><span>Payment Follows.</span><small>DAR Trading &amp; Contracting</small></blockquote></section>
    <section class="p-sec"><h2>${p.valuesH}</h2><div class="p-cards four">${p.values.map(([h, b]) => `<div class="p-card"><h3>${h}</h3><p>${b}</p></div>`).join('')}</div></section>
    <section class="p-sec p-partners"><h2>${p.partnersH}</h2><p>${p.partnersBody}</p>
      <div class="p-brands"><span class="b total">TOTAL</span><span class="b jadever">Jadever</span>
      <span class="b soon"><img src="/brands/schneider.svg" alt="Schneider Electric" /><em>${p.soon}</em></span>
      <span class="b soon"><img src="/brands/abb.svg" alt="ABB" /><em>${p.soon}</em></span>
      <span class="b soon txt">Parkside<em>${p.soon}</em></span></div></section>
    <section class="p-sec"><h2>${p.whyH}</h2><div class="p-cards four">${p.why.map(([h, b], i) => `<div class="p-card"><i>${[CAT_ICONS.safety, CAT_ICONS.hand, ICONS.whatsapp, ICONS.pin][i]}</i><h3>${h}</h3><p>${b}</p></div>`).join('')}</div></section>
    <section class="p-sec p-cta"><a class="p-btn" href="/shop.html?brand=all&lang=${lang}">${p.ctaShop}</a><a class="p-btn ghost" href="/contact.html?lang=${lang}">${p.ctaContact}</a></section>`;
  },
  faq(p) {
    return `${hero(p)}
    <section class="p-sec p-faq">${p.items.map(([qq, a], i) => `<details ${i === 0 ? 'open' : ''}><summary>${qq}</summary><p>${a}</p></details>`).join('')}</section>
    <section class="p-sec p-cta"><a class="p-btn wa" href="${waLink(SHOP[lang].waAsk)}" target="_blank" rel="noopener">${ICONS.whatsapp}${PAGE[lang].support.chat}</a><a class="p-btn ghost" href="/contact.html?lang=${lang}">${PAGE[lang].contact.title}</a></section>`;
  },
  support(p) {
    return `${hero(p)}
    <section class="p-sec"><div class="p-cards three">${p.cards.map(([k, h, b]) => `<div class="p-card"><i>${SUPPORT_ICON[k]}</i><h3>${h}</h3><p>${b}</p></div>`).join('')}</div></section>
    <section class="p-sec p-cta"><a class="p-btn wa" href="${waLink(SHOP[lang].waAsk)}" target="_blank" rel="noopener">${ICONS.whatsapp}${p.chat}</a>
      <a class="p-btn ghost" href="/contact.html?lang=${lang}">${p.form}</a><a class="p-btn ghost" href="/faq.html?lang=${lang}">${p.faq}</a></section>`;
  },
  contact(p) {
    const soc = (k, label) => CONTACT[k] ? `<a class="f-soc ${k}" href="${CONTACT[k]}" target="_blank" rel="noopener" aria-label="${label}">${ICONS[k]}</a>` : `<span class="f-soc ${k} pending" title="Link coming soon" aria-label="${label}">${ICONS[k]}</span>`;
    return `${hero(p)}
    <section class="p-sec p-contact">
      <div class="p-info">
        <div class="p-card"><i>${ICONS.pin}</i><h3>${p.shopH}</h3><p>${p.address}</p><a href="${MAP}" target="_blank" rel="noopener">${p.map} <span class="arw">→</span></a></div>
        <div class="p-card"><i>${ICONS.clock}</i><h3>${p.hoursH}</h3><p>${p.hours}</p></div>
        <div class="p-card"><i>${ICONS.whatsapp}</i><h3>${p.waH}</h3><p>${p.waBody}</p><a href="${waLink(SHOP[lang].waAsk)}" target="_blank" rel="noopener">${p.waBtn} <span class="arw">→</span></a></div>
        <div class="p-card"><h3>${p.followH}</h3><div class="f-socials">${soc('instagram', 'Instagram')}${soc('facebook', 'Facebook')}${soc('tiktok', 'TikTok')}</div></div>
      </div>
      <form class="p-form co" id="contactForm" novalidate>
        <h2>${p.formH}</h2>
        <label>${p.name}<input name="name" autocomplete="name" /><span class="co-err" data-err="name"></span></label>
        <label>${p.phone}<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+961 70 123 456" /><span class="co-err" data-err="phone"></span></label>
        <label>${p.subject}<select name="subject">${p.subjects.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>
        <label>${p.message}<textarea name="message" rows="5"></textarea><span class="co-err" data-err="message"></span></label>
        <button class="co-submit wa" type="submit">${p.send}</button>
        <p class="s-note">${p.sentNote}</p>
      </form>
    </section>`;
  },
};

function render() {
  const p = PAGE[lang][page], sh = SHOP[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = `${NAV[lang][page]} · DAR Building Materials Shop`;
  $('head').innerHTML = header();
  $('main').innerHTML = RENDER[page](p);
  $('foot').innerHTML = footerHTML(sh, lang);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-l]');
  if (b) { lang = b.dataset.l; history.replaceState(null, '', `?lang=${lang}`); render(); }
});
// Contact form: check the fields, then open WhatsApp with the message written out.
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'contactForm') return;
  e.preventDefault();
  const p = PAGE[lang].contact, f = new FormData(e.target), v = k => (f.get(k) || '').toString().trim();
  const errs = { name: v('name').length < 2 ? p.errName : '', phone: /^\+?[0-9\s-]{7,16}$/.test(v('phone')) ? '' : p.errPhone, message: v('message').length < 3 ? p.errMsg : '' };
  e.target.querySelectorAll('[data-err]').forEach(el => { el.textContent = errs[el.dataset.err] || ''; });
  const bad = Object.keys(errs).find(k => errs[k]);
  if (bad) { e.target.elements[bad].focus(); return; }
  const text = `${p.waHello}\n${p.subject}: ${v('subject')}\n${p.name}: ${v('name')}\n${p.phone}: ${v('phone')}\n\n${v('message')}`;
  if (LIVE) {
    // Keep a copy in Supabase so the shop sees every message, even if WhatsApp isn't sent.
    try { await sendContactMessage({ name: v('name'), phone: v('phone'), subject: v('subject'), message: v('message') }, lang); }
    catch (err) { console.warn('Message not saved in Supabase; WhatsApp still opens.', err); }
  }
  window.open(waLink(text), '_blank', 'noopener');
});
document.addEventListener('input', (e) => { const el = e.target.closest('label')?.querySelector('[data-err]'); if (el) el.textContent = ''; });

initMenu();
render();
