# Fixing Supabase RLS Infinite Recursion Issue

This document explains how to fix the "infinite recursion detected in policy for relation 'profiles'" error you're experiencing with Supabase.

## What's Happening

The error occurs because one of your Row Level Security (RLS) policies on the `profiles` table is causing an infinite loop. This typically happens when:

1. A policy queries the same table it's protecting (self-reference)
2. The policy uses another table which itself has a policy that queries back to the original table (circular reference)

## Solution Steps

### Option 1: Run the SQL Fix Script (Recommended)

We've created a SQL script that removes the problematic policies and creates simple, non-recursive ones:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the content from `fix-profiles-rls.sql`
4. Run the script

### Option 2: Manual Fix in the Supabase Dashboard

If you prefer using the UI:

1. Log in to your Supabase dashboard
2. Go to "Authentication" → "Policies"
3. Find the `profiles` table in the list
4. Delete all existing policies for the `profiles` table
5. Create new, simple policies:
   - For SELECT: `auth.uid() = id`
   - For UPDATE: `auth.uid() = id`
   - For INSERT: `auth.uid() = id`

## Code Changes

We've also updated your application code to handle these errors gracefully:

1. `AuthProvider.tsx`: Now continues authentication even if profile loading fails
2. `client-auth.ts`: Now returns a fallback profile when RLS errors occur
3. `user-settings.ts`: Now returns default settings when database errors occur

## Verify the Fix

After applying these changes:

1. Restart your Next.js app
2. Try logging in again
3. Check the console for errors

The app should now work properly without the infinite recursion errors.

## Additional Database Setup

If you're setting up a new Supabase project, make sure to create necessary tables and policies:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  start_balance NUMERIC DEFAULT 0,
  primary_color TEXT DEFAULT '#4A90E2',
  secondary_color TEXT DEFAULT '#111',
  background_color TEXT DEFAULT '#FFFFFF',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Add simple policies for user_settings
CREATE POLICY "Users can view their own settings"
ON user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON user_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);
``` 