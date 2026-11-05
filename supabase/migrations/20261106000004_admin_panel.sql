-- Admin panel support: editable site settings + product photo storage.

-- ---------- site settings (contact details shown on the website) ----------
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "settings are public" on public.site_settings for select using (true);
create policy "admins edit settings" on public.site_settings for all to authenticated using (public.is_staff()) with check (public.is_staff());
create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

insert into public.site_settings (key, value) values
  ('whatsapp', ''),                                        -- international digits, e.g. 96179004108
  ('instagram', 'https://www.instagram.com/darshop.lb/'),
  ('facebook', ''),
  ('tiktok', ''),
  ('hours_en', 'Monday to Saturday · hours to confirm'),
  ('hours_fr', 'Du lundi au samedi · horaires à confirmer'),
  ('hours_ar', 'من الاثنين إلى السبت · الدوام قيد التأكيد')
on conflict (key) do nothing;

-- ---------- product photos (Supabase Storage, public bucket) ----------
insert into storage.buckets (id, name, public) values ('products', 'products', true)
on conflict (id) do nothing;
create policy "product photos are public" on storage.objects for select using (bucket_id = 'products');
create policy "admins upload product photos" on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_staff());
create policy "admins change product photos" on storage.objects for update to authenticated using (bucket_id = 'products' and public.is_staff());
create policy "admins delete product photos" on storage.objects for delete to authenticated using (bucket_id = 'products' and public.is_staff());
