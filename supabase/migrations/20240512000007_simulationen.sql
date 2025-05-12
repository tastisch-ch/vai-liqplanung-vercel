-- SIMULATIONEN TABLE (SIMULATIONS)
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
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      beschreibung TEXT,
      start_datum DATE NOT NULL,
      end_datum DATE NOT NULL,
      start_betrag NUMERIC NOT NULL,
      simulation_data JSONB, -- Stores the complete simulation data
      is_active BOOLEAN DEFAULT FALSE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.simulationen IS 'Financial simulations and forecasts';
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