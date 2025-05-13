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