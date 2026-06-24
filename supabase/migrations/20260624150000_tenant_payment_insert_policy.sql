-- Allow authenticated tenants to insert payment records linked to their profile
DROP POLICY IF EXISTS "payments_tenant_insert" ON public.payments;
CREATE POLICY "payments_tenant_insert" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.id = payments.tenant_id
      AND (
        t.tenant_user_id = auth.uid()
        OR t.id = (NULLIF(auth.jwt()->'user_metadata'->>'tenant_id', '')::uuid)
      )
    )
  );
