import React from 'react';
import { formatCHF } from '@/lib/currency';

interface CashRunwayIndicatorProps {
  currentBalance: number;
  monthlyBurnRate: number;
  monthsOfRunway: number;
}

export default function CashRunwayIndicator({ 
  currentBalance, 
  monthlyBurnRate, 
  monthsOfRunway 
}: CashRunwayIndicatorProps) {
  // Determine status color based on runway length
  const getStatusColor = () => {
    if (monthsOfRunway <= 2) return 'text-red-600';
    if (monthsOfRunway <= 6) return 'text-amber-500';
    return 'text-green-600';
  };

  // Calculate percentage for progress bar (capped at 100%)
  const runwayPercentage = Math.min(monthsOfRunway * 8.33, 100); // 12 months = 100%
  
  // Format months with proper plural form
  const formatMonths = (months: number) => {
    if (months === Infinity) return 'Unbegrenzt';
    if (months === 1) return '1 Monat';
    return `${months.toFixed(1)} Monate`;
  };

  // Get descriptive label
  const getRunwayLabel = () => {
    if (monthsOfRunway <= 1) return 'Kritisch';
    if (monthsOfRunway <= 3) return 'Knapp';
    if (monthsOfRunway <= 6) return 'Ausreichend';
    if (monthsOfRunway <= 12) return 'Gut';
    return 'Ausgezeichnet';
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-3">Liquiditätsreichweite</h2>
      
      <div className="flex items-end justify-between mb-1">
        <div>
          <p className="text-sm text-gray-600 mb-1">Aktuelles Guthaben</p>
          <p className="text-xl font-bold text-vaios-primary">{formatCHF(currentBalance)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 mb-1">Monatliche Ausgaben</p>
          <p className="text-lg font-medium text-gray-700">{formatCHF(monthlyBurnRate)}</p>
        </div>
      </div>
      
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">Geschätzte Reichweite</span>
          <span className={`font-bold ${getStatusColor()}`}>{formatMonths(monthsOfRunway)}</span>
        </div>
        
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${monthsOfRunway <= 2 ? 'bg-red-500' : monthsOfRunway <= 6 ? 'bg-amber-500' : 'bg-green-500'}`}
            style={{ width: `${runwayPercentage}%` }}
          ></div>
        </div>
        
        <div className="mt-2 flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>6 Monate</span>
          <span>12+ Monate</span>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor()} bg-opacity-10 bg-current`}>
          Status: {getRunwayLabel()}
        </span>
      </div>
    </div>
  );
} 