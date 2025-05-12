// RLS fix script for Simulationen table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixSimulationenRLS() {
  console.log('Starting RLS fix for simulationen table...');
  
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // First check if table exists
    console.log('Checking if simulationen table exists...');
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'simulationen')
      .single();
      
    if (tableError && tableError.code !== 'PGRST116') {
      console.error('Error checking table:', tableError);
      process.exit(1);
    }
    
    if (!tableExists) {
      console.log('Table does not exist, will create it...');
      
      // Create the table
      const { error: createError } = await supabase.rpc('create_simulationen_table');
      
      if (createError) {
        console.error('Error creating table:', createError);
        console.log('Trying alternative method...');
        
        // Try running raw SQL (if service role key is used)
        const { error: sqlError } = await supabase.rpc('run_sql', { 
          sql: `
            CREATE TABLE IF NOT EXISTS public.simulationen (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL,
              details TEXT,
              date TIMESTAMP WITH TIME ZONE NOT NULL,
              amount NUMERIC(12, 2) NOT NULL,
              direction TEXT NOT NULL CHECK (direction IN ('Incoming', 'Outgoing')),
              recurring BOOLEAN DEFAULT FALSE,
              "interval" TEXT CHECK ("interval" IN ('monthly', 'quarterly', 'yearly')),
              end_date TIMESTAMP WITH TIME ZONE,
              user_id UUID NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE
            );
          `
        });
        
        if (sqlError) {
          console.error('Failed to create table:', sqlError);
          process.exit(1);
        }
      }
    }
    
    // Now fix the RLS
    console.log('Updating RLS policies...');
    
    // First create RLS helper function if it doesn't exist
    const { error: rlsHelperError } = await supabase.rpc('run_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION update_simulationen_rls()
        RETURNS TEXT
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          -- Enable RLS
          ALTER TABLE public.simulationen ENABLE ROW LEVEL SECURITY;
          
          -- Drop existing policies 
          DROP POLICY IF EXISTS "Users can view their own simulations" ON public.simulationen;
          DROP POLICY IF EXISTS "Users can update their own simulations" ON public.simulationen;
          DROP POLICY IF EXISTS "Users can insert their own simulations" ON public.simulationen;
          DROP POLICY IF EXISTS "Users can delete their own simulations" ON public.simulationen;
          DROP POLICY IF EXISTS "Authenticated users can view all simulations" ON public.simulationen;
          
          -- Create new policies
          CREATE POLICY "Authenticated users can view all simulations"
            ON public.simulationen FOR SELECT
            USING (auth.role() = 'authenticated');
            
          CREATE POLICY "Users can insert their own simulations"
            ON public.simulationen FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
          CREATE POLICY "Users can update their own simulations"
            ON public.simulationen FOR UPDATE
            USING (auth.uid() = user_id);
            
          CREATE POLICY "Users can delete their own simulations"
            ON public.simulationen FOR DELETE
            USING (auth.uid() = user_id);
            
          RETURN 'RLS policies updated';
        END;
        $$;
        
        -- Grant execute permission
        GRANT EXECUTE ON FUNCTION update_simulationen_rls() TO authenticated;
        GRANT EXECUTE ON FUNCTION update_simulationen_rls() TO anon;
      `
    });
    
    if (rlsHelperError) {
      console.error('Error creating RLS helper function:', rlsHelperError);
    } else {
      console.log('RLS helper function created successfully');
      
      // Call the helper function
      const { data, error } = await supabase.rpc('update_simulationen_rls');
      
      if (error) {
        console.error('Error updating RLS policies:', error);
      } else {
        console.log('RLS policies updated successfully:', data);
      }
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the function
fixSimulationenRLS(); 