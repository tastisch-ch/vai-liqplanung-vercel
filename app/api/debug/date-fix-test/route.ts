import { NextResponse } from 'next/server';
import { getNextOccurrence } from '@/lib/date-utils/format';

// Simple date formatter to make output easier to read
function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

export async function GET() {
  const results: string[] = [];
  
  // Test header
  results.push('Testing getNextOccurrence function for month-end dates:');
  results.push('------------------------------------------------------');
  
  // Original problematic case: May 31 -> Monthly -> Should be June 30 not July 1
  const may31 = new Date('2025-05-31');
  const nextMonthAfterMay31 = getNextOccurrence(may31, 'monatlich');
  results.push(`May 31, 2025 + 1 month = ${formatDate(nextMonthAfterMay31)} (Should be June 30, 2025)`);

  // Other test cases
  // February 28th/29th handling
  const feb28 = new Date('2025-02-28'); // non-leap year
  const nextMonthAfterFeb28 = getNextOccurrence(feb28, 'monatlich');
  results.push(`Feb 28, 2025 + 1 month = ${formatDate(nextMonthAfterFeb28)} (Should be March 28, 2025)`);
  
  // Quarter case
  const march31 = new Date('2025-03-31');
  const nextQuarterAfterMarch31 = getNextOccurrence(march31, 'quartalsweise');
  results.push(`March 31, 2025 + 3 months = ${formatDate(nextQuarterAfterMarch31)} (Should be June 30, 2025)`);
  
  // Half-year case
  const jan31 = new Date('2025-01-31');
  const nextHalfYearAfterJan31 = getNextOccurrence(jan31, 'halbjährlich');
  results.push(`Jan 31, 2025 + 6 months = ${formatDate(nextHalfYearAfterJan31)} (Should be July 31, 2025)`);
  
  // Yearly case
  const july31 = new Date('2025-07-31');
  const nextYearAfterJuly31 = getNextOccurrence(july31, 'jährlich');
  results.push(`July 31, 2025 + 1 year = ${formatDate(nextYearAfterJuly31)} (Should be July 31, 2026)`);
  
  // Test multiple steps - check multi-month progression
  results.push('\nTesting multiple steps progression:');
  results.push('----------------------------------');
  let date = new Date('2025-05-31');
  results.push(`Starting date: ${formatDate(date)}`);
  
  for (let i = 1; i <= 12; i++) {
    date = getNextOccurrence(date, 'monatlich');
    results.push(`Step ${i}: ${formatDate(date)}`);
  }

  return NextResponse.json({ 
    success: true, 
    results: results
  });
} 