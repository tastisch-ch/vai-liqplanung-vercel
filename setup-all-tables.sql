-- Combined SQL script to set up all tables for the VAI-LIQ financial planning application
-- This script will create all tables with proper RLS policies if they don't exist

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

-- USER SETTINGS TABLE
-- Check if user_settings table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'user_settings'
  ) THEN
    -- Create user_settings table if it doesn't exist
    CREATE TABLE public.user_settings (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      start_balance NUMERIC DEFAULT 0,
      primary_color TEXT DEFAULT '#4A90E2',
      secondary_color TEXT DEFAULT '#111',
      background_color TEXT DEFAULT '#FFFFFF',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
  ELSE
    -- If table exists but missing columns, alter it to add them
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'background_color'
      ) THEN
        ALTER TABLE public.user_settings ADD COLUMN background_color TEXT DEFAULT '#FFFFFF';
      END IF;
      
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'primary_color'
      ) THEN
        ALTER TABLE public.user_settings ADD COLUMN primary_color TEXT DEFAULT '#4A90E2';
      END IF;
      
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'secondary_color'
      ) THEN
        ALTER TABLE public.user_settings ADD COLUMN secondary_color TEXT DEFAULT '#111';
      END IF;
    END $$;
  END IF;
END
$$;

-- Enable RLS on user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;

CREATE POLICY "Users can view their own settings"
ON user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON user_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS TABLE (BUCHUNGEN)
-- Check if buchungen table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'buchungen'
  ) THEN
    -- Create buchungen table if it doesn't exist
    CREATE TABLE public.buchungen (
      id UUID PRIMARY KEY,
      date TIMESTAMP WITH TIME ZONE NOT NULL,
      details TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('Incoming', 'Outgoing')),
      modified BOOLEAN DEFAULT FALSE,
      kategorie TEXT,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.buchungen IS 'Financial transactions for users';
  END IF;
END
$$;

-- Enable RLS on buchungen
ALTER TABLE buchungen ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON buchungen;
DROP POLICY IF EXISTS "Users can update their own transactions" ON buchungen;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON buchungen;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON buchungen;

CREATE POLICY "Users can view their own transactions"
ON buchungen FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON buchungen FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON buchungen FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON buchungen FOR DELETE
USING (auth.uid() = user_id);

