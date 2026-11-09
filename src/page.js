// Info pages: /about, /faq, /support, /contact (?lang=en|fr|ar).
// The page key comes from the data-page attribute on <main>. Header, menu and footer match the shop.
import { SHOP } from './shop-i18n.js';
import { PAGE } from './pages-i18n.js';
import { mountHeader, NAV } from './site-nav.js';
import { ICONS, CONTACT, waLink, applySettings } from './checkout.js';
import { mountFooter } from './site-footer.js';
import { CAT_ICONS } from './cat-icons.js';
import { LIVE, sendContactMessage, loadSettings, orderStatus } from './api.js';
import './shop.css';
import './page.css';

const q = new URLSearchParams(location.search);
const page = document.querySelector('[data-page]').dataset.page;
let lang = ['en', 'fr', 'ar'].includes(q.get('lang')) ? q.get('lang') : 'en';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAP = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Sfeir Raya Center, Beirut, Lebanon');
// Small illustrations for the "Why shop with DAR" tiles (decorative, no words of their own
// beyond brand names and the shop's place).
const WHY_ART = [
  `<div class="art-rings"><i></i><i></i><i></i><span class="art-sweep"></span></div><div class="art-seal"><svg viewBox="0 0 120 120"><defs><path id="sealPath" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs><text><textPath href="#sealPath">TOTAL · JADEVER · GENUINE · OFFICIAL · </textPath></text></svg><i>✓</i></div><div class="art-sparks"><i></i><i></i><i></i><i></i><i></i><i></i></div>`,
  `<div class="art-chat"><div class="m in"><span class="av"></span><span class="bub"><i class="ln"></i><i class="ln s"></i></span></div><div class="m out"><span class="bub"><img src="/products/total/drill.png" alt="" /><span><i class="ln"></i><i class="ln s"></i></span><b>✓</b></span></div><div class="m in t"><span class="av"></span><span class="bub dots"><i></i><i></i><i></i></span></div></div>`,
  `<div class="art-pay"><span class="opt wa">${ICONS.whatsapp}<i class="ln"></i><i class="radio"></i></span><span class="opt wh">${ICONS.card}<i class="ln"></i><i class="radio"></i></span><span class="go"><i class="ln"></i><b>✓</b></span><span class="cursor"></span></div>`,
  `<div class="art-route"><svg viewBox="0 0 300 140" preserveAspectRatio="xMidYMid meet">
    <defs><pattern id="blocks" width="26" height="26" patternUnits="userSpaceOnUse"><rect x="3" y="3" width="20" height="20" rx="4" fill="#f1f2f4"/></pattern></defs>
    <rect width="300" height="140" fill="url(#blocks)"/>
    <path class="sea" d="M0 0 H34 C 26 30, 40 60, 28 90 C 22 110, 30 128, 24 140 H0 Z"/>
    <path class="street" d="M0 60 H300 M150 0 V140 M60 0 C 70 50, 90 90, 80 140 M230 0 V140 M0 112 H300"/>
    <path class="road" id="route" d="M40 100 C 90 100, 100 40, 150 48 S 220 96, 262 46"/>
    <path class="go" d="M40 100 C 90 100, 100 40, 150 48 S 220 96, 262 46" pathLength="1"/>
    <g class="stops"><circle cx="40" cy="100" r="7"/><circle cx="104" cy="66" r="4"/><circle cx="196" cy="72" r="4"/></g>
    <g class="vanmove"><circle r="9"/><path d="M-4 -1 h5 l2.5 2 v2.5 h-7.5 z M-2.5 3.6 a1 1 0 1 0 0.01 0 M2.5 3.6 a1 1 0 1 0 0.01 0"/><animateMotion dur="5s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .25 1"><mpath href="#route"/></animateMotion></g>
    <g class="pinend" transform="translate(262 46)"><circle class="halo" r="14"/><path d="M0 -4 a10 10 0 0 1 10 10 c0 7 -10 16 -10 16 s-10 -9 -10 -16 a10 10 0 0 1 10 -10 z" transform="translate(0 -22)"/><circle cx="0" cy="-16" r="3.4" fill="#fff"/></g>
  </svg><span class="home">Sfeir Raya · Beirut</span></div>`,
];
// FAQ topics: [key, question indexes in pages-i18n.js]
const FAQ_GROUPS = [['order', [0, 6]], ['payment', [1, 7]], ['delivery', [2, 3]], ['products', [4, 5, 8]], ['business', [9]]];
const SUPPORT_ICON = { order: CAT_ICONS.all, warranty: CAT_ICONS.safety, returns: CAT_ICONS.accessories, advice: CAT_ICONS.hand, bulk: CAT_ICONS.construction };

