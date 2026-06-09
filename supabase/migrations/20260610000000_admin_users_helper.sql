-- Create a security definer function to allow super-admins to retrieve user details
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Security check: Verify that the caller is indeed an admin
  IF (coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false) = true) THEN
    RETURN QUERY 
    SELECT 
      u.id, 
      u.email::VARCHAR, 
      coalesce((u.raw_user_meta_data ->> 'full_name')::VARCHAR, 'User'),
      u.created_at
    FROM auth.users u;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
