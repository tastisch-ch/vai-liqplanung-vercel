-- Add category field to fixkosten table
ALTER TABLE fixkosten ADD COLUMN IF NOT EXISTS kategorie VARCHAR(50);

-- Add default categories to existing records
UPDATE fixkosten SET kategorie = 'Allgemein' WHERE kategorie IS NULL;

-- Create an index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_fixkosten_kategorie ON fixkosten(kategorie);

-- Comment the column to explain its purpose
COMMENT ON COLUMN fixkosten.kategorie IS 'Category of fixed cost for analysis and filtering (e.g., Miete, Gehälter, Versicherungen)'; 