-- FIXED COSTS TABLE (FIXKOSTEN) RLS POLICY FIX
-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own fixed costs" ON fixkosten;
DROP POLICY IF EXISTS "Users can update their own fixed costs" ON fixkosten;
DROP POLICY IF EXISTS "Users can insert their own fixed costs" ON fixkosten;
DROP POLICY IF EXISTS "Users can delete their own fixed costs" ON fixkosten;

-- Make sure RLS is enabled
ALTER TABLE fixkosten ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
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

-- Grant temporary access to superuser for debugging (remove in production)
-- This is optional and should be used only for testing if still having issues
-- CREATE POLICY "Temporary full access policy" ON fixkosten USING (true);

-- Verify structure of fixkosten table
SELECT
  column_name,
  data_type,
  is_nullable
FROM
  information_schema.columns
WHERE
  table_schema = 'public'
  AND table_name = 'fixkosten';

-- List current policies
SELECT * FROM pg_policies WHERE tablename = 'fixkosten'; 