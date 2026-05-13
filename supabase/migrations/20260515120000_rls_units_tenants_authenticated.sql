-- Fix: 42501 "new row violates row-level security policy for table units"
-- After signIn(), the JWT role is `authenticated` — these policies allow CRUD.
--
-- If inserts STILL fail, the client is usually `anon` (no session, e.g. /app without login).
-- Run migration 20260516120000_rls_units_tenants_anon.sql as well.

-- ── units ────────────────────────────────────────────────────────────────────
alter table public.units enable row level security;

drop policy if exists "units_authenticated_all" on public.units;
drop policy if exists "units_select_authenticated" on public.units;
drop policy if exists "units_insert_authenticated" on public.units;
drop policy if exists "units_update_authenticated" on public.units;
drop policy if exists "units_delete_authenticated" on public.units;

create policy "units_authenticated_all"
  on public.units
  for all
  to authenticated
  using (true)
  with check (true);

-- ── tenants (add tenant / occupancy_count updates hit RLS too) ─────────────
alter table public.tenants enable row level security;

drop policy if exists "tenants_authenticated_all" on public.tenants;
drop policy if exists "tenants_select_authenticated" on public.tenants;
drop policy if exists "tenants_insert_authenticated" on public.tenants;
drop policy if exists "tenants_update_authenticated" on public.tenants;
drop policy if exists "tenants_delete_authenticated" on public.tenants;

create policy "tenants_authenticated_all"
  on public.tenants
  for all
  to authenticated
  using (true)
  with check (true);
