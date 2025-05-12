// Test script for checking Supabase authentication and RLS policies
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true
  }
});

// User credentials for testing
// Replace with valid credentials when running
const USER_EMAIL = 'christoph@vaios.ch';
const USER_PASSWORD = '/SerikitSusu*3';

// Helper to pretty-print API responses
function prettyPrint(data) {
  console.log(JSON.stringify(data, null, 2));
}

// TESTS
async function runTests() {
  console.log('🧪 Running Supabase RLS Policy Tests');
  console.log('===================================');

  try {
    // Test 1: Sign in
    console.log('Test 1: Sign in with test user');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: USER_EMAIL,
      password: USER_PASSWORD
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      process.exit(1);
    }

    console.log('✅ Authentication successful');
    console.log(`User ID: ${authData.user.id}`);
    
    // Test 2: Try to select from fixkosten table
    console.log('\nTest 2: Select from fixkosten table');
    const { data: fixkostenData, error: fixkostenError } = await supabase
      .from('fixkosten')
      .select('*');
    
    if (fixkostenError) {
      console.error('❌ Select from fixkosten failed:', fixkostenError.message);
    } else {
      console.log(`✅ Select from fixkosten successful - Found ${fixkostenData.length} records`);
    }
    
    // Test 3: Try to insert into fixkosten table
    console.log('\nTest 3: Insert into fixkosten table');
    const now = new Date().toISOString();
    const newFixkosten = {
      id: uuidv4(),
      name: 'Test Fixed Cost ' + Date.now(),
      betrag: 100.00,
      rhythmus: 'monatlich',
      start: now,
      user_id: authData.user.id,
      created_at: now,
      updated_at: now
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('fixkosten')
      .insert(newFixkosten)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert into fixkosten failed:', insertError.message);
      console.error('Error code:', insertError.code);
      console.error('Error details:', insertError.details);
    } else {
      console.log('✅ Insert into fixkosten successful');
      console.log('Inserted ID:', insertData.id);
    }
    
    // Test 4: Verify user_id is correctly set in the policy
    console.log('\nTest 4: Check auth.uid() value');
    const { data: authUidData, error: authUidError } = await supabase.rpc('get_auth_uid');
    
    if (authUidError) {
      console.error('❌ Could not check auth.uid():', authUidError.message);
      
      // Try to create the function if it doesn't exist
      console.log('Attempting to create the get_auth_uid function...');
      const createFuncResult = await supabase.rpc('create_auth_uid_function');
      console.log('Function creation result:', createFuncResult);
    } else {
      console.log('✅ auth.uid() value:', authUidData);
      if (authUidData !== authData.user.id) {
        console.warn('⚠️ auth.uid() does not match the user ID!');
      }
    }
    
    // Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Tests completed');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the tests
runTests(); 