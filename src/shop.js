// DAR shop catalogue: /shop?brand=total|jadever|all&cat=..&lang=en|fr|ar
// Data: data/catalog-sakr.json (products) + data/photos.json (official brand photos).
import catalog from '../data/catalog-sakr.json';
import photos from '../data/photos.json';
import { SHOP } from './shop-i18n.js';
import { CAT_ICONS } from './cat-icons.js';
import { LIVE, loadProducts, placeOrder, loadSettings } from './api.js';
import { mountHeader } from './site-nav.js';
import { mountFooter } from './site-footer.js';
import { applySettings, ICONS, detailsHTML, doneHTML, orderMessage, validate, makeRef, waLink } from './checkout.js';
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
  search: q.get('q') || '', sort: 'popular',
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
  if (state.search) u.set('q', state.search);
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

// ---------- hero: the brand's name rising in, the brand switcher and a live search ----------
function brandItems() { return products.filter(p => state.brand === 'all' || p.brand === state.brand); }
function renderHero() {
  const tt = t(), b = state.brand, base = brandItems();
  const word = b === 'all' ? 'TOTAL · Jadever' : BRANDS[b].name;
  const nCats = new Set(base.map(p => p.cat)).size;
  const tabs = ['all', 'total', 'jadever'];
  $('hero').className = `sh-hero ${b}`;
  $('heroText').innerHTML = `
    ${HERO_ART[b]()}
    <a class="sh-back" href="/?lang=${state.lang}">${tt.back}</a>
    <p class="sh-kicker"><i></i>${b === 'all' ? tt.title : tt.partner}</p>
    <h1 aria-label="${word}" dir="ltr">${word.split(' ').map((w, i) => `<span class="ct-w" aria-hidden="true"><span class="hero-word" style="--i:${i + 2}"><span class="sh-word ${w === '·' ? 'dot' : ''}">${esc(w)}</span></span></span>`).join(' ')}</h1>
    <p class="sh-stats"><b data-count="${base.length}">0</b> ${tt.statProducts} <i></i> <b data-count="${nCats}">0</b> ${tt.statCats}</p>
    <div class="sh-tabs" role="tablist" style="--n:${tabs.indexOf(b)}">
      <span class="sh-tab-pill" aria-hidden="true"></span>
      ${tabs.map(k => `<button role="tab" aria-selected="${b === k}" data-brand="${k}" class="${b === k ? 'on' : ''} ${k}">${k === 'all' ? tt.allBrands : BRANDS[k].name}</button>`).join('')}
    </div>
    <label class="sh-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="shopSearch" type="search" autocomplete="off" placeholder="${esc(tt.search)}" aria-label="${esc(tt.search)}" value="${esc(state.search)}" /></label>`;
  countUp();
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

// One sticky bar of categories (with live counts) and the sort, above the grid.
function renderSide() {
  const tt = t();
  const base = products.filter(p => state.brand === 'all' || p.brand === state.brand);
  const counts = Object.fromEntries(CAT_ORDER.map(c => [c, base.filter(p => p.cat === c).length]));
  const chip = (key, icon, label, n, soon) => `<button class="sh-chip ${state.cat === key ? 'on' : ''} ${soon ? 'soon' : ''}" ${soon ? 'disabled' : `data-cat="${key}"`}>
      <i>${icon}</i><span>${label}</span><em>${soon ? tt.soonCat : n}</em></button>`;
  $('catrow').innerHTML = `<div class="sh-bar-in">
    <div class="sh-chips-wrap" id="chipsWrap">
    <button class="sh-arrow prev" data-chips="-1" aria-label="previous"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
    <div class="sh-chips" id="chips" role="toolbar" aria-label="${tt.categories}">
      ${chip('all', CAT_ICONS.all, tt.all, base.length, false)}
      ${CAT_ORDER.map(c => chip(c, CAT_ICONS[c], tt.cats[c], counts[c], !counts[c])).join('')}
    </div>
    <button class="sh-arrow next" data-chips="1" aria-label="next"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>
    </div>
    <div class="sh-sort" id="sortBox">
      <button class="sh-sort-btn" data-sort-toggle aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(tt.sort)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4m-3.5 3.5L17 4l3.5 3.5"/></svg><span>${tt.sorts[state.sort]}</span><i aria-hidden="true"></i></button>
      <ul class="sh-sort-menu" role="listbox">${Object.entries(tt.sorts).map(([k, v], i) => `<li><button role="option" aria-selected="${state.sort === k}" data-sort="${k}" class="${state.sort === k ? 'on' : ''}" style="--i:${i}">${v}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></button></li>`).join('')}</ul>
    </div>
  </div>`;
  const chips = $('chips'), on = chips.querySelector('.sh-chip.on');
  if (on && state.cat !== 'all') chips.scrollLeft += on.getBoundingClientRect().left - chips.getBoundingClientRect().left - chips.clientWidth / 2 + on.offsetWidth / 2;
  chips.addEventListener('scroll', chipEdges, { passive: true });
  chipEdges();
  // The first time, the row slides a little and back, to show there is more to scroll.
  if (!nudged && chips.scrollWidth > chips.clientWidth + 8 && !REDUCED) {
    nudged = true;
    setTimeout(() => { const d = state.lang === 'ar' ? -1 : 1; chips.scrollBy({ left: 90 * d, behavior: 'smooth' }); setTimeout(() => chips.scrollBy({ left: -90 * d, behavior: 'smooth' }), 650); }, 1400);
  }
}

// A gear outline as an SVG path: teeth around a circle.
function gearPath(r, teeth, depth) {
  const pts = [], step = (Math.PI * 2) / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * step;
    [[0, r], [step * .18, r + depth], [step * .5, r + depth], [step * .68, r]].forEach(([d, rr]) => pts.push(`${(Math.cos(a + d) * rr).toFixed(1)} ${(Math.sin(a + d) * rr).toFixed(1)}`));
  }
  return `M${pts.join(' L')} Z`;
}
// Pieces shared by the blueprint drawings: a faint grid, corner marks and a scan line.
const GRID = '<g class="sh-grid-lines"><path d="M0 40 H260 M0 80 H260 M0 120 H260 M0 160 H260 M0 200 H260 M40 0 V240 M80 0 V240 M120 0 V240 M160 0 V240 M200 0 V240"/></g><path class="corner" d="M4 18 V4 H18 M242 4 H256 V18 M256 222 V236 H242 M18 236 H4 V222"/><rect class="scan" x="0" y="0" width="260" height="26"/>';
// Sparks flying out from a point: each one is rotated to its own direction.
const sparks = (x, y, angles, cls = '') => `<g class="sparks ${cls}">${angles.map((a, k) => `<g transform="translate(${x} ${y}) rotate(${a})"><circle r="${1.4 + (k % 3) * .5}" style="--k:${k}"/></g>`).join('')}</g>`;
// Every drawn line gets pathLength="1", so it can be drawn in from 0 to 1 whatever its length.
const svg = (side, inner) => `<svg class="sh-art ${side}" viewBox="0 0 260 240" aria-hidden="true">${GRID}${inner.replace(/class="(d|dim)((?: [a-z-]+)*)"/g, (m, k, rest) => (rest.includes('ring') ? m : `${m} pathLength="1"`))}</svg>`;
const d = (delay, path, cls = '') => `<path class="d ${cls}" style="--d:${delay}s" d="${path}"/>`;

