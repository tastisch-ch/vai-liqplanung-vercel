# Date Handling Improvements in VAI-Liq-Planung

## Overview

This document outlines the improvements made to date handling in the VAI-Liq-Planung application, particularly for recurring transactions that occur at the end of each month.

## Problem

The application was experiencing issues with recurring transactions (such as rent payments) that were meant to occur at the end of each month. Some months were showing these transactions correctly, while others (like June) were missing them. The issue was related to the detection logic for determining if a date should be treated as an "end of month" date.

## Solution

### 1. Improved End-of-Month Detection Logic

We enhanced the logic for detecting end-of-month dates with a more reliable approach:

**Old Logic (Less Reliable):**
```javascript
const isMonthEnd = originalDay >= 28 && originalDay >= lastDayOfOriginalMonth - 1;
```

**New Logic (More Reliable):**
```javascript
// More robust end-of-month detection:
// 1. If it's exactly the last day of the month, or
// 2. If it's day 30 or 31 (which are commonly used to mean "end of month")
const isMonthEnd = originalDay === lastDayOfOriginalMonth || originalDay >= 30;
```

This improvement ensures that:
- Dates that are explicitly set to the last day of a month (e.g., the 28th of February, 30th of April) are correctly identified
- Dates set to the 30th or 31st are treated as "end of month" dates regardless of the actual month length

### 2. Consistent Application

This logic was applied to both services that handle recurring transactions:
- `fixkosten.ts` - For fixed recurring costs
- `simulationen.ts` - For simulated future transactions

### 3. Use of adjustPaymentDate Function

The updated logic is used with the `adjustPaymentDate` function, which has two key behaviors:
- Moves weekend dates (Saturday/Sunday) to the previous Friday
- Properly handles month-end cases where the intended day doesn't exist in the current month

```typescript
/**
 * Adjusts payment date for business days and month-end scenarios
 * 
 * @param date - The original payment date
 * @param isMonthEnd - Whether this date should always be treated as end of month
 * @returns Adjusted date suitable for business payments
 */
export function adjustPaymentDate(date: Date, isMonthEnd: boolean = false): Date {
  // If isMonthEnd is true, always use the last day of the month
  if (isMonthEnd) {
    result.setDate(lastDayOfMonth);
  } 
  // Otherwise, only adjust if the intended day exceeds the last day of this month
  else if (intendedDay > lastDayOfMonth) {
    result.setDate(lastDayOfMonth);
  }
  
  // Handle weekend cases - move to previous Friday if needed
  // ...
}
```

## Impact

These improvements ensure that:

1. **Consistent Date Handling**: Recurring transactions like rent payments consistently appear on the appropriate date each month, even when months have different lengths.

2. **Business Day Alignment**: Payments falling on weekends are moved to the previous Friday, reflecting real-world business practices.

3. **Accurate Financial Planning**: The liquidity planning view accurately represents all expected transactions, providing a reliable financial forecast.

## Files Modified

- `lib/date-utils/format.ts` - Added `isMonthEnd` parameter to `adjustPaymentDate` function
- `lib/services/fixkosten.ts` - Improved end-of-month detection logic
- `lib/services/simulationen.ts` - Improved end-of-month detection logic

## Usage Notes

When adding new recurring transactions with end-of-month dates:
- Set the date to either the actual last day of the month (28th, 30th, or 31st depending on month)
- Or simply use the 30th or 31st to indicate "end of month" intent

The system will automatically adjust these dates properly for each month in the recurring sequence. 