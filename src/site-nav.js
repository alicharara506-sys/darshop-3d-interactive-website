// The site header, shared by every page: glass bar, Shop and Brands mega menus,
// product search (⌘K, Ctrl+K or /), cart, language menu and the phone menu.
import { SHOP } from './shop-i18n.js';
import { STR } from './i18n.js';
import { CAT_ICONS } from './cat-icons.js';
import './site-nav.css';

export const NAV = {
  en: { home: 'Home', shop: 'Shop', about: 'About DAR', faq: 'FAQ', support: 'Support', contact: 'Contact us', menu: 'Menu', company: 'Company', help: 'Help',
    aboutShort: 'About', contactShort: 'Contact', brands: 'Brands', shopNow: 'Shop now', searchBtn: 'Search', language: 'Language', close: 'Close', browse: 'Browse', partner: 'Official partner',
    products: 'Products', seeAll: q => `See all results for “${q}”`, noResults: 'Nothing matches that search yet.', keyMove: 'to move', keyOpen: 'to open', keyClose: 'to close' },
  fr: { home: 'Accueil', shop: 'Boutique', about: 'À propos de DAR', faq: 'FAQ', support: 'Assistance', contact: 'Contact', menu: 'Menu', company: 'Société', help: 'Aide',
    aboutShort: 'À propos', contactShort: 'Contact', brands: 'Marques', shopNow: 'Acheter', searchBtn: 'Rechercher', language: 'Langue', close: 'Fermer', browse: 'Parcourir', partner: 'Partenaire officiel',
    products: 'Produits', seeAll: q => `Voir tous les résultats pour « ${q} »`, noResults: 'Aucun résultat pour cette recherche.', keyMove: 'naviguer', keyOpen: 'ouvrir', keyClose: 'fermer' },
  ar: { home: 'الرئيسية', shop: 'المتجر', about: 'من نحن', faq: 'الأسئلة الشائعة', support: 'الدعم', contact: 'اتصل بنا', menu: 'القائمة', company: 'الشركة', help: 'مساعدة',
    aboutShort: 'من نحن', contactShort: 'اتصل بنا', brands: 'العلامات', shopNow: 'تسوّق الآن', searchBtn: 'بحث', language: 'اللغة', close: 'إغلاق', browse: 'تصفّح', partner: 'شريك رسمي',
    products: 'المنتجات', seeAll: q => `عرض كل نتائج «${q}»`, noResults: 'لا توجد نتائج لهذا البحث.', keyMove: 'للتنقل', keyOpen: 'للفتح', keyClose: 'للإغلاق' },
};
export const PAGES = ['about', 'faq', 'support', 'contact'];
const CAT_ORDER = ['power', 'accessories', 'generators', 'welding', 'construction', 'air', 'pumps', 'hand', 'measure', 'safety', 'garden'];
const BRAND_NAME = { total: 'TOTAL', jadever: 'Jadever' };
const LANGS = { en: ['EN', 'English', 'EN'], fr: ['FR', 'Français', 'FR'], ar: ['عربي', 'العربية', 'ع'] };
const href = (key, lang) => key === 'home' ? `/?lang=${lang}` : key === 'shop' ? `/shop?brand=all&lang=${lang}` : `/${key}?lang=${lang}`;
const shopUrl = (lang, extra = {}) => `/shop?${new URLSearchParams({ brand: 'all', lang, ...extra })}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const cartCount = () => { try { return Object.values(JSON.parse(localStorage.getItem('dar-order') || '{}')).reduce((a, b) => a + b, 0); } catch { return 0; } };


const I = {
  logo: '<svg viewBox="0 0 34 56" aria-hidden="true"><circle cx="8" cy="10" r="6" fill="none" stroke="#ff5a1f" stroke-width="3"/><rect x="22" y="0" width="4.5" height="56" fill="#ff5a1f"/></svg>',
  search: '<svg class="h-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  cart: '<svg class="h-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
  chev: '<svg class="h-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg>',
  menu: '<svg class="h-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>',
  close: '<svg class="h-i" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  globe: '<svg class="h-globe" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.500-3.800 9c-2.500-2.500-3.800-5.500-3.800-9S9.500 5.500 12 3z"/></svg>',
  check: '<svg class="h-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg>',
  faq: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6M12 16.8v.2"/></svg>',
  support: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/></svg>',
  arrow: '<span class="h-arw" aria-hidden="true">→</span>',
};

// Products for the menus and search. Loaded the first time someone reaches for the
// header, so the 3D home page doesn't pay for them up front.
let catalog = null, catalogLoad = null;
function loadCatalog() {
  catalogLoad ??= (async () => {
    try {
      const { LIVE, loadProducts } = await import('./api.js');
      if (LIVE) { const rows = await loadProducts(); if (rows?.length) return rows; }
    } catch (err) { console.warn('Using the local catalogue in the header.', err); }
    const [{ default: list }, { default: photos }] = await Promise.all([import('../data/catalog-sakr.json'), import('../data/photos.json')]);
    return list.map(p => ({ ...p, img: photos[p.id] || null }));
  })().then((rows) => { catalog = rows; return rows; });
  return catalogLoad;
}
const heroOf = cat => catalog?.find(p => p.img && (!cat || p.cat === cat));

// el: the <header> element. opts: { lang, current, onLang(lang), onCart(), onProduct(id), onQuery(text) }
// onCart / onProduct / onQuery let the shop act in place; other pages link to the shop.
export function mountHeader(el, opts) {
  let lang = opts.lang, openKey = null, openedBy = null, openY = 0, timer = 0, active = 0, applied = false;
  const $ = sel => el.querySelector(sel);
  const n = () => NAV[lang], sh = () => SHOP[lang];

  const catLink = (c, cls) => `<a class="${cls}" href="${shopUrl(lang, { cat: c })}" data-h-c="${c}" data-h-prev="${c}"><i>${CAT_ICONS[c]}</i><span><b>${sh().cats[c]}</b><small></small></span></a>`;
  const brandCard = b => `<a class="h-brand ${b}" href="/shop?brand=${b}&lang=${lang}" data-h-b="${b}">
      <small>${n().partner}</small><strong>${BRAND_NAME[b]}</strong><p>${STR[lang].stages[b === 'total' ? 1 : 2].b}</p>
      <span><em></em><u>${n().browse} ${I.arrow}</u></span></a>`;
  const soonList = () => `<ul class="h-soon"><li><img src="/brands/schneider.svg" alt="Schneider Electric" /></li><li><img src="/brands/abb.svg" alt="ABB" /></li><li><b>Parkside</b></li></ul>`;

  function html() {
    const t = n(), cur = opts.current;
    const link = k => `<a class="h-link ${k === cur ? 'on' : ''}" href="${href(k, lang)}" ${k === cur ? 'aria-current="page"' : ''}>${k === 'about' ? t.aboutShort : k === 'contact' ? t.contactShort : t[k]}</a>`;
    // FAQ and Support sit together under Help; About and Contact stay as links.
    const helpOn = cur === 'faq' || cur === 'support';
    const links = `${link('about')}
          <div class="h-help">
            <button type="button" class="h-link ${helpOn ? 'on' : ''}" data-h-act="help" aria-expanded="false" aria-haspopup="true">${t.help}${I.chev}</button>
            <div class="h-help-menu">${['faq', 'support'].map(k => `<a href="${href(k, lang)}" class="${k === cur ? 'on' : ''}" ${k === cur ? 'aria-current="page"' : ''}><i>${k === 'faq' ? I.faq : I.support}</i><span>${t[k]}</span>${I.arrow}</a>`).join('')}</div>
          </div>
          ${link('contact')}`;
    const cartInner = `${I.cart}<span class="h-badge" id="hCount"></span>`;
    return `<div class="h-wrap">
      <div class="h-bar">
        <a class="h-logo" href="${href('home', lang)}" aria-label="DAR Building Materials Shop">${I.logo}<span><b>DAR</b><small>Building Materials <em>Shop</em></small></span></a>
        <nav class="h-links" aria-label="${t.menu}">
          <span class="h-pill" aria-hidden="true"></span>
          <button type="button" class="h-link ${cur === 'shop' ? 'on' : ''}" data-h-menu="shop" aria-expanded="false" aria-controls="hPanel">${t.shop}${I.chev}</button>
          <button type="button" class="h-link" data-h-menu="brands" aria-expanded="false" aria-controls="hPanel">${t.brands}${I.chev}</button>
          ${links}
        </nav>
        <div class="h-acts">
          <button type="button" class="h-ico" data-h-act="search" aria-label="${t.searchBtn}" title="${t.searchBtn}">${I.search}</button>
          ${opts.onCart ? `<button type="button" class="h-ico h-cart" data-h-act="cart" aria-label="${sh().order}">${cartInner}</button>` : `<a class="h-ico h-cart" href="${shopUrl(lang, { cart: 1 })}" aria-label="${sh().order}">${cartInner}</a>`}
          <div class="h-lang">
            <button type="button" class="h-lang-btn" data-h-act="lang" aria-expanded="false" aria-label="${t.language}">${I.globe}<span>${LANGS[lang][0]}</span>${I.chev}</button>
            <div class="h-lang-menu"><p><i></i>${t.language}</p>${Object.keys(LANGS).map(l => `<button type="button" lang="${l}" data-h-lang="${l}" class="${l === lang ? 'on' : ''}" ${l === lang ? 'aria-current="true"' : ''}><span class="h-lang-row"><span class="h-lang-code">${LANGS[l][2]}</span><span>${LANGS[l][1]}</span></span>${l === lang ? I.check : ''}</button>`).join('')}</div>
          </div>
          ${cur === 'shop' ? '' : `<a class="h-cta" href="${href('shop', lang)}">${t.shopNow} ${I.arrow}</a>`}
          <button type="button" class="h-ico h-burger" data-h-act="sheet" aria-label="${t.menu}">${I.menu}</button>
        </div>
        <span class="h-progress" aria-hidden="true"><i></i></span>
      </div>
      <div class="h-panel" id="hPanel">
        <div class="h-pane" data-h-pane="shop">
          <div class="h-cats">${CAT_ORDER.map(c => catLink(c, 'h-cat')).join('')}</div>
          <a class="h-prev" id="hPrev" href="${href('shop', lang)}"><span class="h-prev-pic" id="hPrevPic"></span><b id="hPrevName">${sh().all}</b><small id="hPrevSub"></small><u>${t.browse} ${I.arrow}</u></a>
        </div>
        <div class="h-pane h-pane-brands" data-h-pane="brands">
          ${brandCard('total')}${brandCard('jadever')}
          <div class="h-soon-col"><small>${STR[lang].soon}</small>${soonList()}</div>
        </div>
      </div>
    </div>
    <dialog class="h-search" aria-label="${t.searchBtn}">
      <div class="h-s-box">
        <label class="h-s-row">${I.search}<input id="hInput" type="search" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="hResults" placeholder="${esc(sh().search)}" /><button type="button" data-h-act="closeDialog" aria-label="${t.close}"><kbd>esc</kbd></button></label>
        <div class="h-results" id="hResults" role="listbox"></div>
        <p class="h-s-keys"><span><kbd>↑</kbd><kbd>↓</kbd> ${t.keyMove}</span><span><kbd>↵</kbd> ${t.keyOpen}</span><span><kbd>esc</kbd> ${t.keyClose}</span></p>
      </div>
    </dialog>
    <dialog class="h-sheet" aria-label="${t.menu}">
      <div class="h-sh-head"><a class="h-logo" href="${href('home', lang)}" aria-label="DAR Building Materials Shop">${I.logo}<span><b>DAR</b><small>Building Materials <em>Shop</em></small></span></a><button type="button" class="h-ico" data-h-act="closeDialog" aria-label="${t.close}">${I.close}</button></div>
      <nav class="h-sh-nav" aria-label="${t.menu}">
        <a class="${cur === 'home' ? 'on' : ''}" href="${href('home', lang)}">${t.home}</a>
        <details ${cur === 'shop' ? 'open' : ''}><summary class="${cur === 'shop' ? 'on' : ''}">${t.shop}${I.chev}</summary><div class="h-sh-cats"><a class="h-sh-all" href="${href('shop', lang)}">${sh().all} ${I.arrow}</a>${CAT_ORDER.map(c => catLink(c, 'h-cat')).join('')}</div></details>
        <details><summary>${t.brands}${I.chev}</summary><div class="h-sh-brands">${brandCard('total')}${brandCard('jadever')}<div class="h-soon-col"><small>${STR[lang].soon}</small>${soonList()}</div></div></details>
        ${PAGES.map(k => `<a class="${k === cur ? 'on' : ''}" href="${href(k, lang)}">${k === 'about' ? t.aboutShort : k === 'contact' ? t.contactShort : t[k]}</a>`).join('')}
      </nav>
      <div class="h-sh-foot">
        <div class="h-sh-langs" role="group" aria-label="${t.language}">${Object.keys(LANGS).map(l => `<button type="button" lang="${l}" data-h-lang="${l}" class="${l === lang ? 'on' : ''}">${LANGS[l][1]}</button>`).join('')}</div>
        ${cur === 'shop' ? '' : `<a class="h-cta" href="${href('shop', lang)}">${t.shopNow} ${I.arrow}</a>`}
      </div>
    </dialog>`;
  }

  // Counts come in once the catalogue has loaded. A category with no products is "coming soon".
  function applyCatalog() {
    if (!catalog || applied) return;
    applied = true;
    el.querySelectorAll('[data-h-c]').forEach((a) => {
      const count = catalog.filter(p => p.cat === a.dataset.hC).length;
      a.querySelector('small').textContent = count ? sh().count(count) : sh().soonCat;
      if (!count) { a.classList.add('off'); a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); }
    });
    el.querySelectorAll('[data-h-b]').forEach((a) => { a.querySelector('em').textContent = sh().count(catalog.filter(p => p.brand === a.dataset.hB).length); });
    setPreview(null);
    if ($('.h-search').open) renderResults();
  }
  function setPreview(cat) {
    const pic = $('#hPrevPic'), hero = catalog && heroOf(cat);
    const count = catalog ? (cat ? catalog.filter(p => p.cat === cat).length : catalog.length) : 0;
    $('#hPrevName').textContent = cat ? sh().cats[cat] : sh().all;
    $('#hPrevSub').textContent = count ? sh().count(count) : '';
    $('#hPrev').href = cat ? shopUrl(lang, { cat }) : href('shop', lang);
    if (!hero || pic.dataset.src === hero.img) return;
    pic.dataset.src = hero.img;
    pic.innerHTML = `<img src="${hero.img}" alt="" />`;
  }

  // ---------- mega menus ----------
  function sizePanel() { const pane = $(`[data-h-pane="${openKey}"]`); if (pane) $('.h-panel').style.height = `${pane.offsetHeight}px`; }
  function movePill(link) {
    const pill = $('.h-pill');
    if (!link) { pill.classList.remove('on'); return; }
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
    pill.classList.add('on');
  }
  function openMenu(key, by) {
    clearTimeout(timer);
    closeLang();
    loadCatalog().then(applyCatalog);
    openKey = key; openedBy = by; openY = scrollY;
    el.querySelectorAll('[data-h-menu]').forEach((b) => { const on = b.dataset.hMenu === key; b.setAttribute('aria-expanded', on); b.classList.toggle('open', on); if (on) movePill(b); });
    el.querySelectorAll('[data-h-pane]').forEach(p => p.classList.toggle('on', p.dataset.hPane === key));
    $('.h-panel').classList.add('open');
    sizePanel();
  }
  function closeMenu(refocus) {
    clearTimeout(timer);
    if (!openKey) return;
    const btn = $(`[data-h-menu="${openKey}"]`);
    openKey = null; openedBy = null;
    el.querySelectorAll('[data-h-menu]').forEach((b) => { b.setAttribute('aria-expanded', 'false'); b.classList.remove('open'); });
    el.querySelectorAll('[data-h-pane]').forEach(p => p.classList.remove('on'));
    $('.h-panel').classList.remove('open');
    movePill(null);
    if (refocus) btn?.focus();
  }
  const closeHelp = () => { const w = el.querySelector('.h-help'); w?.classList.remove('open'); w?.querySelector('button').setAttribute('aria-expanded', 'false'); };
  const closeLang = () => { const b = $('[data-h-act="lang"]'); b?.setAttribute('aria-expanded', 'false'); b?.parentElement.classList.remove('open'); };

  // ---------- search ----------
  function matches(text) {
    const words = fold(text).split(/\s+/).filter(Boolean);
    const cats = CAT_ORDER.filter(c => words.every(w => fold(sh().cats[c]).includes(w)) && catalog?.some(p => p.cat === c));
    const list = (catalog || []).filter((p) => { const hay = fold(`${p.name} ${p.code} ${BRAND_NAME[p.brand]} ${sh().cats[p.cat]}`); return words.every(w => hay.includes(w)); });
    return { cats, list };
  }
  function renderResults() {
    const text = $('#hInput').value.trim(), t = n(), box = $('#hResults');
    const catRow = c => `<a class="h-r" role="option" href="${shopUrl(lang, { cat: c })}"><i class="h-r-ic">${CAT_ICONS[c]}</i><span><b>${sh().cats[c]}</b><small>${sh().count(catalog.filter(p => p.cat === c).length)}</small></span>${I.arrow}</a>`;
    if (!catalog) { box.innerHTML = ''; return; }
    if (!text) box.innerHTML = `<p class="h-r-h">${sh().categories}</p>${CAT_ORDER.filter(c => catalog.some(p => p.cat === c)).map(catRow).join('')}`;
    else {
      const { cats, list } = matches(text);
      box.innerHTML = !cats.length && !list.length ? `<p class="h-r-none">${t.noResults}</p>` : `
        ${cats.length ? `<p class="h-r-h">${sh().categories}</p>${cats.slice(0, 3).map(catRow).join('')}` : ''}
        ${list.length ? `<p class="h-r-h">${t.products}</p>${list.slice(0, 6).map(p => `<a class="h-r" role="option" data-h-pid="${esc(p.id)}" href="${shopUrl(lang, { open: p.id })}">
          <i class="h-r-pic">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" />` : CAT_ICONS[p.cat] || ''}</i>
          <span><b>${esc(p.name)}</b><small>${BRAND_NAME[p.brand]}${p.code ? ` · ${esc(p.code)}` : ''}</small></span><em>$${money(p.refPrice)}</em></a>`).join('')}
        <a class="h-r h-r-all" role="option" data-h-query href="${shopUrl(lang, { q: text })}"><span><b>${esc(t.seeAll(text))}</b></span>${I.arrow}</a>` : ''}`;
    }
    setActive(0);
  }
  function setActive(i) {
    const rows = [...el.querySelectorAll('#hResults [role="option"]')];
    active = rows.length ? (i + rows.length) % rows.length : 0;
    rows.forEach((r, k) => { r.id = `hR${k}`; r.classList.toggle('active', k === active); r.setAttribute('aria-selected', k === active); });
    if (rows[active]) { $('#hInput').setAttribute('aria-activedescendant', rows[active].id); rows[active].scrollIntoView({ block: 'nearest' }); }
    else $('#hInput').removeAttribute('aria-activedescendant');
  }
  function openDialog(sel) {
    closeMenu(); closeLang();
    loadCatalog().then(applyCatalog);
    $(sel).showModal();
  }
  function openSearch() {
    $('#hInput').value = '';
    renderResults();
    openDialog('.h-search');
    $('#hInput').focus();
  }
  function closeDialogs() { el.querySelectorAll('dialog[open]').forEach(d => d.close()); }

  // ---------- paint ----------
  function setCart(count) {
    const badge = $('#hCount');
    if (+badge.textContent < count) { badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
    badge.textContent = count || '';
    $('.h-cart').classList.toggle('has', count > 0);
  }
  function render() {
    openKey = null; applied = false;
    el.innerHTML = html();
    const count = cartCount();
    $('#hCount').textContent = count || '';
    $('.h-cart').classList.toggle('has', count > 0);
    applyCatalog();
  }

  // ---------- events (delegated on the header, so they survive a language change) ----------
  el.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('dialog')) return closeDialogs(); // the backdrop
    const menuBtn = t.closest('[data-h-menu]');
    if (menuBtn) {
      const key = menuBtn.dataset.hMenu;
      if (openKey === key && openedBy === 'click') closeMenu(); else openMenu(key, 'click');
      return;
    }
    const langBtn = t.closest('[data-h-lang]');
    if (langBtn) {
      const l = langBtn.dataset.hLang;
      closeDialogs(); closeLang();
      if (l !== lang) opts.onLang(l);
      return;
    }
    const act = t.closest('[data-h-act]')?.dataset.hAct;
    if (act === 'search') return openSearch();
    if (act === 'sheet') return openDialog('.h-sheet');
    if (act === 'closeDialog') return closeDialogs();
    if (act === 'cart') return opts.onCart();
    if (act === 'help') {
      closeMenu(); closeLang();
      const w = t.closest('.h-help'), open = !w.classList.contains('open');
      w.classList.toggle('open', open); w.querySelector('button').setAttribute('aria-expanded', open);
      return;
    }
    if (act === 'lang') {
      closeMenu();
      const b = $('[data-h-act="lang"]'), open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open); b.parentElement.classList.toggle('open', open);
      return;
    }
    const row = t.closest('#hResults [role="option"]');
    if (row && opts.onProduct && row.dataset.hPid) { e.preventDefault(); closeDialogs(); opts.onProduct(row.dataset.hPid); return; }
    if (row && opts.onQuery && row.hasAttribute('data-h-query')) { e.preventDefault(); const text = $('#hInput').value.trim(); closeDialogs(); opts.onQuery(text); }
  });
  // Hover intent: open after a short rest, close after a short grace, so nothing flickers
  // on the way from a button down into its menu. Touch screens use click only.
  el.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    loadCatalog().then(applyCatalog);
    const t = e.target, btn = t.closest('[data-h-menu]'), link = t.closest('.h-link');
    if (link) movePill(link);
    if (btn) { clearTimeout(timer); const key = btn.dataset.hMenu; timer = setTimeout(() => openMenu(key, 'hover'), openKey ? 60 : 120); return; }
    if (t.closest('.h-panel')) { clearTimeout(timer); return; }
    if (openKey && openedBy === 'hover') { clearTimeout(timer); timer = setTimeout(() => closeMenu(), 220); }
    else if (!openKey) clearTimeout(timer);
  });
  // The preview follows the category under the pointer or keyboard focus.
  el.addEventListener('pointerover', (e) => { const prev = e.target.closest('.h-panel [data-h-prev]'); if (prev && !prev.classList.contains('off')) setPreview(prev.dataset.hPrev); });
  el.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!e.target.closest('.h-links')?.contains(e.relatedTarget) && !openKey) movePill(null);
    if (!el.contains(e.relatedTarget) || e.relatedTarget === el) { if (openedBy === 'hover') { clearTimeout(timer); timer = setTimeout(() => closeMenu(), 220); } else if (!openKey) clearTimeout(timer); }
  });
  el.addEventListener('focusin', (e) => { loadCatalog().then(applyCatalog); const prev = e.target.closest('.h-panel [data-h-prev]'); if (prev) setPreview(prev.dataset.hPrev); });
  el.addEventListener('input', (e) => { if (e.target.id === 'hInput') renderResults(); });
  el.addEventListener('keydown', (e) => {
    if (e.target.id === 'hInput') {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); el.querySelector('#hResults .active')?.click(); }
      // A search field's own Esc only clears the text, so close the dialog from here.
      else if (e.key === 'Escape') { e.preventDefault(); closeDialogs(); }
      return;
    }
    const btn = e.target.closest('[data-h-menu]');
    if (btn && e.key === 'ArrowDown') { e.preventDefault(); openMenu(btn.dataset.hMenu, 'click'); $(`[data-h-pane="${btn.dataset.hMenu}"] a[href]`)?.focus(); }
  });
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      e.preventDefault();
      if (!$('.h-search').open) openSearch();
      return;
    }
    if (e.key === 'Escape') { closeHelp(); closeMenu(!!el.querySelector('.h-panel :focus, [data-h-menu]:focus')); closeLang(); }
  });
  document.addEventListener('click', (e) => { if (!el.contains(e.target) || !e.target.closest('.h-help')) closeHelp(); if (!el.contains(e.target)) { closeMenu(); closeLang(); } });
  document.addEventListener('focusin', (e) => { if (!el.contains(e.target)) { closeMenu(); closeLang(); } });
  addEventListener('resize', () => { if (openKey) sizePanel(); });
  // Coming back with the browser's back button shows the page as it was, so recount the cart.
  addEventListener('pageshow', () => { if (!opts.onCart) setCart(cartCount()); });

  // Flush at the top of the page, a floating glass bar once it scrolls, with a progress line.
  let ticking = false;
  function onScroll() {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    el.classList.toggle('float', scrollY > 12);
    el.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    if (openKey && Math.abs(scrollY - openY) > 60) closeMenu();
  }
  const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);

  render();
  onScroll();
  return { setLang(l) { if (l !== lang) { lang = l; render(); } }, setCart };
}
