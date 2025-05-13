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