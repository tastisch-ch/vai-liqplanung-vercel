// Migration script: Move existing balances to daily snapshot system
// Usage: node scripts/migrate-balance-to-daily.js

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^"|"$/g, '').trim();
      if (value && !key.startsWith('#')) {
        process.env[key.trim()] = value;
      }
    }
  });
}

function stripQuotes(str) {
  if (!str) return str;
  return str.replace(/^"|"$/g, '');
}

const SUPABASE_URL = stripQuotes(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_SERVICE_KEY = stripQuotes(process.env.SUPABASE_SERVICE_KEY);

console.log('Environment check:');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'Found' : 'Missing');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrate() {
  console.log('Starting migration...');
  
  // First, let's check what tables exist and their structure
  try {
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Could not check tables, continuing...');
    } else {
      console.log('Available tables:', tables?.map(t => t.table_name) || []);
    }
  } catch (e) {
    console.log('Error checking tables:', e.message);
  }

  // Check if user_settings table exists and what columns it has
  try {
    const { data: userSettings, error: userSettingsError } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1);
    
    if (userSettingsError) {
      console.error('Error accessing user_settings table:', userSettingsError);
      console.log('Available columns in user_settings:', Object.keys(userSettings?.[0] || {}));
      return;
    }
    
    if (userSettings && userSettings.length > 0) {
      console.log('user_settings columns:', Object.keys(userSettings[0]));
    }
  } catch (e) {
    console.error('Exception checking user_settings:', e.message);
    return;
  }

  // Get all users - try different column names
  let users = [];
  let userError = null;
  
  // Try with start_balance first
  try {
    const result = await supabase
      .from('user_settings')
      .select('user_id, start_balance');
    users = result.data || [];
    userError = result.error;
  } catch (e) {
    console.log('start_balance column not found, trying without...');
  }
  
  // If that failed, try without start_balance
  if (userError || users.length === 0) {
    try {
      const result = await supabase
        .from('user_settings')
        .select('user_id, settings');
      users = result.data || [];
      userError = result.error;
      
      // If we got users with settings, check if balance is in settings
      if (users.length > 0 && users[0].settings) {
        console.log('Sample settings:', users[0].settings);
        // Try to extract balance from settings
        users = users.map(user => ({
          user_id: user.user_id,
          start_balance: user.settings?.start_balance || user.settings?.balance || 0
        }));
      }
    } catch (e) {
      console.error('Error loading users:', e.message);
      return;
    }
  }

  if (userError) {
    console.error('Error loading users:', userError);
    return;
  }

  console.log(`Found ${users.length} users to migrate`);

  const today = new Date().toISOString().split('T')[0];

  for (const user of users) {
    const { user_id, start_balance } = user;
    if (!user_id) continue;
    const balance = start_balance || 0;

    console.log(`Migrating user ${user_id} with balance ${balance}`);

    // Upsert daily snapshot for today
    const { error: snapshotError } = await supabase
      .from('daily_balance_snapshots')
      .upsert({
        date: today,
        balance,
        user_id
      }, { onConflict: 'date,user_id' });
    if (snapshotError) {
      console.error(`Error upserting daily snapshot for user ${user_id}:`, snapshotError);
    }

    // Upsert current balance
    const { error: currentError } = await supabase
      .from('current_balance')
      .upsert({
        user_id,
        balance,
        effective_date: today
      }, { onConflict: 'user_id' });
    if (currentError) {
      console.error(`Error upserting current balance for user ${user_id}:`, currentError);
    }

    console.log(`✓ Migrated balance for user ${user_id}: ${balance}`);
  }

  console.log('Migration complete.');
}

migrate().catch(console.error); 