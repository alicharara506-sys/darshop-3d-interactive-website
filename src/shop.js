// DAR shop catalogue: /shop.html?brand=total|jadever|all&cat=..&lang=en|fr|ar
// Data: data/catalog-sakr.json (products) + data/photos.json (official brand photos).
import catalog from '../data/catalog-sakr.json';
import photos from '../data/photos.json';
import { SHOP } from './shop-i18n.js';
import { createCategoryCarousel } from './cat3d.js';
import { CAT_ICONS } from './cat-icons.js';
import { LIVE, loadProducts, placeOrder, loadSettings } from './api.js';
import { navHTML, initMenu } from './site-nav.js';
import { applySettings, footerHTML, detailsHTML, doneHTML, orderMessage, validate, makeRef, waLink } from './checkout.js';
import './shop.css';

const q = new URLSearchParams(location.search);
const BRANDS = { total: { name: 'TOTAL' }, jadever: { name: 'Jadever' } };
// TOTAL's 11 official categories, in TOTAL's order.
const CAT_ORDER = ['power', 'accessories', 'generators', 'welding', 'construction', 'air', 'pumps', 'hand', 'measure', 'safety', 'garden'];

const products = catalog.map((p, i) => ({ ...p, rank: i, img: photos[p.id] || null }));
const state = {
  lang: ['en', 'fr', 'ar'].includes(q.get('lang')) ? q.get('lang') : 'en',
  brand: ['total', 'jadever'].includes(q.get('brand')) ? q.get('brand') : 'all',
  cat: CAT_ORDER.includes(q.get('cat')) ? q.get('cat') : 'all',
  search: '', sort: 'popular',
};
let cart = JSON.parse(localStorage.getItem('dar-order') || '{}'); // id -> qty
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACCENT = { all: '#ff5a1f', total: '#0b7480', jadever: '#1f7a37' };
const $ = id => document.getElementById(id);
const t = () => SHOP[state.lang];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Prices always use standard digits (as Lebanese shops do), in every language.
const money = n => n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const priceHTML = p => `${p.refPriceMax ? `<small>${t().from}</small> ` : ''}<b>$${money(p.refPrice)}</b>`;
const pic = (p, cls = '') => p.img
  ? `<img class="${cls}" src="${p.img}" alt="${esc(p.name)}" loading="lazy" />`
  : `<div class="s-noimg ${p.brand} ${cls}"><span>${BRANDS[p.brand].name}</span><small>${esc(p.code || '')}</small><em>${t().photoSoon}</em></div>`;

function syncUrl() {
  const u = new URLSearchParams({ brand: state.brand, lang: state.lang });
  if (state.cat !== 'all') u.set('cat', state.cat);
  history.replaceState(null, '', `?${u}`);
}

function visible() {
  const s = state.search.trim().toLowerCase();
  let list = products.filter(p => (state.brand === 'all' || p.brand === state.brand)
    && (state.cat === 'all' || p.cat === state.cat)
    && (!s || `${p.name} ${p.code} ${BRANDS[p.brand].name} ${t().cats[p.cat]}`.toLowerCase().includes(s)));
  // 'Most popular' keeps SAKR's popularity order but shows products with a photo first.
  const by = { popular: (a, b) => (!a.img - !b.img) || a.rank - b.rank, low: (a, b) => a.refPrice - b.refPrice, high: (a, b) => b.refPrice - a.refPrice, name: (a, b) => a.name.localeCompare(b.name) };
  return list.sort(by[state.sort]);
}

