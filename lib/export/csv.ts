/**
 * CSV Export functionality for the VAI-Liq-Planung application
 */

import { Buchung, Fixkosten, Mitarbeiter, Simulation } from '@/models/types';
import { objectsToCsv, generateExportFilename } from './utils';

interface ExportOptions {
  filename?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

/**
 * Export transactions to CSV
 */
export function transactionsToCsv(transactions: Buchung[], options: ExportOptions = {}): { content: string; filename: string } {
  const headers = [
    { key: 'date', label: 'Datum', type: 'date' as const },
    { key: 'details', label: 'Beschreibung', type: 'string' as const },
    { key: 'amount', label: 'Betrag', type: 'currency' as const },
    { key: 'direction', label: 'Typ', type: 'string' as const },
    { key: 'kategorie', label: 'Kategorie', type: 'string' as const },
    { key: 'modified', label: 'Bearbeitet', type: 'boolean' as const },
    { key: 'created_at', label: 'Erstellt am', type: 'date' as const }
  ];

  // Transform direction to German
  const transformedTransactions = transactions.map(t => ({
    ...t,
    direction: t.direction === 'Incoming' ? 'Einnahme' : 'Ausgabe'
  }));

  const content = objectsToCsv(transformedTransactions, headers);
  const filename = options.filename || generateExportFilename('transaktionen', 'csv', options.dateRange);

  return {
    content,
    filename
  };
}

/**
 * Export fixed costs to CSV
 */
export function fixkostenToCsv(fixkosten: Fixkosten[], options: ExportOptions = {}): { content: string; filename: string } {
  const headers = [
    { key: 'name', label: 'Bezeichnung', type: 'string' as const },
    { key: 'betrag', label: 'Betrag', type: 'currency' as const },
    { key: 'rhythmus', label: 'Intervall', type: 'string' as const },
    { key: 'start', label: 'Start Datum', type: 'date' as const },
    { key: 'enddatum', label: 'End Datum', type: 'date' as const },
    { key: 'created_at', label: 'Erstellt am', type: 'date' as const }
  ];

  // Transform rhythmus to more readable format
  const transformedFixkosten = fixkosten.map(f => ({
    ...f,
    rhythmus: f.rhythmus === 'monatlich' ? 'Monatlich' : 
             f.rhythmus === 'quartalsweise' ? 'Vierteljährlich' : 
             f.rhythmus === 'halbjährlich' ? 'Halbjährlich' : 
             f.rhythmus === 'jährlich' ? 'Jährlich' : f.rhythmus
  }));

  const content = objectsToCsv(transformedFixkosten, headers);
  const filename = options.filename || generateExportFilename('fixkosten', 'csv', options.dateRange);

  return {
    content,
    filename
  };
}

/**
 * Export employees to CSV
 */
export function mitarbeiterToCsv(mitarbeiter: Mitarbeiter[], options: ExportOptions = {}): { content: string; filename: string } {
  // Because Mitarbeiter has nested Lohn array, we need to flatten it
  const flattenedMitarbeiter = mitarbeiter.flatMap(m => {
    // If no salary data, return employee with empty salary
    if (!m.Lohn || m.Lohn.length === 0) {
      return [{
        id: m.id,
        Name: m.Name,
        Betrag: 0,
        Start: new Date(m.created_at), // Use creation date as fallback
        Ende: null,
        user_id: m.user_id,
        created_at: m.created_at
      }];
    }
    
    // Otherwise, create one row per salary entry
    return m.Lohn.map(l => ({
      id: m.id,
      Name: m.Name,
      Betrag: l.Betrag,
      Start: l.Start,
      Ende: l.Ende,
      user_id: m.user_id,
      created_at: m.created_at
    }));
  });

  const headers = [
    { key: 'Name', label: 'Name', type: 'string' as const },
    { key: 'Betrag', label: 'Gehalt', type: 'currency' as const },
    { key: 'Start', label: 'Start Datum', type: 'date' as const },
    { key: 'Ende', label: 'End Datum', type: 'date' as const },
    { key: 'created_at', label: 'Erstellt am', type: 'date' as const }
  ];

  const content = objectsToCsv(flattenedMitarbeiter, headers);
  const filename = options.filename || generateExportFilename('mitarbeiter', 'csv');

  return {
    content,
    filename
  };
}

/**
 * Export simulations to CSV
 */
export function simulationsToCsv(simulations: Simulation[], options: ExportOptions = {}): { content: string; filename: string } {
  const headers = [
    { key: 'name', label: 'Bezeichnung', type: 'string' as const },
    { key: 'details', label: 'Beschreibung', type: 'string' as const },
    { key: 'amount', label: 'Betrag', type: 'currency' as const },
    { key: 'direction', label: 'Typ', type: 'string' as const },
    { key: 'date', label: 'Datum', type: 'date' as const },
    { key: 'recurring', label: 'Wiederkehrend', type: 'boolean' as const },
    { key: 'interval', label: 'Intervall', type: 'string' as const },
    { key: 'end_date', label: 'End Datum', type: 'date' as const },
    { key: 'created_at', label: 'Erstellt am', type: 'date' as const }
  ];

  // Transform direction and interval to German
  const transformedSimulations = simulations.map(s => ({
    ...s,
    direction: s.direction === 'Incoming' ? 'Einnahme' : 'Ausgabe',
    interval: s.interval === 'monthly' ? 'Monatlich' : 
              s.interval === 'quarterly' ? 'Vierteljährlich' : 
              s.interval === 'yearly' ? 'Jährlich' : s.interval
  }));

  const content = objectsToCsv(transformedSimulations, headers);
  const filename = options.filename || generateExportFilename('simulationen', 'csv', options.dateRange);

  return {
    content,
    filename
  };
} 