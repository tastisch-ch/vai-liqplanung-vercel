import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { transactionsToCsv } from '@/lib/export/csv';
import { getMimeType } from '@/lib/export/utils';
import { Buchung } from '@/models/types';

/**
 * Export transactions to CSV
 * @route GET /api/export/transactions
 * @query from - Start date for filtering (optional)
 * @query to - End date for filtering (optional)
 * @query format - Export format (csv, excel - default: csv)
 */
export async function GET(request: NextRequest) {
  try {
    // Get Supabase client 
    const supabase = createRouteHandlerSupabaseClient(request);
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User must be logged in to export data' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // For now, only support CSV (will add Excel later)
    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Unsupported format', details: 'Only CSV format is currently supported' },
        { status: 400 }
      );
    }
    
    // Build query
    let query = supabase
      .from('buchungen')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: false });
    
    // Apply date filters
    if (fromDate) {
      query = query.gte('date', fromDate);
    }
    
    if (toDate) {
      query = query.lte('date', toDate);
    }
    
    // Execute query
    const { data: transactions, error } = await query;
    
    if (error) {
      console.error('Error fetching transactions for export:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }
    
    // Generate CSV data
    const dateRange = {
      from: fromDate ? new Date(fromDate) : undefined,
      to: toDate ? new Date(toDate) : undefined
    };
    
    // Parse dates in transactions
    const parsedTransactions = transactions.map(t => ({
      ...t,
      date: new Date(t.date)
    })) as Buchung[];
    
    const { content, filename } = transactionsToCsv(parsedTransactions, { dateRange });
    
    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', getMimeType('csv'));
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Return the CSV content
    return new NextResponse(content, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 