/**
 * Date formatting and parsing utilities for the application
 * These functions help maintain consistent date handling across the app
 */

/**
 * Format a date in Swiss date format (DD.MM.YYYY)
 * @param date - Date to format
 */
export function formatSwissDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  return d.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Parse a Swiss formatted date string (DD.MM.YYYY) to a Date object
 * Similar to the Python app's parse_date_swiss_fallback function
 * @param dateString - Date string to parse
 */
export function parseSwissDate(dateString: string): Date | null {
  if (!dateString) return null;

  // Try direct parsing first
  const [day, month, year] = dateString.split('.');
  if (day && month && year) {
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try alternative formats if the first method fails
  // ISO format (YYYY-MM-DD)
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try to parse with Date constructor as fallback
  const fallbackDate = new Date(dateString);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }

  return null;
}

/**
 * Convert a Date object to an ISO string for storage
 * @param date - Date to convert
 */
export function dateToIsoString(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Gets the first day of the current month
 */
export function getFirstDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Gets the first day of the current quarter
 */
export function getFirstDayOfQuarter(date: Date = new Date()): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

/**
 * Gets the first day of the current year
 */
export function getFirstDayOfYear(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/**
 * Gets the last day of the month (for date range selection)
 */
export function getLastDayOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Gets the last day of the quarter
 */
export function getLastDayOfQuarter(date: Date = new Date()): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), (quarter + 1) * 3, 0);
}

/**
 * Gets the last day of the year
 */
export function getLastDayOfYear(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), 11, 31);
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Calculate next occurrence based on payment interval (rhythmus)
 * 
 * @param date - Base date
 * @param rhythmus - Payment rhythm (monatlich, quartalsweise, etc.)
 * @returns Date of next occurrence
 */
export function getNextOccurrence(date: Date, rhythmus: string): Date {
  const result = new Date(date);
  
  switch (rhythmus) {
    case 'monatlich':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'quartalsweise':
      result.setMonth(result.getMonth() + 3);
      break;
    case 'halbjährlich':
      result.setMonth(result.getMonth() + 6);
      break;
    case 'jährlich':
      result.setFullYear(result.getFullYear() + 1);
      break;
    default:
      // Default to monthly if unknown
      result.setMonth(result.getMonth() + 1);
  }
  
  return result;
}

/**
 * Adjusts payment date for business days and month-end scenarios
 * 
 * Handles two special cases:
 * 1. If the date falls on a weekend (Saturday/Sunday), moves it to the previous Friday
 * 2. If the date is e.g. 31st but the month doesn't have 31 days, moves it to the last day of that month
 * 
 * @param date - The original payment date
 * @param isMonthEnd - Whether this date should always be treated as the end of month (e.g., for the 31st or the 30th)
 * @param moveToPreviousFriday - Whether weekend dates should be moved to the previous Friday (default: true)
 * @returns Adjusted date suitable for business payments
 */
export function adjustPaymentDate(
  date: Date, 
  isMonthEnd: boolean = false,
  moveToPreviousFriday: boolean = true
): Date {
  if (!date) return date;
  
  const result = new Date(date);
  
  // First preserve the intended day of month
  const intendedDay = result.getDate();
  
  // Handle month-end cases (e.g., trying to use the 31st in a month with only 30 days)
  const month = result.getMonth();
  const year = result.getFullYear();
  
  // Get the actual last day of the month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  // If isMonthEnd is true, always use the last day of the month
  if (isMonthEnd) {
    result.setDate(lastDayOfMonth);
  } 
  // Otherwise, only adjust if the intended day exceeds the last day of this month
  else if (intendedDay > lastDayOfMonth) {
    result.setDate(lastDayOfMonth);
  }
  
  // Now handle weekend cases
  if (moveToPreviousFriday) {
    const dayOfWeek = result.getDay(); // 0 = Sunday, 6 = Saturday
    
    if (dayOfWeek === 0) { // Sunday → Friday
      result.setDate(result.getDate() - 2);
    } else if (dayOfWeek === 6) { // Saturday → Friday
      result.setDate(result.getDate() - 1);
    }
  }
  
  return result;
} 