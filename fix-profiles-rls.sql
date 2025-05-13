-- Fix for profiles table RLS policies that are causing recursion errors
BEGIN;

-- Disable RLS temporarily to fix the issue
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies on the profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owners" ON profiles;
DROP POLICY IF EXISTS "Profiles are editable by owners" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;

-- Create simplified non-recursive policies
-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple SELECT policy
CREATE POLICY "Allow users to view their own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Create simple UPDATE policy
CREATE POLICY "Allow users to update their own profile"
ON profiles FOR UPDATE
USING (id = auth.uid());

-- Create simple INSERT policy
CREATE POLICY "Allow users to insert their own profile"
ON profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- Create simple DELETE policy
CREATE POLICY "Allow users to delete their own profile"
ON profiles FOR DELETE
USING (id = auth.uid());

-- Allow service role to access everything
CREATE POLICY "Service role can access all profiles"
ON profiles
USING (
  (current_setting('role', true)::text = 'service_role')
);

COMMIT;

-- Verify the RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename = 'profiles'
ORDER BY 
    policyname;

-- Check if profiles table exists, and create it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
  END IF;
END
$$; 