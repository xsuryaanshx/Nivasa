-- Occupancy-based rent: JSON array of { "members": number, "amount": number } on units.
-- Tenants store how many people are billed for that room.

alter table public.units
  add column if not exists occupancy_prices jsonb;

alter table public.tenants
  add column if not exists occupancy_count integer not null default 1;

comment on column public.units.occupancy_prices is 'Rent tiers: [{ "members": 1, "amount": 5500 }, ...]. When null, rent_amount is a flat monthly rent.';

comment on column public.tenants.occupancy_count is 'Number of occupants used to pick the rent tier for this tenancy.';
