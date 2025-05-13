import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { parseDateFallback } from '@/lib/date-utils';
import { parseCHF } from '@/lib/currency';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Debug auth cookies
    const cookieNames = Array.from(request.cookies.getAll()).map(c => c.name);
    const authCookies = cookieNames.filter(name => 
      name.includes('sb-') || 
      name.includes('supabase') || 
      name.includes('auth')
    );
    
    console.log('Auth cookies debug:', {
      hasCookies: request.cookies.size > 0,
      cookieNames,
      authCookies,
      headers: Object.fromEntries(request.headers),
    });
    
    // Use the route handler specific client that can access cookies
    const supabase = createRouteHandlerSupabaseClient(request);
    
    // If we have manual access token cookies but no session, try to manually create a session
    const accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    if (accessToken && refreshToken) {
      console.log('Detected manual auth tokens, setting session');
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (error) {
          console.error('Error setting manual session:', error);
        } else if (data.session) {
          console.log('Successfully set manual session');
        }
      } catch (error) {
        console.error('Exception setting manual session:', error);
      }
    }
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Enhanced logging for debugging auth issues
    console.log('Auth session check:', {
      hasSession: !!session,
      userId: session?.user?.id || 'none',
      sessionError: sessionError ? { message: sessionError.message, name: sessionError.name } : null
    });
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication error', details: sessionError.message },
        { status: 401 }
      );
    }
    
    if (!session || !session.user) {
      console.error('Authentication failed: No valid session found');
      return NextResponse.json(
        { error: 'Unauthorized: No valid session found' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get form data from request
    const formData = await request.formData();
    const importType = formData.get('type') as string;
    const importData = formData.get('data') as string;
    const file = formData.get('file') as File | null;
    
    console.log('Processing import:', { importType, hasData: !!importData, hasFile: !!file });
    
    let processedData = [];
    let duplicateCount = 0;
    
    // Process based on import type
    if (importType === 'html') {
      // Process HTML table data
      const { data, duplicates } = await processHTMLImport(importData, userId, request);
      processedData = data;
      duplicateCount = duplicates;
    } else if (importType === 'excel' && file) {
      // Process Excel file
      const { data, duplicates } = await processExcelImport(file, userId, request);
      processedData = data;
      duplicateCount = duplicates;
    } else {
      return NextResponse.json(
        { error: 'Invalid import type or missing data' },
        { status: 400 }
      );
    }
    
    // Insert processed data into Supabase
    if (processedData.length > 0) {
      // First, check for duplicates
      const now = new Date().toISOString();
      
      // Format the data for insertion
      const dataForInsert = processedData.map(item => ({
        id: uuidv4(),
        date: item.date,
        details: item.details,
        amount: item.amount,
        direction: item.direction,
        user_id: userId,
        created_at: now,
        updated_at: now,
        modified: false,
        // Explicitly omit kategorie since it might not exist in the DB
      }));
      
      // Perform the insertion
      const { error } = await supabase
        .from('buchungen')
        .insert(dataForInsert);
        
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
          message: `Importiert: ${processedData.length} Einträge${duplicateCount > 0 ? `, ${duplicateCount} Duplikate übersprungen` : ''}`, 
          count: processedData.length,
          duplicates: duplicateCount
        },
        { status: 200 }
      );
    }
    
    if (duplicateCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `${duplicateCount} Duplikate gefunden, keine neuen Einträge importiert.`,
          count: 0,
          duplicates: duplicateCount
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Keine gültigen Daten zum Importieren gefunden.' 
      },
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

/**
 * Process HTML table data from e-banking
 */
async function processHTMLImport(htmlData: string, userId: string, request: NextRequest) {
  console.log('Processing HTML import with data length:', htmlData.length);
  
  // Get existing transactions to check for duplicates
  const supabase = createRouteHandlerSupabaseClient(request);
  const { data: existingTransactions } = await supabase
    .from('buchungen')
    .select('details, direction, amount, date')
    .eq('user_id', userId);
  
  // Extract transaction rows from HTML - find expandable item rows
  const rowRegex = /<tr[^>]*class="expandable item"[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...htmlData.matchAll(rowRegex)];
  
  console.log(`Found ${rows.length} potential transaction rows in HTML`);
  
  const processedRows = [];
  let duplicateCount = 0;
  let ignoredCount = 0;
  
  for (const rowMatch of rows) {
    const rowContent = rowMatch[1];
    
    try {
      // Extract transaction type to filter out standing orders and salary payments
      const typeRegex = /<td[^>]*class="type"[^>]*>([^<]+)<\/td>/i;
      const typeMatch = rowContent.match(typeRegex);
      const transactionType = typeMatch ? typeMatch[1].trim() : null;
      
      // Skip standing orders (Daueraufträge) and salary payments (Lohn, Gehalt)
      if (transactionType && (
          transactionType.includes('Dauerauftrag') || 
          transactionType.includes('Lohn') ||
          transactionType.includes('Gehalt') ||
          transactionType.includes('Salary')
      )) {
        ignoredCount++;
        continue;
      }
      
      // Extract date from the date cell (first TD)
      // First try to get the print version which is more reliable
      const dateRegex = /<td[^>]*class="date[^"]*"[^>]*>[\s\S]*?<span class="print">([^<]+)<\/span>/i;
      const dateMatch = rowContent.match(dateRegex);
      let dateStr = dateMatch ? dateMatch[1] : null;
      
      // If no print date found, try the display version
      if (!dateStr) {
        const displayDateRegex = /<td[^>]*class="date[^"]*"[^>]*>[\s\S]*?<span class="display">([^<]+)<\/span>/i;
        const displayDateMatch = rowContent.match(displayDateRegex);
        dateStr = displayDateMatch ? displayDateMatch[1] : null;
        
        // Clean up display date format (e.g., "Morgen, 14.05." -> "14.05.2025")
        if (dateStr) {
          // Remove day of week and any other text before the date
          dateStr = dateStr.replace(/^.*?(\d{1,2}\.\d{1,2})\.?$/, '$1');
          
          // Add current year if missing (assuming future dates are next year if needed)
          if (!dateStr.includes('.20')) {
            const currentYear = new Date().getFullYear();
            dateStr = `${dateStr}.${currentYear}`;
          }
        }
      }
      
      // Extract description/details (in TD with class "fill")
      const detailsRegex = /<td[^>]*class="fill[^"]*"[^>]*>[\s\S]*?<span class="text"[^>]*>([^<]+)<\/span>/i;
      const detailsMatch = rowContent.match(detailsRegex);
      const details = detailsMatch ? detailsMatch[1].trim() : null;
      
      // Extract amount (in TD with class "amount" containing fin-amount)
      const amountRegex = /<td[^>]*class="amount"[^>]*>[\s\S]*?<fin-amount[^>]*>([-0-9.',]+)<\/fin-amount>/i;
      const amountMatch = rowContent.match(amountRegex);
      const amountStr = amountMatch ? amountMatch[1] : null;
      
      console.log(`Processing HTML row: Date=${dateStr}, Details=${details?.substring(0, 30)}..., Amount=${amountStr}, Type=${transactionType}`);
      
      // Only proceed if we found all required parts
      if (dateStr && details && amountStr) {
        // Parse date
      const date = parseDateFallback(dateStr);
        
        // Parse amount, removing formatting chars and handling negative numbers
        let amount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
        
        // Check if it's a valid date and amount
        if (date && !isNaN(amount)) {
          // Banking data typically shows negative amounts for outgoing transactions
          const direction = amount < 0 ? 'Outgoing' : 'Incoming';
          
          // Use absolute value of amount
          amount = Math.abs(amount);
          
          // Check for duplicates
          const isDuplicate = checkIfDuplicate(
            existingTransactions || [],
            details,
            direction,
            amount,
            date
          );
          
          if (isDuplicate) {
            duplicateCount++;
            continue;
          }
          
          processedRows.push({
            date: date.toISOString(),
            details: details,
            amount: amount,
            direction: direction
          });
        }
      }
    } catch (error) {
      console.error('Error processing HTML row:', error);
    }
  }
  
  console.log(`Processed ${processedRows.length} valid transactions from HTML (${duplicateCount} duplicates skipped, ${ignoredCount} standing orders/salary payments ignored)`);
  return { data: processedRows, duplicates: duplicateCount };
}

