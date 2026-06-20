-- Add columns for public mini-websites
ALTER TABLE public.buildings 
ADD COLUMN is_public BOOLEAN DEFAULT false,
ADD COLUMN slug TEXT UNIQUE,
ADD COLUMN public_description TEXT,
ADD COLUMN public_amenities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN contact_phone TEXT,
ADD COLUMN cover_image_url TEXT;

-- Update RLS policy to allow public select
CREATE POLICY "Public profiles are viewable by everyone." 
ON public.buildings 
FOR SELECT 
USING (is_public = true);
