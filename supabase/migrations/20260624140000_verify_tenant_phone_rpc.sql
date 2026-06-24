-- Create a secure RPC function to verify tenant phone number anonymously during signup
CREATE OR REPLACE FUNCTION public.verify_tenant_phone(phone_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to allow anonymous sign-up phone matching
AS $$
DECLARE
  matched_id uuid;
  clean_phone_input text;
BEGIN
  -- Remove any non-numeric characters from the input
  clean_phone_input := regexp_replace(phone_input, '\D', '', 'g');
  
  -- If input is 10 digits and doesn't start with 91, handle standard Indian format matching
  IF length(clean_phone_input) = 10 THEN
    -- Match either 10-digit format or with 91 prefix in DB
    SELECT id INTO matched_id
    FROM public.tenants
    WHERE (
      regexp_replace(phone, '\D', '', 'g') = clean_phone_input
      OR regexp_replace(phone, '\D', '', 'g') = '91' || clean_phone_input
      OR regexp_replace(whatsapp_number, '\D', '', 'g') = clean_phone_input
      OR regexp_replace(whatsapp_number, '\D', '', 'g') = '91' || clean_phone_input
    )
    AND status = 'active'
    LIMIT 1;
  ELSE
    -- General exact numeric match fallback
    SELECT id INTO matched_id
    FROM public.tenants
    WHERE (
      regexp_replace(phone, '\D', '', 'g') = clean_phone_input
      OR regexp_replace(whatsapp_number, '\D', '', 'g') = clean_phone_input
    )
    AND status = 'active'
    LIMIT 1;
  END IF;
  
  RETURN matched_id;
END;
$$;

-- Grant execution permissions to both anonymous and authenticated roles
GRANT EXECUTE ON FUNCTION public.verify_tenant_phone(text) TO anon, authenticated;
