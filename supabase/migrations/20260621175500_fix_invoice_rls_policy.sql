-- Simplify tenant_invoices RLS policies to check u.user_id directly
-- This avoids joining buildings, which might have NULL user_id for seeded data.

DROP POLICY IF EXISTS "Users can view invoices for their tenants" ON public.tenant_invoices;
DROP POLICY IF EXISTS "Users can insert invoices for their tenants" ON public.tenant_invoices;
DROP POLICY IF EXISTS "Users can update invoices for their tenants" ON public.tenant_invoices;
DROP POLICY IF EXISTS "Users can delete invoices for their tenants" ON public.tenant_invoices;

CREATE POLICY "Users can view invoices for their tenants" ON public.tenant_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.units u
            WHERE u.id = tenant_invoices.room_id
            AND u.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert invoices for their tenants" ON public.tenant_invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.units u
            WHERE u.id = tenant_invoices.room_id
            AND u.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update invoices for their tenants" ON public.tenant_invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.units u
            WHERE u.id = tenant_invoices.room_id
            AND u.user_id = auth.uid()
        )
    );

-- Also fix any seeded buildings that have NULL user_id by associating them with the first auth user if needed,
-- but the above policy makes tenant_invoices independent of buildings user_id.
