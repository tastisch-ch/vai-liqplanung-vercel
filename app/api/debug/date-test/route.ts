import { NextRequest, NextResponse } from 'next/server';
import { parseDateFallback } from '@/lib/date-utils';
import { getNextOccurrence } from '@/lib/date-utils/format';

/**
 * Debug endpoint to test date parsing functionality
 */
export async function GET(request: NextRequest) {
  try {
    // Test cases from the HTML sample
    const testCases = [
      "30.05.25", // Two-digit year format
      "30.05.",   // Day and month only
      "02.06.25", // Another two-digit year
      "30.05.2025", // Full year format
      "Morgen, 14.05.", // With day of week
      "Di, 20.05."  // With abbreviated day of week
    ];

    const results = testCases.map(dateStr => {
      const parsedDate = parseDateFallback(dateStr);
      return {
        original: dateStr,
        parsed: parsedDate ? parsedDate.toISOString() : null,
        year: parsedDate ? parsedDate.getFullYear() : null,
        month: parsedDate ? parsedDate.getMonth() + 1 : null, // +1 because getMonth is 0-indexed
        day: parsedDate ? parsedDate.getDate() : null,
        success: !!parsedDate
      };
    });

    // Test header
    const testHeader = 'Testing getNextOccurrence function for month-end dates:';
    const testSubHeader = '------------------------------------------------------';

    // Original problematic case: May 31 -> Monthly -> Should be June 30 not July 1
    const may31 = new Date('2025-05-31');
    const nextMonthAfterMay31 = getNextOccurrence(may31, 'monatlich');
    const may31Result = {
      original: 'May 31, 2025',
      parsed: nextMonthAfterMay31 ? nextMonthAfterMay31.toISOString() : null,
      year: nextMonthAfterMay31 ? nextMonthAfterMay31.getFullYear() : null,
      month: nextMonthAfterMay31 ? nextMonthAfterMay31.getMonth() + 1 : null, // +1 because getMonth is 0-indexed
      day: nextMonthAfterMay31 ? nextMonthAfterMay31.getDate() : null,
      success: !!nextMonthAfterMay31
    };

    // Other test cases
    // February 28th/29th handling
    const feb28 = new Date('2025-02-28'); // non-leap year
    const nextMonthAfterFeb28 = getNextOccurrence(feb28, 'monatlich');
    const feb28Result = {
      original: 'Feb 28, 2025',
      parsed: nextMonthAfterFeb28 ? nextMonthAfterFeb28.toISOString() : null,
      year: nextMonthAfterFeb28 ? nextMonthAfterFeb28.getFullYear() : null,
      month: nextMonthAfterFeb28 ? nextMonthAfterFeb28.getMonth() + 1 : null, // +1 because getMonth is 0-indexed
      day: nextMonthAfterFeb28 ? nextMonthAfterFeb28.getDate() : null,
      success: !!nextMonthAfterFeb28
    };
    
    // Quarter case
    const march31 = new Date('2025-03-31');
    const nextQuarterAfterMarch31 = getNextOccurrence(march31, 'quartalsweise');
    const march31Result = {
      original: 'March 31, 2025',
      parsed: nextQuarterAfterMarch31 ? nextQuarterAfterMarch31.toISOString() : null,
      year: nextQuarterAfterMarch31 ? nextQuarterAfterMarch31.getFullYear() : null,
      month: nextQuarterAfterMarch31 ? nextQuarterAfterMarch31.getMonth() + 1 : null, // +1 because getMonth is 0-indexed
      day: nextQuarterAfterMarch31 ? nextQuarterAfterMarch31.getDate() : null,
      success: !!nextQuarterAfterMarch31
    };
    
    // Half-year case
    const jan31 = new Date('2025-01-31');
    const nextHalfYearAfterJan31 = getNextOccurrence(jan31, 'halbjährlich');
    const jan31Result = {
      original: 'Jan 31, 2025',
      parsed: nextHalfYearAfterJan31 ? nextHalfYearAfterJan31.toISOString() : null,
      year: nextHalfYearAfterJan31 ? nextHalfYearAfterJan31.getFullYear() : null,
      month: nextHalfYearAfterJan31 ? nextHalfYearAfterJan31.getMonth() + 1 : null, // +1 because getMonth is 0-indexed
      day: nextHalfYearAfterJan31 ? nextHalfYearAfterJan31.getDate() : null,
      success: !!nextHalfYearAfterJan31
    };
    
    // Yearly case
    const july31 = new Date('2025-07-31');
    const nextYearAfterJuly31 = getNextOccurrence(july31, 'jährlich');
    const july31Result = {
      original: 'July 31, 2025',
      parsed: nextYearAfterJuly31 ? nextYearAfterJuly31.toISOString() : null,
      year: nextYearAfterJuly31 ? nextYearAfterJuly31.getFullYear() : null,
      month: nextYearAfterJuly31 ? nextYearAfterJuly31.getMonth() + 1 : null, // +1 because getMonth is 0-indexed
      day: nextYearAfterJuly31 ? nextYearAfterJuly31.getDate() : null,
      success: !!nextYearAfterJuly31
    };
    
    // Test multiple steps - check multi-month progression
    const multiStepsHeader = '\nTesting multiple steps progression:';
    const multiStepsSubHeader = '----------------------------------';
    let date = new Date('2025-05-31');
    const multiStepsResults: string[] = [
      multiStepsHeader,
      multiStepsSubHeader,
      `Starting date: ${date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`
    ];
    
    for (let i = 1; i <= 12; i++) {
      date = getNextOccurrence(date, 'monatlich');
      multiStepsResults.push(`Step ${i}: ${date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`);
    }

    return NextResponse.json({
      success: true,
      results: [
        testHeader,
        testSubHeader,
        may31Result,
        feb28Result,
        march31Result,
        jan31Result,
        july31Result,
        multiStepsResults
      ],
      summary: {
        total: testCases.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Date test error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 