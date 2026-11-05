-- Functions the website calls (with the public anon key).
-- They run with owner rights (security definer) so the tables can stay closed to the public,
-- and they check every input themselves.

-- ---------- place_order ----------
-- Input (jsonb):
-- { "name": "...", "phone": "...", "fulfilment": "delivery"|"pickup", "address": "...",
--   "payment": "whatsapp"|"whish", "notes": "...", "lang": "en"|"fr"|"ar",
--   "items": [ { "id": "<product id>", "qty": 2 }, ... ] }
-- Output: { "ref": "DAR-261105-AB12", "subtotal": 30.5, "items": [ {id, name, code, unit_price, qty} ] }
-- Prices always come from public.products, never from the browser.
create or replace function public.place_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_ref      text;
  v_sub      numeric(10,2) := 0;
  v_items    jsonb := '[]'::jsonb;
  v_phone    text := trim(coalesce(p->>'phone', ''));
  v_fulfil   text := coalesce(p->>'fulfilment', 'delivery');
  v_pay      text := coalesce(p->>'payment', 'whatsapp');
  v_lang     text := coalesce(p->>'lang', 'en');
  v_line     record;
begin
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then
    raise exception 'ORDER_EMPTY' using errcode = '22023';
  end if;
  if jsonb_array_length(p->'items') > 50 then
    raise exception 'ORDER_TOO_LARGE' using errcode = '22023';
  end if;
  -- simple spam guard: at most 5 orders per phone number in 10 minutes
  if (select count(*) from orders where customer_phone = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'TOO_MANY_ORDERS' using errcode = '22023';
  end if;

  -- unique, readable reference (Beirut date + 4 random characters)
  loop
    v_ref := 'DAR-' || to_char(now() at time zone 'Asia/Beirut', 'YYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
    exit when not exists (select 1 from orders where ref = v_ref);
  end loop;

  insert into orders (ref, customer_name, customer_phone, fulfilment, address, payment_method, notes, lang, subtotal_usd,
                      payment_status)
  values (v_ref, trim(p->>'name'), v_phone, v_fulfil, nullif(trim(coalesce(p->>'address', '')), ''), v_pay,
          nullif(trim(coalesce(p->>'notes', '')), ''), v_lang, 0,
          case when v_pay = 'whish' then 'pending' else 'unpaid' end)
  returning id into v_order_id;

  for v_line in
    select pr.id, pr.name, pr.code, pr.price_usd, least(greatest((it->>'qty')::int, 1), 999) as qty
    from jsonb_array_elements(p->'items') it
    join products pr on pr.id = it->>'id' and pr.active
  loop
    insert into order_items (order_id, product_id, name, code, unit_price_usd, qty)
    values (v_order_id, v_line.id, v_line.name, v_line.code, v_line.price_usd, v_line.qty);
    v_sub := v_sub + v_line.price_usd * v_line.qty;
    v_items := v_items || jsonb_build_object('id', v_line.id, 'name', v_line.name, 'code', v_line.code,
                                             'unit_price', v_line.price_usd, 'qty', v_line.qty);
  end loop;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'NO_VALID_PRODUCTS' using errcode = '22023';  -- rolls back the order
  end if;

  update orders set subtotal_usd = v_sub where id = v_order_id;
  return jsonb_build_object('ref', v_ref, 'subtotal', v_sub, 'items', v_items, 'payment', v_pay);
end;
$$;

-- ---------- send_contact_message ----------
-- Input: { "name", "phone", "subject", "message", "lang" }  Output: { "ok": true, "id": 12 }
create or replace function public.send_contact_message(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_phone text := trim(coalesce(p->>'phone', ''));
begin
  if (select count(*) from contact_messages where phone = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'TOO_MANY_MESSAGES' using errcode = '22023';
  end if;
  insert into contact_messages (name, phone, subject, message, lang)
  values (trim(p->>'name'), v_phone, nullif(trim(coalesce(p->>'subject', '')), ''), trim(p->>'message'), coalesce(p->>'lang', 'en'))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ---------- order_status (customer lookup) ----------
-- A customer can check an order with its reference AND the phone number used.
create or replace function public.order_status(p_ref text, p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('ref', o.ref, 'status', o.status, 'payment_status', o.payment_status,
                            'total', o.total_usd, 'created_at', o.created_at)
  from orders o
  where o.ref = upper(trim(p_ref)) and regexp_replace(o.customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g');
$$;

-- Only these functions are callable by visitors.
revoke all on function public.place_order(jsonb)          from public;
revoke all on function public.send_contact_message(jsonb) from public;
revoke all on function public.order_status(text, text)    from public;
grant execute on function public.place_order(jsonb)          to anon, authenticated;
grant execute on function public.send_contact_message(jsonb) to anon, authenticated;
grant execute on function public.order_status(text, text)    to anon, authenticated;
