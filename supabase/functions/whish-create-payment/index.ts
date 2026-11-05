// Supabase Edge Function: start a Whish payment for an order.
// POST { "ref": "DAR-261105-AB12" }  ->  { "payment_url": "..." }  (when Whish is configured)
//
// STATUS: STUB. The Whish API call is not written yet because it needs DAR's Whish
// merchant account and Whish's merchant API documentation (endpoint, auth, fields,
// callback signature). Until WHISH_API_KEY is set, this returns 501 "not_configured".
//
// Secrets (set with `supabase secrets set ...`, never in the website):
//   WHISH_API_KEY, WHISH_MERCHANT_ID, WHISH_API_URL
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to Edge Functions automatically.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let ref = '';
  try { ref = String((await req.json()).ref || '').trim().toUpperCase(); } catch { /* empty body */ }
  if (!/^DAR-\d{6}-[A-Z0-9]{4}$/.test(ref)) return json({ error: 'bad_ref' }, 400);

  // Look the order up on the server: the amount always comes from the database.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: order, error } = await db.from('orders')
    .select('id, ref, total_usd, payment_method, payment_status, customer_phone')
    .eq('ref', ref).maybeSingle();
  if (error) return json({ error: 'db_error' }, 500);
  if (!order) return json({ error: 'not_found' }, 404);
  if (order.payment_method !== 'whish') return json({ error: 'not_a_whish_order' }, 400);
  if (order.payment_status === 'paid') return json({ error: 'already_paid' }, 409);

  const apiKey = Deno.env.get('WHISH_API_KEY');
  if (!apiKey) return json({ error: 'not_configured', message: 'Whish is not connected yet.' }, 501);

  // TODO(Whish): create the payment with Whish's merchant API for `order.total_usd` (USD)
  // and reference `order.ref`, using WHISH_API_URL / WHISH_MERCHANT_ID / apiKey as their
  // documentation describes. Save Whish's payment id:
  //   await db.from('orders').update({ whish_payment_id: <id> }).eq('id', order.id);
  // and return the page the customer should be sent to:
  //   return json({ payment_url: <url from Whish> });
  // Mark the order paid ONLY from Whish's verified server callback, never from the browser.
  return json({ error: 'not_implemented' }, 501);
});
