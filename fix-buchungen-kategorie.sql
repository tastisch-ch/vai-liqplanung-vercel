-- Fix for buchungen table to add the missing kategorie column
BEGIN;

-- Check if kategorie column exists, if not add it
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

-- Ensure consistent capitalization/naming in the buchungen table
-- Only rename if the column capitalization is different
DO $$
DECLARE
    col_exists boolean;
    col_name text;
BEGIN
    -- Check and fix user_id if needed
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'buchungen' AND column_name = 'user_id' 
        AND column_name != 'user_id'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Find the actual column name with different capitalization
        SELECT column_name INTO col_name 
        FROM information_schema.columns 
        WHERE table_name = 'buchungen' 
        AND lower(column_name) = 'user_id';
        
        IF col_name IS NOT NULL AND col_name != 'user_id' THEN
            EXECUTE format('ALTER TABLE buchungen RENAME COLUMN "%s" TO user_id', col_name);
            RAISE NOTICE 'Renamed column % to user_id', col_name;
        END IF;
    END IF;
    
    -- Same for other columns - only trying to fix kategorie which is the one we need
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'buchungen' AND lower(column_name) = 'kategorie' 
        AND column_name != 'kategorie'
    ) INTO col_exists;
    
    IF col_exists THEN
        -- Find the actual column name with different capitalization
        SELECT column_name INTO col_name 
        FROM information_schema.columns 
        WHERE table_name = 'buchungen' 
        AND lower(column_name) = 'kategorie';
        
        IF col_name IS NOT NULL AND col_name != 'kategorie' THEN
            EXECUTE format('ALTER TABLE buchungen RENAME COLUMN "%s" TO kategorie', col_name);
            RAISE NOTICE 'Renamed column % to kategorie', col_name;
        END IF;
    END IF;
END $$;

-- Create index on user_id for better query performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'buchungen' AND indexname = 'buchungen_user_id_idx'
    ) THEN
        CREATE INDEX buchungen_user_id_idx ON buchungen(user_id);
        RAISE NOTICE 'Created index on buchungen.user_id';
    ELSE
        RAISE NOTICE 'Index on buchungen.user_id already exists';
    END IF;
END $$;

-- Ensure RLS is properly configured
-- First, enable RLS on buchungen table if not already enabled
ALTER TABLE buchungen ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view their own transactions" ON buchungen;
DROP POLICY IF EXISTS "Users can update their own transactions" ON buchungen;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON buchungen;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON buchungen;

-- Create RLS policies
CREATE POLICY "Users can view their own transactions"
ON buchungen FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON buchungen FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON buchungen FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON buchungen FOR DELETE
USING (auth.uid() = user_id);

COMMIT;

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