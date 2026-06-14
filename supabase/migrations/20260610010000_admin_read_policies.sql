-- Migration to allow super-admins (is_admin = true in user_metadata) to view all data in tenant tables
-- This ensures the admin control tower dashboard can read the statistics without breaking RLS

-- 1. Buildings Policies
DROP POLICY IF EXISTS "buildings_admin_select" ON public.buildings;
CREATE POLICY "buildings_admin_select" ON public.buildings
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- 2. Units (Rooms) Policies
DROP POLICY IF EXISTS "units_admin_select" ON public.units;
CREATE POLICY "units_admin_select" ON public.units
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- 3. Tenants Policies
DROP POLICY IF EXISTS "tenants_admin_select" ON public.tenants;
CREATE POLICY "tenants_admin_select" ON public.tenants
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- 4. Payments Policies
DROP POLICY IF EXISTS "payments_admin_select" ON public.payments;
CREATE POLICY "payments_admin_select" ON public.payments
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
