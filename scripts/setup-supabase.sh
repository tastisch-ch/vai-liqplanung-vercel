#!/bin/bash

# Setup script for linking and deploying Supabase database structure
# This script will help setup the Supabase database for the VAI-LIQ financial planning app

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}VAI-LIQ Supabase Database Setup${NC}"
echo -e "This script will help you set up your Supabase database structure."
echo -e "Make sure you have the following information ready:\n"
echo -e "1. Your Supabase project reference ID (from your dashboard URL)"
echo -e "2. Your Supabase database password"
echo -e "3. Supabase auth token (from your dashboard)\n"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Supabase CLI is not installed.${NC}"
    echo -e "Please install it first using:"
    echo -e "${BLUE}brew install supabase/tap/supabase${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Step 1: Linking your Supabase project${NC}"
echo -e "Run the following command, replacing the placeholders with your actual values:"
echo -e "${BLUE}supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD${NC}"
echo -e "Example: supabase link --project-ref abcdefghijklm --password db_password123"

echo -e "\n${YELLOW}Step 2: Applying database migrations${NC}"
echo -e "After linking your project, run:"
echo -e "${BLUE}supabase db push${NC}"
echo -e "This will apply all database migrations in the supabase/migrations directory."

echo -e "\n${YELLOW}Step 3: Seeding your database with sample data (optional)${NC}"
echo -e "If you want to add some sample data for testing:"
echo -e "${BLUE}supabase db reset${NC}"
echo -e "Warning: This will reset your database and apply migrations, then seed it with data."

echo -e "\n${YELLOW}Step 4: Verifying your database structure${NC}"
echo -e "To check if everything was set up correctly, check your Supabase dashboard."
echo -e "Go to: Table Editor and verify that all tables exist with proper RLS policies."

echo -e "\n${GREEN}Setup guide completed!${NC}"
echo -e "For more information, visit: https://supabase.com/docs/reference/cli/usage" 