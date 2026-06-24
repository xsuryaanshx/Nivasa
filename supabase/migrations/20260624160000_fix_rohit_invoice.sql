-- Update Rohit Bhaiya's existing June 2026 invoice base_rent and total_amount to 1
UPDATE public.tenant_invoices
SET base_rent = 1, total_amount = 1 + COALESCE(addons_total, 0)
WHERE tenant_id = 'd3ce3f9c-a401-4077-bafc-606bcae9d400';

-- Also update historical invoices table if any matching invoice exists
UPDATE public.invoices
SET base_rent = 1, total_due = 1
WHERE tenant_id = 'd3ce3f9c-a401-4077-bafc-606bcae9d400';

-- Copy UPI ID from landlord profiles (raw_user_meta_data) to their buildings so tenants can access it
UPDATE public.buildings b
SET upi_id = u.raw_user_meta_data ->> 'upi_id'
FROM auth.users u
WHERE b.user_id = u.id
AND u.raw_user_meta_data ->> 'upi_id' IS NOT NULL;
