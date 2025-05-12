import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseDateFallback } from '@/lib/date-utils';
import { parseCHF } from '@/lib/currency';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get form data from request
    const formData = await request.formData();
    const importType = formData.get('type') as string;
    const importData = formData.get('data') as string;
    const file = formData.get('file') as File | null;
    
    let processedData = [];
    
    // Process based on import type
    if (importType === 'html') {
      // Process HTML table data
      processedData = processHTMLImport(importData, userId);
    } else if (importType === 'excel' && file) {
      // Process Excel file
      // In a real implementation, we would use a library like xlsx to parse Excel files
      // For now, we're simulating with a simple response
      return NextResponse.json(
        { message: 'Excel import not fully implemented in this demo' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid import type or missing data' },
        { status: 400 }
      );
    }
    
    // Insert processed data into Supabase
    if (processedData.length > 0) {
      const { error } = await supabase
        .from('buchungen')
        .insert(processedData);
        
      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Database error', details: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          success: true, 
          message: `Imported ${processedData.length} entries successfully`,
          count: processedData.length
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { message: 'No valid data to import' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function processHTMLImport(htmlData: string, userId: string) {
  // Basic processing of HTML data
  // In a real implementation, this would parse the HTML more thoroughly
  
  // Extract table rows - use lowercase flags instead of 's' flag
  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...htmlData.matchAll(tableRowRegex)].map(match => match[1]);
  
  // Extract cells from each row - use lowercase flags instead of 's' flag
  const processedRows = rows.map(row => {
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [...row.matchAll(cellRegex)].map(match => {
      // Clean the content (remove HTML tags, trim)
      return match[1].replace(/<[^>]*>/g, '').trim();
    });
    
    // Check if we have enough cells and they have valid data
    if (cells.length >= 3) {
      const dateStr = cells[0];
      const details = cells[1];
      const amountStr = cells[2];
      
      const date = parseDateFallback(dateStr);
      const amount = parseCHF(amountStr);
      
      if (date && amount !== null) {
        return {
          id: crypto.randomUUID(),
          Date: date.toISOString(),
          Details: details,
          Amount: Math.abs(amount), // Store absolute value
          Direction: amount < 0 ? 'Outgoing' : 'Incoming', // Determine direction based on sign
          modified: false,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    }
    
    return null;
  }).filter(Boolean);
  
  return processedRows;
} 