/**
 * Simple Supabase connection test
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables without quotes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/"/g, '');

console.log('Supabase URL:', supabaseUrl ? '[Found]' : '[Missing]');
console.log('Supabase Anon Key:', supabaseAnonKey ? '[Found]' : '[Missing]');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables.');
  process.exit(1);
}

// Create Supabase client
console.log('\nCreating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
async function testConnection() {
  try {
    console.log('Testing connection...');
    
    // Simple health check
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
    
    console.log('Connection successful! Received response from Supabase.');
    
  } catch (error) {
    console.error('Error testing Supabase connection:');
    console.error(error.message);
    process.exit(1);
  }
}

testConnection(); 