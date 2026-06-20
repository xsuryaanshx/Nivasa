ALTER TABLE public.buildings 
ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
