DROP POLICY IF EXISTS "Users can view invoices for their tenants" ON public.tenant_invoices;
DROP POLICY IF EXISTS "Users can insert invoices for their tenants" ON public.tenant_invoices;
DROP POLICY IF EXISTS "Users can update invoices for their tenants" ON public.tenant_invoices;
DROP POLICY IF EXISTS "Users can delete invoices for their tenants" ON public.tenant_invoices;

CREATE POLICY "Users can view invoices for their tenants" ON public.tenant_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.units u
            JOIN public.buildings b ON u.building_id = b.id
            WHERE u.id = tenant_invoices.room_id
            AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert invoices for their tenants" ON public.tenant_invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.units u
            JOIN public.buildings b ON u.building_id = b.id
            WHERE u.id = tenant_invoices.room_id
            AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update invoices for their tenants" ON public.tenant_invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.units u
            JOIN public.buildings b ON u.building_id = b.id
            WHERE u.id = tenant_invoices.room_id
            AND b.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete invoices for their tenants" ON public.tenant_invoices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.units u
            JOIN public.buildings b ON u.building_id = b.id
            WHERE u.id = tenant_invoices.room_id
            AND b.user_id = auth.uid()
        )
    );
