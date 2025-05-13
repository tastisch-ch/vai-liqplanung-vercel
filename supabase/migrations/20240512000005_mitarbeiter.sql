-- MITARBEITER TABLE (EMPLOYEES)
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
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vorname TEXT NOT NULL,
      nachname TEXT NOT NULL,
      email TEXT,
      telefon TEXT,
      position TEXT,
      eintrittsdatum DATE NOT NULL,
      austrittsdatum DATE,
      prozent NUMERIC DEFAULT 100, -- Employment percentage (100% = full time)
      notizen TEXT,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.mitarbeiter IS 'Employee information for HR and payroll';
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