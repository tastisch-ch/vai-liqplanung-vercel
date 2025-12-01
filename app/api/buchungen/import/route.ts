import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/server';
import { parseDateFallback } from '@/lib/date-utils';
import { parseCHF } from '@/lib/currency';
import ExcelJS from 'exceljs';
import { Buffer } from 'node:buffer';
import { v4 as uuidv4 } from 'uuid';
import { matchBuchungToFixkostenServer } from '@/lib/services/fixkosten-overrides-server';

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
    const fileBase64 = formData.get('fileBase64') as string | null;
    const fileName = formData.get('fileName') as string | null;
    
    console.log('Processing import:', { importType, hasData: !!importData, hasFile: !!file, hasFileBase64: !!fileBase64 });
    
    let processedData = [];
    let duplicateCount = 0;
    
    // Process based on import type
    if (importType === 'html') {
      // Process HTML table data
      const { data, duplicates } = await processHTMLImport(importData, userId, request);
      processedData = data;
      duplicateCount = duplicates;
    } else if (importType === 'excel' && (file || fileBase64)) {
      // Excel import: idempotent upsert/delete for invoices
      try {
        const fileToUse = file || (fileBase64 ? { name: fileName || 'import.xlsx', size: (fileBase64.length * 3) / 4 } : null);
        console.log('Starting Excel import for file:', fileToUse?.name, 'size:', fileToUse?.size, 'hasBase64:', !!fileBase64);
        // Use base64 string if available, otherwise use file object
        const stats = await upsertExcelInvoices(fileBase64 ? undefined : (file || undefined), userId, request, fileBase64 || undefined);
        console.log('Excel import completed successfully:', stats);
        // Persist last import meta (best-effort)
        try {
          await supabase
            .from('imports')
            .insert({
              kind: 'excel',
              user_id: session.user.id,
              user_email: (session.user as any).email || null,
              details: { count: stats.newCount + stats.updatedCount + stats.removedCount, duplicates: stats.removedCount }
            });
        } catch (e) {
          console.warn('Persist last_import (imports) failed (non-fatal):', e);
        }
        return NextResponse.json(
          {
            success: true,
            message: `Excel verarbeitet: neu=${stats.newCount}, aktualisiert=${stats.updatedCount}, entfernt=${stats.removedCount}`,
            stats
          },
          { status: 200 }
        );
      } catch (excelError) {
        console.error('Excel import error:', excelError);
        return NextResponse.json(
          { 
            error: 'Excel import failed', 
            details: excelError instanceof Error ? excelError.message : 'Unknown Excel error' 
          },
          { status: 500 }
        );
      }
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
      
      // Try to match imported transactions to fixkosten and create skip overrides
      let matchedCount = 0;
      for (const item of processedData) {
        try {
          const override = await matchBuchungToFixkostenServer(
            {
              date: new Date(item.date),
              amount: item.amount,
              details: item.details,
              direction: item.direction
            },
            userId,
            supabase
          );
          if (override) {
            matchedCount++;
          }
        } catch (matchError) {
          // Non-critical error, just log it
          console.warn('Error matching buchung to fixkosten:', matchError);
        }
      }
      
      if (matchedCount > 0) {
        console.log(`Created ${matchedCount} skip overrides for matching fixkosten transactions`);
      }
      
      // Persist last import meta (best-effort, global shared key)
      try {
        await supabase
          .from('imports')
          .insert({
            kind: 'html',
            user_id: session.user.id,
            user_email: (session.user as any).email || null,
            details: { count: processedData.length, duplicates: duplicateCount }
          });
      } catch (e) {
        console.warn('Persist last_import (imports) failed (non-fatal):', e);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Importiert: ${processedData.length} Einträge${duplicateCount > 0 ? `, ${duplicateCount} Duplikate übersprungen` : ''}`, 
        count: processedData.length,
        duplicates: duplicateCount
      }, { status: 200 });
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
  // IMPORTANT: de-dupe across ALL users (shared dataset)
  const { data: existingTransactions } = await supabase
    .from('buchungen')
    .select('details, direction, amount, date, user_id');

  // Normalization helper
  const normalizeDetails = (s: string) => String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  
  // Extract transaction rows from HTML - find expandable item rows
  const rowRegex = /<tr[^>]*class="expandable item"[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...htmlData.matchAll(rowRegex)];
  
  console.log(`Found ${rows.length} potential transaction rows in HTML`);
  
  const processedRows = [] as Array<{ date: string; details: string; amount: number; direction: 'Incoming' | 'Outgoing' }>;
  let duplicateCount = 0;
  let ignoredCount = 0;
  const seenImportKeys = new Set<string>();
  
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
          
          // Build normalized key (per-day) and check duplicates within current import
          const day = date.toISOString().slice(0, 10);
          const normDetails = normalizeDetails(details);
          const importKey = `${normDetails}|${direction}|${amount.toFixed(2)}|${day}`;

          if (seenImportKeys.has(importKey)) {
            duplicateCount++;
            continue;
          }

          // Check for duplicates in DB including same day
          const isDuplicate = (existingTransactions || []).some((tx: any) => {
            const txDay = String(tx.date).slice(0, 10);
            const amountDiff = Math.abs(tx.amount - amount);
            const amountTolerance = amount * 0.01; // 1%
            return (
              normalizeDetails(tx.details) === normDetails &&
              tx.direction === direction &&
              txDay === day &&
              amountDiff <= amountTolerance
            );
          });
          
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
          seenImportKeys.add(importKey);
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
 * Excel upsert/delete for invoices keyed by a stable invoice_id derived from details
 * - New: insert with is_invoice=true, invoice_id, kategorie='Standard'
 * - Changed: update amount/date/details (keep id)
 * - Missing: delete rows that are not present in this import (paid invoices)
 */
async function upsertExcelInvoices(file: File | undefined, userId: string, request: NextRequest, fileBase64?: string) {
  const supabase = createRouteHandlerSupabaseClient(request);

  try {
    // Load existing invoices globally (matching + removals)
    console.log('Loading existing invoices (global)');

    let { data: existingForMatching, error: loadMatchErr } = await supabase
      .from('buchungen')
      .select('id, invoice_id, amount, date, details, is_invoice, user_id, invoice_status, paid_at, kategorie, is_simulation, direction, last_seen_at');

    if (loadMatchErr) {
      console.warn('Loading existing invoices failed (non-fatal), continuing with empty set:', loadMatchErr.message);
      existingForMatching = [] as any[];
    }
    console.log('Loaded for matching:', existingForMatching?.length || 0);

  const existingByInvoiceId = new Map<string, { id: string; amount: number; date: string; details: string; invoice_status?: string | null; paid_at?: string | null; user_id?: string }>();
  for (const inv of existingForMatching || []) {
    const invIdRaw = (inv as any).invoice_id as string | null;
    const invId = invIdRaw ? String(invIdRaw).trim().toLowerCase() : null;
    const details = (inv as any).details as string;
    
    // If invoice_id is set, use it
    if (invId) {
      existingByInvoiceId.set(invId, {
        id: (inv as any).id,
        amount: (inv as any).amount,
        date: (inv as any).date,
        details: details,
        invoice_status: (inv as any).invoice_status || null,
        paid_at: (inv as any).paid_at || null,
        user_id: (inv as any).user_id,
      });
    }
    // Also try to extract invoice number from existing details for matching
    else if (details) {
      // Try to extract invoice number from details like "12345 - Customer Name" or "Invoice #12345 - Customer Name" 
      const invoiceMatch = details.match(/(?:Invoice #)?(\w+) - /i);
      if (invoiceMatch) {
        const extractedInvoiceNumber = invoiceMatch[1].toLowerCase();
        existingByInvoiceId.set(extractedInvoiceNumber, {
          id: (inv as any).id,
          amount: (inv as any).amount,
          date: (inv as any).date,
          details: details,
          invoice_status: (inv as any).invoice_status || null,
          paid_at: (inv as any).paid_at || null,
          user_id: (inv as any).user_id,
        });
      }
      
      // Also add the full details as fallback
      const computedInvoiceId = String(details).trim().toLowerCase();
      existingByInvoiceId.set(computedInvoiceId, {
        id: (inv as any).id,
        amount: (inv as any).amount,
        date: (inv as any).date,
        details: details,
        invoice_status: (inv as any).invoice_status || null,
        paid_at: (inv as any).paid_at || null,
        user_id: (inv as any).user_id,
      });
    }
  }
  
  console.log('Existing invoices by ID:', Array.from(existingByInvoiceId.keys()));

    // Read Excel file - use exceljs instead of XLSX to avoid ArrayBuffer allocation issues
    let workbook: ExcelJS.Workbook;
    
    if (fileBase64) {
      // Use base64 string - convert to Buffer for exceljs
      const approximateSize = (fileBase64.length * 3) / 4;
      console.log('Reading Excel from base64 string, length:', fileBase64.length, 'approximate size:', approximateSize, 'bytes');
      
      if (approximateSize > 5 * 1024 * 1024) {
        throw new Error(`Excel file too large: ${(approximateSize / 1024 / 1024).toFixed(2)}MB (max 5MB)`);
      }
      
      try {
        const buffer = Buffer.from(fileBase64, 'base64');
        workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        console.log('Excel loaded from base64, sheets:', workbook.worksheets.length);
      } catch (e) {
        console.error('Error reading Excel from base64:', e);
        throw new Error(`Failed to read Excel file from base64: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    } else if (file) {
      console.log('Reading Excel file with exceljs...', {
        fileName: file.name,
        fileSize: file.size,
        fileSizeMB: (file.size / 1024 / 1024).toFixed(4),
        fileType: file.type,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage ? {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        } : 'N/A'
      });
      
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`Excel file too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 5MB)`);
      }
      
      try {
        // ExcelJS needs a Buffer, not a stream - read file as Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as any);
        console.log('Excel loaded successfully, sheets:', workbook.worksheets.length);
      } catch (e) {
        console.error('Error reading Excel file:', {
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
          name: e instanceof Error ? e.name : undefined,
          memoryUsage: process.memoryUsage ? {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
          } : 'N/A'
        });
        throw new Error(`Failed to read Excel file: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    } else {
      throw new Error('No file or base64 string provided');
    }
    
    if (!workbook.worksheets || workbook.worksheets.length === 0) {
      throw new Error('Excel file contains no sheets');
    }
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Failed to read first sheet from Excel file');
    }
    
    // Convert ExcelJS worksheet to JSON array
    const jsonData: any[] = [];
    const headerRow: string[] = [];
    let isFirstRow = true;
    
    worksheet.eachRow((row, rowNumber) => {
      if (isFirstRow) {
        // First row is headers
        row.eachCell((cell, colNumber) => {
          headerRow[colNumber - 1] = cell.text || '';
        });
        isFirstRow = false;
      } else {
        // Data rows
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headerRow[colNumber - 1];
          if (header) {
            // Handle different cell types
            if (cell.value instanceof Date) {
              rowData[header] = cell.value;
            } else if (typeof cell.value === 'number') {
              rowData[header] = cell.value;
            } else {
              rowData[header] = cell.text || '';
            }
          }
        });
        jsonData.push(rowData);
      }
    });
    
    console.log('Extracted', jsonData.length, 'rows from Excel file');

  const toInsert: any[] = [];
  const toUpdate: { id: string; date: string; amount: number; details: string }[] = [];
  const toReopen: string[] = [];
  const seenIds = new Set<string>();

  for (const row of jsonData) {
    try {
      const dateDue = findValueFromPossibleKeys(row, [
        'Zahlbar bis', 'Fällig am', 'Fälligkeit', 'Datum', 'Zahlungsziel'
      ]);
      const customer = findValueFromPossibleKeys(row, [
        'Kunde', 'Kundenname', 'Firma', 'Name', 'Empfänger'
      ]);
      const customerNumber = findValueFromPossibleKeys(row, [
        'Kundennummer', 'KundenNr', 'Kunden-Nr', 'Nummer', 'Nr'
      ]);
      const invoiceNumber = findValueFromPossibleKeys(row, [
        'Rechnungsnummer', 'RechnungsNr', 'Rechnung-Nr', 'Invoice', 'InvoiceNumber', 'Nr', 'ID'
      ]);
      const amount = findValueFromPossibleKeys(row, [
        'Brutto', 'Betrag', 'Summe', 'Total', 'Rechnungsbetrag'
      ]);

      if (!customer || amount === undefined || amount === null) continue;

      // Parse date
      let finalDate: Date = new Date();
      if (dateDue !== null && dateDue !== undefined) {
        if (typeof dateDue === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          const msPerDay = 24 * 60 * 60 * 1000;
          finalDate = new Date(excelEpoch.getTime() + dateDue * msPerDay);
        } else {
          const parsed = parseDateFallback(String(dateDue));
          finalDate = parsed || new Date();
        }
      }

      // Parse amount
      let parsedAmount = 0;
      if (typeof amount === 'string') parsedAmount = parseFloat(amount.replace(/[^\d.-]/g, ''));
      else parsedAmount = Number(amount);
      if (isNaN(parsedAmount)) continue;

      // Build details with invoice number prominently displayed
      let details;
      if (invoiceNumber) {
        // Format: "12345 - Customer Name (CustomerNumber)"
        const customerInfo = customerNumber ? `${customer} (${customerNumber})` : customer;
        details = `${invoiceNumber} - ${customerInfo}`;
      } else {
        // Fallback to old format if no invoice number
        details = customerNumber ? `${customer} ${customerNumber}` : `${customer}`;
      }
      
      // Use invoice number as unique ID if available, otherwise fall back to customer details
      const invoiceId = invoiceNumber 
        ? String(invoiceNumber).trim().toLowerCase()
        : String(details).trim().toLowerCase();
      seenIds.add(invoiceId);

      const normalized = {
        date: finalDate.toISOString(),
        details,
        amount: Math.abs(parsedAmount),
        direction: 'Incoming' as const,
      };

      const existing = existingByInvoiceId.get(invoiceId);
      if (!existing) {
        toInsert.push({
          id: uuidv4(),
          ...normalized,
          user_id: userId,
          is_invoice: true,
          invoice_id: invoiceId,
          invoice_status: 'open',
          last_seen_at: new Date().toISOString(),
          kategorie: 'Standard',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          modified: false,
        });
      } else {
        // If invoice reappears while it was marked paid -> reopen
        const wasPaid = !!(existing.paid_at);
        const amountChanged = Math.abs((existing as any).amount - normalized.amount) > 0.005;
        const dateChanged = new Date((existing as any).date).getTime() !== new Date(normalized.date).getTime();
        const detailsChanged = (((existing as any).details || '') !== normalized.details);

        if (wasPaid) {
          toReopen.push((existing as any).id);
          if (amountChanged || dateChanged || detailsChanged) {
            toUpdate.push({ id: (existing as any).id, date: normalized.date, amount: normalized.amount, details: normalized.details });
          }
        } else {
          if (amountChanged || dateChanged || detailsChanged) {
            toUpdate.push({ id: (existing as any).id, date: normalized.date, amount: normalized.amount, details: normalized.details });
          } else {
            // No field changed -> still present in the feed: refresh last_seen_at to keep it open (not counted as update)
            try {
              const { error: seenErr } = await supabase
                .from('buchungen')
                .update({ last_seen_at: new Date().toISOString(), invoice_status: 'open', updated_at: new Date().toISOString() })
                .eq('id', (existing as any).id);
              if (seenErr) console.warn('last_seen refresh failed (non-fatal):', seenErr.message);
            } catch (e) {
              console.warn('last_seen refresh threw (non-fatal):', e instanceof Error ? e.message : e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error parsing Excel row (upsert path):', err);
    }
  }

  // Determine invoices no longer present (globally): mark as paid immediately (Incoming only, non-simulations)
  const markPaidIds: string[] = [];
  for (const inv of existingForMatching || []) {
    const invIdRaw = (inv as any).invoice_id as string | null;
    const invId = invIdRaw ? String(invIdRaw).trim().toLowerCase() : null;
    const detailsKey = ((inv as any).details || '').toString().trim().toLowerCase();
    const isSimulation = ((inv as any).kategorie === 'Simulation') || ((inv as any).is_simulation === true);
    const isIncoming = ((inv as any).direction === 'Incoming');
    const alreadyPaid = !!(inv as any).paid_at;
    const missingByInvoiceId = invId && !seenIds.has(invId);
    const missingByDetails = !invId && detailsKey && !seenIds.has(detailsKey);
    if ((missingByInvoiceId || missingByDetails) && !isSimulation && isIncoming && !alreadyPaid) {
      markPaidIds.push((inv as any).id);
    }
  }

  // Execute DB operations
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('buchungen').insert(toInsert);
    if (insErr) throw insErr;
    
    // Try to match inserted transactions to fixkosten and create skip overrides
    let matchedCount = 0;
    for (const item of toInsert) {
      try {
        const override = await matchBuchungToFixkostenServer(
          {
            date: new Date(item.date),
            amount: item.amount,
            details: item.details,
            direction: item.direction
          },
          userId,
          supabase
        );
        if (override) {
          matchedCount++;
        }
      } catch (matchError) {
        // Non-critical error, just log it
        console.warn('Error matching buchung to fixkosten:', matchError);
      }
    }
    
    if (matchedCount > 0) {
      console.log(`Created ${matchedCount} skip overrides for matching fixkosten transactions`);
    }
  }
  if (toReopen.length > 0) {
    const { error: reopenErr } = await supabase
      .from('buchungen')
      .update({ invoice_status: 'open', paid_at: null, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', toReopen)
      .eq('direction', 'Incoming')
      .eq('is_invoice', true);
    if (reopenErr) throw reopenErr;
  }
  for (const upd of toUpdate) {
    const { error: updErr } = await supabase
      .from('buchungen')
      .update({ date: upd.date, amount: upd.amount, details: upd.details, invoice_status: 'open', last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', upd.id);
    if (updErr) throw updErr;
  }
  if (markPaidIds.length > 0) {
    console.log('Marking invoices as paid (count):', markPaidIds.length);
    const { error: payErr } = await supabase
      .from('buchungen')
      .update({ invoice_status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in('id', markPaidIds)
      .eq('direction', 'Incoming')
      .eq('is_invoice', true);
    if (payErr) throw payErr;
  }

    // Count: updated includes field changes + paid/unpaid toggles; last_seen refreshes are not counted
    const updatedCount = toUpdate.length + markPaidIds.length + toReopen.length;
    return { newCount: toInsert.length, updatedCount, removedCount: 0, markedPaidCount: markPaidIds.length, reopenedCount: toReopen.length };
  } catch (error) {
    console.error('Error in upsertExcelInvoices:', error);
    throw error;
  }
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