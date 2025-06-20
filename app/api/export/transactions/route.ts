import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { loadBuchungen, enhanceTransactions } from '@/lib/services/buchungen';
import { loadFixkosten, convertFixkostenToBuchungen } from '@/lib/services/fixkosten';
import { loadSimulationen, convertSimulationenToBuchungen } from '@/lib/services/simulationen';
import { loadMitarbeiter } from '@/lib/services/mitarbeiter';
import { loadLohnkosten, convertLohnkostenToBuchungen } from '@/lib/services/lohnkosten';
import { getUserSettings } from '@/lib/services/user-settings';
import { transactionsToCSV, generatePDFContent, generateManagementSummary } from '@/lib/export';
import { getMimeType, generateExportFilename } from '@/lib/export/utils';
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
    // Log all headers for debugging
    const headers = Object.fromEntries(request.headers);
    console.log('Request headers:', Object.keys(headers).join(', '));
    
    // Get all cookies for debugging
    const allCookies = request.cookies.getAll();
    console.log('All request cookies:', allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));
    
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing Supabase credentials' },
        { status: 500 }
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
    
    // Get the authentication tokens from different sources
    const authCookieName = `sb-${supabaseUrl.match(/(?:\/\/|^)([\w-]+)\.supabase/)?.[1]}-auth-token`;
    const authCookie = request.cookies.get(authCookieName)?.value;
    const directAccessToken = request.cookies.get('sb-access-token')?.value || searchParams.get('access_token');
    const directRefreshToken = request.cookies.get('sb-refresh-token')?.value || searchParams.get('refresh_token');
    
    console.log('Auth cookie exists:', !!authCookie);
    console.log('Direct access token exists:', !!directAccessToken);
    
    // Create direct Supabase client
    const supabase = createRouteHandlerSupabaseClient(request);
    
    // Try to extract user ID directly from JWT token
    let userId: string | null = null;
    
    if (directAccessToken) {
      try {
        // Manually parse the JWT token to extract user ID
        // JWT format: header.payload.signature
        const parts = directAccessToken.split('.');
        if (parts.length === 3) {
          // Decode the payload (middle part)
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          
          // The subject claim (sub) contains the user ID
          if (payload.sub) {
            userId = payload.sub;
            console.log('Successfully extracted user ID from JWT:', userId);
          }
        }
      } catch (e) {
        console.error('Error parsing JWT token:', e);
      }
    }
    
    // If we couldn't extract from JWT, try other methods
    if (!userId) {
      // Try with Supabase auth methods as backup
      try {
        if (directAccessToken && directRefreshToken) {
          console.log('Trying authentication with direct tokens');
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: directAccessToken,
              refresh_token: directRefreshToken
            });
            
            if (!sessionError && sessionData.user) {
              userId = sessionData.user.id;
              console.log('Authenticated with direct tokens, user:', userId);
            } else {
              console.error('Direct token session error:', sessionError);
            }
          } catch (e) {
            console.error('Error setting session with direct tokens:', e);
          }
        }
        
        // Final attempt with getUser
        if (!userId) {
          console.log('Trying to get user from current session');
          const { data, error } = await supabase.auth.getUser();
          
          if (!error && data.user) {
            userId = data.user.id;
            console.log('Got user from current session:', userId);
          } else {
            console.error('Get user error:', error);
          }
        }
      } catch (e) {
        console.error('Error in authentication backup methods:', e);
      }
    }
    
    // If all authentication methods failed and in development mode, use a test user ID
    if (!userId && process.env.NODE_ENV === 'development') {
      // This is a fallback for development only - NEVER use in production
      const testParam = searchParams.get('test_user_id');
      if (testParam) {
        userId = testParam;
        console.log('DEVELOPMENT MODE: Using test user ID from URL parameter:', userId);
      }
      
      // Hardcoded user ID as an absolute last resort for dev testing
      if (!userId && directAccessToken) {
        // Extract a user ID hint from the token if possible
        try {
          const parts = directAccessToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            console.log('Token payload info:', { iss: payload.iss, aud: payload.aud, email: payload.email });
            
            // If the token has a user email that matches, use a known ID
            if (payload.email === 'christoph@vaios.ch') {
              userId = '25fabd31-7992-42f2-b64a-32f5993c0456'; // Replace with actual ID if known
              console.log('DEV MODE: Using hardcoded ID for', payload.email);
            }
          }
        } catch (e) {
          console.error('Error extracting email from token in dev mode:', e);
        }
      }
    }
    
    // If all authentication methods failed
    if (!userId) {
      console.log('All authentication methods failed');
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User must be logged in to export data' },
        { status: 401 }
      );
    }
    
    // Execute query with authenticated client
    console.log('Fetching transactions for user:', userId);
    let query = supabase
      .from('buchungen')
      .select('*')
      .eq('user_id', userId)
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
    
    console.log(`Fetched ${transactions.length} transactions for export`);
    
    // Create properly formatted date range for the export functions
    const fromDate2 = fromDate ? new Date(fromDate) : new Date();
    const toDate2 = toDate ? new Date(toDate) : new Date();
    
    // Get additional data types (fixkosten, simulationen, lohnkosten)
    let fixkostenData: any[] = [];
    let simulationenData: any[] = [];
    let lohnkostenData: any[] = [];
    
    try {
      // Load fixkosten
      const fixkosten = await loadFixkosten(userId);
      if (fixkosten && fixkosten.length > 0) {
        const fixkostenBuchungen = convertFixkostenToBuchungen(
          fromDate2, toDate2, fixkosten
        );
        fixkostenData = fixkostenBuchungen;
      }
      
      // Load simulationen (optional based on URL parameter)
      if (searchParams.get('include_simulationen') === 'true') {
        const simulationen = await loadSimulationen(userId);
        if (simulationen && simulationen.length > 0) {
          const simulationenBuchungen = convertSimulationenToBuchungen(
            fromDate2, toDate2, simulationen
          );
          simulationenData = simulationenBuchungen;
        }
      }
      
      // Load lohnkosten
      const lohnkostenRaw = await loadLohnkosten(userId);
      if (lohnkostenRaw && lohnkostenRaw.length > 0) {
        const lohnkostenBuchungen = convertLohnkostenToBuchungen(
          fromDate2, toDate2, lohnkostenRaw.map(item => item.mitarbeiter)
        );
        lohnkostenData = lohnkostenBuchungen;
      }
    } catch (e) {
      console.error('Error loading additional data for export:', e);
    }
    
    // Format for generateExportFilename (from/to)
    const dateRangeForFilename = {
      from: fromDate2,
      to: toDate2
    };
    
    // Format for transactionsToCSV (start/end)
    const exportDateRange = {
      start: fromDate2,
      end: toDate2
    };
    
    // Parse dates in transactions
    const parsedTransactions = transactions.map(t => ({
      ...t,
      date: new Date(t.date)
    })) as Buchung[];
    
    // Combine all transaction types
    const allTransactions = [
      ...parsedTransactions,
      ...fixkostenData,
      ...simulationenData,
      ...lohnkostenData
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Enhance transactions with balances
    const enhancedTransactions = await enhanceTransactions(allTransactions);
    
    // Generate CSV content
    const content = transactionsToCSV(enhancedTransactions, { dateRange: exportDateRange });
    
    // Generate filename
    const filename = generateExportFilename('transactions', 'csv', dateRangeForFilename);
    
    // Set headers for file download
    const headers2 = new Headers();
    headers2.set('Content-Type', getMimeType('csv'));
    headers2.set('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Return the CSV content
    return new NextResponse(content, {
      status: 200,
      headers: headers2
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Get the current user from supabase auth
  const supabase = createRouteHandlerSupabaseClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Parse request body
    const body = await request.json();
    const {
      startDate,
      endDate,
      includeFixkosten = true,
      includeSimulationen = true,
      includeLohnkosten = true,
      format = 'csv', // csv, pdf, management-summary
      title,
      subtitle
    } = body;
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    // Load user settings for starting balance
    const settings = await getUserSettings(user.id);
    const startBalance = settings.start_balance;
    
    // Load data
    const [buchungen, fixkosten, simulationen, lohnkostenData] = await Promise.all([
      loadBuchungen(user.id),
      includeFixkosten ? loadFixkosten(user.id) : Promise.resolve([]),
      includeSimulationen ? loadSimulationen(user.id) : Promise.resolve([]),
      includeLohnkosten ? loadLohnkosten(user.id) : Promise.resolve([])
    ]);
    
    // Build transactions list
    let allTransactions = [...buchungen];
    
    if (includeFixkosten) {
      const fixkostenBuchungen = convertFixkostenToBuchungen(start, end, fixkosten);
      allTransactions = [...allTransactions, ...fixkostenBuchungen];
    }
    
    if (includeSimulationen) {
      const simulationBuchungen = convertSimulationenToBuchungen(start, end, simulationen);
      allTransactions = [...allTransactions, ...simulationBuchungen];
    }
    
    if (includeLohnkosten) {
      const lohnBuchungen = convertLohnkostenToBuchungen(start, end, lohnkostenData.map(item => item.mitarbeiter));
      allTransactions = [...allTransactions, ...lohnBuchungen];
    }
    
    // Enhance transactions with balances
    const enhancedTransactions = await enhanceTransactions(allTransactions);
    
    // Create export options
    const exportOptions = {
      includeHeader: true,
      title: title || 'Liquiditätsplanung',
      subtitle: subtitle || '',
      dateRange: {
        start,
        end
      }
    };
    
    // Generate export content based on format
    let content: string;
    let filename: string;
    let contentType: string;
    
    switch (format) {
      case 'csv':
        content = transactionsToCSV(enhancedTransactions, exportOptions);
        filename = 'transactions-export.csv';
        contentType = 'text/csv';
        break;
        
      case 'pdf':
        content = generatePDFContent(enhancedTransactions, exportOptions);
        filename = 'transactions-export.html'; // Client will convert to PDF
        contentType = 'text/html';
        break;
        
      case 'management-summary':
        content = generateManagementSummary(enhancedTransactions, exportOptions);
        filename = 'management-summary.html'; // Client will convert to PDF
        contentType = 'text/html';
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid export format' },
          { status: 400 }
        );
    }
    
    // Return the export content
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
} 