'use client';

import { formatCHF } from '@/lib/currency';

interface KpisProps {
  currentBalance: number;
  net30: number;
  runwayMonths: number;
  eomForecast: number;
  openIncoming: { count: number; sum: number };
  openOutgoing: { count: number; sum: number };
}

export function ModernKpiCards({ 
  currentBalance, 
  net30, 
  runwayMonths, 
  eomForecast, 
  openIncoming, 
  openOutgoing 
}: KpisProps) {
  
  // Calculate health indicators
  const balanceHealth = currentBalance > 10000 ? "healthy" : currentBalance > 0 ? "warning" : "critical";
  const runwayHealth = runwayMonths > 6 ? "healthy" : runwayMonths > 3 ? "warning" : "critical";
  const eomTrend = eomForecast >= currentBalance;
  
  const runwayProgress = Math.min((runwayMonths / 12) * 100, 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Current Balance */}
      <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              balanceHealth === 'healthy' ? 'bg-emerald-100 text-emerald-800' :
              balanceHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {balanceHealth === 'healthy' ? '✓ Gesund' : balanceHealth === 'warning' ? '⚠ Achtung' : '⚠ Kritisch'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Kontostand</h3>
            <p className={`text-2xl font-bold ${
              balanceHealth === 'healthy' ? 'text-emerald-600' :
              balanceHealth === 'warning' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {formatCHF(currentBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Stand: {new Date().toLocaleDateString('de-CH')}
            </p>
          </div>
      </div>

      {/* 30-Day Net */}
      <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
            <span className="text-xs text-gray-500">
              {openIncoming.count + openOutgoing.count} Transaktionen
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Netto 30 Tage</h3>
            <p className={`text-2xl font-bold ${net30 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCHF(net30)}
            </p>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span className="text-emerald-600">+{formatCHF(openIncoming.sum)}</span>
              <span className="text-red-600">-{formatCHF(openOutgoing.sum)}</span>
            </div>
          </div>
      </div>

      {/* Financial Runway */}
      <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              runwayHealth === 'healthy' ? 'bg-emerald-100 text-emerald-800' :
              runwayHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {runwayHealth === 'healthy' ? 'Sicher' : runwayHealth === 'warning' ? 'Achtung' : 'Kritisch'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Reichweite</h3>
            <p className={`text-2xl font-bold ${
              runwayHealth === 'healthy' ? 'text-emerald-600' :
              runwayHealth === 'warning' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {runwayMonths.toFixed(1)} Monate
            </p>
            <div className="mt-3">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    runwayHealth === 'healthy' ? 'bg-emerald-500' :
                    runwayHealth === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(runwayProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
      </div>

      {/* EOM Forecast */}
      <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              eomTrend ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              {eomTrend ? '📈 Wachstum' : '📉 Rückgang'}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Monatsende</h3>
            <p className={`text-2xl font-bold ${eomForecast >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCHF(eomForecast)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Δ {formatCHF(eomForecast - currentBalance)}
            </p>
          </div>
      </div>

      {/* Open Transactions Summary - Full Width */}
      <div className="col-span-full">
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Offene Transaktionen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-200 rounded-lg">
                    <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-emerald-800">Eingehende Zahlungen</h4>
                    <p className="text-sm text-emerald-600">{openIncoming.count} Transaktionen</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-700">{formatCHF(openIncoming.sum)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-200 rounded-lg">
                    <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-800">Ausgehende Zahlungen</h4>
                    <p className="text-sm text-red-600">{openOutgoing.count} Transaktionen</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-700">{formatCHF(openOutgoing.sum)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