const hero = (p) => `<section class="p-hero"><div class="p-hero-in"><p class="s-kicker">${p.kicker}</p><h1>${p.title}</h1><p class="p-intro">${p.intro}</p></div></section>`;

const RENDER = {
  about(p) {
    const words = (t, start = 1) => t.split(' ').map((w, i, all) => `<span class="ct-w" aria-hidden="true"><span class="hero-word" style="--i:${i + start}">${i === all.length - 1 ? `<span class="hero-flow">${w}</span>` : w}</span></span>`).join(' ');
    const title = t => `<h2 class="ab-h2" aria-label="${esc(t)}">${t.split(' ').map((w, i) => `<span class="ct-w" aria-hidden="true"><span class="hero-word" style="--i:${i}">${w}</span></span>`).join(' ')}<i class="ab-bar" aria-hidden="true"></i></h2>`;
    // The first letter of each value in flowing orange; Arabic letters join, so there the whole word flows.
    const initial = h => lang === 'ar' ? `<span class="hero-flow">${h}</span>` : `<span class="hero-flow ab-init">${h[0]}</span>${h.slice(1)}`;
    const valueIcons = [CAT_ICONS.safety, CAT_ICONS.measure, CAT_ICONS.hand, CAT_ICONS.power];
    const brands = [['total', 'TOTAL', ''], ['jadever', 'Jadever', ''], ['soon', '<img src="/brands/schneider.svg" alt="Schneider Electric" />', p.soon], ['soon', '<img src="/brands/abb.svg" alt="ABB" />', p.soon], ['soon', 'Parkside', p.soon]];
    const strip = brands.map(([k, n, s]) => `<span class="ab-logo ${k}">${n}${s ? `<em>${s}</em>` : ''}</span>`).join('');
    return `<section class="ct ab" id="ct"><div class="ct-dots" aria-hidden="true"></div>
      <div class="ab-hero">
        <div class="ab-hero-copy">
          <p class="ct-kicker"><i></i>${p.kicker}</p>
          <h1 aria-label="${esc(p.title)}">${words(p.title)}</h1>
          <p class="ct-lead">${p.intro}</p>
          <div class="ab-acts"><a class="ct-send" href="/shop?brand=all&lang=${lang}"><span class="ct-sheen"></span>${p.ctaShop} <span class="arw">→</span></a><a class="sp-ghost" href="/contact?lang=${lang}">${p.ctaContact} <span class="arw">→</span></a></div>
        </div>
        <figure class="ab-word" aria-label="${esc(p.wordNote)}">
          <span class="ab-ar" lang="ar">دار</span>
          <figcaption><b>dar</b> <i>/daːr/</i> · <em>${p.wordType}</em><span>${p.wordNote}</span></figcaption>
          <span class="ab-ring" aria-hidden="true"></span>
        </figure>
      </div>

      <div class="ab-story">
        <p class="ab-label">${p.storyH}</p>
        <p class="ab-reveal" id="abReveal">${p.story.join(' ').split(' ').map(w => `<span>${w}</span>`).join(' ')}</p>
      </div>

      <div class="ab-promise">
        <div class="ab-promise-in">
          <span class="ab-aurora" aria-hidden="true"><i></i><i></i><i></i></span>
          <svg class="ab-plan" viewBox="0 0 560 340" aria-hidden="true">
            <path class="" style="--d:0s" d="M20 300 H500" pathLength="1" />
            <path class="" style="--d:0.15s" d="M40 300 V292 H470 V300" pathLength="1" />
            <path class="" style="--d:0.3s" d="M70 292 V200 H330 V292" pathLength="1" />
            <path class="ab-fine" style="--d:0.5s" d="M70 212 H120 M250 212 H330" pathLength="1" />
            <path class="ab-fine" style="--d:0.55s" d="M70 228 H120 M250 228 H330" pathLength="1" />
            <path class="ab-fine" style="--d:0.6s" d="M70 244 H120 M250 244 H330" pathLength="1" />
            <path class="ab-fine" style="--d:0.65s" d="M70 260 H120 M250 260 H330" pathLength="1" />
            <path class="ab-fine" style="--d:0.7s" d="M70 276 H120 M250 276 H330" pathLength="1" />
            <path class="" style="--d:0.7s" d="M50 200 H360 V190 H50 Z" pathLength="1" />
            <path class="" style="--d:0.9s" d="M100 190 V112 H350 V190" pathLength="1" />
            <path class="ab-fine" style="--d:1.1s" d="M110 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.12s" d="M122 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.1400000000000001s" d="M134 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.1600000000000001s" d="M146 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.1800000000000002s" d="M158 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.2000000000000002s" d="M170 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.2200000000000002s" d="M182 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.2400000000000002s" d="M194 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.26s" d="M206 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.28s" d="M218 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.3s" d="M230 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.32s" d="M242 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.34s" d="M254 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.36s" d="M266 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.3800000000000001s" d="M278 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.4000000000000001s" d="M290 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.4200000000000002s" d="M302 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.4400000000000002s" d="M314 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.46s" d="M326 116 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.48s" d="M338 116 V186" pathLength="1" />
            <path class="" style="--d:1.3s" d="M86 112 H366 V102 H86 Z" pathLength="1" />
            <path class="ab-acc" style="--d:1.5s" d="M86 112 H366" pathLength="1" />
            <path class="" style="--d:1.6s" d="M140 102 L152 86 H196 L184 102" pathLength="1" />
            <path class="" style="--d:1.7000000000000002s" d="M200 102 L212 86 H256 L244 102" pathLength="1" />
            <path class="" style="--d:1.8s" d="M260 102 L272 86 H316 L304 102" pathLength="1" />
            <path class="" style="--d:1.0s" d="M40 292 V60 H72 V292" pathLength="1" />
            <path class="" style="--d:1.2s" d="M36 60 H76" pathLength="1" />
            <path class="ab-fine" style="--d:1.3s" d="M40 80 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.33s" d="M40 102 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.36s" d="M40 124 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.3900000000000001s" d="M40 146 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.42s" d="M40 168 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.45s" d="M40 190 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.48s" d="M40 212 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.51s" d="M40 234 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.54s" d="M40 256 H72" pathLength="1" />
            <path class="ab-fine" style="--d:1.57s" d="M40 278 H72" pathLength="1" />
            <path class="ab-glass" style="--d:1.8s" d="M150 128 H330 V172 H150 Z" pathLength="1" />
            <path class="ab-fine" style="--d:2.0s" d="M210 128 V172 M270 128 V172" pathLength="1" />
            <path class="ab-fine" style="--d:1.9s" d="M108 120 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.93s" d="M114 120 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.96s" d="M120 120 V186" pathLength="1" />
            <path class="ab-fine" style="--d:1.99s" d="M126 120 V186" pathLength="1" />
            <path class="ab-fine" style="--d:2.02s" d="M132 120 V186" pathLength="1" />
            <path class="ab-fine" style="--d:2.05s" d="M138 120 V186" pathLength="1" />
            <path class="ab-fine" style="--d:2.08s" d="M144 120 V186" pathLength="1" />
            <path class="ab-glass" style="--d:2.1s" d="M130 216 H200 V270 H130 Z" pathLength="1" />
            <path class="ab-fine" style="--d:2.2s" d="M165 216 V270" pathLength="1" />
            <path class="" style="--d:2.2s" d="M220 222 H246 V292 H220 Z" pathLength="1" />
            <path class="ab-fine" style="--d:2.3s" d="M240 256 V266" pathLength="1" />
            <path class="ab-glass" style="--d:2.3s" d="M262 216 H318 V270 H262 Z" pathLength="1" />
            <path class="ab-fine" style="--d:2.4s" d="M50 190 V170 H360 V190" pathLength="1" />
            <path class="ab-fine" style="--d:2.5s" d="M80 170 V190" pathLength="1" />
            <path class="ab-fine" style="--d:2.52s" d="M120 170 V190" pathLength="1" />
            <path class="ab-fine" style="--d:2.54s" d="M160 170 V190" pathLength="1" />
            <path class="ab-fine" style="--d:2.56s" d="M200 170 V190" pathLength="1" />
            <path class="ab-fine" style="--d:2.58s" d="M240 170 V190" pathLength="1" />
            <path class="ab-fine" style="--d:2.6s" d="M280 170 V190" pathLength="1" />
            <path class="ab-fine" style="--d:2.62s" d="M320 170 V190" pathLength="1" />
            <path class="" style="--d:2.5s" d="M360 292 V214 M440 292 V214 M350 214 H452" pathLength="1" />
            <path class="ab-fine" style="--d:2.6s" d="M366 208 V220" pathLength="1" />
            <path class="ab-fine" style="--d:2.62s" d="M378 208 V220" pathLength="1" />
            <path class="ab-fine" style="--d:2.64s" d="M390 208 V220" pathLength="1" />
            <path class="ab-fine" style="--d:2.66s" d="M402 208 V220" pathLength="1" />
            <path class="ab-fine" style="--d:2.68s" d="M414 208 V220" pathLength="1" />
            <path class="ab-fine" style="--d:2.7s" d="M426 208 V220" pathLength="1" />
            <path class="ab-fine" style="--d:2.72s" d="M438 208 V220" pathLength="1" />
            <path class="ab-glass" style="--d:2.7s" d="M372 292 Q 400 286 428 292" pathLength="1" />
            <path class="" style="--d:2.6s" d="M478 300 V250" pathLength="1" />
            <path class="" style="--d:2.7s" d="M478 252 C 452 252 450 220 466 214 C 462 194 494 190 496 210 C 514 212 512 246 478 252 Z" pathLength="1" />
            <path class="ab-dim" style="--d:2.9s" d="M40 318 H470 M40 312 V324 M470 312 V324" pathLength="1" />
            <path class="ab-dim" style="--d:3.0s" d="M520 300 V60 M514 300 H526 M514 60 H526" pathLength="1" />
            <path class="ab-dim" style="--d:3.2s" d="M330 150 L 400 60 H 470" pathLength="1" />
            <circle class="ab-node" cx="330" cy="150" r="4" />
            <text class="ab-tx" x="402" y="54">GLAZING · 3.6 m</text>
            <text class="ab-tx" x="232" y="334">8.40 m</text>
            <text class="ab-tx ab-v" x="532" y="184">7.20 m</text>
          </svg>
          <p class="ab-label">${p.promiseH}</p>
          <p class="ab-big" dir="ltr"><span>Results First.</span><span>Payment Follows.</span></p>
          <small>DAR Trading &amp; Contracting</small>
        </div>
      </div>

      <div class="ab-sec">
        ${title(p.valuesH)}
        <ol class="ab-principles">${p.values.map(([h, b], i) => `<li style="--d:${i * 0.12}s"><span class="ab-pic ab-ic-${i}">${valueIcons[i]}</span><h3>${initial(h)}</h3><p>${b}</p></li>`).join('')}</ol>
      </div>

      <div class="ab-sec ab-partners">
        ${title(p.partnersH)}<p class="ct-lead">${p.partnersBody}</p>
        <div class="ab-marquee" aria-label="TOTAL, Jadever, Schneider Electric, ABB, Parkside"><div class="ab-track" aria-hidden="true">${strip}${strip}${strip}${strip}</div></div>
      </div>

      <div class="ab-sec">
        ${title(p.whyH)}
        <div class="ab-bento">${p.why.map(([h, b], i) => `<article class="ab-tile ab-t${i}"><div class="ab-art" aria-hidden="true">${WHY_ART[i]}</div><div><h3>${h}</h3><p>${b}</p></div></article>`).join('')}</div>
      </div>
    </section>`;
  },

  faq(p) {
    const groups = FAQ_GROUPS.map(([key, ids]) => ({ key, items: ids.map(n => [n, ...p.items[n]]) }));
    const sp = PAGE[lang].support;
    return `<section class="ct fq" id="ct"><div class="ct-dots" aria-hidden="true"></div>
      <div class="sp-hero">
        <p class="ct-kicker"><i></i>${p.kicker}</p>
        <h1 aria-label="${esc(p.title2)}">${p.title2.split(' ').map((w, i, all) => `<span class="ct-w" aria-hidden="true"><span class="hero-word" style="--i:${i + 1}">${i === all.length - 1 ? `<span class="hero-flow">${w}</span>` : w}</span></span>`).join(' ')}</h1>
        <p class="ct-lead">${p.intro}</p>
        <label class="sp-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="fqSearch" type="search" autocomplete="off" placeholder="${p.searchPh}" aria-label="${p.searchPh}" /><kbd>/</kbd></label>
        <p class="sp-hint" id="fqCount">${p.count(p.items.length)}</p>
      </div>
      <div class="fq-body">
        <nav class="fq-nav" aria-label="${p.topics}">
          <p>${p.topics}</p>
          ${groups.map((g, i) => `<a href="#fq-${g.key}" data-fq-nav="${g.key}" class="${i === 0 ? 'on' : ''}"><span>${p.groups[g.key]}</span><em>${g.items.length}</em></a>`).join('')}
          <span class="fq-rail" aria-hidden="true"></span>
        </nav>
        <div class="fq-list">
          ${groups.map(g => `<section class="fq-group" id="fq-${g.key}" data-fq-group>
            <h2>${p.groups[g.key]}</h2>
            ${g.items.map(([n, q, a]) => `<article class="fq-item" id="q-${n + 1}" data-fq-text="${esc((q + ' ' + a).toLowerCase())}">
              <button type="button" class="fq-q" aria-expanded="false" aria-controls="qa-${n}"><b>${String(n + 1).padStart(2, '0')}</b><span data-fq-raw="${esc(q)}">${q}</span><i aria-hidden="true"></i></button>
              <div class="fq-a" id="qa-${n}" role="region"><div><p data-fq-raw="${esc(a)}">${a}</p>
                <div class="fq-tools"><span>${p.helpful}</span><button type="button" data-fq-vote="up" aria-label="${p.yes}">👍</button><button type="button" data-fq-vote="down" aria-label="${p.no}">👎</button>
                  <button type="button" class="fq-link" data-fq-copy="q-${n + 1}">${p.copy}</button></div></div></div>
            </article>`).join('')}
          </section>`).join('')}
          <p class="sp-none" id="fqNone" hidden>${sp.none}</p>
        </div>
      </div>
      <div class="sp-help">
        <div class="sp-help-in">
          <div class="sp-avatars" aria-hidden="true"><span>D</span><span>A</span><span>R</span><i></i></div>
          <div><h2>${sp.stillH}</h2><p>${sp.stillBody}</p></div>
          <div class="sp-help-acts">
            <a class="ct-send" href="${waLink(SHOP[lang].waAsk)}" target="_blank" rel="noopener"><span class="ct-sheen"></span>${ICONS.whatsapp}${sp.chat}</a>
            <a class="sp-ghost" href="/contact?lang=${lang}">${sp.form} <span class="arw">→</span></a>
          </div>
        </div>
      </div>
    </section>`;
  },

  support(p) {
    const steps = ['new', 'confirmed', 'ready', 'out_for_delivery', 'completed'];
    return `<section class="ct sp" id="ct"><div class="ct-dots" aria-hidden="true"></div>
      <div class="sp-hero">
        <p class="ct-kicker"><i></i>${p.kicker}</p>
        <h1 aria-label="${esc(p.title2)}">${p.title2.split(' ').map((w, i, all) => `<span class="ct-w" aria-hidden="true"><span class="hero-word" style="--i:${i + 1}">${i === all.length - 1 ? `<span class="hero-flow">${w}</span>` : w}</span></span>`).join(' ')}</h1>
        <p class="ct-lead">${p.intro}</p>
        <label class="sp-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="spSearch" type="search" autocomplete="off" placeholder="${p.searchPh}" aria-label="${p.searchPh}" /><kbd>/</kbd></label>
        <p class="sp-hint">${p.popular} ${p.cards.slice(0, 3).map(([k, h]) => `<button type="button" data-sp-q="${esc(h)}">${h}</button>`).join('')}</p>
      </div>

      <div class="sp-grid">
        <form class="sp-track" id="trackForm" novalidate>
          <div class="sp-track-head"><span class="sp-badge">${SUPPORT_ICON.order}</span><div><h2>${p.trackH}</h2><p>${p.trackBody}</p></div></div>
          <div class="sp-track-row">
            <input name="ref" placeholder="DAR-261105-AB12" dir="ltr" autocomplete="off" aria-label="${p.trackRef}" />
            <input name="phone" type="tel" placeholder="+961 70 123 456" dir="ltr" aria-label="${p.trackPhone}" />
            <button type="submit">${p.trackBtn}</button>
          </div>
          <ol class="sp-steps" id="trackSteps">${steps.map((k, i) => `<li data-step="${k}"><i>${i + 1}</i><span>${p.steps[k]}</span></li>`).join('')}</ol>
          <p class="sp-track-msg" id="trackMsg" aria-live="polite">${p.trackIdle}</p>
        </form>

        <div class="sp-topics" id="spTopics">
          ${p.cards.map(([k, h, b], i) => `<article class="sp-topic" data-sp-text="${esc((h + ' ' + b).toLowerCase())}" style="--d:${i * 0.08}s">
            <span class="sp-ic sp-ic-${k}">${SUPPORT_ICON[k]}</span>
            <h3>${h}</h3><p>${b}</p>
            <a href="${waLink(`${SHOP[lang].waAsk}\n${h}`)}" target="_blank" rel="noopener">${p.askWa} <span class="arw">→</span></a>
          </article>`).join('')}
        </div>
      </div>
      <p class="sp-none" id="spNone" hidden>${p.none}</p>

      <div class="sp-help">
        <div class="sp-help-in">
          <div class="sp-avatars" aria-hidden="true"><span>D</span><span>A</span><span>R</span><i></i></div>
          <div><h2>${p.stillH}</h2><p>${p.stillBody}</p></div>
          <div class="sp-help-acts">
            <a class="ct-send" href="${waLink(SHOP[lang].waAsk)}" target="_blank" rel="noopener"><span class="ct-sheen"></span>${ICONS.whatsapp}${p.chat}</a>
            <a class="sp-ghost" href="/contact?lang=${lang}">${p.form} <span class="arw">→</span></a>
          </div>
        </div>
      </div>
    </section>`;
  },

  contact(p) {
    const ic = { send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' };
    return `<section class="ct" id="ct"><div class="ct-dots" aria-hidden="true"></div>
      <div class="ct-in">
        <div class="ct-copy">
          <p class="ct-kicker"><i></i>${p.kicker}</p>
          <h1 aria-label="${esc(p.title2)}">${p.title2.split(' ').map((w, i, all) => `<span class="ct-w" aria-hidden="true"><span class="hero-word" style="--i:${i + 1}">${i === all.length - 1 ? `<span class="hero-flow">${w}</span>` : w}</span></span>`).join(' ')}</h1>
          <p class="ct-lead">${p.intro}</p>
          <form class="ct-form" id="contactForm" novalidate>
            <div class="ct-two">
              <label>${p.name}<input name="name" autocomplete="name" placeholder="${p.namePh}" /><span class="co-err" data-err="name"></span></label>
              <label>${p.phone}<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+961 70 123 456" dir="ltr" /><span class="co-err" data-err="phone"></span></label>
            </div>
            <fieldset class="ct-chips"><legend>${p.subject}</legend>
              ${p.subjects.map((x, i) => `<label class="ct-chip"><input type="radio" name="subject" value="${esc(x)}" ${i === 0 ? 'checked' : ''} /><span>${esc(x)}</span></label>`).join('')}
            </fieldset>
            <label>${p.message}<textarea name="message" rows="4" placeholder="${p.msgPh}"></textarea><span class="co-err" data-err="message"></span></label>
            <button class="ct-send" type="submit"><span class="ct-sheen"></span>${p.send} ${ic.send}</button>
            <p class="ct-note">${p.sentNote}</p>
          </form>
        </div>
        <div class="ct-phone" aria-hidden="true">
          <div class="ct-glow"></div>
          <div class="ct-device">
            <div class="ct-bar"><span class="ct-av">DAR</span><span><b>DAR Building Materials</b><small>${p.online}</small></span></div>
            <div class="ct-chat">
              <p class="ct-day">${p.today}</p>
              <div class="ct-in-msg">${p.greet}<time>10:40</time></div>
              <div class="ct-out" id="ctBubble"><div id="ctText"></div><time>10:42 <i class="ct-ticks">✓✓</i></time></div>
              <div class="ct-typing" id="ctTyping"><i></i><i></i><i></i></div>
            </div>
            <div class="ct-input"><span>${p.msgPh}</span><i>${ic.send}</i></div>
          </div>
        </div>
      </div>
      <div class="ct-cards">
        <a class="ct-card" href="${MAP}" target="_blank" rel="noopener"><span class="ct-pin"><i></i>${ICONS.pin}</span><span><small>${p.shopH}</small><b>${p.address}</b><em>${p.map} →</em></span></a>
        <div class="ct-card"><span class="ct-ic"><svg class="ct-clock" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><line class="ct-hand-h" x1="12" y1="12" x2="12" y2="8.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line class="ct-hand-m" x1="12" y1="12" x2="15.6" y2="12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span><span><small>${p.hoursH}</small><b>${CONTACT.hours?.[lang] || p.hours}</b></span></div>
        <a class="ct-card" href="${waLink(SHOP[lang].waAsk)}" target="_blank" rel="noopener"><span class="ct-ic wa"><i></i>${ICONS.whatsapp}</span><span><small>${p.waH}</small><b>${p.waBody}</b><em>${p.waBtn} →</em></span></a>
        <a class="ct-card" href="${CONTACT.instagram}" target="_blank" rel="noopener"><span class="ct-ic ig">${ICONS.instagram}</span><span><small>Instagram</small><b dir="ltr">@darshop.lb</b><em>${p.followH} →</em></span></a>
      </div>
    </section>`;
  },

};

function render() {
  const p = PAGE[lang][page], sh = SHOP[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = `${NAV[lang][page]} · DAR Building Materials Shop`;
  header.setLang(lang);
  $('main').innerHTML = RENDER[page](p);
  // The contact and support pages end with their own way to reach us, so they leave out the closing band.
  mountFooter($('foot'), lang, { cta: !['contact', 'support', 'faq'].includes(page) });
  if (page === 'faq') initFaq();
  if (page === 'about') { requestAnimationFrame(revealStory); watchTitles(); }
  if (page === 'contact') previewMessage();
}

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
  $('ctBubble')?.classList.add('sent');
  setTimeout(() => window.open(waLink(text), '_blank', 'noopener'), 650);
});
document.addEventListener('input', (e) => { const el = e.target.closest('label')?.querySelector('[data-err]'); if (el) el.textContent = ''; });
// Contact page: the WhatsApp bubble beside the form writes itself as the form is filled in.
let typingTimer = 0;
function previewMessage() {
  const form = $('contactForm'), box = $('ctText'); if (!form || !box) return;
  const p = PAGE[lang].contact, f = new FormData(form), v = k => esc((f.get(k) || '').toString().trim());
  const lines = [`<b>${v('subject')}</b>`];
  if (v('name')) lines.push(`${p.name}: ${v('name')}`);
  if (v('phone')) lines.push(`<span dir="ltr">${v('phone')}</span>`);
  if (v('message')) lines.push(`<span class="ct-msg">${v('message').replace(/\n/g, '<br>')}</span>`);
  box.innerHTML = lines.join('<br>');
  $('ctBubble').classList.toggle('on', true);
  const typing = $('ctTyping'); typing.classList.add('on'); clearTimeout(typingTimer); typingTimer = setTimeout(() => typing.classList.remove('on'), 900);
}
document.addEventListener('input', (e) => { if (e.target.closest('#contactForm')) previewMessage(); });
document.addEventListener('change', (e) => { if (e.target.closest('#contactForm')) previewMessage(); });

