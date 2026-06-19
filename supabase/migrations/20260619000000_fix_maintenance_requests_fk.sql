-- Drop the incorrect foreign key constraint that references the non-existent or incorrect "properties" table
ALTER TABLE public.maintenance_requests 
  DROP CONSTRAINT IF EXISTS maintenance_requests_property_id_fkey;

-- Add the correct foreign key constraint to reference the "buildings" table
ALTER TABLE public.maintenance_requests 
  ADD CONSTRAINT maintenance_requests_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES public.buildings(id) ON DELETE CASCADE;