// ---------- hero: animated brand header + 3D category carousel ----------
function brandItems() { return products.filter(p => state.brand === 'all' || p.brand === state.brand); }
function catItems() {
  const tt = t(), base = brandItems();
  const items = [{ key: 'all', label: tt.all, sub: tt.count(base.length), logo: true }];
  for (const c of CAT_ORDER) {
    const list = base.filter(p => p.cat === c);
    if (!list.length) continue;
    const hero = list.find(p => p.img); // most popular product with a photo
    items.push({ key: c, label: tt.cats[c], sub: tt.count(list.length), img: hero ? hero.img : null });
  }
  return items;
}
function renderHero() {
  const tt = t(), b = state.brand, base = brandItems();
  const word = b === 'all' ? 'TOTAL · Jadever' : BRANDS[b].name;
  const nCats = new Set(base.map(p => p.cat)).size;
  $('hero').className = `s-hero ${b}`;
  $('heroText').innerHTML = `
    <a class="s-back" href="/?lang=${state.lang}">${tt.back}</a>
    <p class="s-kicker">${b === 'all' ? tt.title : tt.partner}</p>
    <h1 aria-label="${word}">${[...word].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</h1>
    <p class="s-stats"><b data-count="${base.length}">0</b> ${tt.statProducts} <i></i> <b data-count="${nCats}">0</b> ${tt.statCats}</p>
    <div class="s-tabs" role="tablist">
      ${['all', 'total', 'jadever'].map(k => `<button role="tab" data-brand="${k}" class="${state.brand === k ? 'on' : ''} ${k}">${k === 'all' ? tt.allBrands : BRANDS[k].name}</button>`).join('')}
    </div>`;
  // replay the intro (letters, sweep line, counters)
  $('hero').classList.remove('play'); void $('hero').offsetWidth; $('hero').classList.add('play');
  countUp();
  carousel.setItems(catItems(), ACCENT[b], state.cat, state.lang === 'ar');
  renderCatUI(false);
}
function countUp() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = +el.dataset.count, t0 = performance.now(), dur = REDUCED ? 0 : 1100;
    const tick = (now) => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
// Caption under the carousel: active category name + count, with arrows.
function renderCatUI(animate = true) {
  const tt = t(), all = catItems(), it = all.find(x => x.key === state.cat) || all[0];
  $('c3dui').innerHTML = `
    <button class="s-c3d-arrow" data-step="-1" aria-label="previous">&lsaquo;</button>
    <div class="s-c3d-cap ${animate ? 'swap' : ''}"><b>${it.label}</b><span>${it.sub}</span><em>${tt.dragHint}</em></div>
    <button class="s-c3d-arrow" data-step="1" aria-label="next">&rsaquo;</button>`;
}

function renderSide() {
  const tt = t();
  const base = products.filter(p => state.brand === 'all' || p.brand === state.brand);
  const counts = Object.fromEntries(CAT_ORDER.map(c => [c, base.filter(p => p.cat === c).length]));
  $('side').innerHTML = `
    <p class="s-side-h">${tt.categories}</p>
    <div class="s-cats">
      <button data-cat="all" class="${state.cat === 'all' ? 'on' : ''}"><i>${CAT_ICONS.all}</i><em>${tt.all}</em><span>${base.length}</span></button>
      ${CAT_ORDER.filter(c => counts[c]).map(c => `<button data-cat="${c}" class="${state.cat === c ? 'on' : ''}"><i>${CAT_ICONS[c]}</i><em>${tt.cats[c]}</em><span>${counts[c]}</span></button>`).join('')}
    </div>`;
  renderCatRow(counts);
}
// Row of all 11 categories with icons (like TOTAL's site). Empty ones say "Coming soon".
function renderCatRow(counts) {
  const tt = t();
  $('catrow').innerHTML = `<div class="s-catrow-in">${CAT_ORDER.map(c => `
    <button class="s-catico ${state.cat === c ? 'on' : ''} ${counts[c] ? '' : 'empty'}" ${counts[c] ? `data-cat="${c}"` : 'disabled'}>
      <i>${CAT_ICONS[c]}</i><b>${tt.cats[c]}</b><small>${counts[c] ? tt.count(counts[c]) : tt.soonCat}</small>
    </button>`).join('')}</div>`;
}

