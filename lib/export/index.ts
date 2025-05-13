import { EnhancedTransaction } from '@/models/types';
import { formatCHF } from '@/lib/currency';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ExportOptions {
  includeHeader?: boolean;
  title?: string;
  subtitle?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: {
    categories?: string[];
  };
}

/**
 * Create a CSV string from transactions (for Excel export)
 */
export function transactionsToCSV(transactions: EnhancedTransaction[], options: ExportOptions = {}): string {
  // Define headers
  const headers = [
    'Datum',
    'Beschreibung',
    'Kategorie',
    'Betrag',
    'Kontostand'
  ].join(',');
  
  // Convert each transaction to CSV row
  const rows = transactions.map(tx => {
    const isIncome = tx.direction === 'Incoming';
    const formattedAmount = isIncome 
      ? formatCHF(Math.abs(tx.amount)) 
      : `-${formatCHF(Math.abs(tx.amount))}`;
    
    return [
      format(tx.date, 'dd.MM.yyyy', { locale: de }),
      `"${tx.details.replace(/"/g, '""')}"`, // Escape quotes
      `"${tx.kategorie}"`,
      formattedAmount,
      formatCHF(tx.kontostand || 0)
    ].join(',');
  });
  
  // Create metadata header rows if requested
  let metadataRows: string[] = [];
  if (options.includeHeader) {
    if (options.title) {
      metadataRows.push(`"${options.title}"`);
    }
    
    if (options.subtitle) {
      metadataRows.push(`"${options.subtitle}"`);
    }
    
    if (options.dateRange) {
      const formattedStart = format(options.dateRange.start, 'dd.MM.yyyy', { locale: de });
      const formattedEnd = format(options.dateRange.end, 'dd.MM.yyyy', { locale: de });
      metadataRows.push(`"Zeitraum: ${formattedStart} - ${formattedEnd}"`);
    }
    
    if (metadataRows.length > 0) {
      metadataRows.push(''); // Add empty row before table
    }
  }
  
  // Combine all parts
  return [...metadataRows, headers, ...rows].join('\n');
}

/**
 * Generate content for PDF export of transactions
 */
