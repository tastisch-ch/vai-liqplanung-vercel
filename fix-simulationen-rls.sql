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
    
    -- Enable RLS on simulationen
    ALTER TABLE simulationen ENABLE ROW LEVEL SECURITY;
    
    -- Add RLS policies
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
    
    -- Add comment
    COMMENT ON TABLE public.simulationen IS 'Financial simulations for what-if scenarios';
  END IF;
END
$$;

-- Fix Row Level Security policies for the simulationen table
DO $$
BEGIN
  -- First ensure the table has RLS enabled
  ALTER TABLE public.simulationen ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies to avoid conflicts
  DROP POLICY IF EXISTS "Users can view their own simulations" ON public.simulationen;
  DROP POLICY IF EXISTS "Users can update their own simulations" ON public.simulationen;
  DROP POLICY IF EXISTS "Users can insert their own simulations" ON public.simulationen;
  DROP POLICY IF EXISTS "Users can delete their own simulations" ON public.simulationen;
  DROP POLICY IF EXISTS "Authenticated users can view all simulations" ON public.simulationen;
  
  -- Create new policies with proper permissions
  
  -- Allow all authenticated users to view all simulations
  CREATE POLICY "Authenticated users can view all simulations"
    ON public.simulationen FOR SELECT
    USING (auth.role() = 'authenticated');
  
  -- Allow users to insert their own records
  CREATE POLICY "Users can insert their own simulations"
    ON public.simulationen FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  
  -- Allow users to update their own records
  CREATE POLICY "Users can update their own simulations"
    ON public.simulationen FOR UPDATE
    USING (auth.uid() = user_id);
  
  -- Allow users to delete their own records
  CREATE POLICY "Users can delete their own simulations"
    ON public.simulationen FOR DELETE
    USING (auth.uid() = user_id);
  
  RAISE NOTICE 'RLS policies for simulationen table updated';
END
$$; 