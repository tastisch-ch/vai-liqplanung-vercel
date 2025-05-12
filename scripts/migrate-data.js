#!/usr/bin/env node

/**
 * Data Migration Script
 * 
 * This script migrates data from the Python Streamlit app to the Next.js app.
 * It reads data from the Python app's database file and inserts it into Supabase.
 * 
 * Usage:
 * node scripts/migrate-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const PYTHON_APP_PATH = '../VAI-liq-planung'; // Path to the Python app
const TABLES_TO_MIGRATE = [
  { name: 'buchungen', primaryKey: 'id' },
  { name: 'fixkosten', primaryKey: 'id' },
  { name: 'mitarbeiter', primaryKey: 'id' },
  { name: 'profiles', primaryKey: 'id' }
];

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Extract data from Python app using a Python script
async function extractDataFromPythonApp() {
  console.log('Extracting data from Python app...');
  
  // Create a temporary Python script to extract data
  const extractScript = `
import json
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Load environment from Python app
sys.path.append("${PYTHON_APP_PATH}")
load_dotenv("${PYTHON_APP_PATH}/.env")

# Connect to Supabase using credentials from Python app
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

# Extract data from tables
data = {}
tables = ["buchungen", "fixkosten", "mitarbeiter", "profiles"]

for table in tables:
    try:
        response = supabase.table(table).select("*").execute()
        data[table] = response.data
        print(f"Extracted {len(response.data)} records from {table}")
    except Exception as e:
        print(f"Error extracting data from {table}: {e}")
        data[table] = []

# Write data to a JSON file
with open("migration-data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Data extraction complete. Data saved to migration-data.json")
  `;
  
  fs.writeFileSync('extract-data.py', extractScript);
  
  try {
    console.log('Running Python extraction script...');
    const output = execSync('python extract-data.py', { encoding: 'utf-8' });
    console.log(output);
    
    // Read the extracted data
    const data = JSON.parse(fs.readFileSync('migration-data.json', 'utf-8'));
    return data;
  } catch (error) {
    console.error('Error extracting data:', error.message);
    const useManualOption = await askQuestion('Would you like to continue with manual data entry? (y/n): ');
    if (useManualOption.toLowerCase() === 'y') {
      return { buchungen: [], fixkosten: [], mitarbeiter: [], profiles: [] };
    } else {
      throw new Error('Data extraction failed');
    }
  } finally {
    // Clean up
    try {
      fs.unlinkSync('extract-data.py');
    } catch (e) {
      console.warn('Could not delete temporary Python script:', e);
    }
  }
}

// Insert data into Supabase
async function migrateDataToSupabase(data) {
  console.log('Migrating data to Supabase...');
  
  for (const table of TABLES_TO_MIGRATE) {
    const tableName = table.name;
    const records = data[tableName] || [];
    
    if (records.length === 0) {
      console.log(`No data to migrate for ${tableName}`);
      continue;
    }
    
    console.log(`Migrating ${records.length} records to ${tableName}...`);
    
    // Check if table already has data
    const { data: existingData, error: checkError } = await supabase
      .from(tableName)
      .select('count', { count: 'exact' });
    
    if (checkError) {
      console.error(`Error checking existing data in ${tableName}:`, checkError);
      continue;
    }
    
    if (existingData[0].count > 0) {
      const proceed = await askQuestion(`Table ${tableName} already has data. Continue with migration? (y/n): `);
      if (proceed.toLowerCase() !== 'y') {
        console.log(`Skipping migration for ${tableName}`);
        continue;
      }
    }
    
    // Insert data in batches of 100
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).upsert(batch, {
        onConflict: table.primaryKey
      });
      
      if (error) {
        console.error(`Error inserting data into ${tableName}:`, error);
        break;
      }
      
      console.log(`Migrated records ${i + 1} to ${Math.min(i + batchSize, records.length)} of ${records.length}`);
    }
  }
}

// Main function
async function main() {
  try {
    console.log('Starting data migration...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Python App Path:', PYTHON_APP_PATH);
    
    // Check if we can connect to Supabase
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Error connecting to Supabase:', error);
      return;
    }
    
    // Extract data from Python app
    const data = await extractDataFromPythonApp();
    
    // Ask for confirmation before migrating
    const proceed = await askQuestion(`Ready to migrate ${Object.keys(data).map(k => `${data[k].length} ${k}`).join(', ')} to Supabase. Proceed? (y/n): `);
    if (proceed.toLowerCase() !== 'y') {
      console.log('Migration aborted by user');
      return;
    }
    
    // Migrate data to Supabase
    await migrateDataToSupabase(data);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    rl.close();
    // Clean up
    try {
      if (fs.existsSync('migration-data.json')) {
        fs.unlinkSync('migration-data.json');
      }
    } catch (e) {
      console.warn('Could not delete migration data file:', e);
    }
  }
}

main(); 