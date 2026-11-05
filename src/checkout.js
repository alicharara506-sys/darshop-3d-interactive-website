// Footer + checkout for the DAR shop.
// Checkout: cart -> details (name, phone, delivery or pickup, payment) -> done.
// Payment: "Order on WhatsApp" (pay on delivery / in store) or "Pay online with Whish".
// PROTOTYPE: real Whish payments need DAR's Whish merchant account and a small
// server to create the payment; until then the Whish step shows a confirmation
// screen and no money is taken.

import { companyLinksHTML } from './site-nav.js';

// Shop contact details. Fill in the missing ones before launch.
export const CONTACT = {
  whatsapp: '',                                        // e.g. '96179004108' (not confirmed yet)
  instagram: 'https://www.instagram.com/darshop.lb/',  // @darshop.lb
  facebook: '',                                        // page URL not known yet
  tiktok: '',                                          // profile URL not known yet
};

export const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.3" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.5V21h3z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.9c-1.4.1-2.6-.3-3.9-1.1v5.6c0 4.1-3.7 6.6-7.3 5.3-2.4-.9-3.8-3.2-3.5-5.8.4-3.1 3.3-5.1 6.4-4.6v3.1c-.4-.1-.8-.2-1.2-.1-1.5.1-2.6 1.4-2.4 2.9.1 1.3 1.3 2.3 2.6 2.2 1.4-.1 2.4-1.2 2.4-2.7V3h3z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.8l5.1-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.2l-.5-.4z"/></svg>',
  card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 10h19" stroke="currentColor" stroke-width="2"/><path d="M6 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