const header = mountHeader($('head'), { lang, current: page, onLang(l) { lang = l; history.replaceState(null, '', `?lang=${lang}`); render(); } });
render();
if (LIVE) loadSettings().then((st) => { applySettings(st); render(); }).catch(err => console.warn('Using default contact details.', err));

// Contact page: the dots under the pointer light up in orange, as in the home page's hero.
document.addEventListener('pointermove', (e) => {
  const ct = document.getElementById('ct'); if (!ct) return;
  const r = ct.getBoundingClientRect();
  ct.style.setProperty('--mx', `${e.clientX - r.left}px`); ct.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });

// Support page: search filters the help topics as you type.
document.addEventListener('input', (e) => {
  if (e.target.id !== 'spSearch') return;
  const words = e.target.value.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  document.querySelectorAll('#spTopics [data-sp-text]').forEach((el) => {
    const hit = words.every(w => el.dataset.spText.includes(w));
    el.classList.toggle('sp-hide', !hit); if (hit) shown++;
  });
  $('spNone').hidden = shown > 0;
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sp-q]'); if (!b) return;
  const input = $('spSearch'); input.value = b.dataset.spQ; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && $('spSearch') && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { e.preventDefault(); e.stopImmediatePropagation(); $('spSearch').focus(); }
}, true);
// Support page: order tracking. With Supabase it shows the order's real progress; without it,
// the order number goes to the team on WhatsApp.
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'trackForm') return;
  e.preventDefault();
  const p = PAGE[lang].support, f = new FormData(e.target), ref = (f.get('ref') || '').toString().trim().toUpperCase(), phone = (f.get('phone') || '').toString().trim();
  const msg = $('trackMsg'), steps = [...document.querySelectorAll('#trackSteps li')];
  e.target.classList.add('on');
  steps.forEach(li => li.classList.remove('done', 'now', 'x'));
  if (!/^DAR-\w+-\w+$/.test(ref)) { msg.textContent = p.trackBadRef; msg.className = 'sp-track-msg err'; return; }
  msg.textContent = p.trackLooking; msg.className = 'sp-track-msg';
  let order = null;
  try { order = await orderStatus(ref, phone); } catch {}
  if (!LIVE) { msg.innerHTML = `${p.trackOffline} <a href="${waLink(`${SHOP[lang].waAsk}\n${ref}`)}" target="_blank" rel="noopener">${p.askWa} →</a>`; return; }
  if (!order) { msg.textContent = p.trackNotFound; msg.className = 'sp-track-msg err'; return; }
  if (order.status === 'cancelled') { msg.textContent = p.trackCancelled; msg.className = 'sp-track-msg err'; return; }
  const at = steps.findIndex(li => li.dataset.step === order.status);
  steps.forEach((li, i) => setTimeout(() => li.classList.add(i < at ? 'done' : i === at ? 'now' : 'x'), i * 180));
  msg.textContent = `${ref} · ${p.steps[order.status]}`; msg.className = 'sp-track-msg ok';
});

