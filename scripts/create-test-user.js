#!/usr/bin/env node

/**
 * Test User Creation Script
 * 
 * This script creates a test user in Supabase for testing authentication.
 * 
 * Usage:
 * node scripts/create-test-user.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

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

// Main function
async function main() {
  try {
    console.log('Creating test user in Supabase...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Error: Missing Supabase environment variables.');
      console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local');
      return;
    }
    
    console.log(`Using Supabase URL: ${supabaseUrl}`);
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user input
    const email = await askQuestion('Enter email for test user: ');
    const password = await askQuestion('Enter password for test user: ');
    const name = await askQuestion('Enter name for test user (optional): ');
    
    // Create user
    console.log(`Creating user: ${email}...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Skip email verification
    });
    
    if (error) {
      console.error('Error creating user:', error.message);
      return;
    }
    
    if (!data.user) {
      console.error('No user data returned');
      return;
    }
    
    console.log('User created successfully:');
    console.log(` - ID: ${data.user.id}`);
    console.log(` - Email: ${data.user.email}`);
    
    // Create profile for the user - check if the profiles table exists first
    console.log('Creating profile...');
    
    // First check the structure of the profiles table
    try {
      const { error: tableError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('Error accessing profiles table:', tableError.message);
        console.log('Attempting to create a simple profile with minimal fields...');
        
        // Try with minimal fields
        const { error: simpleProfileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: name || email.split('@')[0],
            role: 'admin' // Give admin role for testing
          });
        
        if (simpleProfileError) {
          console.error('Error creating minimal profile:', simpleProfileError.message);
        } else {
          console.log('Minimal profile created successfully!');
        }
      } else {
        // If table exists with expected structure, add all fields
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: name || email.split('@')[0],
            role: 'admin', // Give admin role for testing
            read_only: false,
            created_at: new Date().toISOString()
          });
        
        if (profileError) {
          console.error('Error creating profile:', profileError.message);
        } else {
          console.log('Profile created successfully!');
        }
      }
    } catch (error) {
      console.error('Unexpected error creating profile:', error);
    }
    
    console.log('You can now log in with this user in the application.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    rl.close();
  }
}

// Run the script
main(); 