export const waLink = text => `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;
const social = (key, label) => CONTACT[key]
  ? `<a class="f-soc ${key}" href="${CONTACT[key]}" target="_blank" rel="noopener" aria-label="${label}">${ICONS[key]}</a>`
  : `<a class="f-soc ${key} pending" href="#" onclick="return false" aria-label="${label}" title="Link coming soon">${ICONS[key]}</a>`;

export function footerHTML(tt, lang) {
  const f = tt.foot;
  return `
  <div class="f-top">
    <div class="f-brand">
      <a class="f-logo" href="/?lang=${lang}" aria-label="DAR Building Materials Shop">
        <svg viewBox="0 0 34 56" aria-hidden="true"><circle cx="8" cy="10" r="6" fill="none" stroke="#ff5a1f" stroke-width="3"/><rect x="22" y="0" width="4.5" height="56" fill="#ff5a1f"/></svg>
        <span><b>DAR</b><small>Building Materials <em>Shop</em></small></span>
      </a>
      <p class="f-tag">${f.tagline}</p>
      <p class="f-partners"><span>${f.partners}</span><i class="t">TOTAL</i><i class="j">Jadever</i></p>
      <div class="f-socials">${social('instagram', 'Instagram')}${social('facebook', 'Facebook')}${social('tiktok', 'TikTok')}</div>
    </div>
    <nav class="f-col"><h4>${f.shop}</h4>
      <a href="/shop.html?brand=total&lang=${lang}">${f.shopTotal}</a>
      <a href="/shop.html?brand=jadever&lang=${lang}">${f.shopJadever}</a>
      <a href="/shop.html?brand=all&cat=power&lang=${lang}">${tt.cats.power}</a>
      <a href="/shop.html?brand=all&cat=hand&lang=${lang}">${tt.cats.hand}</a>
      <a href="/shop.html?brand=all&cat=garden&lang=${lang}">${tt.cats.garden}</a>
    </nav>
    ${companyLinksHTML(lang)}
    <div class="f-col"><h4>${f.visit}</h4>
      <p class="f-row">${ICONS.pin}<span>${f.address}</span></p>
      <p class="f-row">${ICONS.clock}<span>${f.hours}</span></p>
      <a class="f-row f-wa" href="${waLink(tt.waAsk)}" target="_blank" rel="noopener">${ICONS.whatsapp}<span>${f.chat}</span></a>
    </div>
    <div class="f-col"><h4>${f.pay}</h4>
      <p class="f-row">${ICONS.whatsapp}<span>${f.payWa}</span></p>
      <p class="f-row">${ICONS.card}<span>${f.payWhish}</span></p>
      <p class="f-row">${ICONS.pin}<span>${f.payStore}</span></p>
    </div>
  </div>
  <div class="f-bottom"><p>© ${new Date().getFullYear()} DAR Building Materials Shop · ${f.rights}</p><p class="s-proto">${tt.proto}</p></div>`;
}

// ---------- checkout (inside the order drawer) ----------
export function makeRef() {
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  return `DAR-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function detailsHTML(tt, form, total, money) {
  const c = tt.co, v = k => (form[k] || '').replace(/"/g, '&quot;');
  const err = k => form.errors?.[k] ? `<span class="co-err">${form.errors[k]}</span>` : '';
  return `
  <form class="co" id="coForm" novalidate>
    <button type="button" class="co-back" data-back>${c.back}</button>
    <h4>${c.contact}</h4>
    <label>${c.name}<input name="name" autocomplete="name" value="${v('name')}" />${err('name')}</label>
    <label>${c.phone}<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+961 70 123 456" value="${v('phone')}" />${err('phone')}</label>
    <h4>${c.receive}</h4>
    <div class="co-opts">
      <label class="co-opt"><input type="radio" name="ship" value="delivery" ${form.ship !== 'pickup' ? 'checked' : ''} /><span><b>${c.delivery}</b><small>${c.deliveryHint}</small></span></label>
      <label class="co-opt"><input type="radio" name="ship" value="pickup" ${form.ship === 'pickup' ? 'checked' : ''} /><span><b>${c.pickup}</b><small>${c.pickupHint}</small></span></label>
    </div>
    <label class="co-addr ${form.ship === 'pickup' ? 'hide' : ''}">${c.address}<textarea name="address" rows="2" autocomplete="street-address" placeholder="${c.addressPh}">${form.address || ''}</textarea>${err('address')}</label>
    <h4>${c.payHow}</h4>
    <div class="co-opts">
      <label class="co-opt pay wa"><input type="radio" name="pay" value="whatsapp" ${form.pay !== 'whish' ? 'checked' : ''} /><span>${ICONS.whatsapp}<b>${c.payWa}</b><small>${c.payWaHint}</small></span></label>
      <label class="co-opt pay whish"><input type="radio" name="pay" value="whish" ${form.pay === 'whish' ? 'checked' : ''} /><span>${ICONS.card}<b>${c.payWhish}</b><small>${c.payWhishHint}</small></span></label>
    </div>
    <label>${c.notes}<textarea name="notes" rows="2">${form.notes || ''}</textarea></label>
    <div class="co-sum"><span>${tt.total}</span><b>$${money(total)}</b></div>
    <button class="co-submit ${form.pay === 'whish' ? 'whish' : 'wa'}" type="submit">${form.pay === 'whish' ? c.submitWhish.replace('{t}', '$' + money(total)) : c.submitWa}</button>
    <p class="s-note">${tt.note}</p>
  </form>`;
}

export function doneHTML(tt, done, money) {
  const c = tt.co;
  if (done.pay === 'whish') return `
    <div class="co-done">
      <div class="co-badge whish">${ICONS.card}</div>
      <h4>${c.whishTitle}</h4>
      <p>${c.whishBody.replace('{t}', '$' + money(done.total))}</p>
      <p class="co-ref">${c.ref}: <b>${done.ref}</b></p>
      <p class="co-proto">${c.whishProto}</p>
      <button class="co-submit" data-close>${c.continue}</button>
    </div>`;
  return `
    <div class="co-done">
      <div class="co-badge wa">${ICONS.whatsapp}</div>
      <h4>${c.waTitle}</h4>
      <p>${c.waBody}</p>
      <p class="co-ref">${c.ref}: <b>${done.ref}</b></p>
      <a class="s-send" href="${done.link}" target="_blank" rel="noopener">${c.waAgain}</a>
      <button class="co-plain" data-close>${c.continue}</button>
    </div>`;
}

export function orderMessage(tt, items, total, form, ref, money) {
  const c = tt.co;
  return [
    `${tt.waIntro} (${ref})`,
    ...items.map(({ p, n }) => `• ${n} × ${p.name}${p.code ? ` (${p.code})` : ''} – $${money(p.refPrice * n)}`),
    `${tt.total}: $${money(total)}`,
    '',
    `${c.name}: ${form.name}`,
    `${c.phone}: ${form.phone}`,
    form.ship === 'pickup' ? `${c.pickup}` : `${c.delivery}: ${form.address}`,
    `${c.payHow}: ${form.pay === 'whish' ? c.payWhish : c.payWa}`,
    form.notes ? `${c.notes}: ${form.notes}` : '',
  ].filter(Boolean).join('\n');
}

export function validate(tt, form) {
  const c = tt.co, e = {};
  if (!form.name || form.name.trim().length < 2) e.name = c.errName;
  if (!/^\+?[0-9\s-]{7,16}$/.test((form.phone || '').trim())) e.phone = c.errPhone;
  if (form.ship !== 'pickup' && (!form.address || form.address.trim().length < 5)) e.address = c.errAddress;
  return e;
}
