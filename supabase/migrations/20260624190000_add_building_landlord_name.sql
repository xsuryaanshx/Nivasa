-- Add landlord_name column to buildings table
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS landlord_name text;

-- Sync current landlord names and UPI IDs from user profiles (auth.users metadata) to buildings
UPDATE public.buildings b
SET 
  upi_id = COALESCE(u.raw_user_meta_data ->> 'upi_id', b.upi_id),
  landlord_name = COALESCE(u.raw_user_meta_data ->> 'full_name', 'Nivasa Landlord')
FROM auth.users u
WHERE b.user_id = u.id;