export function generatePDFContent(transactions: EnhancedTransaction[], options: ExportOptions = {}): string {
  const title = options.title || 'Liquiditätsplanung';
  const subtitle = options.subtitle || '';
  const dateRange = options.dateRange 
    ? `${format(options.dateRange.start, 'dd.MM.yyyy', { locale: de })} - ${format(options.dateRange.end, 'dd.MM.yyyy', { locale: de })}`
    : '';

  // Simple HTML content for PDF conversion
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 30px;
          color: #333;
        }
        h1 {
          color: #02403D;
          margin-bottom: 5px;
        }
        h3 {
          color: #666;
          font-weight: normal;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .date-range {
          color: #666;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #ADC7C8;
          color: #02403D;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #02403D;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #DEE2E3;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .amount-positive {
          color: green;
        }
        .amount-negative {
          color: red;
        }
        .text-right {
          text-align: right;
        }
        .summary {
          margin-top: 20px;
          padding: 15px;
          background-color: #f5f5f5;
          border-radius: 5px;
        }
        .footer {
          margin-top: 50px;
          font-size: 12px;
          color: #999;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${subtitle ? `<h3>${subtitle}</h3>` : ''}
      ${dateRange ? `<div class="date-range">Zeitraum: ${dateRange}</div>` : ''}
      
      <table>
        <thead>
          <tr>
            <th>Datum</th>
            <th>Beschreibung</th>
            <th>Kategorie</th>
            <th class="text-right">Betrag</th>
            <th class="text-right">Kontostand</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(tx => {
            const isIncome = tx.direction === 'Incoming';
            const amountClass = isIncome ? 'amount-positive' : 'amount-negative';
            const formattedAmount = isIncome 
              ? `+${formatCHF(Math.abs(tx.amount))}` 
              : `-${formatCHF(Math.abs(tx.amount))}`;
            
            return `
              <tr>
                <td>${format(tx.date, 'dd.MM.yyyy', { locale: de })}</td>
                <td>${tx.details}</td>
                <td>${tx.kategorie}</td>
                <td class="text-right ${amountClass}">${formattedAmount}</td>
                <td class="text-right">${formatCHF(tx.kontostand || 0)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="summary">
        <div><strong>Anzahl Transaktionen:</strong> ${transactions.length}</div>
        <div><strong>Endsaldo:</strong> ${formatCHF(transactions[transactions.length - 1]?.kontostand || 0)}</div>
      </div>
      
      <div class="footer">
        <p>Generiert am ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })} | VAI-Liq-Planung</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate a summary report for management
 */
export function generateManagementSummary(transactions: EnhancedTransaction[], options: ExportOptions = {}): string {
  const title = options.title || 'Liquiditätsplanung - Management Summary';
  const subtitle = options.subtitle || '';
  const dateRange = options.dateRange 
    ? `${format(options.dateRange.start, 'dd.MM.yyyy', { locale: de })} - ${format(options.dateRange.end, 'dd.MM.yyyy', { locale: de })}`
    : '';
    
  // Calculate summary metrics
  const startBalance = transactions[0]?.kontostand || 0;
  const endBalance = transactions[transactions.length - 1]?.kontostand || 0;
  const netChange = endBalance - startBalance;
  const netChangePercent = startBalance !== 0 ? (netChange / Math.abs(startBalance) * 100).toFixed(2) : 'N/A';
  
  // Summarize by category
  const categorySummary: Record<string, { count: number, total: number }> = {};
  
  transactions.forEach(tx => {
    const category = tx.kategorie || 'Unbekannt';
    if (!categorySummary[category]) {
      categorySummary[category] = { count: 0, total: 0 };
    }
    
    categorySummary[category].count += 1;
    categorySummary[category].total += tx.amount;
  });
  
  // Sort categories by total amount
  const sortedCategories = Object.entries(categorySummary)
    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 30px;
          color: #333;
        }
        h1 {
          color: #02403D;
          margin-bottom: 5px;
        }
        h2 {
          color: #02403D;
          border-bottom: 2px solid #ADC7C8;
          padding-bottom: 8px;
          margin-top: 30px;
        }
        h3 {
          color: #666;
          font-weight: normal;
          margin-top: 0;
          margin-bottom: 20px;
        }
        .date-range {
          color: #666;
          margin-bottom: 20px;
        }
        .summary-card {
          display: inline-block;
          width: 30%;
          margin-right: 1.5%;
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f5f5f5;
          border-left: 4px solid #02403D;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          color: #02403D;
        }
        .summary-card .value {
          font-size: 24px;
          font-weight: bold;
        }
        .positive {
          color: green;
        }
        .negative {
          color: red;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #ADC7C8;
          color: #02403D;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border-bottom: 2px solid #02403D;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #DEE2E3;
        }
        .text-right {
          text-align: right;
        }
        .footer {
          margin-top: 50px;
          font-size: 12px;
          color: #999;
          text-align: center;
          border-top: 1px solid #DEE2E3;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${subtitle ? `<h3>${subtitle}</h3>` : ''}
      ${dateRange ? `<div class="date-range">Zeitraum: ${dateRange}</div>` : ''}
      
      <h2>Kennzahlen</h2>
      
      <div class="summary-card">
        <h3>Anfangssaldo</h3>
        <div class="value">${formatCHF(startBalance)}</div>
      </div>
      
      <div class="summary-card">
        <h3>Endsaldo</h3>
        <div class="value">${formatCHF(endBalance)}</div>
      </div>
      
      <div class="summary-card">
        <h3>Veränderung</h3>
        <div class="value ${netChange >= 0 ? 'positive' : 'negative'}">
          ${netChange >= 0 ? '+' : ''}${formatCHF(netChange)} (${netChangePercent}%)
        </div>
      </div>
      
      <h2>Kategorieübersicht</h2>
      
      <table>
        <thead>
          <tr>
            <th>Kategorie</th>
            <th class="text-right">Anzahl</th>
            <th class="text-right">Summe</th>
          </tr>
        </thead>
        <tbody>
          ${sortedCategories.map(([category, data]) => {
            const isPositive = data.total >= 0;
            return `
              <tr>
                <td>${category}</td>
                <td class="text-right">${data.count}</td>
                <td class="text-right ${isPositive ? 'positive' : 'negative'}">${formatCHF(data.total)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generiert am ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })} | VAI-Liq-Planung</p>
        <p>Vertrauliche Informationen - Nur für internen Gebrauch</p>
      </div>
    </body>
    </html>
  `;
} 