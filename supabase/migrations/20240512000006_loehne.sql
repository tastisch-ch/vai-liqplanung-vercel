-- LÖHNE TABLE (SALARIES)
-- Check if loehne table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'loehne'
  ) THEN
    -- Create loehne table if it doesn't exist
    CREATE TABLE public.loehne (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mitarbeiter_id UUID REFERENCES public.mitarbeiter(id) ON DELETE CASCADE,
      datum DATE NOT NULL,
      bruttolohn NUMERIC NOT NULL,
      ahv_iv_eo NUMERIC, -- Social security contributions
      alv NUMERIC, -- Unemployment insurance
      nbu NUMERIC, -- Non-occupational accident insurance
      pensionskasse NUMERIC, -- Pension fund
      quellensteuer NUMERIC, -- Withholding tax
      sonstige_abzuege NUMERIC, -- Other deductions
      nettolohn NUMERIC, -- Net salary
      bezahlt BOOLEAN DEFAULT FALSE, -- Payment status
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add comment
    COMMENT ON TABLE public.loehne IS 'Employee salary records with gross and net amounts';
  END IF;
END
$$;

-- Enable RLS on loehne
ALTER TABLE loehne ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Users can view their own salary records" ON loehne;
DROP POLICY IF EXISTS "Users can update their own salary records" ON loehne;
DROP POLICY IF EXISTS "Users can insert their own salary records" ON loehne;
DROP POLICY IF EXISTS "Users can delete their own salary records" ON loehne;

CREATE POLICY "Users can view their own salary records"
ON loehne FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own salary records"
ON loehne FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own salary records"
ON loehne FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own salary records"
ON loehne FOR DELETE
USING (auth.uid() = user_id); 