import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Use the route handler specific client that can access cookies
    const supabase = createRouteHandlerSupabaseClient(request);
    
    // Query the database schema for the buchungen table
    const { data: columns, error: schemaError } = await supabase.rpc(
      'get_table_schema',
      { table_name: 'buchungen' }
    );
    
    if (schemaError) {
      // Try a different approach if RPC fails
      const { data: tablesData, error: tablesError } = await supabase.from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'buchungen')
        .order('ordinal_position');
        
      if (tablesError) {
        // Last resort - try a direct query
        const { data: directData, error: directError } = await supabase.from('buchungen')
          .select('*')
          .limit(1);
          
        if (directError) {
          return NextResponse.json({
            success: false,
            rpcError: schemaError,
            tablesError,
            directError,
            message: 'All schema query methods failed'
          }, { status: 500 });
        }
        
        // If direct query works, return the structure
        return NextResponse.json({
          success: true,
          source: 'direct query',
          columns: directData?.[0] ? Object.keys(directData[0]) : [],
          sample: directData?.[0] || null
        });
      }
      
      // Return table schema from information_schema
      return NextResponse.json({
        success: true,
        source: 'information_schema',
        columns: tablesData,
        rpcError: schemaError
      });
    }
    
    // Test inserting data to see what columns are actually accepted
    const testData = {
      id: 'test-' + Date.now(),
      date: new Date().toISOString(),
      details: 'Test Transaction',
      amount: 100,
      direction: 'Incoming',
      modified: false,
      kategorie: 'Test',
      user_id: request.cookies.get('sb-user-id')?.value || 'unknown'
    };
    
    const { error: insertError } = await supabase
      .from('buchungen')
      .insert(testData)
      .select();
      
    // Return the schema data
    return NextResponse.json({
      success: true,
      source: 'rpc',
      columns,
      testInsert: insertError ? { error: insertError.message } : { success: true },
      testData
    });
  } catch (error) {
    console.error('Error getting schema:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 