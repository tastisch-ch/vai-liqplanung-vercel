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
    
    -- Enable RLS on mitarbeiter
    ALTER TABLE mitarbeiter ENABLE ROW LEVEL SECURITY;
    
    -- Add RLS policies
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
    
    -- Add comment
    COMMENT ON TABLE public.mitarbeiter IS 'Employee data for salary planning';
  END IF;
END
$$;

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
    
    -- Enable RLS on lohndaten
    ALTER TABLE lohndaten ENABLE ROW LEVEL SECURITY;
    
    -- Add RLS policies for lohndaten based on mitarbeiter permission
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
    
    -- Add comment
    COMMENT ON TABLE public.lohndaten IS 'Salary data for employees';
  END IF;
END
$$; 