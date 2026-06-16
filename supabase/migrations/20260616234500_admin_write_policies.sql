-- Migration: Admin Write Policies
-- Allow super-admins (is_admin = true in user_metadata) to run SELECT, INSERT, UPDATE, and DELETE on all key tables.

-- 1. Buildings Policies
DROP POLICY IF EXISTS "buildings_admin_all" ON public.buildings;
CREATE POLICY "buildings_admin_all" ON public.buildings
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- 2. Units (Rooms) Policies
DROP POLICY IF EXISTS "units_admin_all" ON public.units;
CREATE POLICY "units_admin_all" ON public.units
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- 3. Tenants Policies
DROP POLICY IF EXISTS "tenants_admin_all" ON public.tenants;
CREATE POLICY "tenants_admin_all" ON public.tenants
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- 4. Payments Policies
DROP POLICY IF EXISTS "payments_admin_all" ON public.payments;
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