// Each brand has its own pair of drawings beside the title. They draw themselves line by
// line, then keep working.
const HERO_ART = {
  // All brands: a house going up under a crane, and a train of gears turning together.
  all: () => svg('left', `
    ${d(0, 'M30 206 H230')}
    ${d(.2, 'M60 206 V128 H170 V206')}
    ${d(.4, 'M52 128 H178 V120 H52 Z')}
    ${d(.6, 'M74 120 V82 H160 V120')}
    ${d(.8, 'M66 82 H168 V76 H66 Z', 'acc')}
    <rect class="win" x="82" y="146" width="28" height="24" style="--w:0"/><rect class="win" x="124" y="146" width="28" height="24" style="--w:1"/><rect class="win" x="88" y="92" width="62" height="20" style="--w:2"/>
    ${d(1, 'M82 146 H110 V170 H82 Z M124 146 H152 V170 H124 Z M88 92 H150 V112 H88 Z', 'f')}
    ${d(1.1, 'M198 206 V30 M190 206 V30 M190 30 H246 M190 30 L120 30 M198 46 L190 54 M198 70 L190 78 M198 94 L190 102 M198 118 L190 126 M198 142 L190 150 M198 166 L190 174', 'f')}
    ${d(1.2, 'M120 30 L198 14 L246 30 M198 14 V30')}
    <g class="hoist"><line class="cable" x1="132" y1="30" x2="132" y2="58"/><path class="d" style="--d:1.5s" d="M110 58 H154 V66 H110 Z"/></g>
    ${d(1.7, 'M30 222 H230 M30 216 V228 M230 216 V228', 'dim')}
    <text class="tx" x="104" y="236">DAR · 8.40 m</text>`) + svg('right', `
    <circle class="dim ring" style="--d:0s" cx="100" cy="112" r="70"/>
    <g class="ticks" style="--o:100px 112px">${Array.from({ length: 36 }, (_, k) => `<path d="M100 ${112 - 76} V${112 - (k % 3 ? 80 : 86)}" transform="rotate(${k * 10} 100 112)"/>`).join('')}</g>
    <g class="gear g1" style="--o:100px 112px"><path class="d" style="--d:.2s" d="${gearPath(48, 14, 9)}" transform="translate(100 112)"/><circle class="d" style="--d:.5s" cx="100" cy="112" r="16"/><path class="d f" style="--d:.6s" d="M100 96 V128 M84 112 H116 M89 101 L111 123 M111 101 L89 123"/></g>
    <g class="gear g2" style="--o:186px 64px"><path class="d" style="--d:.6s" d="${gearPath(28, 9, 8)}" transform="translate(186 64)"/><circle class="d" style="--d:.9s" cx="186" cy="64" r="9"/></g>
    <g class="gear g3" style="--o:192px 170px"><path class="d" style="--d:.9s" d="${gearPath(22, 8, 7)}" transform="translate(192 170)"/><circle class="d" style="--d:1.2s" cx="192" cy="170" r="7"/></g>
    <path class="dim" style="--d:1.5s" d="M100 112 L186 64 M100 112 L192 170"/>
    <circle class="node" cx="100" cy="112" r="3.5"/><circle class="node" cx="186" cy="64" r="3"/><circle class="node" cx="192" cy="170" r="3"/>
    <text class="tx" x="18" y="228">Ø 96 · 14T</text><text class="tx" x="200" y="22">9T</text>`),

  // TOTAL: a cordless drill (bit spinning, battery charging, speed dial sweeping) and an
  // angle grinder whose disc throws a fan of sparks.
  total: () => svg('left', `
    ${d(0, 'M70 70 H170 Q190 70 190 90 V100 Q190 118 170 118 H128 L120 150 H90 L98 118 H80 Q60 118 60 100 V88 Q60 70 70 70 Z')}
    <g class="batt">${d(.4, 'M86 150 H132 Q140 150 140 158 V182 Q140 190 132 190 H86 Q78 190 78 182 V158 Q78 150 86 150 Z')}
    <rect class="cell" x="88" y="162" width="12" height="18" style="--c:0"/><rect class="cell" x="103" y="162" width="12" height="18" style="--c:1"/><rect class="cell" x="118" y="162" width="12" height="18" style="--c:2"/></g>
    <circle class="click" cx="109" cy="150" r="20"/>
    <path class="flow" d="M109 150 V124 H150 V94 H190"/>
    <circle class="trig" cx="118" cy="128" r="5"/>
    ${d(.9, 'M190 80 H206 V108 H190')}
    <g class="chuck" style="--o:214px 94px">${d(1.1, 'M206 86 H222 V102 H206 Z')}${d(1.2, 'M210 86 V102 M214 86 V102 M218 86 V102', 'f')}</g>
    <g class="bit">${d(1.3, 'M222 94 H252')}${d(1.5, 'M226 90 L230 98 M234 90 L238 98 M242 90 L246 98', 'f spin')}</g>
    ${d(1.6, 'M100 84 H150 M100 94 H140', 'f')}
    ${sparks(254, 94, [-40, -20, 0, 20, 40, -60, 60])}
    <g class="gauge"><path class="d f" style="--d:1.8s" d="M32 56 A26 26 0 0 1 84 56"/><line class="needle" x1="58" y1="56" x2="58" y2="36"/><circle class="node" cx="58" cy="56" r="3"/></g>
    ${d(2, 'M60 214 H252 M60 208 V220 M252 208 V220', 'dim')}
    <text class="tx" x="140" y="232">P20S · 20V</text><text class="tx" x="36" y="76">RPM</text>`) + svg('right', `
    <g class="buzz">${d(0, 'M40 112 H140 Q154 112 154 126 V134 Q154 148 140 148 H40 Q30 148 30 138 V122 Q30 112 40 112 Z')}
    ${d(.3, 'M40 120 H128 M40 140 H128', 'f')}
    ${d(.5, 'M60 112 V96 H86 V112', 'f')}
    ${d(.6, 'M154 122 H170 V138 H154')}
    ${d(.8, 'M150 96 A50 50 0 0 1 230 96', '')}</g>
    <g class="disc" style="--o:190px 130px"><circle class="d" style="--d:.9s" cx="190" cy="130" r="40"/><path class="d f" style="--d:1.1s" d="M190 90 V170 M150 130 H230 M162 102 L218 158 M218 102 L162 158"/><circle class="d" style="--d:1.2s" cx="190" cy="130" r="8"/></g>
    <g class="bar">${d(1.2, 'M120 172 H250 V190 H120 Z')}${d(1.4, 'M130 172 L122 190 M146 172 L138 190 M162 172 L154 190 M226 172 L218 190 M242 172 L234 190', 'f')}</g>
    <path class="kerf" d="M190 172 V190"/>
    <ellipse class="heat" cx="192" cy="172" rx="16" ry="6"/>
    ${sparks(196, 170, [70, 82, 94, 106, 118, 130, 142, 76, 100, 124], 'fan')}
    ${sparks(196, 172, [160, 172, 184, 196, 208], 'fan back')}
    ${d(1.6, 'M150 186 H230 M150 180 V192 M230 180 V192', 'dim')}
    <text class="tx" x="168" y="206">Ø 115</text><text class="tx" x="36" y="176">11 000 rpm</text>`),

  // Jadever: a tape measure running out and back, and a spirit level whose bubble settles
  // while a wrench turns a bolt.
  jadever: () => svg('left', `
    ${d(0, 'M50 96 Q50 70 76 70 H118 Q140 70 140 96 V140 Q140 162 118 162 H76 Q50 162 50 140 Z')}
    <g class="reel" style="--o:95px 116px">${d(.4, 'M95 116 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0 M95 116 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0', 'f')}${d(.6, 'M95 98 V134 M77 116 H113', 'f')}</g>
    ${d(.7, 'M60 150 H80', 'acc')}
    <g class="blade"><rect class="tape" x="140" y="146" width="104" height="12" rx="1"/>${Array.from({ length: 26 }, (_, k) => `<path class="tick" d="M${144 + k * 4} 146 V${k % 5 ? 151 : 155}"/>`).join('')}<path class="d" style="--d:1s" d="M244 142 V162"/></g>
    <path class="mark" d="M246 132 L256 142 M256 132 L246 142"/>
    <g class="arrow"><path d="M140 136 H244 M140 132 V140 M244 132 V140"/></g>
    ${d(1.2, 'M140 176 H244 M140 170 V182 M244 170 V182', 'dim')}
    <text class="tx" x="164" y="196">5 m · 19 mm</text><text class="tx" x="64" y="56">MAGNETIC HOOK</text>`) + svg('right', `
    ${d(0, 'M24 60 H236 Q246 60 246 70 V86 Q246 96 236 96 H24 Q14 96 14 86 V70 Q14 60 24 60 Z')}
    ${d(.3, 'M104 66 H156 V90 H104 Z', 'f')}
    ${d(.4, 'M120 66 V90 M140 66 V90', 'f')}
    <ellipse class="bubble" cx="130" cy="78" rx="9" ry="6"/>
    <line class="laser" x1="246" y1="78" x2="330" y2="78"/><line class="laser l2" x1="14" y1="78" x2="-70" y2="78"/>
    ${d(.5, 'M36 66 V90 M224 66 V90', 'f')}
    <path class="torque" d="M100 170 A30 30 0 0 1 130 140" pathLength="1"/>
    <g class="bolt" style="--o:130px 170px">${d(.8, 'M130 150 L148 160 V180 L130 190 L112 180 V160 Z')}<circle class="d" style="--d:1s" cx="130" cy="170" r="7"/></g>
    <g class="wrench" style="--o:130px 170px">${d(1.1, 'M108 158 Q104 146 116 140 L124 152 Q130 156 136 152 L144 140 Q156 146 152 158 Q148 168 138 170 L138 172 L224 196 Q232 200 228 208 Q224 214 216 210 L130 182 Q114 178 108 158 Z')}</g>
    ${d(1.4, 'M14 112 H246 M14 106 V118 M246 106 V118', 'dim')}
    <text class="tx" x="104" y="126">600 mm · 0.5 mm/m</text>`),
};
let nudged = false;
// Shows the arrows (and fades) only on the sides where there are more categories to scroll to.
function chipEdges() {
  const c = $('chips'), w = $('chipsWrap'); if (!c || !w) return;
  const max = c.scrollWidth - c.clientWidth, x = Math.abs(c.scrollLeft), rtl = state.lang === 'ar';
  const start = x > 4, end = x < max - 4;
  w.classList.toggle('can-prev', rtl ? end : start);
  w.classList.toggle('can-next', rtl ? start : end);
}
addEventListener('resize', chipEdges);
function cardActions(p) {
  const tt = t(), n = cart[p.id];
  return n
    ? `<div class="sh-step" role="group" aria-label="${tt.added}"><button data-dec="${p.id}" aria-label="-">−</button><b>${n}</b><button data-inc="${p.id}" aria-label="+">+</button></div>`
    : `<button class="sh-add" data-add="${p.id}" aria-label="${esc(tt.add)}" title="${esc(tt.add)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`;
}
function renderGrid() {
  const tt = t(), list = visible();
  const catName = state.cat === 'all' ? tt.all : tt.cats[state.cat];
  $('tools').innerHTML = `
    <div class="s-cat-title"><h3>${catName}</h3><p class="s-count">${tt.count(list.length)}</p>${state.search.trim() ? `<button class="s-q" data-clear aria-label="${tt.clear}">“${esc(state.search.trim())}” ✕</button>` : ''}</div>`;
  $('grid').innerHTML = list.length ? list.map((p, i) => `
    <li class="sh-card ${p.brand}" data-id="${p.id}" style="--k:${i % 4}">
      <button class="sh-pic" data-open="${p.id}" aria-label="${esc(p.name)}">${pic(p)}<span class="sh-glow"></span></button>
      <div class="sh-info">
        <p class="s-meta"><span class="s-chip ${p.brand}">${BRANDS[p.brand].name}</span>${p.code ? `<span class="s-code">${esc(p.code)}</span>` : ''}</p>
        <h2><button data-open="${p.id}">${esc(p.name)}</button></h2>
        <div class="sh-buy"><p class="s-price">${priceHTML(p)}</p>${cardActions(p)}</div>
      </div>
    </li>`).join('')
    : `<li class="s-empty"><p>${tt.none}</p><button data-clear>${tt.clear}</button></li>`;
  revealCards();
}
// Cards rise in as they scroll into view.
const cardSeen = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); cardSeen.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' }) : null;
function revealCards() { document.querySelectorAll('.sh-card:not(.in)').forEach(el => (cardSeen ? cardSeen.observe(el) : el.classList.add('in'))); }
// The product photo flies from the card into the cart in the header.
function flyToCart(from) {
  const img = from?.querySelector('img'), target = document.querySelector('.h-cart');
  if (!img || !target || REDUCED) return;
  const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
  const ghost = img.cloneNode(); ghost.className = 'sh-fly';
  Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy - 80}px) scale(.55)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: .4 },
  ], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)' }).finished.then(() => ghost.remove());
  setTimeout(() => target.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 400 }), 650);
}

