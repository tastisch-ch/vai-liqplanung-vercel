-- Create a function to get the auth.uid() value
-- This helps debugging RLS policies
CREATE OR REPLACE FUNCTION public.get_auth_uid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- Grant necessary privileges
GRANT EXECUTE ON FUNCTION public.get_auth_uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_uid() TO anon;

-- Function to create the above function via RPC (if you can't run SQL directly)
CREATE OR REPLACE FUNCTION public.create_auth_uid_function()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CREATE OR REPLACE FUNCTION public.get_auth_uid()
  RETURNS uuid
  LANGUAGE sql
  SECURITY DEFINER
  AS $func$
    SELECT auth.uid();
  $func$;

  GRANT EXECUTE ON FUNCTION public.get_auth_uid() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_auth_uid() TO anon;
  
  RETURN 'Function created successfully';
END;
$$;

-- Grant privileges to call this function
GRANT EXECUTE ON FUNCTION public.create_auth_uid_function() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_auth_uid_function() TO anon; 