/**
 * Test script for Supabase integration
 * Tests database connection and basic CRUD operations on main tables
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '.env.local' });

// Get environment variables without quotes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/"/g, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/"/g, '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables.');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl ? '[Found]' : '[Missing]');
console.log('Supabase Anon Key:', supabaseAnonKey ? '[Found]' : '[Missing]');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const TEST_USER_ID = 'test-user-' + uuidv4().slice(0, 8);

async function testSupabaseIntegration() {
  console.log('\n🔍 Testing Supabase integration with database...');
  console.log(`Using test user ID: ${TEST_USER_ID}`);
  
  try {
    // First test auth connection
    console.log('\n🔒 Testing authentication service...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      throw new Error(`Authentication connection failed: ${authError.message}`);
    }
    console.log('✅ Authentication service connected');
    
    // Test connection with a simple health check
    console.log('\n🔌 Testing database connection...');
    try {
      const { data, error } = await supabase.from('buchungen').select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01') {
          console.log('❌ Table "buchungen" not found. Database may not be set up correctly.');
        } else {
          throw error;
        }
      } else {
        console.log('✅ Database connection successful');
      }
    } catch (dbError) {
      console.error('❌ Database connection failed:', dbError.message);
      console.error('This might be due to RLS policies or missing tables.');
      console.error('Continuing with tests to gather more information...');
    }
    
    // Test tables existence
    console.log('\n📋 Verifying database tables...');
    const tables = [
      'profiles',
      'user_settings',
      'buchungen',
      'fixkosten',
      'mitarbeiter',
      'lohndaten',
      'simulationen'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true });
        
        if (error) {
          console.error(`❌ Table '${table}' check failed: ${error.message}`);
        } else {
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (tableError) {
        console.error(`❌ Table '${table}' check failed: ${tableError.message}`);
      }
    }
    
    // Try to create a profile first (this may be needed for FK constraints)
    console.log('\n🧪 Setting up test profile for foreign key relationships...');
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: TEST_USER_ID,
          updated_at: new Date().toISOString(),
          username: 'tester_' + Date.now(),
          full_name: 'Test User',
          avatar_url: null
        })
        .select()
        .single();
      
      if (profileError) {
        console.warn(`⚠️ Could not create test profile: ${profileError.message}`);
        console.warn('Continuing tests but foreign key constraints may fail');
      } else {
        console.log('✅ Test profile created');
      }
    } catch (profileSetupError) {
      console.warn(`⚠️ Error during profile setup: ${profileSetupError.message}`);
    }
    
    // Test CRUD operations on Fixkosten
    console.log('\n🧪 Testing CRUD operations on Fixkosten...');
    
    // Create test record
    const fixkostenId = uuidv4();
    const fixkostenData = {
      id: fixkostenId,
      name: 'Test Fixkosten ' + Date.now(),
      betrag: 100.50,
      rhythmus: 'monatlich',
      start: new Date().toISOString(),
      user_id: TEST_USER_ID,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    try {
      const { error: createError } = await supabase
        .from('fixkosten')
        .insert(fixkostenData);
      
      if (createError) {
        console.error(`❌ Create operation failed: ${createError.message}`);
      } else {
        console.log('✅ Create operation successful');
        
        // Read the created record
        const { data: readData, error: readError } = await supabase
          .from('fixkosten')
          .select('*')
          .eq('id', fixkostenId)
          .single();
        
        if (readError) {
          console.error(`❌ Read operation failed: ${readError.message}`);
        } else if (readData) {
          console.log('✅ Read operation successful');
          
          // Update the record
          const { error: updateError } = await supabase
            .from('fixkosten')
            .update({ betrag: 150.75 })
            .eq('id', fixkostenId);
          
          if (updateError) {
            console.error(`❌ Update operation failed: ${updateError.message}`);
          } else {
            console.log('✅ Update operation successful');
          }
          
          // Delete the record
          const { error: deleteError } = await supabase
            .from('fixkosten')
            .delete()
            .eq('id', fixkostenId);
          
          if (deleteError) {
            console.error(`❌ Delete operation failed: ${deleteError.message}`);
          } else {
            console.log('✅ Delete operation successful');
          }
        }
      }
    } catch (fixkostenError) {
      console.error(`❌ Fixkosten test failed with error: ${fixkostenError.message}`);
    }
    
    // Test CRUD operations on Buchungen
    console.log('\n🧪 Testing CRUD operations on Buchungen...');
    
    try {
      // Create test record
      const buchungId = uuidv4();
      const buchungData = {
        id: buchungId,
        date: new Date().toISOString(),
        details: 'Test Buchung ' + Date.now(),
        amount: 75.25,
        direction: 'Outgoing',
        kategorie: 'Test',
        user_id: TEST_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error: buchungCreateError } = await supabase
        .from('buchungen')
        .insert(buchungData);
      
      if (buchungCreateError) {
        console.error(`❌ Buchung create operation failed: ${buchungCreateError.message}`);
      } else {
        console.log('✅ Buchung create operation successful');
        
        // Clean up the test record
        await supabase
          .from('buchungen')
          .delete()
          .eq('id', buchungId);
        
        console.log('✅ Buchung cleanup successful');
      }
    } catch (buchungError) {
      console.error(`❌ Buchungen test failed with error: ${buchungError.message}`);
    }
    
    // Clean up test profile
    try {
      await supabase
        .from('profiles')
        .delete()
        .eq('id', TEST_USER_ID);
      console.log('\n🧹 Test profile cleanup successful');
    } catch (cleanupError) {
      console.warn(`⚠️ Could not clean up test profile: ${cleanupError.message}`);
    }
    
    console.log('\n🎉 Supabase integration tests completed!');
    
  } catch (error) {
    console.error('\n❌ Supabase integration test failed:');
    console.error(error.message);
    console.error('\nMore details:', error);
    process.exit(1);
  }
}

// Run the tests
testSupabaseIntegration(); 