/**
 * Process Excel file with invoice data
 */
async function processExcelImport(file: File, userId: string, request: NextRequest) {
  // Get existing transactions to check for duplicates
  const supabase = createRouteHandlerSupabaseClient(request);
  const { data: existingTransactions } = await supabase
    .from('buchungen')
    .select('details, direction, amount, date')
    .eq('user_id', userId);
  
  // Read the Excel file
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  
  // Get the first sheet
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
  
  console.log(`Extracted ${jsonData.length} rows from Excel file`);
  if (jsonData.length > 0) {
    console.log('Sample row:', JSON.stringify(jsonData[0]).substring(0, 200) + '...');
  }
  
  // Expected columns for invoice data
  const processedRows = [];
  let duplicateCount = 0;
  
  for (const row of jsonData) {
    try {
      // Try to find expected columns with different possible names
      const dateDue = findValueFromPossibleKeys(row, [
        'Zahlbar bis', 'Fällig am', 'Fälligkeit', 'Datum', 'Zahlungsziel'
      ]);
      
      const customer = findValueFromPossibleKeys(row, [
        'Kunde', 'Kundenname', 'Firma', 'Name', 'Empfänger'
      ]);
      
      const customerNumber = findValueFromPossibleKeys(row, [
        'Kundennummer', 'KundenNr', 'Kunden-Nr', 'Nummer', 'Nr'
      ]);
      
      const amount = findValueFromPossibleKeys(row, [
        'Brutto', 'Betrag', 'Summe', 'Total', 'Rechnungsbetrag'
      ]);
      
      // Parse values safely
      // IMPORTANT: Don't use Excel dates directly, they cause timezone issues
      let finalDate = new Date();
      
      // Log the original dateDue value for debugging
      console.log('Original dateDue value:', {
        value: dateDue,
        type: typeof dateDue,
        valueAsString: String(dateDue)
      });
      
      // Handle Excel numeric dates (Excel stores dates as numbers)
      if (dateDue !== null && dateDue !== undefined) {
        if (typeof dateDue === 'number') {
          // Convert Excel date number to JavaScript Date
          // Excel dates are number of days since 1900-01-01
          // But there's a leap year bug, so we need to adjust
          try {
            // Adjust for Excel's leap year bug (Excel thinks 1900 was a leap year)
            const excelEpoch = new Date(1899, 11, 30);
            const msPerDay = 24 * 60 * 60 * 1000;
            finalDate = new Date(excelEpoch.getTime() + dateDue * msPerDay);
            console.log(`Converted Excel numeric date ${dateDue} to ${finalDate.toISOString()}`);
          } catch (error) {
            console.error('Error converting Excel date number:', error);
            // Use today's date as fallback
            finalDate = new Date();
          }
        } else {
          // Try to parse string date
          const parsedDate = parseDateFallback(String(dateDue));
          if (parsedDate) {
            finalDate = parsedDate;
            console.log(`Parsed string date "${dateDue}" to ${finalDate.toISOString()}`);
          } else {
            console.warn(`Could not parse date string "${dateDue}", using today's date`);
            // Use today's date as fallback
            finalDate = new Date();
          }
        }
      } else {
        console.warn('No date value found, using today\'s date');
        // No date provided, use today's date
        finalDate = new Date();
      }
      
      // Parse amount safely
      let parsedAmount = 0;
      if (amount) {
        if (typeof amount === 'string') {
          // Remove currency symbols and other non-numeric characters
          parsedAmount = parseFloat(amount.replace(/[^\d.-]/g, ''));
        } else {
          parsedAmount = Number(amount);
        }
      }
      
      if (customer && !isNaN(parsedAmount)) {
        // Create description from customer and number
        const details = customerNumber 
          ? `${customer} ${customerNumber}`
          : `${customer}`;
        
        // Check if this is a duplicate 
        const isDuplicate = checkIfDuplicate(
          existingTransactions || [],
          details,
          'Incoming',
          Math.abs(parsedAmount),
          finalDate
        );
        
        if (isDuplicate) {
          duplicateCount++;
          continue;
        }
        
        processedRows.push({
          date: finalDate.toISOString(),
          details: details,
          amount: Math.abs(parsedAmount),
          direction: 'Incoming' // Always incoming for invoices
        });
      }
    } catch (rowError) {
      console.error('Error processing Excel row:', rowError);
    }
  }
  
  return { data: processedRows, duplicates: duplicateCount };
}

/**
 * Helper function to check if a transaction already exists
 */
function checkIfDuplicate(
  existingTransactions: any[],
  details: string,
  direction: 'Incoming' | 'Outgoing',
  amount: number,
  date: Date
): boolean {
  return existingTransactions.some(tx => {
    // Check for existing transaction with same details and direction
    if (tx.details === details && tx.direction === direction) {
      // Check if amount is within 1% tolerance (to account for rounding errors)
      const amountDiff = Math.abs(tx.amount - amount);
      const amountTolerance = amount * 0.01; // 1% tolerance
      
      if (amountDiff <= amountTolerance) {
        return true;
      }
      
      // Check if the transaction was modified by the user
      if (tx.modified) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Helper function to find a value in an object using multiple possible keys
 */
function findValueFromPossibleKeys(obj: any, keys: string[]): any {
  for (const key of keys) {
    if (obj[key] !== undefined) {
      return obj[key];
    }
  }
    return null;
} 