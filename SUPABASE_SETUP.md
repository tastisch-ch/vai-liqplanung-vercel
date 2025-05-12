# Supabase Database Setup

This document provides instructions for setting up the Supabase database for the financial planning application.

## Prerequisites

- Supabase CLI installed
- Access to the Supabase project

## Setup Instructions

1. **Connect to your Supabase project**

   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Run the setup script**

   The easiest way to set up all tables is to run the provided script:

   ```bash
   chmod +x setup-supabase-database.sh
   ./setup-supabase-database.sh
   ```

   This script will create all necessary tables with proper Row Level Security (RLS) policies using the combined SQL file.

3. **Verify the tables**

   You can verify the tables were created correctly by querying them in the Supabase dashboard.

## Alternative Setup Methods

### Individual SQL Files

If you prefer to run the individual SQL files, use the `--individual` flag:

```bash
./setup-supabase-database.sh --individual
```

### Direct SQL Execution

You can also execute the combined SQL file directly:

```bash
psql -f setup-all-tables.sql
```

Or run individual SQL files:

1. **Create the profiles table**

   ```bash
   psql -f fix-profiles-rls.sql
   ```

2. **Create the user settings table**

   ```bash
   psql -f fix-user-settings.sql
   ```

3. **Create the transactions table**

   ```bash
   psql -f fix-buchungen-rls.sql
   ```

4. **Create the fixed costs table**

   ```bash
   psql -f fix-fixkosten-rls.sql
   ```

5. **Create the employees and salary tables**

   ```bash
   psql -f fix-mitarbeiter-rls.sql
   ```

6. **Create the simulations table**

   ```bash
   psql -f fix-simulationen-rls.sql
   ```

7. **Create the scenarios table**

   ```bash
   psql -f fix-scenarios.sql
   ```

## Tables Overview

The database includes the following tables:

1. **profiles** - User profile information
2. **user_settings** - User-specific settings like initial balance and theme colors
3. **buchungen** - Financial transactions
4. **fixkosten** - Recurring fixed costs
5. **mitarbeiter** - Employee information
6. **lohndaten** - Salary data for employees
7. **simulationen** - Financial simulation data
8. **scenarios** - Saved simulation scenarios for what-if analysis

## Row Level Security (RLS)

All tables have Row Level Security (RLS) policies in place to ensure users can only access their own data. The policies follow these principles:

- Users can only view their own data
- Users can only modify their own data
- Users can only delete their own data

## Troubleshooting

If you encounter any issues, check the Supabase dashboard for error messages or run the SQL files manually to see any specific errors. 