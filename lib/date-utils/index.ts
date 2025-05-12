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
 * Parse a date with fallback formats for different sources
 */
export function parseDateFallback(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  try {
    // Clean the string
    const cleanDateStr = dateStr.trim();
    
    // Try Swiss format first
    const swissDate = parseSwissDate(cleanDateStr);
    if (swissDate) return swissDate;
    
    // Try to parse as ISO
    const isoDate = parseISO(cleanDateStr);
    if (isValid(isoDate)) return isoDate;
    
    // Last attempt - try as timestamp
    const timestamp = Date.parse(cleanDateStr);
    if (!isNaN(timestamp)) {
      return new Date(timestamp);
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date with fallback:', error);
    return null;
  }
} 