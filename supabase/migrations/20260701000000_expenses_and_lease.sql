-- Migration for custom expenses templates and lease duration

-- 1. Create expense templates table
CREATE TABLE IF NOT EXISTS public.expense_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for expense_templates
ALTER TABLE public.expense_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own expense templates" 
ON public.expense_templates 
FOR ALL USING (auth.uid() = user_id);

-- 2. Add lease_duration_months to tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS lease_duration_months INTEGER DEFAULT 11;
