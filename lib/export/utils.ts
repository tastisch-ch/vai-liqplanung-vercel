/**
 * Export utilities for the VAI-Liq-Planung application
 */

import { formatSwissDate } from '@/lib/date-utils';
import { formatCHF } from '@/lib/currency';

/**
 * Format a value based on its type for export
 */
export function formatValueForExport(value: any, type: 'date' | 'currency' | 'string' | 'number' | 'boolean'): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'date':
      return value instanceof Date 
        ? formatSwissDate(value) 
        : typeof value === 'string' 
          ? formatSwissDate(new Date(value)) 
          : '';
    
    case 'currency':
      return typeof value === 'number' 
        ? formatCHF(value).replace('CHF ', '') // Remove currency symbol for CSV
        : '';
    
    case 'number':
      return typeof value === 'number' ? value.toString() : '';
    
    case 'boolean':
      return value ? 'Ja' : 'Nein';
    
    case 'string':
    default:
      return String(value);
  }
}

/**
 * Generate a safe filename for exports
 */
export function generateExportFilename(
  prefix: string, 
  extension: string, 
  dateRange?: { from?: Date; to?: Date }
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  
  // Add date range to filename if provided
  const dateRangePart = dateRange 
    ? `_${formatFilenameDate(dateRange.from)}_bis_${formatFilenameDate(dateRange.to)}` 
    : '';
  
  // Ensure extension starts with a dot
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  
  return `${prefix}${dateRangePart}_${timestamp}${ext}`;
}

/**
 * Format date for filenames (YYYY-MM-DD)
 */
function formatFilenameDate(date?: Date): string {
  if (!date) return 'alle';
  return date.toISOString().slice(0, 10);
}

/**
 * Get the appropriate MIME type for file exports
 */
export function getMimeType(fileType: 'csv' | 'excel' | 'pdf'): string {
  switch (fileType) {
    case 'csv':
      return 'text/csv';
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Convert an array of objects to CSV format
 */
export function objectsToCsv(data: any[], headers: { key: string; label: string; type: 'date' | 'currency' | 'string' | 'number' | 'boolean' }[]): string {
  // Create header row
  const headerRow = headers.map(h => h.label).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return headers
      .map(header => {
        const value = formatValueForExport(item[header.key], header.type);
        // Escape quotes and wrap in quotes if contains comma
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      })
      .join(',');
  });
  
  return [headerRow, ...rows].join('\n');
} 