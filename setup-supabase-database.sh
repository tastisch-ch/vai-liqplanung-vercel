#!/bin/bash

# Setup script for Supabase database tables and policies
# This script should be run after connecting to Supabase instance

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up Supabase database tables and RLS policies...${NC}"

# Option to run individual files or combined file
if [ "$1" == "--individual" ]; then
  # Run SQL files in order
  SQL_FILES=(
    "fix-profiles-rls.sql"
    "fix-user-settings.sql"
    "fix-buchungen-rls.sql"
    "fix-fixkosten-rls.sql"
    "fix-mitarbeiter-rls.sql"
    "fix-simulationen-rls.sql"
    "fix-scenarios.sql"
  )

  # Loop through SQL files and execute them
  for file in "${SQL_FILES[@]}"; do
    if [ -f "$file" ]; then
      echo -e "${GREEN}Executing $file...${NC}"
      psql -f "$file"
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully executed $file${NC}"
      else
        echo -e "${RED}Error executing $file${NC}"
        exit 1
      fi
    else
      echo -e "${RED}File $file not found${NC}"
      exit 1
    fi
  done
else
  # Run the combined file
  COMBINED_FILE="setup-all-tables.sql"
  
  if [ -f "$COMBINED_FILE" ]; then
    echo -e "${GREEN}Executing combined database setup file...${NC}"
    psql -f "$COMBINED_FILE"
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Successfully executed database setup${NC}"
    else
      echo -e "${RED}Error setting up database${NC}"
      exit 1
    fi
  else
    echo -e "${RED}File $COMBINED_FILE not found${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}Database setup completed successfully!${NC}" 