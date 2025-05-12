# Supabase RLS Testing Tools

This folder contains tools to help diagnose and fix Row Level Security (RLS) issues with your Supabase database.

## Problem

When you get the error:

```
Failed to add fixed cost: new row violates row-level security policy for table "fixkosten"
```

It means that Supabase's RLS policy is preventing the operation, typically because:

1. The user isn't authenticated correctly
2. The RLS policy isn't set up correctly
3. The user_id in the inserted row doesn't match auth.uid()

## Setup

```bash
# Install dependencies
npm install

# Update credentials in the test scripts:
# Edit test-supabase-rls.js and update:
const USER_EMAIL = 'your-real-user@example.com';
const USER_PASSWORD = 'your-real-password';
```

## Running Tests

```bash
# Simple connection test (no authentication needed)
node simple-supabase-test.js

# Full RLS test (requires authentication)
node test-supabase-rls.js
```

## SQL Files

1. **auth-uid-function.sql**: Contains SQL to create a helper function that returns auth.uid() value
2. **../fix-fixkosten-rls.sql**: SQL to fix RLS policies for the fixkosten table

## How to Fix RLS Issues

1. Run the simple test first to verify basic connectivity
2. Run the RLS test to identify specific auth/permission issues
3. Apply the SQL fixes to your Supabase database:
   - Go to Supabase Dashboard > SQL Editor
   - Copy the contents of fix-fixkosten-rls.sql
   - Run the SQL
   - Refresh your policies page to confirm changes

## Debugging

Common issues:
- Ensure you are authenticated (the user must be logged in)
- Verify auth.uid() matches the user_id in your insert/update operations
- Check that the RLS policies exist and are correctly configured
- The table must have RLS enabled 