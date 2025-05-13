import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { mitarbeiterToCsv } from '@/lib/export/csv';
import { getMimeType } from '@/lib/export/utils';
import { Mitarbeiter, LohnDaten } from '@/models/types';

/**
 * Export employees to CSV
 * @route GET /api/export/mitarbeiter
 * @query format - Export format (csv, excel - default: csv)
 * @query active - Filter for active/inactive employees (optional)
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
      .from('mitarbeiter')
      .select('*, Lohn(*)')
      .eq('user_id', session.user.id)
      .order('Name', { ascending: true });
    
    // Execute query
    const { data: employees, error } = await query;
    
    if (error) {
      console.error('Error fetching employees for export:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }
    
    // Filter active/inactive employees if requested
    let filteredEmployees = employees;
    if (activeFilter) {
      const today = new Date();
      
      filteredEmployees = employees.filter(employee => {
        // Check if employee has any active salary data
        const hasActiveSalary = employee.Lohn?.some((lohn: LohnDaten) => {
          const startDate = new Date(lohn.Start);
          const endDate = lohn.Ende ? new Date(lohn.Ende) : null;
          
          return startDate <= today && (!endDate || endDate >= today);
        });
        
        return activeFilter === 'true' ? hasActiveSalary : !hasActiveSalary;
      });
    }
    
    // Parse dates in employees
    const parsedEmployees = filteredEmployees.map(employee => {
      return {
        ...employee,
        Lohn: employee.Lohn?.map((lohn: any) => ({
          ...lohn,
          Start: new Date(lohn.Start),
          Ende: lohn.Ende ? new Date(lohn.Ende) : null
        })) || []
      };
    }) as Mitarbeiter[];
    
    // Generate CSV data
    const { content, filename } = mitarbeiterToCsv(parsedEmployees);
    
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