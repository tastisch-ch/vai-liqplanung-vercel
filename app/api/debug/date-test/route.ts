import { NextRequest, NextResponse } from 'next/server';
import { parseDateFallback } from '@/lib/date-utils';

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

    return NextResponse.json({
      success: true,
      results,
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