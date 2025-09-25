'use client';

import { BarChart } from '@tremor/react';
import { formatCHF } from '@/lib/currency';

interface Props { 
  data: { month: string; value: number }[] 
}

export function ModernCashflowChart({ data }: Props) {
  // Transform and enhance data
  const chartData = data.map(d => {
    const isPositive = d.value >= 0;
    return {
      month: d.month,
      'Cashflow': d.value,
      status: isPositive ? 'profit' : 'loss',
      magnitude: Math.abs(d.value)
    };
  });

  const valueFormatter = (number: number) => formatCHF(number);
  
  // Calculate metrics
  const totalCashflow = data.reduce((sum, d) => sum + d.value, 0);
  const positiveMonths = data.filter(d => d.value >= 0).length;
  const negativeMonths = data.filter(d => d.value < 0).length;
  const avgCashflow = totalCashflow / data.length;
  
  const bestMonth = data.reduce((best, current) => 
    current.value > best.value ? current : best, data[0] || { month: '', value: 0 }
  );
  
  const worstMonth = data.reduce((worst, current) => 
    current.value < worst.value ? current : worst, data[0] || { month: '', value: 0 }
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-indigo-50 p-8 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Monatlicher Cashflow</h2>
            <p className="text-gray-600 text-lg">
              Einnahmen vs. Ausgaben über die Zeit
            </p>
            
            {/* Key Metrics */}
            <div className="flex gap-6 mt-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm text-gray-600">Gesamt</p>
                <p className={`text-lg font-bold ${totalCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCHF(totalCashflow)}
                </p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm text-gray-600">Durchschnitt</p>
                <p className={`text-lg font-bold ${avgCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCHF(avgCashflow)}
                </p>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm text-gray-600">Positive Monate</p>
                <p className="text-lg font-bold text-emerald-600">{positiveMonths}</p>
              </div>
            </div>
          </div>
          
          {/* Status Summary */}
          <div className="flex gap-3 flex-wrap">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
              totalCashflow >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                                   'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {totalCashflow >= 0 ? "💰 Gewinn gesamt" : "📉 Verlust gesamt"}
            </span>
            
            {positiveMonths > negativeMonths ? (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                ✅ Mehrheitlich positiv
              </span>
            ) : (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                ⚠️ Verbesserung nötig
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Chart */}
      <div className="p-8">
        <div className="relative overflow-visible">
          <BarChart
            data={chartData}
            index="month"
            categories={['Cashflow']}
            colors={['blue']}
            valueFormatter={valueFormatter}
            yAxisWidth={100}
            showLegend={false}
            showGridLines={true}
            showXAxis={true}
            showYAxis={true}
            className="h-80"
          />
        </div>
        
        {/* Chart Footer with Insights */}
        <div className="mt-6 p-6 bg-gray-50 rounded-xl">
          <h4 className="font-semibold text-gray-800 mb-4">Cashflow-Analyse</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <h5 className="font-medium text-emerald-800">Bester Monat</h5>
              </div>
              <p className="text-sm text-emerald-700 mb-1">{bestMonth.month}</p>
              <p className="text-xl font-bold text-emerald-800">{formatCHF(bestMonth.value)}</p>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <h5 className="font-medium text-red-800">Schwächster Monat</h5>
              </div>
              <p className="text-sm text-red-700 mb-1">{worstMonth.month}</p>
              <p className="text-xl font-bold text-red-800">{formatCHF(worstMonth.value)}</p>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Schwankung: <span className="font-semibold">{formatCHF(bestMonth.value - worstMonth.value)}</span>
              {" • "}
              Positive Monate: <span className="font-semibold text-emerald-600">{positiveMonths}</span>
              {" • "}
              Negative Monate: <span className="font-semibold text-red-600">{negativeMonths}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
