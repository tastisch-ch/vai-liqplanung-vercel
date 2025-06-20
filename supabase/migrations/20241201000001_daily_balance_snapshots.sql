-- DAILY BALANCE SNAPSHOTS SYSTEM
-- This migration creates a new system for tracking daily balance snapshots
-- to maintain historical integrity of balance calculations

-- Create daily balance snapshots table
CREATE TABLE IF NOT EXISTS public.daily_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  balance NUMERIC NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(date, user_id)
);

-- Create current balance reference table for quick access
CREATE TABLE IF NOT EXISTS public.current_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.daily_balance_snapshots IS 'Daily balance snapshots to maintain historical integrity';
COMMENT ON TABLE public.current_balance IS 'Current balance reference for quick access';

-- Enable RLS on both tables
ALTER TABLE daily_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_balance ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for daily_balance_snapshots
DROP POLICY IF EXISTS "Users can view their own daily balance snapshots" ON daily_balance_snapshots;
DROP POLICY IF EXISTS "Users can update their own daily balance snapshots" ON daily_balance_snapshots;
DROP POLICY IF EXISTS "Users can insert their own daily balance snapshots" ON daily_balance_snapshots;
DROP POLICY IF EXISTS "Users can delete their own daily balance snapshots" ON daily_balance_snapshots;

CREATE POLICY "Users can view their own daily balance snapshots"
ON daily_balance_snapshots FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily balance snapshots"
ON daily_balance_snapshots FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily balance snapshots"
ON daily_balance_snapshots FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily balance snapshots"
ON daily_balance_snapshots FOR DELETE
USING (auth.uid() = user_id);

-- Add RLS policies for current_balance
DROP POLICY IF EXISTS "Users can view their own current balance" ON current_balance;
DROP POLICY IF EXISTS "Users can update their own current balance" ON current_balance;
DROP POLICY IF EXISTS "Users can insert their own current balance" ON current_balance;
DROP POLICY IF EXISTS "Users can delete their own current balance" ON current_balance;

CREATE POLICY "Users can view their own current balance"
ON current_balance FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own current balance"
ON current_balance FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own current balance"
ON current_balance FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own current balance"
ON current_balance FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_balance_snapshots_user_date 
ON daily_balance_snapshots(user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_balance_snapshots_date 
ON daily_balance_snapshots(date);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_daily_balance_snapshots_updated_at ON daily_balance_snapshots;
DROP TRIGGER IF EXISTS update_current_balance_updated_at ON current_balance;

CREATE TRIGGER update_daily_balance_snapshots_updated_at
    BEFORE UPDATE ON daily_balance_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_current_balance_updated_at
    BEFORE UPDATE ON current_balance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 