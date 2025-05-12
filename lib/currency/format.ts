/**
 * Formats a number as a Swiss Franc currency string (CHF).
 * Similar to the Python app's chf_format function.
 * 
 * @param amount - The number to format
 * @param includeSymbol - Whether to include the CHF symbol (default: true)
 * @returns A formatted currency string
 */
export function formatCHF(amount: number, includeSymbol = true): string {
  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return includeSymbol ? 'CHF 0.00' : '0.00';
  }

  // Format with Swiss conventions (thousands separator: ')
  const formattedAmount = new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return includeSymbol ? `CHF ${formattedAmount}` : formattedAmount;
}

/**
 * Parses a Swiss Franc currency string back to a number.
 * 
 * @param value - Currency string to parse
 * @returns Parsed number value
 */
export function parseCHF(value: string): number {
  if (!value) return 0;

  // Remove CHF symbol and whitespace
  let cleanValue = value.replace('CHF', '').trim();
  
  // Remove thousands separators (') and replace comma with dot
  cleanValue = cleanValue.replace(/'/g, '').replace(',', '.');
  
  // Parse to float
  const amount = parseFloat(cleanValue);
  
  // Return 0 if parsing failed
  return isNaN(amount) ? 0 : amount;
}

/**
 * Formats an amount as positive or negative based on direction
 * Used for displaying transaction amounts with the correct sign
 * 
 * @param amount - The raw amount
 * @param direction - 'Incoming' or 'Outgoing'
 * @returns Correctly signed amount for calculations
 */
export function getSignedAmount(amount: number, direction: 'Incoming' | 'Outgoing'): number {
  const absAmount = Math.abs(amount);
  return direction === 'Outgoing' ? -absAmount : absAmount;
} 