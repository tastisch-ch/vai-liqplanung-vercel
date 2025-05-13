import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { parseDateFallback } from '@/lib/date-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('Debug import endpoint called');
    
    // Get auth user (optional now)
    const supabase = createRouteHandlerSupabaseClient(request);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Use a default/test user ID if not authenticated
    const userId = session?.user?.id || 'test-user-id';
    console.log('Using user ID:', userId, 'Authenticated:', !!session);
    
    // Get form data
    const formData = await request.formData();
    const importType = formData.get('type') as string;
    const importData = formData.get('data') as string;
    const file = formData.get('file') as File | null;
    
    console.log('Debug import type:', importType, 'Has data:', !!importData, 'Has file:', !!file);
    
    // Process based on import type
    if (importType === 'html' && importData) {
      // Process HTML data
      const processedData = processHTMLImport(importData);
      
      return NextResponse.json({
        success: true,
        message: `Debug HTML data processed: ${processedData.length} rows extracted`,
        data: processedData,
        note: "This endpoint only processes the data but does not insert it into the database."
      });
    }
    else if (importType === 'excel' && file) {
      // Process Excel file
      return await processExcelFile(file, userId);
    }
    else {
      return NextResponse.json(
        { error: 'Invalid import type or missing data/file' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Overall error in debug import API:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Process HTML table data from e-banking
 */
function processHTMLImport(htmlData: string) {
  console.log('Processing HTML import with data length:', htmlData.length);
  
  // Extract transaction rows from HTML - find expandable item rows
  const rowRegex = /<tr[^>]*class="expandable item"[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...htmlData.matchAll(rowRegex)];
  
  console.log(`Found ${rows.length} potential transaction rows in HTML`);
  
  const processedRows = [];
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
      
      console.log(`Debug - Processing HTML row: Date=${dateStr}, Details=${details?.substring(0, 30)}..., Amount=${amountStr}, Type=${transactionType}`);
      
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
          
          processedRows.push({
            id: uuidv4(),
            date: date.toISOString(),
            details: details,
            amount: amount,
            direction: direction,
            user_id: 'debug-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            modified: false
          });
        }
      }
    } catch (error) {
      console.error('Error processing HTML row:', error);
    }
  }
  
  console.log(`Processed ${processedRows.length} valid transactions from HTML (${ignoredCount} standing orders/salary payments ignored)`);
  return processedRows;
}

/**
 * Process Excel file with invoice data
 */
async function processExcelFile(file: File, userId: string) {
  console.log('Processing Excel file:', file.name, file.size);
  
  // Read Excel file
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    console.log('Excel file parsed successfully');
    
    // Get first sheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
    console.log('Sheet data extracted, rows:', jsonData.length);
    
    if (jsonData.length === 0) {
      return NextResponse.json(
        { error: 'Excel file has no data' },
        { status: 400 }
      );
    }
    
    // Log the structure of the first row for debugging
    console.log('First row structure:', Object.keys(jsonData[0]));
    console.log('First row sample data:', JSON.stringify(jsonData[0]).substring(0, 200) + '...');
    
    // Process rows
    const processedRows = [];
    for (const row of jsonData.slice(0, 3)) { // Process only first 3 rows for testing
      try {
        // Find key fields in the Excel data
        const kunde = findValueFromKeys(row, ['Kunde', 'kunde', 'KUNDE']) || '';
        const kundennummer = findValueFromKeys(row, ['Kundennummer', 'kundennummer', 'KUNDENNUMMER']) || '';
        const betragRaw = findValueFromKeys(row, ['Brutto', 'brutto', 'BRUTTO', 'Total', 'total']) || 0;
        const dateDue = findValueFromKeys(row, ['Zahlbar bis', 'Fällig am', 'Fälligkeit', 'Datum', 'Zahlungsziel']);
        
        // Parse the due date properly with date fallback handling
        let finalDate = new Date();
        
        // Log the original dateDue value for debugging
        console.log('Debug import - Original dateDue value:', {
          value: dateDue,
          type: typeof dateDue,
          valueAsString: String(dateDue)
        });
        
        // Handle Excel numeric dates (Excel stores dates as numbers)
        if (dateDue !== null && dateDue !== undefined) {
          if (typeof dateDue === 'number') {
            // Convert Excel date number to JavaScript Date
            // Excel dates are number of days since 1900-01-01
            try {
              // Adjust for Excel's leap year bug (Excel thinks 1900 was a leap year)
              const excelEpoch = new Date(1899, 11, 30);
              const msPerDay = 24 * 60 * 60 * 1000;
              finalDate = new Date(excelEpoch.getTime() + dateDue * msPerDay);
              console.log(`Debug import - Converted Excel numeric date ${dateDue} to ${finalDate.toISOString()}`);
            } catch (error) {
              console.error('Debug import - Error converting Excel date number:', error);
              finalDate = new Date();
            }
          } else {
            // Try to parse string date
            const parsedDate = parseDateFallback(String(dateDue));
            if (parsedDate) {
              finalDate = parsedDate;
              console.log(`Debug import - Parsed string date "${dateDue}" to ${finalDate.toISOString()}`);
            } else {
              console.warn(`Debug import - Could not parse date string "${dateDue}", using today's date`);
              finalDate = new Date();
            }
          }
        } else {
          console.warn('Debug import - No date value found, using today\'s date');
          finalDate = new Date();
        }
        
        // For the amount, ensure we have a valid number
        const betrag = typeof betragRaw === 'string' ? 
          parseFloat(betragRaw.replace(/[^\d.-]/g, '')) : // Remove non-numeric chars
          Number(betragRaw);
        
        console.log('Processing row data:', { 
          kunde, 
          kundennummer, 
          betragRaw,
          betrag,
          dateDue,
          finalDate: finalDate.toISOString(),
          rowData: JSON.stringify(row).substring(0, 200)
        });
        
        // Create processed row with the properly handled date
        const processedRow = {
          id: uuidv4(),
          date: finalDate.toISOString(),
          details: `${kunde} ${kundennummer}`.trim(),
          amount: isNaN(betrag) ? 0 : betrag,
          direction: 'Incoming',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          modified: false
        };
        
        processedRows.push(processedRow);
        console.log('Processed row:', processedRow);
      } catch (rowError) {
        console.error('Error processing row:', rowError);
      }
    }
    
    // Return the processed data without inserting into database
    return NextResponse.json({
      success: true,
      message: `Debug data processed: ${processedRows.length} rows extracted`,
      data: processedRows,
      excelData: {
        firstRow: jsonData.length > 0 ? jsonData[0] : null,
        rowCount: jsonData.length
      },
      note: "This endpoint only processes the data but does not insert it into the database."
    });
    
  } catch (parseError) {
    console.error('Error parsing Excel file:', parseError);
    return NextResponse.json(
      { error: 'Error parsing Excel file', details: parseError instanceof Error ? parseError.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to find a value in an object using multiple possible keys
 */
function findValueFromKeys(obj: any, keys: string[]): any {
  for (const key of keys) {
    if (obj[key] !== undefined) {
      return obj[key];
    }
  }
  return null;
} 