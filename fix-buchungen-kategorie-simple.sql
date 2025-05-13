-- Simple fix to add kategorie column to buchungen table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'buchungen' AND column_name = 'kategorie'
    ) THEN
        ALTER TABLE buchungen ADD COLUMN kategorie TEXT;
        RAISE NOTICE 'Added kategorie column to buchungen table';
    ELSE
        RAISE NOTICE 'kategorie column already exists in buchungen table';
    END IF;
END $$;

-- Output verification query
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'buchungen'
ORDER BY 
    ordinal_position; 