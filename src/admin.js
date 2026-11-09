// DAR admin panel (/admin): orders, messages, products (add/edit/photos), site settings.
// Login uses Supabase Auth (email + password). Only users listed in public.staff
// can see or change anything: the database's row level security enforces this,
// so even a logged-in non-staff account gets empty lists.
import { createClient } from '@supabase/supabase-js';
import './admin.css';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'dar-staff' } }) : null;
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = d => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
// Lebanese numbers -> international digits for wa.me / tel: (70123456 -> 96170123456)
const intl = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = d.slice(1); if (d.length <= 8) d = '961' + d; return d; };

const STATUS = [['new', 'New'], ['confirmed', 'Confirmed'], ['ready', 'Ready'], ['out_for_delivery', 'Out for delivery'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
const PAY = [['unpaid', 'Unpaid'], ['pending', 'Pending'], ['paid', 'Paid'], ['failed', 'Failed'], ['refunded', 'Refunded']];
const STOCK = [['in_stock', 'In stock'], ['low', 'Low'], ['out', 'Out of stock'], ['on_order', 'On order']];
const label = (list, v) => (list.find(x => x[0] === v) || [v, v])[1];

const S = { staff: null, tab: 'orders', orders: [], messages: [], products: [], categories: [], settings: {}, filter: 'open', q: '', open: null, edit: null, pq: '', pbrand: 'all' };
const SETTINGS = [['whatsapp', 'WhatsApp number for orders', 'International digits, e.g. 96179004108'], ['instagram', 'Instagram link', 'https://www.instagram.com/…'], ['facebook', 'Facebook link', 'https://www.facebook.com/…'], ['tiktok', 'TikTok link', 'https://www.tiktok.com/@…'], ['hours_en', 'Opening hours (English)', ''], ['hours_fr', 'Opening hours (French)', ''], ['hours_ar', 'Opening hours (Arabic)', '']];
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function toast(msg, kind = '') {
  const t = $('#toast'); t.textContent = msg; t.className = `a-toast on ${kind}`;
  clearTimeout(toast.h); toast.h = setTimeout(() => { t.className = 'a-toast'; }, 2600);
}
function beep() { try { const a = new AudioContext(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.18); } catch { /* no sound */ } }

// ---------- login ----------
function loginView(msg = '') {
  $('#app').innerHTML = `
    <div class="a-login">
      <form id="login" class="a-card">
        <div class="a-brand">${logo()}<span>Admin</span></div>
        ${db ? '' : '<p class="a-err">Supabase is not configured (.env.local missing).</p>'}
        <label>Email<input name="email" type="email" autocomplete="username" required /></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required /></label>
        ${msg ? `<p class="a-err">${esc(msg)}</p>` : ''}
        <button class="a-btn" type="submit">Sign in</button>
        <p class="a-note">DAR admins only.</p>
      </form>
    </div>`;
}
const logo = () => `<svg viewBox="0 0 34 56" aria-hidden="true"><circle cx="8" cy="10" r="6" fill="none" stroke="#ff5a1f" stroke-width="3"/><rect x="22" y="0" width="4.5" height="56" fill="#ff5a1f"/></svg><b>DAR</b>`;

async function start() {
  if (!db) return loginView();
  const { data: { session } } = await db.auth.getSession();
  if (!session) return loginView();
  const { data: staff } = await db.from('staff').select('name, role').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { await db.auth.signOut(); return loginView('This account does not have admin access.'); }
  S.staff = { ...staff, email: session.user.email };
  shell();
  await Promise.all([loadOrders(), loadMessages()]);
  render();
  live();
}

// ---------- data ----------
async function loadOrders() {
  const { data, error } = await db.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(300);
  if (error) return toast('Could not load orders: ' + error.message, 'bad');
  S.orders = data;
}
async function loadMessages() {
  const { data, error } = await db.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) return toast('Could not load messages: ' + error.message, 'bad');
  S.messages = data;
}
async function loadProducts() {
  const { data, error } = await db.from('products').select('id, brand_id, category_id, code, name, price_usd, price_max_usd, stock_status, active, image_url, popularity').order('popularity');
  if (error) return toast('Could not load products: ' + error.message, 'bad');
  S.products = data;
  if (!S.categories.length) { const c = await db.from('categories').select('id, name_en').order('sort'); S.categories = c.data || []; }
}
async function loadSettings() {
  const { data, error } = await db.from('site_settings').select('key, value');
  if (error) return toast('Could not load settings: ' + error.message, 'bad');
  S.settings = Object.fromEntries(data.map(r => [r.key, r.value]));
}
// New orders and messages arrive live (Supabase Realtime, staff only).
function live() {
  db.channel('staff-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async () => { await loadOrders(); beep(); toast('New order received', 'good'); render(); })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, async () => { await loadMessages(); beep(); toast('New message received', 'good'); render(); })
    .subscribe();
}

// ---------- layout ----------
function shell() {
  $('#app').innerHTML = `
    <header class="a-head"><div class="a-brand">${logo()}<span>Admin</span></div>
      <nav class="a-tabs" id="tabs"></nav>
      <div class="a-user"><span>${esc(S.staff.name)}</span><button class="a-link" data-act="logout">Sign out</button></div></header>
    <main class="a-main" id="main"></main>
    <aside class="a-panel" id="panel"></aside><div class="a-dim" data-act="close"></div>`;
}
function render() {
  const newOrders = S.orders.filter(o => o.status === 'new').length, newMsgs = S.messages.filter(m => !m.handled).length;
  $('#tabs').innerHTML = [['orders', 'Orders', newOrders], ['messages', 'Messages', newMsgs], ['products', 'Products', 0], ['settings', 'Settings', 0]]
    .map(([k, l, n]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}${n ? `<i>${n}</i>` : ''}</button>`).join('');
  $('#main').innerHTML = S.tab === 'orders' ? ordersView() : S.tab === 'messages' ? messagesView() : S.tab === 'products' ? productsView() : settingsView();
  document.body.classList.toggle('panel-open', Boolean(S.open || S.edit));
  $('#panel').innerHTML = S.open ? orderPanel(S.orders.find(o => o.id === S.open)) : S.edit ? productPanel(S.edit === 'new' ? null : S.products.find(p => p.id === S.edit)) : '';
}

// ---------- orders ----------
function ordersView() {
  const today = new Date().toDateString();
  const stats = [
    ['New', S.orders.filter(o => o.status === 'new').length],
    ['Today', S.orders.filter(o => new Date(o.created_at).toDateString() === today).length],
    ['Open', S.orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length],
    ['Completed (value)', money(S.orders.filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total_usd), 0))],
  ];
  const filters = [['open', 'Open'], ['all', 'All'], ...STATUS];
  const q = S.q.trim().toLowerCase();
  const list = S.orders.filter(o => (S.filter === 'all' || (S.filter === 'open' ? !['completed', 'cancelled'].includes(o.status) : o.status === S.filter))
    && (!q || `${o.ref} ${o.customer_name} ${o.customer_phone}`.toLowerCase().includes(q)));
  return `
    <section class="a-stats">${stats.map(([l, v]) => `<div class="a-stat"><b>${v}</b><span>${l}</span></div>`).join('')}</section>
    <div class="a-bar"><div class="a-chips">${filters.map(([k, l]) => `<button data-filter="${k}" class="${S.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <input class="a-search" id="oq" placeholder="Search order no., name or phone" value="${esc(S.q)}" /></div>
    ${list.length ? `<ul class="a-list">${list.map(o => `
      <li><button class="a-row" data-order="${o.id}">
        <span class="a-pill s-${o.status}">${label(STATUS, o.status)}</span>
        <span class="a-ref">${esc(o.ref)}</span>
        <span class="a-who"><b>${esc(o.customer_name)}</b><small>${esc(o.customer_phone)}</small></span>
        <span class="a-meta">${o.fulfilment === 'pickup' ? 'Pickup' : 'Delivery'} · ${o.payment_method === 'whish' ? 'Whish' : 'WhatsApp'}<small>${when(o.created_at)}</small></span>
        <span class="a-total">${money(o.total_usd)}<small class="p-${o.payment_status}">${label(PAY, o.payment_status)}</small></span>
      </button></li>`).join('')}</ul>` : '<p class="a-empty">No orders here yet.</p>'}`;
}
function orderPanel(o) {
  if (!o) return '';
  const wa = `https://wa.me/${intl(o.customer_phone)}?text=${encodeURIComponent(`Hello ${o.customer_name}, this is DAR Building Materials Shop about your order ${o.ref}.`)}`;
  return `
    <div class="a-pan-head"><div><small>Order</small><h3>${esc(o.ref)}</h3></div><button class="a-x" data-act="close" aria-label="Close">✕</button></div>
    <div class="a-pan-body">
      <section><h4>Customer</h4><p><b>${esc(o.customer_name)}</b><br>${esc(o.customer_phone)}</p>
        <p>${o.fulfilment === 'pickup' ? 'Pick up in store' : `Delivery: ${esc(o.address)}`}</p>
        ${o.notes ? `<p class="a-notes">“${esc(o.notes)}”</p>` : ''}
        <div class="a-actions"><a class="a-btn wa" href="${wa}" target="_blank" rel="noopener">WhatsApp customer</a><a class="a-btn ghost" href="tel:+${intl(o.customer_phone)}">Call</a></div></section>
      <section><h4>Items</h4><table class="a-items">${o.order_items.map(it => `<tr><td>${it.qty} ×</td><td>${esc(it.name)}<small>${esc(it.code || '')}</small></td><td>${money(it.line_total_usd)}</td></tr>`).join('')}
        <tr class="sub"><td></td><td>Subtotal</td><td>${money(o.subtotal_usd)}</td></tr></table></section>
      <form id="orderForm" data-id="${o.id}">
        <section><h4>Update</h4>
          <label>Status<select name="status">${STATUS.map(([k, l]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>Payment (${o.payment_method === 'whish' ? 'Whish' : 'on delivery / in store'})<select name="payment_status">${PAY.map(([k, l]) => `<option value="${k}" ${o.payment_status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label>Delivery fee (USD)<input name="delivery_fee_usd" type="number" min="0" step="0.5" value="${o.delivery_fee_usd ?? ''}" placeholder="0" /></label>
          <p class="a-total-line">Total <b>${money(o.total_usd)}</b></p>
          <button class="a-btn" type="submit">Save changes</button>
        </section>
      </form>
      <p class="a-note">Placed ${when(o.created_at)} · language ${o.lang.toUpperCase()}</p>
      <button class="a-link danger" data-act="delete" data-id="${o.id}">Delete this order</button>
    </div>`;
}
async function saveOrder(form) {
  const f = new FormData(form), fee = f.get('delivery_fee_usd');
  const patch = { status: f.get('status'), payment_status: f.get('payment_status'), delivery_fee_usd: fee === '' ? null : Number(fee) };
  const { error } = await db.from('orders').update(patch).eq('id', form.dataset.id);
  if (error) return toast('Not saved: ' + error.message, 'bad');
  await loadOrders(); render(); toast('Order updated', 'good');
}

// ---------- messages ----------
function messagesView() {
  return S.messages.length ? `<ul class="a-msgs">${S.messages.map(m => `
    <li class="a-card ${m.handled ? 'done' : ''}">
      <div class="a-msg-top"><b>${esc(m.name)}</b><span>${when(m.created_at)}</span></div>
      <p class="a-msg-sub">${esc(m.subject || '')} · ${esc(m.phone)} · ${m.lang.toUpperCase()}</p>
      <p class="a-msg-body">${esc(m.message)}</p>
      <div class="a-actions"><a class="a-btn wa" target="_blank" rel="noopener" href="https://wa.me/${intl(m.phone)}?text=${encodeURIComponent(`Hello ${m.name}, this is DAR Building Materials Shop replying to your message.`)}">Reply on WhatsApp</a>
        <button class="a-btn ghost" data-act="handled" data-id="${m.id}" data-val="${!m.handled}">${m.handled ? 'Mark as not handled' : 'Mark as handled'}</button></div>
    </li>`).join('')}</ul>` : '<p class="a-empty">No messages yet.</p>';
}

// ---------- products ----------
function productsView() {
  if (!S.products.length) { loadProducts().then(render); return '<p class="a-empty">Loading products…</p>'; }
  const q = S.pq.trim().toLowerCase();
  const list = S.products.filter(p => (S.pbrand === 'all' || p.brand_id === S.pbrand) && (!q || `${p.name} ${p.code}`.toLowerCase().includes(q)));
  return `
    <div class="a-bar"><div class="a-chips">${[['all', 'All'], ['total', 'TOTAL'], ['jadever', 'Jadever']].map(([k, l]) => `<button data-pbrand="${k}" class="${S.pbrand === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <input class="a-search" id="pq" placeholder="Search name or model code" value="${esc(S.pq)}" />
      <button class="a-btn" data-act="new-product">+ Add product</button></div>
    <p class="a-note">${list.length} products. Quick edit a row and press Save, or tap a name to edit everything (photo, category…). Prices are in USD.</p>
    <ul class="a-prods">${list.map(p => `
      <li class="a-card ${p.active ? '' : 'off'}"><form class="a-prod" data-pid="${esc(p.id)}">
        <div class="a-prod-pic">${p.image_url ? `<img src="${esc(p.image_url)}" alt="" loading="lazy" />` : '<span>No photo</span>'}</div>
        <button type="button" class="a-prod-name" data-act="edit-product" data-id="${esc(p.id)}"><b>${esc(p.name)}</b><small>${p.brand_id === 'total' ? 'TOTAL' : 'Jadever'} · ${esc(p.code || 'no code')} · edit</small></button>
        <label>Price<input name="price_usd" type="number" min="0" step="0.01" value="${p.price_usd}" required /></label>
        <label>Up to<input name="price_max_usd" type="number" min="0" step="0.01" value="${p.price_max_usd ?? ''}" placeholder="—" /></label>
        <label>Stock<select name="stock_status">${STOCK.map(([k, l]) => `<option value="${k}" ${p.stock_status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="a-check"><input name="active" type="checkbox" ${p.active ? 'checked' : ''} />On site</label>
        <button class="a-btn sm" type="submit">Save</button>
      </form></li>`).join('')}</ul>`;
}
async function saveProduct(form) {
  const f = new FormData(form), max = f.get('price_max_usd');
  const patch = { price_usd: Number(f.get('price_usd')), price_max_usd: max === '' ? null : Number(max), stock_status: f.get('stock_status'), active: f.get('active') === 'on' };
  if (patch.price_max_usd != null && patch.price_max_usd < patch.price_usd) return toast('"Up to" must be higher than the price.', 'bad');
  const { error } = await db.from('products').update(patch).eq('id', form.dataset.pid);
  if (error) return toast('Not saved: ' + error.message, 'bad');
  Object.assign(S.products.find(p => p.id === form.dataset.pid), patch);
  form.closest('li').classList.toggle('off', !patch.active);
  toast('Product saved', 'good');
}

// ---------- product editor (add / edit with photo upload) ----------
function productPanel(p) {
  const v = (k, d = '') => esc(p ? (p[k] ?? d) : d);
  return `
    <div class="a-pan-head"><div><small>${p ? 'Edit product' : 'New product'}</small><h3>${p ? esc(p.name) : 'Add a product'}</h3></div><button class="a-x" data-act="close" aria-label="Close">✕</button></div>
    <div class="a-pan-body"><form id="productForm" data-pid="${p ? esc(p.id) : ''}">
      <section><h4>Photo</h4>
        <div class="a-photo">${p?.image_url ? `<img src="${esc(p.image_url)}" alt="" />` : '<span>No photo yet</span>'}</div>
        <label>Upload a photo (JPG, PNG or WebP, max 3 MB)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label></section>
      <section><h4>Details</h4>
        <label>Brand<select name="brand_id">${[['total', 'TOTAL'], ['jadever', 'Jadever']].map(([k, l]) => `<option value="${k}" ${p?.brand_id === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Category<select name="category_id">${S.categories.map(c => `<option value="${c.id}" ${p?.category_id === c.id ? 'selected' : ''}>${esc(c.name_en)}</option>`).join('')}</select></label>
        <label>Product name<input name="name" required minlength="2" value="${v('name')}" /></label>
        <label>Model code<input name="code" value="${v('code')}" placeholder="e.g. TDLI200528" /></label>
        <div class="a-two"><label>Price (USD)<input name="price_usd" type="number" min="0" step="0.01" required value="${v('price_usd')}" /></label>
          <label>Up to (USD, optional)<input name="price_max_usd" type="number" min="0" step="0.01" value="${v('price_max_usd')}" /></label></div>
        <label>Stock<select name="stock_status">${STOCK.map(([k, l]) => `<option value="${k}" ${p?.stock_status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="a-check"><input name="active" type="checkbox" ${!p || p.active ? 'checked' : ''} />Show on the website</label>
        <button class="a-btn" type="submit">${p ? 'Save product' : 'Add product'}</button></section>
    </form></div>`;
}
async function saveProductFull(form) {
  const f = new FormData(form), btn = form.querySelector('button[type=submit]');
  const max = f.get('price_max_usd'), file = f.get('photo');
  const row = {
    brand_id: f.get('brand_id'), category_id: f.get('category_id'), name: String(f.get('name')).trim(),
    code: String(f.get('code') || '').trim().toUpperCase() || null, price_usd: Number(f.get('price_usd')),
    price_max_usd: max === '' ? null : Number(max), stock_status: f.get('stock_status'), active: f.get('active') === 'on',
  };
  if (row.price_max_usd != null && row.price_max_usd < row.price_usd) return toast('"Up to" must be higher than the price.', 'bad');
  const isNew = !form.dataset.pid;
  const id = form.dataset.pid || `${row.brand_id}-${slug(row.name)}${row.code ? '-' + slug(row.code) : ''}`;
  btn.disabled = true; btn.textContent = 'Saving…';
  if (file && file.size) {
    if (file.size > 3 * 1024 * 1024) { btn.disabled = false; btn.textContent = 'Save'; return toast('Photo is larger than 3 MB.', 'bad'); }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z]/g, '');
    const path = `${id}-${Date.now()}.${ext}`;
    const up = await db.storage.from('products').upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) { btn.disabled = false; btn.textContent = 'Save'; return toast('Photo not uploaded: ' + up.error.message, 'bad'); }
    row.image_url = db.storage.from('products').getPublicUrl(path).data.publicUrl;
  }
  let res;
  if (isNew) { row.id = id; row.popularity = 0; res = await db.from('products').insert(row); }
  else res = await db.from('products').update(row).eq('id', id);
  if (res.error) { btn.disabled = false; btn.textContent = 'Save'; return toast('Not saved: ' + (res.error.code === '23505' ? 'a product with this name and code already exists.' : res.error.message), 'bad'); }
  await loadProducts(); S.edit = null; render(); toast(isNew ? 'Product added' : 'Product saved', 'good');
}

// ---------- site settings ----------
function settingsView() {
  if (!Object.keys(S.settings).length) { loadSettings().then(render); return '<p class="a-empty">Loading settings…</p>'; }
  return `<form id="settingsForm" class="a-card a-settings">
    <h3>Website settings</h3><p class="a-note">These appear on the website (footer, contact page, WhatsApp buttons). Leave a link empty to hide it.</p>
    ${SETTINGS.map(([k, l, ph]) => `<label>${l}<input name="${k}" value="${esc(S.settings[k] || '')}" placeholder="${esc(ph)}" ${k === 'hours_ar' ? 'dir="rtl"' : ''} /></label>`).join('')}
    <button class="a-btn" type="submit">Save settings</button></form>`;
}
async function saveSettings(form) {
  const f = new FormData(form);
  const rows = SETTINGS.map(([k]) => ({ key: k, value: String(f.get(k) || '').trim() }));
  const wa = rows.find(r => r.key === 'whatsapp');
  wa.value = wa.value.replace(/\D/g, '');
  if (wa.value && (wa.value.length < 10 || wa.value.length > 15)) return toast('WhatsApp number: use international digits, e.g. 96179004108.', 'bad');
  for (const r of rows.filter(r => ['instagram', 'facebook', 'tiktok'].includes(r.key))) {
    if (r.value && !/^https:\/\//.test(r.value)) return toast(`${r.key}: the link must start with https://`, 'bad');
  }
  const { error } = await db.from('site_settings').upsert(rows);
  if (error) return toast('Not saved: ' + error.message, 'bad');
  await loadSettings(); render(); toast('Settings saved. The website uses them on the next page load.', 'good');
}

// ---------- events ----------
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-tab],[data-filter],[data-order],[data-act],[data-pbrand]');
  if (!el) return;
  const d = el.dataset;
  if (d.tab) { S.tab = d.tab; S.open = null; S.edit = null; return render(); }
  if (d.filter) { S.filter = d.filter; return render(); }
  if (d.pbrand) { S.pbrand = d.pbrand; return render(); }
  if (d.order) { S.open = d.order; return render(); }
  if (d.act === 'close') { S.open = null; S.edit = null; return render(); }
  if (d.act === 'new-product') { S.edit = 'new'; return render(); }
  if (d.act === 'edit-product') { S.edit = d.id; return render(); }
  if (d.act === 'logout') { await db.auth.signOut(); location.reload(); return; }
  if (d.act === 'handled') {
    const { error } = await db.from('contact_messages').update({ handled: d.val === 'true' }).eq('id', d.id);
    if (error) return toast('Not saved: ' + error.message, 'bad');
    await loadMessages(); render(); return;
  }
  if (d.act === 'delete') {
    const o = S.orders.find(x => x.id === d.id);
    if (!confirm(`Delete order ${o?.ref}? This cannot be undone.`)) return;
    const { error } = await db.from('orders').delete().eq('id', d.id);
    if (error) return toast('Not deleted: ' + error.message, 'bad');
    S.open = null; await loadOrders(); render(); toast('Order deleted');
  }
});
document.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'login') {
    const d = new FormData(f), btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Signing in…';
    const { error } = await db.auth.signInWithPassword({ email: d.get('email'), password: d.get('password') });
    if (error) return loginView(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
    return start();
  }
  if (f.id === 'orderForm') return saveOrder(f);
  if (f.id === 'productForm') return saveProductFull(f);
  if (f.id === 'settingsForm') return saveSettings(f);
  if (f.classList.contains('a-prod')) return saveProduct(f);
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'oq') { S.q = e.target.value; const pos = e.target.selectionStart; render(); const i = $('#oq'); i.focus(); i.setSelectionRange(pos, pos); }
  if (e.target.id === 'pq') { S.pq = e.target.value; const pos = e.target.selectionStart; render(); const i = $('#pq'); i.focus(); i.setSelectionRange(pos, pos); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (S.open || S.edit)) { S.open = null; S.edit = null; render(); } });

start();
