import { format, parse, parseISO, isValid } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

/**
 * Format a date with Swiss/German format
 */
export function formatSwissDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd.MM.yyyy', { locale: de });
}

/**
 * Parse a date string in Swiss/German format
 */
export function parseSwissDate(dateStr: string): Date | null {
  try {
    // Try to parse in format dd.MM.yyyy
    const date = parse(dateStr, 'dd.MM.yyyy', new Date(), { locale: de });
    if (isValid(date)) return date;
    
    // Try to parse in format yyyy-MM-dd
    const date2 = parse(dateStr, 'yyyy-MM-dd', new Date(), { locale: enUS });
    if (isValid(date2)) return date2;
    
    // Try to parse ISO date
    const date3 = parseISO(dateStr);
    if (isValid(date3)) return date3;
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Date utility functions
 */

/**
 * Formats a date to ISO string (YYYY-MM-DD)
 * @param date Date to format
 * @returns ISO date string
 */
export function dateToIsoString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parses a date string with fallback to multiple formats
 * Supports Swiss format (dd.mm.yyyy), ISO format, and others
 * @param dateStr The date string to parse
 * @returns Date object or null if parsing failed
 */
export function parseDateFallback(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Clean up the input
  let cleanDateStr = dateStr.trim();
  
  // Log the original date string for debugging
  console.log(`Attempting to parse date: "${dateStr}"`);
    
  // Handle Swiss dates with missing year (e.g., "14.05.")
  if (/^\d{1,2}\.\d{1,2}\.?$/.test(cleanDateStr)) {
    // Remove trailing dot if present
    cleanDateStr = cleanDateStr.replace(/\.$/, '');
    
    // Add current year
    const currentYear = new Date().getFullYear();
    cleanDateStr = `${cleanDateStr}.${currentYear}`;
    console.log(`Added current year to short date: "${cleanDateStr}"`);
  }
  
  // Handle Swiss dates with two-digit year (e.g., "30.05.25")
  if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(cleanDateStr)) {
    // Extract the parts
    const [day, month, shortYear] = cleanDateStr.split('.');
    
    // Convert to four-digit year (assuming 20xx for years < 50, 19xx for years >= 50)
    const fullYear = parseInt(shortYear) < 50 ? `20${shortYear}` : `19${shortYear}`;
    
    // Reconstruct the date string
    cleanDateStr = `${day}.${month}.${fullYear}`;
    console.log(`Expanded two-digit year date: "${dateStr}" to "${cleanDateStr}"`);
  }
  
  // Handle banking display formats like "Morgen, 14.05." or "Di, 20.05."
  if (cleanDateStr.includes(',')) {
    // Extract the date part after the comma
    const datePart = cleanDateStr.split(',')[1]?.trim() || '';
    
    // If we have a date pattern like dd.mm.
    if (/^\d{1,2}\.\d{1,2}\.?$/.test(datePart)) {
      // Add current year
      const currentYear = new Date().getFullYear();
      cleanDateStr = `${datePart.replace(/\.$/, '')}.${currentYear}`;
      console.log(`Parsed date with day of week: "${dateStr}" to "${cleanDateStr}"`);
    }
  }
  
  // Try various formats in order of likelihood
  const formats = [
    // Swiss format: 31.12.2023
    { format: 'dd.MM.yyyy', locale: de },
    // Short Swiss format with current year: 31.12.
    { format: 'd.M.yyyy', locale: de },
    // Swiss format with two-digit year: 31.12.23
    { format: 'dd.MM.yy', locale: de },
    // ISO format: 2023-12-31
    { format: 'yyyy-MM-dd' },
    // US format: 12/31/2023
    { format: 'MM/dd/yyyy' },
    // Other common formats
    { format: 'dd/MM/yyyy' },
    { format: 'yyyy.MM.dd' },
  ];
  
  for (const { format: dateFormat, locale } of formats) {
    try {
      const parsedDate = locale 
        ? parse(cleanDateStr, dateFormat, new Date(), { locale })
        : parse(cleanDateStr, dateFormat, new Date());
      
      // Validate the parsed date
      const isValidDate = !isNaN(parsedDate.getTime());
      
      if (isValidDate) {
        console.log(`Successfully parsed date: "${cleanDateStr}" with format "${dateFormat}" to ${parsedDate.toISOString()}`);
        return parsedDate;
      }
    } catch (error) {
      // Continue to the next format if this one fails
      continue;
    }
  }
  
  // Handle special bank date formats like "Morgen" (tomorrow), "Heute" (today)
  if (/morgen/i.test(cleanDateStr)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  } else if (/heute/i.test(cleanDateStr)) {
    return new Date();
  }
  
  // If all parsing attempts fail, try the JavaScript Date constructor as a last resort
  try {
    const fallbackDate = new Date(cleanDateStr);
    if (!isNaN(fallbackDate.getTime())) {
      console.log(`Parsed date with JS Date constructor: "${cleanDateStr}" to ${fallbackDate.toISOString()}`);
      return fallbackDate;
    }
  } catch (error) {
    // Ignore error and return null
  }
  
  // Log the unparseable date for debugging
  console.warn(`Failed to parse date: "${dateStr}" (cleaned: "${cleanDateStr}")`);
  
  return null;
} 