// Date handling debug script

// Test function similar to our production adjustPaymentDate function
function adjustPaymentDate(date, isMonthEnd = false) {
  if (!date) return date;
  
  const result = new Date(date);
  
  // First preserve the intended day of month
  const intendedDay = result.getDate();
  
  // Handle month-end cases (e.g., trying to use the 31st in a month with only 30 days)
  const month = result.getMonth();
  const year = result.getFullYear();
  
  // Get the actual last day of the month
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  
  console.log('Date:', result.toISOString(), 'Day:', intendedDay, 'Last day:', lastDayOfMonth, 'isMonthEnd:', isMonthEnd);
  
  // If isMonthEnd is true, always use the last day of the month
  if (isMonthEnd) {
    result.setDate(lastDayOfMonth);
    console.log('  → Adjusted to month end:', result.toISOString());
  } 
  // Otherwise, only adjust if the intended day exceeds the last day of this month
  else if (intendedDay > lastDayOfMonth) {
    result.setDate(lastDayOfMonth);
    console.log('  → Adjusted to last day (overflow):', result.toISOString());
  }
  
  // Now handle weekend cases
  const dayOfWeek = result.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (dayOfWeek === 0) { // Sunday → Friday
    const oldDate = new Date(result);
    result.setDate(result.getDate() - 2);
    console.log('  → Sunday adjusted to Friday:', oldDate.toISOString(), '→', result.toISOString());
  } else if (dayOfWeek === 6) { // Saturday → Friday
    const oldDate = new Date(result);
    result.setDate(result.getDate() - 1);
    console.log('  → Saturday adjusted to Friday:', oldDate.toISOString(), '→', result.toISOString());
  }
  
  return result;
}

// Test with different months
console.log('\n--- Testing months with 31 days ---');
const jan31 = new Date(2025, 0, 31); // January 31
console.log('Original:', jan31.toISOString());
console.log('Adjusted (normal):', adjustPaymentDate(jan31).toISOString());
console.log('Adjusted (isMonthEnd=true):', adjustPaymentDate(jan31, true).toISOString());

console.log('\n--- Testing months with 30 days ---');
const june30 = new Date(2025, 5, 30); // June 30
console.log('Original:', june30.toISOString());
console.log('Adjusted (normal):', adjustPaymentDate(june30).toISOString());
console.log('Adjusted (isMonthEnd=true):', adjustPaymentDate(june30, true).toISOString());

// Test specifically for end-of-month detection
console.log('\n--- Testing end-of-month detection ---');
const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // Jan to Dec (0-11)
const year = 2025;

months.forEach(month => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
  
  console.log(`\n${monthName} ${year} (last day: ${lastDay})`);
  
  // Test with day 30 (which should be end of month for some months)
  const day30 = new Date(year, month, 30);
  const isDay30Valid = day30.getMonth() === month; // Check if day 30 exists in this month
  const isDay30LastDay = lastDay === 30;
  
  if (isDay30Valid) {
    console.log(`Day 30 exists, is last day: ${isDay30LastDay}`);
    const originalDay = day30.getDate();
    const isMonthEnd = originalDay === lastDay || originalDay >= 30;
    console.log(`isMonthEnd detection: ${isMonthEnd}`);
    
    // Test adjustment
    const adjusted = adjustPaymentDate(day30, isMonthEnd);
    console.log(`30th adjusted: ${adjusted.toISOString()}`);
  } else {
    console.log('Day 30 does not exist in this month');
  }
  
  // Test with the actual last day
  const lastDayDate = new Date(year, month, lastDay);
  console.log(`Testing last day (${lastDay}):`);
  const originalDay = lastDayDate.getDate();
  const isMonthEnd = originalDay === lastDay || originalDay >= 30;
  console.log(`isMonthEnd detection: ${isMonthEnd}`);
  
  // Test adjustment
  const adjusted = adjustPaymentDate(lastDayDate, isMonthEnd);
  console.log(`Last day adjusted: ${adjusted.toISOString()}`);
});

// Test for the specific issue with June 30
console.log('\n--- Specific test for June 30 issue ---');
const june30_2026 = new Date(2026, 5, 30); // June 30, 2026
console.log('June 30, 2026:', june30_2026.toISOString());
const originalDay = june30_2026.getDate();
const lastDayOfMonth = new Date(2026, 6, 0).getDate();
console.log(`Day: ${originalDay}, Last day of month: ${lastDayOfMonth}`);
const isMonthEnd = originalDay === lastDayOfMonth || originalDay >= 30;
console.log(`isMonthEnd detection: ${isMonthEnd}`);
console.log('Final adjusted date:', adjustPaymentDate(june30_2026, isMonthEnd).toISOString()); 