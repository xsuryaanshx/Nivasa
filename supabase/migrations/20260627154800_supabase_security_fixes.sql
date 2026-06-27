-- 1. Create a secure RPC function to link tenant accounts using phone matching
CREATE OR REPLACE FUNCTION public.link_tenant_account(tenant_id_input uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.tenants
  SET tenant_user_id = auth.uid()
  WHERE id = tenant_id_input
    AND tenant_user_id IS NULL
    AND (
      regexp_replace(phone, '\D', '', 'g') = regexp_replace(coalesce(auth.jwt()->'user_metadata'->>'phone', ''), '\D', '', 'g')
      OR regexp_replace(whatsapp_number, '\D', '', 'g') = regexp_replace(coalesce(auth.jwt()->'user_metadata'->>'phone', ''), '\D', '', 'g')
    );
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.link_tenant_account(uuid) TO authenticated;

-- 2. Drop and recreate policies to remove unsafe user_metadata calls

-- Tenants Policies
DROP POLICY IF EXISTS "tenants_tenant_select" ON public.tenants;
CREATE POLICY "tenants_tenant_select" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (tenant_user_id = auth.uid());

DROP POLICY IF EXISTS "tenants_tenant_link" ON public.tenants;
-- (Note: Link policy is no longer needed since linking is handled securely by the link_tenant_account RPC)

-- Units (Rooms) Policies
DROP POLICY IF EXISTS "units_tenant_select" ON public.units;
CREATE POLICY "units_tenant_select" ON public.units
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.room_id = units.id
      AND t.tenant_user_id = auth.uid()
    )
  );

-- Buildings Policies
DROP POLICY IF EXISTS "buildings_tenant_select" ON public.buildings;
CREATE POLICY "buildings_tenant_select" ON public.buildings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.building_id = buildings.id
      AND t.tenant_user_id = auth.uid()
    )
  );

-- Invoices Policies
DROP POLICY IF EXISTS "invoices_tenant_select" ON public.tenant_invoices;
CREATE POLICY "invoices_tenant_select" ON public.tenant_invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_invoices.tenant_id
      AND t.tenant_user_id = auth.uid()
    )
  );

-- Payments Policies
DROP POLICY IF EXISTS "payments_tenant_select" ON public.payments;
CREATE POLICY "payments_tenant_select" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = payments.tenant_id
      AND t.tenant_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payments_tenant_insert" ON public.payments;
CREATE POLICY "payments_tenant_insert" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = payments.tenant_id
      AND t.tenant_user_id = auth.uid()
    )
  );

-- Feature Usage Events: Admin policy
DROP POLICY IF EXISTS "Allow admin all access to feature events" ON public.feature_usage_events;
CREATE POLICY "Allow admin all access to feature events" ON public.feature_usage_events
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- 3. Fix Security Definer Views (change to Security Invoker)
ALTER VIEW IF EXISTS public.landlord_growth_monthly SET (security_invoker = on);
ALTER VIEW IF EXISTS public.occupancy_by_city SET (security_invoker = on);
ALTER VIEW IF EXISTS public.revenue_series_monthly SET (security_invoker = on);

-- 4. Enable RLS on public.properties to clear initialization warning
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;
