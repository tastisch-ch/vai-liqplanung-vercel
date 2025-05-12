#!/usr/bin/env node

/**
 * Test script to verify the Supabase connection and database configuration
 * Usage: node test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Check for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables.');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test connection with a simple query
    const { data, error } = await supabase.from('profiles').select('count(*)', { count: 'exact' });
    
    if (error) throw error;
    
    console.log('✅ Successfully connected to Supabase!');
    
    // Test database tables
    console.log('\nVerifying database tables...');
    const tables = [
      'profiles',
      'user_settings',
      'buchungen',
      'fixkosten',
      'mitarbeiter',
      'lohndaten',
      'simulationen',
      'scenarios'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count(*)', { count: 'exact' });
      
      if (error) {
        console.error(`❌ Table '${table}' check failed: ${error.message}`);
      } else {
        const count = data[0]?.count || 0;
        console.log(`✅ Table '${table}' exists. Row count: ${count}`);
      }
    }
    
    console.log('\nDatabase verification complete!');
    
  } catch (error) {
    console.error('❌ Supabase connection test failed:');
    console.error(error.message);
    process.exit(1);
  }
}

testSupabaseConnection(); 