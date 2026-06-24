-- 1. Add tenant_user_id column to tenants table to link it to auth.users
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add upi_id column to buildings table so tenants can retrieve the payee UPI ID
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- 3. Drop existing policies to update them or add new ones safely
DROP POLICY IF EXISTS "tenants_tenant_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_tenant_link" ON public.tenants;
DROP POLICY IF EXISTS "units_tenant_select" ON public.units;
DROP POLICY IF EXISTS "buildings_tenant_select" ON public.buildings;
DROP POLICY IF EXISTS "invoices_tenant_select" ON public.tenant_invoices;
DROP POLICY IF EXISTS "payments_tenant_select" ON public.payments;

-- 4. Create Tenant Policies

-- Allow tenants to select their own tenant record
CREATE POLICY "tenants_tenant_select" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (tenant_user_id = auth.uid());

-- Allow tenants to link their authenticated user account to their tenant record
-- only if the record has not been claimed yet (tenant_user_id is NULL)
CREATE POLICY "tenants_tenant_link" ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (tenant_user_id = auth.uid());

-- Allow tenants to select their assigned room
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

-- Allow tenants to select their building
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

-- Allow tenants to select their own invoices
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

-- Allow tenants to select their own payments
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
