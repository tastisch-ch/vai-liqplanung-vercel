import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { fixkostenToCsv } from '@/lib/export/csv';
import { getMimeType } from '@/lib/export/utils';
import { Fixkosten } from '@/models/types';

/**
 * Export fixed costs to CSV
 * @route GET /api/export/fixkosten
 * @query format - Export format (csv, excel - default: csv)
 * @query active - Filter for active/inactive fixed costs (optional)
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
    const activeFilter = searchParams.get('active');

    // For now, only support CSV (will add Excel later)
    if (format !== 'csv') {
      return NextResponse.json(
        { error: 'Unsupported format', details: 'Only CSV format is currently supported' },
        { status: 400 }
      );
    }
    
    // Build query
    let query = supabase
      .from('fixkosten')
      .select('*')
      .eq('user_id', session.user.id)
      .order('name', { ascending: true });
    
    // Apply active filter if provided
    if (activeFilter === 'true') {
      const today = new Date().toISOString();
      query = query
        .or(`enddatum.gt.${today},enddatum.is.null`)
        .lt('start', today);
    } else if (activeFilter === 'false') {
      const today = new Date().toISOString();
      query = query.lt('enddatum', today);
    }
    
    // Execute query
    const { data: fixkosten, error } = await query;
    
    if (error) {
      console.error('Error fetching fixed costs for export:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }
    
    // Parse dates in fixkosten
    const parsedFixkosten = fixkosten.map(f => ({
      ...f,
      start: new Date(f.start),
      enddatum: f.enddatum ? new Date(f.enddatum) : null
    })) as Fixkosten[];
    
    // Generate CSV data
    const { content, filename } = fixkostenToCsv(parsedFixkosten);
    
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