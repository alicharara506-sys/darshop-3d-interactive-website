-- Staff dashboard support.
-- 1) Live updates: new orders and messages are pushed to the dashboard (Supabase Realtime).
--    Realtime respects row level security, so only staff receive them.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.contact_messages;

-- 2) Staff can delete a test or spam order (its items are removed with it).
create policy "staff delete orders" on public.orders for delete to authenticated using (public.is_staff());
