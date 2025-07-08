-- Add is_simulation column to buchungen table
ALTER TABLE buchungen ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN DEFAULT FALSE;

-- Update existing simulation transactions
UPDATE buchungen SET is_simulation = TRUE WHERE kategorie = 'Simulation'; 