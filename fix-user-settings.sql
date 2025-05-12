-- Check if user_settings table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'user_settings'
  ) THEN
    -- Create user_settings table if it doesn't exist
    CREATE TABLE public.user_settings (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      start_balance NUMERIC DEFAULT 0,
      primary_color TEXT DEFAULT '#4A90E2',
      secondary_color TEXT DEFAULT '#111',
      background_color TEXT DEFAULT '#FFFFFF',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Enable RLS on user_settings
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
    
    -- Add RLS policies
    CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
    
  ELSE
    -- If table exists but missing columns, alter it to add them
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'background_color'
      ) THEN
        ALTER TABLE public.user_settings ADD COLUMN background_color TEXT DEFAULT '#FFFFFF';
      END IF;
      
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'primary_color'
      ) THEN
        ALTER TABLE public.user_settings ADD COLUMN primary_color TEXT DEFAULT '#4A90E2';
      END IF;
      
      IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'secondary_color'
      ) THEN
        ALTER TABLE public.user_settings ADD COLUMN secondary_color TEXT DEFAULT '#111';
      END IF;
    END $$;
  END IF;
END
$$; 