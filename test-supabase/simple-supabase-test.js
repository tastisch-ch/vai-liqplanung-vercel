// Simple Supabase connection test
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.log('URL defined:', !!supabaseUrl);
  console.log('Key defined:', !!supabaseKey);
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

// Test basic connection
async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Get session (anonymous)
    console.log('\nTest 1: Get session (anonymous)');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError.message);
    } else {
      console.log('Session data:', sessionData);
    }
    
    // Test 2: Check if 'fixkosten' table exists
    console.log('\nTest 2: Check if fixkosten table exists');
    // Using system tables to check if the table exists
    const { data: tableData, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'fixkosten');
    
    if (tableError) {
      console.error('Error checking table:', tableError.message);
    } else {
      console.log('Table check result:', tableData);
      console.log('fixkosten table exists:', tableData.length > 0);
    }
    
    // Test 3: Try a raw query with service key (if available)
    console.log('\nTest 3: Database health check');
    const { data: healthData, error: healthError } = await supabase.rpc('extension_schema_version');
    
    if (healthError) {
      console.error('Error checking database health:', healthError.message);
      
      // Fallback to a simple query
      console.log('Trying a simple query instead...');
      const { data, error } = await supabase.from('fixkosten').select('count(*)');
      
      if (error) {
        console.error('Simple query failed:', error.message);
      } else {
        console.log('Simple query succeeded, result:', data);
      }
    } else {
      console.log('Database health:', healthData);
    }
    
  } catch (error) {
    console.error('Connection test error:', error.message);
  }
}

testConnection(); 