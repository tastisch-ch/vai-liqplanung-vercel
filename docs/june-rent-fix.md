# Fix for Missing June Rent Transactions

## Issue Summary

The application was experiencing an issue where rent payments and other transactions scheduled for the end of June (and potentially other month-end dates) were not appearing in the transaction list.

## Root Cause

The root cause was identified as a missing end-of-month detection in the `enhanceTransactions` function in `lib/services/buchungen.ts`. When processing transactions, this function was applying the `adjustPaymentDate` function but wasn't passing the critical `isMonthEnd` parameter. 

For dates like June 30, which should be treated as a month-end date, the missing parameter resulted in the date not being properly recognized as a month-end date. This led to inconsistent handling across different months:

1. Months with 31 days - Transactions were showing properly
2. Months with 30 days (like June) - End-of-month transactions were missing
3. February - End-of-month transactions might have been inconsistently handled

## Implementation Fix

The issue was fixed by properly detecting end-of-month dates in the `enhanceTransactions` function and passing the appropriate `isMonthEnd` flag to the `adjustPaymentDate` function:

```typescript
// Check if this is an end-of-month date (day 30+ or last day of month)
const originalDate = new Date(transaction.date);
const originalDay = originalDate.getDate();
const lastDayOfMonth = new Date(
  originalDate.getFullYear(), 
  originalDate.getMonth() + 1, 
  0
).getDate();

// Detect if this is an end-of-month date
const isMonthEnd = originalDay === lastDayOfMonth || originalDay >= 30;

// Use adjustPaymentDate with proper isMonthEnd parameter
const adjustedDate = adjustPaymentDate(new Date(transaction.date), isMonthEnd);
```

## Verification

After implementing this fix, the June rent payment now correctly appears in the transaction list, consistently with other month-end transactions. This ensures that all recurring transactions scheduled for the end of the month appear correctly, regardless of the number of days in the month.

## Related Documentation

For more comprehensive information about the date handling improvements, please refer to the [Date Handling Improvements](./date-handling-improvements.md) document, which explains all the changes made to improve date handling throughout the application. 