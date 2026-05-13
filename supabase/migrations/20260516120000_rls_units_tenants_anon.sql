-- RLS still blocked inserts: the browser client often has NO Supabase session (e.g. /app is
-- reachable without login, or useAuth shows a "demo" user while JWT role stays `anon`).
-- Policies "TO authenticated" alone never run for `anon`. Add matching `anon` policies.
--
-- Security: anyone with your anon key can read/write these rows. Prefer removing anon
-- policies later and enforcing login + authenticated-only policies.

alter table public.units enable row level security;
alter table public.tenants enable row level security;

drop policy if exists "units_anon_all" on public.units;
create policy "units_anon_all"
  on public.units
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "tenants_anon_all" on public.tenants;
create policy "tenants_anon_all"
  on public.tenants
  for all
  to anon
  using (true)
  with check (true);
