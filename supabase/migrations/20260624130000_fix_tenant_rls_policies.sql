-- Drop existing policies to update them safely
DROP POLICY IF EXISTS "tenants_tenant_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_tenant_link" ON public.tenants;
DROP POLICY IF EXISTS "units_tenant_select" ON public.units;
DROP POLICY IF EXISTS "buildings_tenant_select" ON public.buildings;
DROP POLICY IF EXISTS "invoices_tenant_select" ON public.tenant_invoices;
DROP POLICY IF EXISTS "payments_tenant_select" ON public.payments;

-- 1. Tenants Policies
-- Allow tenants to select their own tenant record (matched by tenant_user_id or JWT user metadata)
CREATE POLICY "tenants_tenant_select" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    tenant_user_id = auth.uid()
    OR id = (NULLIF(auth.jwt()->'user_metadata'->>'tenant_id', '')::uuid)
  );

-- Allow tenants to link their authenticated user account to their tenant record
-- only if the record has not been claimed yet (tenant_user_id is NULL)
CREATE POLICY "tenants_tenant_link" ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    tenant_user_id IS NULL
    AND id = (NULLIF(auth.jwt()->'user_metadata'->>'tenant_id', '')::uuid)
  )
  WITH CHECK (
    tenant_user_id = auth.uid()
  );

-- 2. Units (Rooms) select policy for tenants
CREATE POLICY "units_tenant_select" ON public.units
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.room_id = units.id
      AND (
        t.tenant_user_id = auth.uid()
        OR t.id = (NULLIF(auth.jwt()->'user_metadata'->>'tenant_id', '')::uuid)
      )
    )
  );

-- 3. Buildings select policy for tenants
CREATE POLICY "buildings_tenant_select" ON public.buildings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.building_id = buildings.id
      AND (
        t.tenant_user_id = auth.uid()
        OR t.id = (NULLIF(auth.jwt()->'user_metadata'->>'tenant_id', '')::uuid)
      )
    )
  );

-- 4. Invoices select policy for tenants
CREATE POLICY "invoices_tenant_select" ON public.tenant_invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = tenant_invoices.tenant_id
      AND (
        t.tenant_user_id = auth.uid()
        OR t.id = (NULLIF(auth.jwt()->'user_metadata'->>'tenant_id', '')::uuid)
      )
    )
  );

-- 5. Payments select policy for tenants
CREATE POLICY "payments_tenant_select" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = payments.tenant_id
      AND (
        t.tenant_user_id = auth.uid()
        OR t.id = (NULLIF(auth.jwt()->'user_metadata'->>'tenant_id', '')::uuid)
      )
    )
  );