// ---------- FAQ page ----------
const markUp = (text, words) => {
  let out = esc(text);
  for (const w of words) out = out.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  return out;
};
function openFaq(item, open) {
  item.classList.toggle('open', open);
  item.querySelector('.fq-q').setAttribute('aria-expanded', open);
}
function initFaq() {
  const hash = location.hash.slice(1), target = hash ? document.getElementById(hash) : null;
  if (target?.classList.contains('fq-item')) { openFaq(target, true); setTimeout(() => target.scrollIntoView({ block: 'center' }), 300); }
  else { const first = document.querySelector('.fq-item'); if (first) openFaq(first, true); }
  // The topic list follows the reading position, with a bar gliding to the current topic.
  const links = [...document.querySelectorAll('[data-fq-nav]')], rail = document.querySelector('.fq-rail');
  const mark = (key) => {
    links.forEach(a => a.classList.toggle('on', a.dataset.fqNav === key));
    const on = links.find(a => a.dataset.fqNav === key);
    if (on && rail) { rail.style.transform = `translateY(${on.offsetTop}px)`; rail.style.height = `${on.offsetHeight}px`; }
  };
  mark(links[0]?.dataset.fqNav);
  const seen = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) mark(e.target.id.slice(3)); }), { rootMargin: '-35% 0px -60% 0px' });
  document.querySelectorAll('[data-fq-group]').forEach(g => seen.observe(g));
}
document.addEventListener('click', (e) => {
  const q = e.target.closest('.fq-q');
  if (q) { const item = q.closest('.fq-item'); openFaq(item, !item.classList.contains('open')); history.replaceState(null, '', `?lang=${lang}#${item.id}`); return; }
  const vote = e.target.closest('[data-fq-vote]');
  if (vote) { const tools = vote.closest('.fq-tools'); tools.classList.add('voted'); tools.querySelector('span').textContent = PAGE[lang].faq.thanks; vote.classList.add('picked'); return; }
  const copy = e.target.closest('[data-fq-copy]');
  if (copy) {
    const url = `${location.origin}/faq?lang=${lang}#${copy.dataset.fqCopy}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    copy.textContent = PAGE[lang].faq.copied; copy.classList.add('done');
    setTimeout(() => { copy.textContent = PAGE[lang].faq.copy; copy.classList.remove('done'); }, 1600);
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'fqSearch') return;
  const p = PAGE[lang].faq, words = e.target.value.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  let shown = 0;
  document.querySelectorAll('.fq-item').forEach((item) => {
    const hit = words.every(w => item.dataset.fqText.includes(w));
    item.classList.toggle('sp-hide', !hit);
    item.querySelectorAll('[data-fq-raw]').forEach(el => { el.innerHTML = words.length ? markUp(el.dataset.fqRaw, words) : esc(el.dataset.fqRaw); });
    if (hit) { shown++; if (words.length) openFaq(item, true); }
  });
  document.querySelectorAll('[data-fq-group]').forEach(g => g.classList.toggle('sp-hide', !g.querySelector('.fq-item:not(.sp-hide)')));
  $('fqNone').hidden = shown > 0;
  $('fqCount').textContent = words.length ? p.found(shown) : p.count(p.items.length);
});
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && $('fqSearch') && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { e.preventDefault(); e.stopImmediatePropagation(); $('fqSearch').focus(); }
}, true);

// About page: the story lights up word by word as it scrolls through the screen.
function revealStory() {
  const el = $('abReveal'); if (!el) return;
  const r = el.getBoundingClientRect(), words = el.children;
  const k = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
  const lit = Math.round(k * words.length);
  for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', i < lit);
}
addEventListener('scroll', revealStory, { passive: true });
addEventListener('resize', revealStory);

// About page: section titles rise in when they scroll into view.
function watchTitles() {
  const seen = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); } }), { threshold: 0.4 });
  document.querySelectorAll('.ab-h2:not(.in), .ab-promise-in:not(.in)').forEach(el => seen.observe(el));
}
