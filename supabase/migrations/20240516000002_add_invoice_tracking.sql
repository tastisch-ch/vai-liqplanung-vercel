-- Add invoice tracking fields to buchungen table
ALTER TABLE buchungen 
  ADD COLUMN IF NOT EXISTS invoice_id text,
  ADD COLUMN IF NOT EXISTS is_invoice boolean DEFAULT false;

-- Unique per user for active invoices (open invoices tracked from Excel)
DO 54870
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 
