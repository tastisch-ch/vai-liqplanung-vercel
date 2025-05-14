-- Create the fixkosten_overrides table to store exceptions for specific fixkosten transactions
CREATE TABLE IF NOT EXISTS fixkosten_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixkosten_id UUID NOT NULL REFERENCES fixkosten(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  new_date DATE,
  new_amount DECIMAL(15, 2),
  is_skipped BOOLEAN DEFAULT false,
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index on fixkosten_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_fixkosten_overrides_fixkosten_id ON fixkosten_overrides(fixkosten_id);

-- Index on original_date for faster lookups
CREATE INDEX IF NOT EXISTS idx_fixkosten_overrides_original_date ON fixkosten_overrides(original_date);

-- Ensure only one override per fixkosten_id + original_date combination
ALTER TABLE fixkosten_overrides ADD CONSTRAINT unique_fixkosten_override 
  UNIQUE (fixkosten_id, original_date);

-- Add RLS policies for fixkosten_overrides
ALTER TABLE fixkosten_overrides ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all authenticated users to view all overrides
CREATE POLICY "Authenticated users can view all fixkosten_overrides" ON fixkosten_overrides
  FOR SELECT TO authenticated USING (true);

-- Create a policy to allow authenticated users to insert their own overrides
CREATE POLICY "Authenticated users can insert their own fixkosten_overrides" ON fixkosten_overrides
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create a policy to allow authenticated users to update their own overrides
CREATE POLICY "Authenticated users can update their own fixkosten_overrides" ON fixkosten_overrides
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create a policy to allow authenticated users to delete their own overrides
CREATE POLICY "Authenticated users can delete their own fixkosten_overrides" ON fixkosten_overrides
  FOR DELETE TO authenticated USING (auth.uid() = user_id); 