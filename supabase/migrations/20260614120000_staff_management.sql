-- Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  phone VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create staff_allocations table
CREATE TABLE IF NOT EXISTS public.staff_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(staff_id, building_id)
);

-- Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_allocations ENABLE ROW LEVEL SECURITY;

-- Policies for staff
CREATE POLICY "Users can view their own staff"
  ON public.staff FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own staff"
  ON public.staff FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own staff"
  ON public.staff FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own staff"
  ON public.staff FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for staff_allocations
CREATE POLICY "Users can view allocations of their staff"
  ON public.staff_allocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = staff_allocations.staff_id
      AND staff.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert allocations for their staff"
  ON public.staff_allocations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = staff_allocations.staff_id
      AND staff.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.buildings
      WHERE buildings.id = staff_allocations.building_id
      AND buildings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete allocations of their staff"
  ON public.staff_allocations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = staff_allocations.staff_id
      AND staff.user_id = auth.uid()
    )
  );
