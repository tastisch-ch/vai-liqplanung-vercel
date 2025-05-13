-- PROFILES TABLE
-- Drop all existing RLS policies on the profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
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
      read_only BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      settings JSONB
    );
  END IF;
END
$$;

-- Make sure RLS is enabled on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "Allow users to view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id); 