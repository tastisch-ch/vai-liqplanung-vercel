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