function renderGrid() {
  const tt = t(), list = visible();
  const catName = state.cat === 'all' ? tt.all : tt.cats[state.cat];
  $('tools').innerHTML = `
    <div class="s-cat-title"><h3>${catName}</h3><p class="s-count">${tt.count(list.length)}</p></div>
    <label class="s-sort">${tt.sort}
      <select id="sort">${Object.entries(tt.sorts).map(([k, v]) => `<option value="${k}" ${state.sort === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    </label>`;
  $('grid').innerHTML = list.length ? list.map(p => `
    <li class="s-card" data-id="${p.id}">
      <button class="s-pic" data-open="${p.id}" aria-label="${esc(p.name)}">${pic(p)}</button>
      <div class="s-info">
        <p class="s-meta"><span class="s-chip ${p.brand}">${BRANDS[p.brand].name}</span>${p.code ? `<span class="s-code">${esc(p.code)}</span>` : ''}</p>
        <h2><button data-open="${p.id}">${esc(p.name)}</button></h2>
        <p class="s-price">${priceHTML(p)}</p>
        <button class="s-add ${cart[p.id] ? 'in' : ''}" data-add="${p.id}">${cart[p.id] ? `✓ <span class="lbl">${tt.added} · </span>${cart[p.id]}` : tt.add}</button>
      </div>
    </li>`).join('')
    : `<li class="s-empty"><p>${tt.none}</p><button data-clear>${tt.clear}</button></li>`;
}

function renderFoot() { $('foot').innerHTML = footerHTML(t(), state.lang); }

// Order drawer: step 'cart' -> 'details' (checkout form) -> 'done'.
const co = { step: 'cart', form: { ship: 'delivery', pay: 'whatsapp' }, done: null };
function cartItems() { return Object.entries(cart).map(([id, n]) => ({ p: products.find(x => x.id === id), n })).filter(x => x.p); }
function renderCart() {
  const tt = t(), items = cartItems();
  const total = items.reduce((s, x) => s + x.p.refPrice * x.n, 0);
  $('cartCount').textContent = items.reduce((s, x) => s + x.n, 0);
  $('cartBtn').classList.toggle('has', items.length > 0);
  const title = co.step === 'details' ? tt.co.title : co.step === 'done' ? tt.co.doneTitle : tt.order;
  let body;
  if (co.step === 'done' && co.done) body = `<div class="s-dr-scroll">${doneHTML(tt, co.done, money)}</div>`;
  else if (!items.length) { co.step = 'cart'; body = `<p class="s-dr-empty">${tt.orderEmpty}</p>`; }
  else if (co.step === 'details') body = `<div class="s-dr-scroll">${detailsHTML(tt, co.form, total, money)}</div>`;
  else body = `<ul class="s-lines">${items.map(({ p, n }) => `
      <li><div class="s-line-pic">${pic(p, 'sm')}</div>
        <div class="s-line-info"><p>${esc(p.name)}</p><small>${BRANDS[p.brand].name}${p.code ? ` · ${esc(p.code)}` : ''}</small>
          <div class="s-qty"><button data-dec="${p.id}" aria-label="-">−</button><span>${n}</span><button data-inc="${p.id}" aria-label="+">+</button>
          <button class="s-rm" data-rm="${p.id}">${tt.remove}</button></div></div>
        <b>$${money(p.refPrice * n)}</b></li>`).join('')}</ul>
      <div class="s-dr-foot"><p class="s-total"><span>${tt.total}</span><b>$${money(total)}</b></p><p class="s-note">${tt.note}</p>
        <button class="co-submit" data-checkout>${tt.co.checkout}</button>
        <div class="co-ways"><span>${tt.co.ways}</span></div></div>`;
  $('drawer').innerHTML = `<div class="s-dr-head"><h3>${title}</h3><button data-close aria-label="${tt.close}">✕</button></div>${body}`;
}
function readForm() {
  const f = $('coForm'); if (!f) return;
  const d = new FormData(f);
  for (const k of ['name', 'phone', 'ship', 'address', 'pay', 'notes']) co.form[k] = (d.get(k) || '').toString();
}
let submitting = false;
async function submitOrder() {
  if (submitting) return;
  readForm();
  const tt = t(), errors = validate(tt, co.form);
  co.form.errors = errors;
  if (Object.keys(errors).length) { renderCart(); $('coForm').querySelector('.co-err')?.closest('label')?.querySelector('input,textarea')?.focus(); return; }
  let items = cartItems(), total = items.reduce((s, x) => s + x.p.refPrice * x.n, 0), ref = makeRef();
  if (LIVE) {
    // Save the order in Supabase. The server sets the reference and the prices.
    const btn = $('coForm').querySelector('.co-submit');
    submitting = true; btn.disabled = true; btn.textContent = tt.co.sending;
    try {
      const saved = await placeOrder(co.form, cart, state.lang);
      ref = saved.ref; total = Number(saved.subtotal);
      items = saved.items.map(it => ({ p: { name: it.name, code: it.code, refPrice: Number(it.unit_price) }, n: it.qty }));
    } catch (err) {
      console.error('place_order failed', err);
      submitting = false; btn.disabled = false;
      co.form.errors = { server: String(err.message || '').includes('TOO_MANY') ? tt.co.errTooMany : tt.co.errServer };
      renderCart(); return;
    }
    submitting = false;
  }
  const link = waLink(orderMessage(tt, items, total, co.form, ref, money));
  co.done = { ref, total, pay: co.form.pay, link };
  if (co.form.pay === 'whatsapp') window.open(link, '_blank', 'noopener');
  // PROTOTYPE: with a Whish merchant account, this is where the shop's server
  // would create the Whish payment and send the customer to Whish's page.
  cart = {}; localStorage.setItem('dar-order', '{}');
  co.step = 'done'; renderCart(); renderGrid();
}

function openProduct(id) {
  const tt = t(), p = products.find(x => x.id === id);
  if (!p) return;
  $('modal').innerHTML = `
    <div class="s-mod-card ${p.brand}">
      <button class="s-x" data-close aria-label="${tt.close}">✕</button>
      <div class="s-mod-pic">${pic(p)}</div>
      <div class="s-mod-info">
        <p class="s-meta"><span class="s-chip ${p.brand}">${BRANDS[p.brand].name}</span></p>
        <h2>${esc(p.name)}</h2>
        <dl><dt>${tt.model}</dt><dd>${esc(p.code || '—')}</dd><dt>${tt.category}</dt><dd>${tt.cats[p.cat]}</dd></dl>
        <p class="s-price big">${priceHTML(p)} <small>${tt.usd}</small></p>
        <button class="s-add big" data-add="${p.id}">${tt.add}</button>
        <a class="s-wa" target="_blank" rel="noopener" href="${waLink(`${tt.waAsk}\n${p.name}${p.code ? ` (${p.code})` : ''}`)}">${tt.askWa}</a>
        <p class="s-note">${tt.note}</p>
      </div>
    </div>`;
  document.body.classList.add('mod-open');
}

// Category / brand change: cards slip out, the new ones rise in one after another.
let switching = null;
function changeGrid(update) {
  const old = [...$('grid').children];
  if (REDUCED || !old.length) { update(); return; }
  const outs = old.slice(0, 16).map((el, i) => el.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(.97)' }],
    { duration: 170, delay: i * 12, easing: 'ease-in', fill: 'forwards' }).finished);
  const token = switching = {};
  Promise.all(outs).catch(() => {}).then(() => {
    if (switching !== token) return;
    update();
    [...$('grid').children].slice(0, 16).forEach((el, i) => el.animate(
      [{ opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, delay: i * 38, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }));
    const h = document.querySelector('.s-cat-title h3');
    if (h) h.animate([{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
  });
}
function selectCat(key, fromCarousel = false) {
  if (key === state.cat) return;
  state.cat = key;
  if (!fromCarousel) carousel.go(catItems().findIndex(x => x.key === key));
  renderSide(); renderCatUI(); syncUrl();
  changeGrid(renderGrid);
}

function save() { localStorage.setItem('dar-order', JSON.stringify(cart)); renderCart(); }
function add(id) { cart[id] = (cart[id] || 0) + 1; save(); renderGrid(); }
function closeAll() {
  document.body.classList.remove('mod-open', 'dr-open');
  if (co.step === 'done') { co.step = 'cart'; co.done = null; setTimeout(renderCart, 300); }
}

function renderAll() {
  const tt = t();
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  document.title = `${state.brand === 'all' ? tt.title : BRANDS[state.brand].name} · DAR Building Materials Shop`;
  $('home').href = `/?lang=${state.lang}`;
  $('q').placeholder = tt.search;
  $('cartBtn').setAttribute('aria-label', tt.order);
  document.querySelectorAll('.s-langs button').forEach(b => b.classList.toggle('on', b.dataset.l === state.lang));
  $('navSlot').innerHTML = navHTML(state.lang, 'shop');
  renderHero(); renderSide(); renderGrid(); renderFoot(); renderCart(); syncUrl();
}

// ---------- events (one listener, delegated) ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('button, .s-dim');
  if (!el) return;
  const d = el.dataset;
  if (el.id === 'dim' || d.close !== undefined) return closeAll();
  if (el.id === 'cartBtn') { document.body.classList.add('dr-open'); return; }
  if (d.checkout !== undefined) { co.step = 'details'; co.form.errors = null; renderCart(); return; }
  if (d.back !== undefined) { readForm(); co.step = 'cart'; renderCart(); return; }
  if (d.l) { state.lang = d.l; return renderAll(); }
  if (d.step) { carousel.next(+d.step); return; }
  if (d.brand) { if (d.brand === state.brand) return; state.brand = d.brand; state.cat = 'all'; changeGrid(() => {}); renderAll(); return; }
  if (d.cat) { selectCat(d.cat); return; }
  if (d.clear !== undefined) { state.search = ''; state.cat = 'all'; $('q').value = ''; renderSide(); renderGrid(); syncUrl(); return; }
  if (d.open) return openProduct(d.open);
  if (d.add) { add(d.add); if (el.classList.contains('big')) { el.textContent = `✓ ${t().added}`; } return; }
  if (d.inc) { cart[d.inc]++; save(); renderGrid(); return; }
  if (d.dec) { cart[d.dec] > 1 ? cart[d.dec]-- : delete cart[d.dec]; save(); renderGrid(); return; }
  if (d.rm) { delete cart[d.rm]; save(); renderGrid(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
document.addEventListener('change', e => {
  if (e.target.id === 'sort') { state.sort = e.target.value; renderGrid(); }
  // checkout: switching delivery/pickup or payment updates the form (address field, button text)
  if (e.target.form && e.target.form.id === 'coForm' && (e.target.name === 'ship' || e.target.name === 'pay')) { readForm(); renderCart(); }
});
document.addEventListener('submit', e => { if (e.target.id === 'coForm') { e.preventDefault(); submitOrder(); } });
$('q').addEventListener('input', e => { state.search = e.target.value; renderGrid(); });

// The carousel is created once; brand / language changes just give it new tiles.
initMenu();
const carousel = createCategoryCarousel($('c3d'), { onSelect: (key) => selectCat(key, true) });
renderAll();

// When Supabase is connected, the catalogue comes from the database (same shape as the local file).
if (LIVE) {
  loadSettings().then((s) => { applySettings(s); renderFoot(); renderCart(); }).catch(err => console.warn('Using default contact details.', err));
  loadProducts().then((rows) => {
    if (!rows || !rows.length) return;
    products.length = 0; products.push(...rows);
    renderAll();
  }).catch(err => console.warn('Using the local catalogue; Supabase products could not be loaded.', err));
}
