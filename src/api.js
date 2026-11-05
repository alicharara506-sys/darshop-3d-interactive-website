// Supabase connection for the shop.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (see .env.example).
// Without them the site keeps working on the local catalogue (data/*.json) and
// WhatsApp-only orders, so the prototype never breaks.
// Only the PUBLIC anon key goes here. Never put the service_role key in the website.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
export const LIVE = Boolean(supabase);

const withTimeout = (promise, ms = 8000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
]);

// Products from the database, in the same shape the shop already uses.
export async function loadProducts() {
  if (!LIVE) return null;
  const { data, error } = await withTimeout(supabase.from('products')
    .select('id, brand_id, category_id, code, name, price_usd, price_max_usd, image_url, popularity')
    .order('popularity', { ascending: true }));
  if (error) throw error;
  return data.map((p, i) => ({
    id: p.id, brand: p.brand_id, cat: p.category_id, code: p.code || '', name: p.name,
    refPrice: Number(p.price_usd), refPriceMax: p.price_max_usd == null ? null : Number(p.price_max_usd),
    img: p.image_url || null, rank: p.popularity ?? i,
  }));
}

// Creates the order on the server. Prices are recalculated there from the products table.
// Returns { ref, subtotal, items:[{id,name,code,unit_price,qty}], payment } or null when offline.
export async function placeOrder(form, cart, lang) {
  if (!LIVE) return null;
  const payload = {
    name: form.name, phone: form.phone, fulfilment: form.ship === 'pickup' ? 'pickup' : 'delivery',
    address: form.ship === 'pickup' ? null : form.address, payment: form.pay === 'whish' ? 'whish' : 'whatsapp',
    notes: form.notes || null, lang, items: Object.entries(cart).map(([id, qty]) => ({ id, qty })),
  };
  const { data, error } = await withTimeout(supabase.rpc('place_order', { p: payload }));
  if (error) throw error;
  return data;
}

export async function sendContactMessage(fields, lang) {
  if (!LIVE) return null;
  const { data, error } = await withTimeout(supabase.rpc('send_contact_message', { p: { ...fields, lang } }));
  if (error) throw error;
  return data;
}

// Contact details edited in the admin panel (site_settings table).
export async function loadSettings() {
  if (!LIVE) return null;
  const { data, error } = await withTimeout(supabase.from('site_settings').select('key, value'));
  if (error) throw error;
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}

export async function orderStatus(ref, phone) {
  if (!LIVE) return null;
  const { data, error } = await withTimeout(supabase.rpc('order_status', { p_ref: ref, p_phone: phone }));
  if (error) throw error;
  return data;
}
