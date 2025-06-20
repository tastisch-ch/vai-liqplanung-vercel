-- GLOBAL BALANCE SYSTEM
-- This migration converts the balance system to be global (shared across all users)
-- instead of user-specific

-- Drop existing RLS policies that restrict access to user_id
DROP POLICY IF EXISTS "Users can view their own daily balance snapshots" ON daily_balance_snapshots;
DROP POLICY IF EXISTS "Users can update their own daily balance snapshots" ON daily_balance_snapshots;
DROP POLICY IF EXISTS "Users can insert their own daily balance snapshots" ON daily_balance_snapshots;
DROP POLICY IF EXISTS "Users can delete their own daily balance snapshots" ON daily_balance_snapshots;

DROP POLICY IF EXISTS "Users can view their own current balance" ON current_balance;
DROP POLICY IF EXISTS "Users can update their own current balance" ON current_balance;
DROP POLICY IF EXISTS "Users can insert their own current balance" ON current_balance;
DROP POLICY IF EXISTS "Users can delete their own current balance" ON current_balance;

-- Create new policies that allow authenticated users to access all balance data
CREATE POLICY "Authenticated users can view all daily balance snapshots"
ON daily_balance_snapshots FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update all daily balance snapshots"
ON daily_balance_snapshots FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert daily balance snapshots"
ON daily_balance_snapshots FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete daily balance snapshots"
ON daily_balance_snapshots FOR DELETE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view current balance"
ON current_balance FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update current balance"
ON current_balance FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert current balance"
ON current_balance FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete current balance"
ON current_balance FOR DELETE
USING (auth.role() = 'authenticated');

-- Insert initial global balance entry if it doesn't exist
INSERT INTO public.current_balance (user_id, balance, effective_date, updated_at)
VALUES ('global', 0, CURRENT_DATE, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Update table comments to reflect global nature
COMMENT ON TABLE public.daily_balance_snapshots IS 'Global daily balance snapshots shared across all users';
COMMENT ON TABLE public.current_balance IS 'Global current balance reference for quick access (shared system)'; 