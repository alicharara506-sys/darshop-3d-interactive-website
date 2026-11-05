-- DAR Building Materials Shop: database schema.
-- Tables: brands, categories, products (public catalogue), orders, order_items,
-- contact_messages (private), staff (who may see orders and messages).
--
-- Security model:
--   * Anyone can READ active brands, categories and products.
--   * Nobody can write orders or messages directly. The website calls the
--     functions in 20261105000002_functions.sql, which validate the input and
--     take prices from the products table (prices sent by a browser are ignored).
--   * Logged-in users listed in public.staff can read and update orders/messages.

create extension if not exists pgcrypto;

-- ---------- catalogue ----------
create table public.brands (
  id          text primary key,                  -- 'total', 'jadever'
  name        text not null,
  color       text,                              -- brand colour for the site
  sort        int  not null default 0,
  active      boolean not null default true
);

create table public.categories (
  id          text primary key,                  -- 'power', 'hand', ... (TOTAL's 11 categories)
  sort        int  not null default 0,
  name_en     text not null,
  name_fr     text not null,
  name_ar     text not null
);

create table public.products (
  id           text primary key,                 -- e.g. 'total-safety-boots-total-tsp201sb'
  brand_id     text not null references public.brands(id),
  category_id  text not null references public.categories(id),
  code         text,                             -- model code, e.g. 'TSP201SB'
  name         text not null,
  price_usd    numeric(10,2) not null check (price_usd >= 0),
  price_max_usd numeric(10,2) check (price_max_usd is null or price_max_usd >= price_usd), -- for 'from ... ' ranges
  image_url    text,
  model_url    text,                             -- optional 3D model (.glb)
  popularity   int  not null default 0,          -- lower = more popular
  stock_status text not null default 'in_stock' check (stock_status in ('in_stock', 'low', 'out', 'on_order')),
  active       boolean not null default true,
  source_url   text,                             -- where the data came from (reference only)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_brand_idx    on public.products (brand_id) where active;
create index products_category_idx on public.products (category_id) where active;
create index products_code_idx     on public.products (code);

-- ---------- orders ----------
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,          -- shown to the customer, e.g. 'DAR-261105-AB12'
  status          text not null default 'new'
                  check (status in ('new', 'confirmed', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  customer_name   text not null check (char_length(customer_name) between 2 and 120),
  customer_phone  text not null check (customer_phone ~ '^\+?[0-9 -]{7,20}$'),
  fulfilment      text not null check (fulfilment in ('delivery', 'pickup')),
  address         text,
  payment_method  text not null check (payment_method in ('whatsapp', 'whish')),
  payment_status  text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  notes           text check (char_length(coalesce(notes, '')) <= 1000),
  lang            text not null default 'en' check (lang in ('en', 'fr', 'ar')),
  subtotal_usd    numeric(10,2) not null check (subtotal_usd >= 0),
  delivery_fee_usd numeric(10,2),                -- set by staff after confirming on WhatsApp
  total_usd       numeric(10,2) generated always as (subtotal_usd + coalesce(delivery_fee_usd, 0)) stored,
  whish_payment_id text,                         -- filled by the Whish integration later
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- deliveries need an address; pickups don't
  constraint orders_address_needed check (fulfilment = 'pickup' or char_length(coalesce(address, '')) >= 5)
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx  on public.orders (status);

create table public.order_items (
  id            bigint generated always as identity primary key,
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_id    text references public.products(id),
  name          text not null,                   -- snapshot at order time
  code          text,
  unit_price_usd numeric(10,2) not null check (unit_price_usd >= 0),
  qty           int  not null check (qty between 1 and 999),
  line_total_usd numeric(10,2) generated always as (unit_price_usd * qty) stored
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------- contact form ----------
create table public.contact_messages (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 2 and 120),
  phone       text not null check (phone ~ '^\+?[0-9 -]{7,20}$'),
  subject     text check (char_length(coalesce(subject, '')) <= 120),
  message     text not null check (char_length(message) between 3 and 4000),
  lang        text not null default 'en' check (lang in ('en', 'fr', 'ar')),
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- staff ----------
-- Add a shop employee: create the user in Supabase Auth, then
--   insert into public.staff (user_id, name) values ('<auth user uuid>', 'Name');
create table public.staff (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  name      text not null,
  role      text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- keep updated_at current
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_touch   before update on public.orders   for each row execute function public.touch_updated_at();

-- ---------- row level security ----------
alter table public.brands           enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.contact_messages enable row level security;
alter table public.staff            enable row level security;

-- public catalogue (read only)
create policy "brands are public"     on public.brands     for select using (active or public.is_staff());
create policy "categories are public" on public.categories for select using (true);
create policy "active products are public" on public.products for select using (active or public.is_staff());

-- staff manage the catalogue
create policy "staff edit brands"     on public.brands     for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff edit categories" on public.categories for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff edit products"   on public.products   for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- orders and messages: staff only (customers go through the functions)
create policy "staff read orders"   on public.orders for select to authenticated using (public.is_staff());
create policy "staff update orders" on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff read order items" on public.order_items for select to authenticated using (public.is_staff());
create policy "staff read messages"   on public.contact_messages for select to authenticated using (public.is_staff());
create policy "staff update messages" on public.contact_messages for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff see staff" on public.staff for select to authenticated using (public.is_staff());
