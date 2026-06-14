-- 1. Create tables
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL, -- Optional assignment
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- Maid, Security Guard, Maintenance, Manager, Other
    phone TEXT,
    join_date DATE NOT NULL,
    monthly_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- present, absent, half-day
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

CREATE TABLE IF NOT EXISTS public.staff_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- Aadhaar, PAN, Other
    document_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add RLS Policies
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

-- Policies for staff
CREATE POLICY "Users can manage their own staff" ON public.staff
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policies for staff_payments
CREATE POLICY "Users can manage their staff payments" ON public.staff_payments
    FOR ALL
    TO authenticated
    USING (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()))
    WITH CHECK (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));

-- Policies for staff_attendance
CREATE POLICY "Users can manage their staff attendance" ON public.staff_attendance
    FOR ALL
    TO authenticated
    USING (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()))
    WITH CHECK (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));

-- Policies for staff_documents
CREATE POLICY "Users can manage their staff documents" ON public.staff_documents
    FOR ALL
    TO authenticated
    USING (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()))
    WITH CHECK (staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()));
