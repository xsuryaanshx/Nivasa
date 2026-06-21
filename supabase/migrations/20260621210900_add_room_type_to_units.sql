-- Add room_type to units to classify different unit configurations (e.g. 1-BHK, 2-BHK, PG Bed)
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS room_type text;
