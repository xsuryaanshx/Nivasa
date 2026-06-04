-- Migration to add deposit and history tracking for tenants

-- Add deposit_amount, deposit_method, status, and left_at to tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS left_at TIMESTAMP WITH TIME ZONE;

-- Create an index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
