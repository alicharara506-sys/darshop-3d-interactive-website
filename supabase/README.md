# DAR shop backend (Supabase)

The website works without this (local catalogue + WhatsApp orders). Connecting Supabase adds:
a product database the shop reads from, orders saved on the server with prices checked there,
contact-form messages saved, a customer order-status lookup, and a place for the Whish payment.

## What's here

| File | What it does |
|---|---|
| `migrations/20261105000001_init.sql` | Tables: `brands`, `categories`, `products`, `orders`, `order_items`, `contact_messages`, `staff`; security rules (RLS). |
| `migrations/20261105000002_functions.sql` | Functions the site calls: `place_order`, `send_contact_message`, `order_status`. |
| `migrations/20261106000003_staff_dashboard.sql` | Live updates for new orders/messages; admins can delete orders. |
| `migrations/20261106000004_admin_panel.sql` | `site_settings` (WhatsApp, social links, hours) and the public `products` photo bucket. |
| `seed.sql` | 2 brands, TOTAL's 11 categories, 115 products. Rebuild with `python tools/make_seed.py`. |
| `functions/whish-create-payment/` | Edge Function stub for Whish online payment (not connected yet). |

## Security in short
- Visitors can only **read** active products, brands and categories.
- Visitors can't write to any table. Orders and messages go through `place_order` / `send_contact_message`,
  which check every field, take **prices from the database** (never from the browser) and limit
  each phone number to 5 submissions per 10 minutes.
- Only logged-in users listed in `staff` can see and update orders and messages.
- The website uses the public **anon** key only. The **service_role** key must never be put in the website or the repo.

## Set up (about 10 minutes)
1. Create a project at supabase.com (region: Frankfurt is closest to Lebanon).
2. In the project, open **SQL Editor** and run, in this order:
   1. `migrations/20261105000001_init.sql`
   2. `migrations/20261105000002_functions.sql`
   3. `migrations/20261106000003_staff_dashboard.sql`
   4. `migrations/20261106000004_admin_panel.sql`
   5. `seed.sql`
3. **Project Settings → API**: copy the Project URL and the `anon` public key.
4. In the website folder, copy `.env.example` to `.env.local` and paste both values.
5. Restart the dev server (`npm run dev`). The shop now loads products from Supabase and saves orders.
6. Add an admin (needed to sign in at `/admin.html`): **Authentication → Users → Add user**, copy their user id, then in SQL Editor:
   `insert into public.staff (user_id, name, role) values ('<user id>', 'Name', 'admin');`

With the Supabase CLI instead: `supabase link --project-ref <ref>` then `supabase db push` and `supabase db reset` (local) or run `seed.sql`.

## Whish
`whish-create-payment` is a stub: it checks the order on the server and returns `not_configured`.
To finish it we need DAR's Whish merchant account and Whish's merchant API documentation.
Payments must be marked as paid only from Whish's verified server callback, never from the browser.

## Admin panel (`/admin.html`)
Orders (live alerts, status, payment, delivery fee, WhatsApp/call the customer), messages, products (add, edit, photo upload, price, stock, show/hide) and website settings (WhatsApp number, Instagram, Facebook, TikTok, opening hours). Only users in `public.staff` can sign in.
Tip: in Authentication settings, turn off public sign-ups so only accounts you create exist.

## Still to do
- Real prices from DAR (the seed uses SAKR's prices as placeholders).
- Photos: move `public/products/catalog/` to Supabase Storage if the catalogue grows.
