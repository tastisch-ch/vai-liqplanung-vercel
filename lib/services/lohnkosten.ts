/**
 * Service for handling salary costs (Lohnkosten) in the application
 * This service aggregates and processes salary data from the mitarbeiter service
 */

import { convertLohneToBuchungen, getAktuelleLohne, loadMitarbeiter } from './mitarbeiter';
import { Buchung, LohnDaten, Mitarbeiter } from '@/models/types';
import { addMonths } from 'date-fns';

/**
 * Load all salary costs data from the mitarbeiter service
 */
export async function loadLohnkosten(userId?: string): Promise<{ mitarbeiter: Mitarbeiter; lohn: LohnDaten }[]> {
  try {
    // Load all employees with their salary data
    const mitarbeiter = await loadMitarbeiter(userId);
    
    // Get currently active salaries
    return getAktuelleLohne(mitarbeiter);
  } catch (error: any) {
    console.error('Error loading salary costs:', error);
    throw new Error(`Failed to load salary costs: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Calculate total monthly salary costs
 */
export function calculateMonthlyLohnkosten(lohnkosten: { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[]): number {
  return lohnkosten.reduce((total, { lohn }) => total + lohn.Betrag, 0);
}

/**
 * Convert salary costs to transactions for a given date range
 * This is a wrapper around the convertLohneToBuchungen function from mitarbeiter service
 */
export function convertLohnkostenToBuchungen(
  startDate: Date,
  endDate: Date,
  mitarbeiter: Mitarbeiter[]
): Buchung[] {
  return convertLohneToBuchungen(startDate, endDate, mitarbeiter);
}

/**
 * Generate salary cost projections for a given date range
 * Similar to the generateFixkostenProjections function
 */
export function generateLohnkostenProjections(
  lohnkosten: { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[],
  startDate: Date,
  endDate: Date
): Array<{ mitarbeiter: Mitarbeiter; lohn: LohnDaten; date: Date }> {
  const result: Array<{ mitarbeiter: Mitarbeiter; lohn: LohnDaten; date: Date }> = [];
  
  // For each month in the date range, create salary projections
  let currentMonthDate = new Date(startDate);
  currentMonthDate.setDate(1); // Start from the first day of the month
  
  while (currentMonthDate <= endDate) {
    const paymentDate = new Date(currentMonthDate);
    paymentDate.setDate(25); // Salary payment on the 25th
    
    // Only process if the payment date is within our range
    if (paymentDate >= startDate && paymentDate <= endDate) {
      // For each employee with an active salary
      lohnkosten.forEach(({ mitarbeiter, lohn }) => {
        // Check if the salary is valid for this month
        if (lohn.Start <= paymentDate && (!lohn.Ende || lohn.Ende >= paymentDate)) {
          // Create a projection for this salary payment
          result.push({
            mitarbeiter,
            lohn,
            date: paymentDate
          });
        }
      });
    }
    
    // Move to the next month
    currentMonthDate = addMonths(currentMonthDate, 1);
  }
  
  // Sort by date
  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Filter active lohnkosten (those that don't have an end date or the end date is in the future)
 */
export function filterActiveLohnkosten(
  lohnkosten: { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[],
  onlyActive: boolean = true
): { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[] {
  if (!onlyActive) return lohnkosten;
  
  const today = new Date();
  return lohnkosten.filter(({ lohn }) => 
    !lohn.Ende || lohn.Ende >= today
  );
}

/**
 * Get a list of all employee names for display purposes
 */
export function getLohnkostenNames(lohnkosten: { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[]): string[] {
  return lohnkosten.map(({ mitarbeiter }) => mitarbeiter.Name);
}

/**
 * Filter lohnkosten by employee name
 */
export function filterLohnkostenByName(
  lohnkosten: { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[],
  name?: string
): { mitarbeiter: Mitarbeiter; lohn: LohnDaten }[] {
  if (!name) return lohnkosten;
  
  return lohnkosten.filter(({ mitarbeiter }) => 
    mitarbeiter.Name.toLowerCase().includes(name.toLowerCase())
  );
} 