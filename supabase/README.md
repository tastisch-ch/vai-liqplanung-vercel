# Supabase Configuration for VAI-LIQ

This directory contains the Supabase configuration for the VAI-LIQ financial planning application.

## Directory Structure

- `migrations/`: SQL migration files for database schema
- `seed.sql`: Sample data to populate the database for testing
- `functions/`: Edge functions (serverless functions)
- `config.toml`: Supabase configuration

## Database Structure

The application uses the following tables:

1. `profiles`: User profile information linked to auth.users
2. `user_settings`: User-specific settings like initial balance and theme colors
3. `buchungen`: Financial transactions
4. `fixkosten`: Recurring fixed costs
5. `mitarbeiter`: Employee information
6. `lohndaten`: Salary data for employees
7. `simulationen`: Financial simulation data
8. `scenarios`: Saved simulation scenarios for what-if analysis

## Setting Up Supabase

### Prerequisites

1. Supabase CLI installed: `brew install supabase/tap/supabase`
2. A Supabase project created at [supabase.com](https://supabase.com)

### Initial Setup

1. Link your project:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD
   ```

2. Push the database schema:

   ```bash
   supabase db push
   ```

3. Optional: Seed with test data:

   ```bash
   supabase db reset
   ```

### Development Workflow

1. Create new migrations:

   ```bash
   supabase migration new <migration_name>
   ```

2. Apply migrations:

   ```bash
   supabase db push
   ```

## Row Level Security (RLS)

All tables have Row Level Security (RLS) policies that ensure users can only access their own data:

- Users can only view their own data
- Users can only insert their own data
- Users can only update their own data
- Users can only delete their own data

## Troubleshooting

- Check Supabase logs with `supabase logs`
- Test locally with `supabase start` (requires Docker)
- View database changes with `supabase db diff` 