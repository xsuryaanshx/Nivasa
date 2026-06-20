CREATE TABLE IF NOT EXISTS public.tenant_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    room_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
    billing_month text NOT NULL, -- Format: YYYY-MM
    base_rent numeric DEFAULT 0,
    addons_total numeric DEFAULT 0,
    total_amount numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, billing_month)
);

-- RLS
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices for their tenants" ON public.tenant_invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tenants t
            JOIN public.units u ON t.unit_id = u.id
            JOIN public.buildings b ON u.building_id = b.id
            WHERE t.id = tenant_invoices.tenant_id
            AND b.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert invoices for their tenants" ON public.tenant_invoices
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tenants t
            JOIN public.units u ON t.unit_id = u.id
            JOIN public.buildings b ON u.building_id = b.id
            WHERE t.id = tenant_invoices.tenant_id
            AND b.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update invoices for their tenants" ON public.tenant_invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.tenants t
            JOIN public.units u ON t.unit_id = u.id
            JOIN public.buildings b ON u.building_id = b.id
            WHERE t.id = tenant_invoices.tenant_id
            AND b.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete invoices for their tenants" ON public.tenant_invoices
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.tenants t
            JOIN public.units u ON t.unit_id = u.id
            JOIN public.buildings b ON u.building_id = b.id
            WHERE t.id = tenant_invoices.tenant_id
            AND b.owner_id = auth.uid()
        )
    );
