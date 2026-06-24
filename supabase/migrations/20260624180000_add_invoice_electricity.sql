-- Add electricity_cost column to tenant_invoices table to support manual invoice syncs
ALTER TABLE public.tenant_invoices ADD COLUMN IF NOT EXISTS electricity_cost numeric DEFAULT 0;
