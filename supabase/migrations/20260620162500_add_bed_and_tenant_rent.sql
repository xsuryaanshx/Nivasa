-- Add capacity to units to track total beds
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS capacity integer DEFAULT 1;

-- Add bed_assignment and rent_amount to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS bed_assignment text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS rent_amount numeric DEFAULT 0;
