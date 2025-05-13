import React from 'react';
import { formatCHF } from '@/lib/currency';

interface MonthlyMetric {
  currentMonth: number;
  previousMonth: number;
  label: string;
  isHigherBetter: boolean;
}

interface MonthlyComparisonProps {
  currentMonthName: string;
  previousMonthName: string;
  metrics: MonthlyMetric[];
}

export default function MonthlyComparison({ 
  currentMonthName, 
  previousMonthName, 
  metrics 
}: MonthlyComparisonProps) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4">Monatsvergleich</h2>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 bg-vaios-50 rounded-md">
          <span className="text-sm text-gray-600">Aktuell</span>
          <h3 className="font-medium text-vaios-primary">{currentMonthName}</h3>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-md">
          <span className="text-sm text-gray-600">Vormonat</span>
          <h3 className="font-medium text-gray-700">{previousMonthName}</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        {metrics.map((metric, index) => {
          // Calculate percentage change
          const change = metric.currentMonth - metric.previousMonth;
          const percentChange = metric.previousMonth !== 0 
            ? (change / Math.abs(metric.previousMonth)) * 100 
            : 0;
          
          // Determine if change is positive from a business perspective
          const isPositiveChange = metric.isHigherBetter 
            ? change > 0 
            : change < 0;
            
          return (
            <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{metric.label}</span>
                <span className={`font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                  {percentChange !== 0 && (
                    <>
                      {percentChange > 0 ? '+' : ''}
                      {Math.abs(percentChange).toFixed(1)}%
                      {isPositiveChange ? ' ↑' : ' ↓'}
                    </>
                  )}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="text-vaios-primary font-bold">
                  {formatCHF(metric.currentMonth)}
                </div>
                <div className="text-gray-700">
                  {formatCHF(metric.previousMonth)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 