-- Migration: Add user_settings and invoices tables

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  rent_collection_date integer, -- 1 to 31
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_settings enable row level security;

create policy "user_settings_authenticated_all"
  on public.user_settings
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tenant_id uuid references public.tenants on delete cascade not null,
  room_id uuid references public.units on delete cascade not null,
  month_year text not null, -- e.g., "June 2026"
  base_rent numeric not null default 0,
  electricity_cost numeric not null default 0,
  add_ons jsonb default '[]'::jsonb not null,
  previous_dues numeric not null default 0,
  total_due numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.invoices enable row level security;

create policy "invoices_authenticated_all"
  on public.invoices
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
