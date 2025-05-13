-- Create user_settings table for storing persistent user preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  primary_color VARCHAR(20) NOT NULL DEFAULT '#02403D',
  secondary_color VARCHAR(20) NOT NULL DEFAULT '#000',
  background_color VARCHAR(20) NOT NULL DEFAULT '#fff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id)
);

-- Add appropriate RLS policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can read and update only their own settings
CREATE POLICY "Users can view own settings" 
  ON user_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
  ON user_settings FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can insert their own settings (but not others')
CREATE POLICY "Users can insert own settings" 
  ON user_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow the service role to access all settings for admin functions
CREATE POLICY "Service role can manage all settings" 
  ON user_settings 
  USING (auth.role() = 'service_role'); 