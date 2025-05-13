/**
 * Currency utility functions for the application.
 */

/**
 * Format a number as CHF currency
 * @param value Number to format
 * @returns Formatted string (e.g. "123.45 CHF")
 */
export function formatCHF(value: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Parse a CHF currency string to a number
 * @param value String representation of CHF amount (e.g. "CHF 123.45", "123,45 CHF", etc.)
 * @returns Parsed number or null if parsing fails
 */
export function parseCHF(value: string): number | null {
  if (!value) return null;
  
  try {
    // Clean up the string - remove currency symbol, spaces, etc.
    let cleanedValue = value
      .replace(/CHF|Fr\.|SFr\.?|\u20A3/gi, '') // Remove currency indicators
      .replace(/[^\d.,\-]/g, '') // Remove anything that's not a digit, dot, comma or minus
      .trim();
    
    // Handle Swiss number format (using comma as decimal separator)
    if (cleanedValue.includes(',')) {
      // If we have both comma and dot, assume comma is thousands separator
      if (cleanedValue.includes('.')) {
        cleanedValue = cleanedValue.replace(/,/g, '');
      } 
      // Otherwise, assume comma is decimal separator
      else {
        cleanedValue = cleanedValue.replace(',', '.');
      }
    }
    
    // Parse as float
    const amount = parseFloat(cleanedValue);
    
    return isNaN(amount) ? null : amount;
  } catch (error) {
    console.error('Error parsing CHF value:', error);
    return null;
  }
}

/**
 * Gets the signed amount based on the direction
 * @param amount Absolute amount value
 * @param direction Transaction direction (Incoming or Outgoing)
 * @returns Signed amount (positive for incoming, negative for outgoing)
 */
export function getSignedAmount(amount: number, direction: 'Incoming' | 'Outgoing'): number {
  return direction === 'Outgoing' ? -Math.abs(amount) : Math.abs(amount);
} 