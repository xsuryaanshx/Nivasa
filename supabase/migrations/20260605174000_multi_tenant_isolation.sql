-- Multi-Tenancy Isolation Migration

-- 1. Add user_id to tables that are missing it
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop existing wide-open and anon policies
DROP POLICY IF EXISTS "units_authenticated_all" ON public.units;
DROP POLICY IF EXISTS "tenants_authenticated_all" ON public.tenants;
DROP POLICY IF EXISTS "units_anon_all" ON public.units;
DROP POLICY IF EXISTS "tenants_anon_all" ON public.tenants;

-- 3. Enable RLS on all tables
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. Create strict user_id based RLS policies

-- Buildings
DROP POLICY IF EXISTS "buildings_user_isolation" ON public.buildings;
CREATE POLICY "buildings_user_isolation" ON public.buildings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Units
DROP POLICY IF EXISTS "units_user_isolation" ON public.units;
CREATE POLICY "units_user_isolation" ON public.units
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Tenants
DROP POLICY IF EXISTS "tenants_user_isolation" ON public.tenants;
CREATE POLICY "tenants_user_isolation" ON public.tenants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Payments
DROP POLICY IF EXISTS "payments_user_isolation" ON public.payments;
CREATE POLICY "payments_user_isolation" ON public.payments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