-- FIXED COSTS TABLE (FIXKOSTEN)
-- Check if fixkosten table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'fixkosten'
  ) THEN
    -- Create fixkosten table if it doesn't exist
    CREATE TABLE public.fixkosten (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      betrag NUMERIC NOT NULL,
      rhythmus TEXT NOT NULL CHECK (rhythmus IN ('monatlich', 'quartalsweise', 'halbjährlich', 'jährlich')),
      start TIMESTAMP WITH TIME ZONE NOT NULL,
      enddatum TIMESTAMP WITH TIME ZONE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.fixkosten IS 'Recurring fixed costs for financial planning';
  END IF;
END
$$;

-- Enable RLS on fixkosten
ALTER TABLE fixkosten ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view their own fixed costs" ON fixkosten;
DROP POLICY IF EXISTS "Users can update their own fixed costs" ON fixkosten;
DROP POLICY IF EXISTS "Users can insert their own fixed costs" ON fixkosten;
DROP POLICY IF EXISTS "Users can delete their own fixed costs" ON fixkosten;

CREATE POLICY "Users can view their own fixed costs"
ON fixkosten FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own fixed costs"
ON fixkosten FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fixed costs"
ON fixkosten FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fixed costs"
ON fixkosten FOR DELETE
USING (auth.uid() = user_id);

-- EMPLOYEES TABLE (MITARBEITER)
-- Check if mitarbeiter table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'mitarbeiter'
  ) THEN
    -- Create mitarbeiter table if it doesn't exist
    CREATE TABLE public.mitarbeiter (
      id UUID PRIMARY KEY,
      Name TEXT NOT NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.mitarbeiter IS 'Employee data for salary planning';
  END IF;
END
$$;

-- Enable RLS on mitarbeiter
ALTER TABLE mitarbeiter ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view their own employees" ON mitarbeiter;
DROP POLICY IF EXISTS "Users can update their own employees" ON mitarbeiter;
DROP POLICY IF EXISTS "Users can insert their own employees" ON mitarbeiter;
DROP POLICY IF EXISTS "Users can delete their own employees" ON mitarbeiter;

CREATE POLICY "Users can view their own employees"
ON mitarbeiter FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own employees"
ON mitarbeiter FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own employees"
ON mitarbeiter FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own employees"
ON mitarbeiter FOR DELETE
USING (auth.uid() = user_id);

-- SALARY DATA TABLE (LOHNDATEN)
-- Check if lohndaten table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'lohndaten'
  ) THEN
    -- Create lohndaten table if it doesn't exist
    CREATE TABLE public.lohndaten (
      id UUID PRIMARY KEY,
      mitarbeiter_id UUID REFERENCES mitarbeiter(id) ON DELETE CASCADE,
      Start TIMESTAMP WITH TIME ZONE NOT NULL,
      Ende TIMESTAMP WITH TIME ZONE,
      Betrag NUMERIC NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.lohndaten IS 'Salary data for employees';
  END IF;
END
$$;

-- Enable RLS on lohndaten
ALTER TABLE lohndaten ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for lohndaten based on mitarbeiter permission
DROP POLICY IF EXISTS "Users can view their own employee salary data" ON lohndaten;
DROP POLICY IF EXISTS "Users can update their own employee salary data" ON lohndaten;
DROP POLICY IF EXISTS "Users can insert their own employee salary data" ON lohndaten;
DROP POLICY IF EXISTS "Users can delete their own employee salary data" ON lohndaten;

CREATE POLICY "Users can view their own employee salary data"
ON lohndaten FOR SELECT
USING (EXISTS (
  SELECT 1 FROM mitarbeiter
  WHERE mitarbeiter.id = lohndaten.mitarbeiter_id
  AND mitarbeiter.user_id = auth.uid()
));

CREATE POLICY "Users can update their own employee salary data"
ON lohndaten FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM mitarbeiter
  WHERE mitarbeiter.id = lohndaten.mitarbeiter_id
  AND mitarbeiter.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own employee salary data"
ON lohndaten FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM mitarbeiter
  WHERE mitarbeiter.id = mitarbeiter_id
  AND mitarbeiter.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own employee salary data"
ON lohndaten FOR DELETE
USING (EXISTS (
  SELECT 1 FROM mitarbeiter
  WHERE mitarbeiter.id = lohndaten.mitarbeiter_id
  AND mitarbeiter.user_id = auth.uid()
));

-- SIMULATIONS TABLE (SIMULATIONEN)
-- Check if simulationen table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'simulationen'
  ) THEN
    -- Create simulationen table if it doesn't exist
    CREATE TABLE public.simulationen (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      details TEXT NOT NULL,
      date TIMESTAMP WITH TIME ZONE NOT NULL,
      amount NUMERIC NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('Incoming', 'Outgoing')),
      recurring BOOLEAN DEFAULT FALSE,
      interval TEXT CHECK (interval IN ('monthly', 'quarterly', 'yearly')),
      end_date TIMESTAMP WITH TIME ZONE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.simulationen IS 'Financial simulations for what-if scenarios';
  END IF;
END
$$;

-- Enable RLS on simulationen
ALTER TABLE simulationen ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view their own simulations" ON simulationen;
DROP POLICY IF EXISTS "Users can update their own simulations" ON simulationen;
DROP POLICY IF EXISTS "Users can insert their own simulations" ON simulationen;
DROP POLICY IF EXISTS "Users can delete their own simulations" ON simulationen;

CREATE POLICY "Users can view their own simulations"
ON simulationen FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulations"
ON simulationen FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own simulations"
ON simulationen FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulations"
ON simulationen FOR DELETE
USING (auth.uid() = user_id);

-- SCENARIOS TABLE
-- Check if scenarios table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'scenarios'
  ) THEN
    -- Create scenarios table if it doesn't exist
    CREATE TABLE public.scenarios (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      simulation_ids TEXT[] NOT NULL,
      projection_months INTEGER DEFAULT 12,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.scenarios IS 'Saved simulation scenarios for financial projections';
  END IF;
END
$$;

-- Enable RLS on scenarios
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can update their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can insert their own scenarios" ON scenarios;
DROP POLICY IF EXISTS "Users can delete their own scenarios" ON scenarios;

CREATE POLICY "Users can view their own scenarios"
ON scenarios FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
ON scenarios FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenarios"
ON scenarios FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
ON scenarios FOR DELETE
USING (auth.uid() = user_id); 