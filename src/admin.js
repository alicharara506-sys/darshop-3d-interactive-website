// DAR staff dashboard (admin.html): orders, contact messages, products.
// Login uses Supabase Auth (email + password). Only users listed in public.staff
// can see or change anything: the database's row level security enforces this,
// so even a logged-in non-staff account gets empty lists.
import { createClient } from '@supabase/supabase-js';
import './admin.css';

const URL = import.meta.env.VITE_SUPABASE_URL, KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
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

const S = { staff: null, tab: 'orders', orders: [], messages: [], products: [], filter: 'open', q: '', open: null, pq: '', pbrand: 'all' };

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
        <div class="a-brand">${logo()}<span>Staff dashboard</span></div>
        ${db ? '' : '<p class="a-err">Supabase is not configured (.env.local missing).</p>'}
        <label>Email<input name="email" type="email" autocomplete="username" required /></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required /></label>
        ${msg ? `<p class="a-err">${esc(msg)}</p>` : ''}
        <button class="a-btn" type="submit">Sign in</button>
        <p class="a-note">For DAR staff only. Accounts are created by the shop admin.</p>
      </form>
    </div>`;
}
const logo = () => `<svg viewBox="0 0 34 56" aria-hidden="true"><circle cx="8" cy="10" r="6" fill="none" stroke="#ff5a1f" stroke-width="3"/><rect x="22" y="0" width="4.5" height="56" fill="#ff5a1f"/></svg><b>DAR</b>`;

async function start() {
  if (!db) return loginView();
  const { data: { session } } = await db.auth.getSession();
  if (!session) return loginView();
  const { data: staff } = await db.from('staff').select('name, role').eq('user_id', session.user.id).maybeSingle();
  if (!staff) { await db.auth.signOut(); return loginView('This account is not a DAR staff account.'); }
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
    <header class="a-head"><div class="a-brand">${logo()}<span>Staff</span></div>
      <nav class="a-tabs" id="tabs"></nav>
      <div class="a-user"><span>${esc(S.staff.name)}</span><button class="a-link" data-act="logout">Sign out</button></div></header>
    <main class="a-main" id="main"></main>
    <aside class="a-panel" id="panel"></aside><div class="a-dim" data-act="close"></div>`;
}
function render() {
  const newOrders = S.orders.filter(o => o.status === 'new').length, newMsgs = S.messages.filter(m => !m.handled).length;
  $('#tabs').innerHTML = [['orders', 'Orders', newOrders], ['messages', 'Messages', newMsgs], ['products', 'Products', 0]]
    .map(([k, l, n]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}${n ? `<i>${n}</i>` : ''}</button>`).join('');
  $('#main').innerHTML = S.tab === 'orders' ? ordersView() : S.tab === 'messages' ? messagesView() : productsView();
  document.body.classList.toggle('panel-open', Boolean(S.open));
  $('#panel').innerHTML = S.open ? orderPanel(S.orders.find(o => o.id === S.open)) : '';
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
      <input class="a-search" id="pq" placeholder="Search name or model code" value="${esc(S.pq)}" /></div>
    <p class="a-note">${list.length} products. Change a value, then press Save on that row. Prices are in USD.</p>
    <ul class="a-prods">${list.map(p => `
      <li class="a-card ${p.active ? '' : 'off'}"><form class="a-prod" data-pid="${esc(p.id)}">
        <div class="a-prod-pic">${p.image_url ? `<img src="${esc(p.image_url)}" alt="" loading="lazy" />` : '<span>No photo</span>'}</div>
        <div class="a-prod-name"><b>${esc(p.name)}</b><small>${p.brand_id === 'total' ? 'TOTAL' : 'Jadever'} · ${esc(p.code || 'no code')}</small></div>
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

// ---------- events ----------
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-tab],[data-filter],[data-order],[data-act],[data-pbrand]');
  if (!el) return;
  const d = el.dataset;
  if (d.tab) { S.tab = d.tab; S.open = null; return render(); }
  if (d.filter) { S.filter = d.filter; return render(); }
  if (d.pbrand) { S.pbrand = d.pbrand; return render(); }
  if (d.order) { S.open = d.order; return render(); }
  if (d.act === 'close') { S.open = null; return render(); }
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
  if (f.classList.contains('a-prod')) return saveProduct(f);
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'oq') { S.q = e.target.value; const pos = e.target.selectionStart; render(); const i = $('#oq'); i.focus(); i.setSelectionRange(pos, pos); }
  if (e.target.id === 'pq') { S.pq = e.target.value; const pos = e.target.selectionStart; render(); const i = $('#pq'); i.focus(); i.setSelectionRange(pos, pos); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.open) { S.open = null; render(); } });

start();