function renderFoot() { mountFooter($('foot'), state.lang); }

// Order drawer: step 'cart' -> 'details' (checkout form) -> 'done'.
const co = { step: 'cart', form: { ship: 'delivery', pay: 'whatsapp' }, done: null };
function cartItems() { return Object.entries(cart).map(([id, n]) => ({ p: products.find(x => x.id === id), n })).filter(x => x.p); }
function renderCart() {
  const tt = t(), items = cartItems();
  const total = items.reduce((s, x) => s + x.p.refPrice * x.n, 0);
  header.setCart(items.reduce((s, x) => s + x.n, 0));
  const title = co.step === 'details' ? tt.co.title : co.step === 'done' ? tt.co.doneTitle : tt.order;
  let body;
  if (co.step === 'done' && co.done) body = `<div class="s-dr-scroll">${doneHTML(tt, co.done, money)}</div>`;
  else if (!items.length) {
    co.step = 'cart';
    // Empty: a friendly picture, and the categories to start from.
    const popular = ['power', 'hand', 'garden', 'measure'];
    body = `<div class="sh-empty"><div class="sh-empty-art" aria-hidden="true"><span>${CAT_ICONS.all}</span><i></i><i></i><i></i></div><p>${tt.orderEmpty}</p>
      <div class="sh-empty-cats">${popular.map(c => `<button data-cat="${c}" data-close-after>${CAT_ICONS[c]}<span>${tt.cats[c]}</span></button>`).join('')}</div></div>`;
  }
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
        <button class="s-add big" data-add="${p.id}"><span class="sh-sheen"></span>${tt.add}</button>
        <a class="s-wa" target="_blank" rel="noopener" href="${waLink(`${tt.waAsk}\n${p.name}${p.code ? ` (${p.code})` : ''}`)}">${ICONS.whatsapp}${tt.askWa}</a>
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
function selectCat(key) {
  if (key === state.cat) return;
  state.cat = key;
  renderSide(); syncUrl();
  changeGrid(renderGrid);
  const top = $('catrow').getBoundingClientRect().top;
  if (top < 0) scrollTo({ top: scrollY + top - 70, behavior: REDUCED ? 'auto' : 'smooth' });
}

// Removing a line: it slides out and fades, the lines below close the gap, then the order updates.
function removeLine(el, id) {
  const li = el.closest('.s-lines li');
  const done = () => { delete cart[id]; save(); renderGrid(); };
  if (!li || REDUCED) return done();
  li.style.pointerEvents = 'none';
  li.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${state.lang === 'ar' ? -40 : 40}px) scale(.96)`, opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished
    .then(() => li.animate([{ height: `${li.offsetHeight}px`, marginBottom: getComputedStyle(li).marginBottom, paddingTop: getComputedStyle(li).paddingTop, paddingBottom: getComputedStyle(li).paddingBottom }, { height: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px' }], { duration: 240, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished)
    .then(done, done);
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
  header.setLang(state.lang);
  renderHero(); renderSide(); renderGrid(); renderFoot(); renderCart(); syncUrl();
}

// ---------- events (one listener, delegated) ----------
document.addEventListener('click', (e) => {
  if (!e.target.closest('#sortBox')) $('sortBox')?.classList.remove('open');
  const el = e.target.closest('button, .s-dim');
  if (!el) return;
  const d = el.dataset;
  if (el.id === 'dim' || d.close !== undefined) return closeAll();
  if (d.sortToggle !== undefined) { const box = $('sortBox'), open = !box.classList.contains('open'); box.classList.toggle('open', open); el.setAttribute('aria-expanded', open); return; }
  if (d.sort) { state.sort = d.sort; renderSide(); renderGrid(); return; }
  if (d.chips) { $('chips').scrollBy({ left: +d.chips * 320 * (state.lang === 'ar' ? -1 : 1), behavior: 'smooth' }); return; }
  if (d.checkout !== undefined) { co.step = 'details'; co.form.errors = null; renderCart(); return; }
  if (d.back !== undefined) { readForm(); co.step = 'cart'; renderCart(); return; }
  if (d.brand) { if (d.brand === state.brand) return; state.brand = d.brand; state.cat = 'all'; changeGrid(() => {}); renderAll(); return; }
  if (d.cat) { if (d.closeAfter !== undefined) closeAll(); selectCat(d.cat); return; }
  if (d.clear !== undefined) { state.search = ''; state.cat = 'all'; const box = $('shopSearch'); if (box) box.value = ''; renderSide(); renderGrid(); syncUrl(); return; }
  if (d.open) return openProduct(d.open);
  if (d.add) { flyToCart(el.closest('.sh-card, .s-mod-card')); add(d.add); if (el.classList.contains('big')) { el.textContent = `✓ ${t().added}`; } return; }
  if (d.inc) { cart[d.inc]++; save(); renderGrid(); return; }
  if (d.dec) { if (cart[d.dec] > 1) { cart[d.dec]--; save(); renderGrid(); } else removeLine(el, d.dec); return; }
  if (d.rm) removeLine(el, d.rm);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('sortBox')?.classList.remove('open'); closeAll(); } });
document.addEventListener('change', e => {
  // checkout: switching delivery/pickup or payment updates the form (address field, button text)
  if (e.target.form && e.target.form.id === 'coForm' && (e.target.name === 'ship' || e.target.name === 'pay')) { readForm(); renderCart(); }
});
document.addEventListener('submit', e => { if (e.target.id === 'coForm') { e.preventDefault(); submitOrder(); } });
// The dots in the hero light up around the pointer.
document.addEventListener('pointermove', (e) => {
  const h = $('hero'); if (!h) return;
  const r = h.getBoundingClientRect();
  if (e.clientY > r.bottom) return;
  h.style.setProperty('--mx', `${e.clientX - r.left}px`); h.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });
// The search in the hero filters the grid as you type.
document.addEventListener('input', e => { if (e.target.id === 'shopSearch') { state.search = e.target.value; renderGrid(); syncUrl(); } });

const header = mountHeader($('head'), {
  lang: state.lang, current: 'shop',
  onLang(l) { state.lang = l; renderAll(); },
  onCart() { document.body.classList.add('dr-open'); },
  onProduct: openProduct,
  // Search from the header: show every match in the grid.
  onQuery(text) { state.search = text; state.cat = 'all'; const box = $('shopSearch'); if (box) box.value = text; renderSide(); renderGrid(); syncUrl(); $('tools').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); },
});
renderAll();
// Links from the header on other pages: open the cart or a product straight away.
if (q.has('cart')) document.body.classList.add('dr-open');
if (q.has('open')) openProduct(q.get('open'));

// When Supabase is connected, the catalogue comes from the database (same shape as the local file).
if (LIVE) {
  loadSettings().then((s) => { applySettings(s); renderFoot(); renderCart(); }).catch(err => console.warn('Using default contact details.', err));
  loadProducts().then((rows) => {
    if (!rows || !rows.length) return;
    products.length = 0; products.push(...rows);
    renderAll();
  }).catch(err => console.warn('Using the local catalogue; Supabase products could not be loaded.', err));
}
