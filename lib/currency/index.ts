/**
 * Format a number as CHF currency
 */
export function formatCHF(amount: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a string with a CHF amount into a number
 */
export function parseCHF(amountStr: string): number | null {
  if (!amountStr) return null;
  
  try {
    // Clean the string
    let cleanStr = amountStr.trim();
    
    // Remove 'CHF' if present
    if (cleanStr.toUpperCase().startsWith('CHF')) {
      cleanStr = cleanStr.substring(3).trim();
    }
    
    // Replace commas with periods for decimal places
    cleanStr = cleanStr.replace(/['']/g, "").replace(/[,]/g, ".");
    
    // Remove all other non-numeric characters except periods
    cleanStr = cleanStr.replace(/[^\d.-]/g, "");
    
    const amount = parseFloat(cleanStr);
    return isNaN(amount) ? null : amount;
  } catch (error) {
    console.error('Error parsing CHF amount:', error);
    return null;
  }
} 