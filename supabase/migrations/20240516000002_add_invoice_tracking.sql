-- Add invoice tracking fields to buchungen table
ALTER TABLE buchungen 
  ADD COLUMN IF NOT EXISTS invoice_id text,
  ADD COLUMN IF NOT EXISTS is_invoice boolean DEFAULT false;

-- Create index for invoice lookups
CREATE INDEX IF NOT EXISTS idx_buchungen_invoice_id 
  ON buchungen(user_id, invoice_id) 
  WHERE is_invoice = true;

-- Create index for invoice queries
CREATE INDEX IF NOT EXISTS idx_buchungen_is_invoice 
  ON buchungen(user_id, is_invoice) 
  WHERE is_invoice = true;