'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from "@/components/auth/AuthProvider";
import { loadSimulationen, generateSimulationProjections } from "@/lib/services/simulationen";
import { loadScenarios, saveScenario, updateScenario, deleteScenario } from "@/lib/services/scenarios";
import { loadBuchungen, enhanceTransactions } from "@/lib/services/buchungen";
import { Simulation, EnhancedTransaction, SavedScenario } from "@/models/types";
import { formatCHF } from "@/lib/currency";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from "date-fns";
import { de } from "date-fns/locale";
import dynamic from 'next/dynamic';

// Import chart types
import { 
  MonthlyDataPoint, 
  CashFlowDataPoint,
  ChartOptions
} from "@/models/chart-types";

// Dynamically import ECharts components to prevent SSR issues
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function SimulationProjectionsPage() {
  const { authState } = useAuth();
  const { user } = authState;
  
  // State for data
  const [simulationen, setSimulationen] = useState<Simulation[]>([]);
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [projections, setProjections] = useState<Array<Simulation & { date: Date }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for simulation selection
  const [selectedSimulations, setSelectedSimulations] = useState<string[]>([]);
  
  // State for projection period
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [projectionStart] = useState<Date>(new Date());
  const [projectionEnd, setProjectionEnd] = useState<Date>(() => {
    const end = new Date();
    end.setMonth(end.getMonth() + projectionMonths);
    return end;
  });
  
  // State for saved scenarios
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<SavedScenario | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  
  // Load simulation and transaction data
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Load simulations
        const simulationData = await loadSimulationen(user.id);
        setSimulationen(simulationData);
        
        // Set all simulations as selected by default
        setSelectedSimulations(simulationData.map(sim => sim.id));
        
        // Load transactions for baseline data
        const transactionData = await loadBuchungen(user.id);
        const enhancedTx = await enhanceTransactions(transactionData, user.id);
        setTransactions(enhancedTx);
        
        // Load saved scenarios
        const scenariosData = await loadScenarios(user.id);
        setSavedScenarios(scenariosData);
        
        // Filter transactions to get only the most recent ones (last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        // Update projections based on selected simulations
        updateProjections(simulationData);
      } catch (err) {
        setError('Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user?.id]);
  
  // Update projections when selection or period changes
  useEffect(() => {
    if (simulationen.length > 0) {
      updateProjections(simulationen);
    }
  }, [selectedSimulations, projectionMonths]);
  
  // Update projection end date when projection months change
  useEffect(() => {
    const end = new Date(projectionStart);
    end.setMonth(end.getMonth() + projectionMonths);
    setProjectionEnd(end);
  }, [projectionMonths, projectionStart]);
  
  // Generate projections based on selected simulations
  const updateProjections = (allSimulations: Simulation[]) => {
    // Filter simulations based on selection
    const filteredSimulations = allSimulations.filter(sim => 
      selectedSimulations.includes(sim.id)
    );
    
    // Generate projections
    const projectedData = generateSimulationProjections(
      filteredSimulations, 
      projectionStart, 
      projectionEnd
    );
    
    setProjections(projectedData);
  };
  
  // Toggle selection of a simulation
  const toggleSimulation = (simulationId: string) => {
    setSelectedSimulations(prevSelected => {
      if (prevSelected.includes(simulationId)) {
        return prevSelected.filter(id => id !== simulationId);
      } else {
        return [...prevSelected, simulationId];
      }
    });
  };
  
  // Toggle all simulations
  const toggleAllSimulations = () => {
    if (selectedSimulations.length === simulationen.length) {
      setSelectedSimulations([]);
    } else {
      setSelectedSimulations(simulationen.map(sim => sim.id));
    }
  };
  
  // Calculate monthly data based on projections
  const monthlyData = useMemo<MonthlyDataPoint[]>(() => {
    const result: {[key: string]: {income: number, expenses: number}} = {};
    
    projections.forEach(projection => {
      const monthKey = format(projection.date, 'yyyy-MM');
      if (!result[monthKey]) {
        result[monthKey] = { income: 0, expenses: 0 };
      }
      
      if (projection.direction === 'Incoming') {
        result[monthKey].income += projection.amount;
      } else {
        result[monthKey].expenses += projection.amount;
      }
    });
    
    return Object.entries(result)
      .map(([date, values]) => ({
        date,
        income: values.income,
        expenses: values.expenses,
        balance: values.income - values.expenses
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [projections]);
  
  // Calculate initial balance from existing transactions
  const initialBalance = useMemo(() => {
    return transactions.reduce((balance, tx) => {
      if (tx.direction === 'Incoming') {
        return balance + tx.amount;
      } else {
        return balance - tx.amount;
      }
    }, 0);
  }, [transactions]);
  
  // Calculate cumulative balance over time with initial balance
  const cumulativeBalanceData = useMemo<CashFlowDataPoint[]>(() => {
    // Get monthly balance changes
    const monthlyBalances = monthlyData.map(month => ({
      date: month.date,
      balance: month.income - month.expenses
    }));
    
    // Start with initial balance
    let runningBalance = initialBalance;
    const result = monthlyBalances.map(month => {
      runningBalance += month.balance;
      return {
        date: month.date,
        balance: runningBalance
      };
    });
    
    return result;
  }, [monthlyData, initialBalance]);
  
  // Options for monthly projection chart
  const monthlyChartOptions: ChartOptions = {
    title: {
      text: 'Monatliche Projektion',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const date = params[0].name;
        let tooltipText = `<strong>${date}</strong><br/>`;
        
        params.forEach((param: any) => {
          let value = formatCHF(Math.abs(param.value));
          let color = param.seriesIndex === 0 ? 'green' : param.seriesIndex === 1 ? 'red' : 'blue';
          tooltipText += `<span style="display:inline-block;margin-right:5px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span> ${param.seriesName}: ${value}<br/>`;
        });
        
        return tooltipText;
      }
    },
    legend: {
      data: ['Einnahmen', 'Ausgaben', 'Bilanz'],
      bottom: '0%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: monthlyData.map(item => item.date)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatCHF(value)
      }
    },
    series: [
      {
        name: 'Einnahmen',
        type: 'bar',
        stack: 'total',
        data: monthlyData.map(item => item.income),
        itemStyle: {
          color: '#4CAF50'
        }
      },
      {
        name: 'Ausgaben',
        type: 'bar',
        stack: 'total',
        data: monthlyData.map(item => -item.expenses),
        itemStyle: {
          color: '#F44336'
        }
      },
      {
        name: 'Bilanz',
        type: 'line',
        data: monthlyData.map(item => item.balance),
        lineStyle: {
          color: '#2196F3'
        },
        itemStyle: {
          color: '#2196F3'
        }
      }
    ]
  };
  
  // Options for cumulative balance chart
  const cumulativeChartOptions: ChartOptions = {
    title: {
      text: 'Prognostizierte Vermögensentwicklung',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        return `${params[0].name}: ${formatCHF(params[0].value)}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: cumulativeBalanceData.map(item => item.date)
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatCHF(value)
      }
    },
    series: [
      {
        data: cumulativeBalanceData.map(item => item.balance),
        type: 'line',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: 'rgba(58, 71, 212, 0.5)'
              },
              {
                offset: 1,
                color: 'rgba(58, 71, 212, 0.1)'
              }
            ]
          }
        },
        lineStyle: {
          width: 2,
          color: '#3a47d4'
        },
        symbol: 'circle',
        symbolSize: 6
      }
    ]
  };
  
  // Save current scenario
  const handleSaveScenario = async () => {
    if (!user?.id || !scenarioName.trim()) return;
    
    try {
      // Save the scenario
      const newScenario = await saveScenario(
        scenarioName,
        selectedSimulations,
        user.id,
        projectionMonths,
        scenarioDescription
      );
      
      // Update state
      setSavedScenarios(prev => [newScenario, ...prev]);
      setCurrentScenario(newScenario);
      
      // Reset form
      setScenarioName('');
      setScenarioDescription('');
      setShowSaveForm(false);
      
      // Show success message
      setSavedMessage('Szenario erfolgreich gespeichert');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      setError('Fehler beim Speichern des Szenarios');
    }
  };
  
  // Load a saved scenario
  const loadSavedScenario = (scenario: SavedScenario) => {
    setSelectedSimulations(scenario.simulationIds);
    setProjectionMonths(scenario.projectionMonths);
    setCurrentScenario(scenario);
  };
  
  // Delete a saved scenario
  const handleDeleteScenario = async (scenarioId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Szenario löschen möchten?')) return;
    
    try {
      await deleteScenario(scenarioId);
      setSavedScenarios(prev => prev.filter(s => s.id !== scenarioId));
      
      if (currentScenario?.id === scenarioId) {
        setCurrentScenario(null);
      }
      
      // Show success message
      setSavedMessage('Szenario erfolgreich gelöscht');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      setError('Fehler beim Löschen des Szenarios');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Simulationen & Projektionen</h1>
      
      {/* Initial state banner */}
      <div className="bg-blue-50 p-4 rounded-xl shadow-sm">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Ausgangspunkt</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Ihr aktuelles Vermögen basierend auf vorhandenen Transaktionen: <strong>{formatCHF(initialBalance)}</strong></p>
              <p className="text-xs mt-1">Die Projektionen werden basierend auf diesem Ausgangswert berechnet.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Success message for saved scenarios */}
      {savedMessage && (
        <div className="bg-green-50 p-4 rounded-md border border-green-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {savedMessage}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Configuration Panel */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Szenario konfigurieren</h2>
          
          <div className="flex space-x-2">
            {currentScenario && (
              <div className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Aktives Szenario: {currentScenario.name}
              </div>
            )}
            
            <button
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              {showSaveForm ? 'Abbrechen' : 'Szenario speichern'}
            </button>
          </div>
        </div>
        
        {/* Scenario save form */}
        {showSaveForm && (
          <div className="mb-6 p-4 border border-blue-100 rounded-md bg-blue-50">
            <h3 className="text-md font-medium mb-2">Szenario speichern</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="scenarioName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name des Szenarios
                </label>
                <input
                  type="text"
                  id="scenarioName"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. 'Optimistisches Szenario'"
                />
              </div>
              
              <div>
                <label htmlFor="scenarioDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung (optional)
                </label>
                <textarea
                  id="scenarioDescription"
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Kurze Beschreibung des Szenarios"
                />
              </div>
              
              <div className="text-right">
                <button
                  onClick={handleSaveScenario}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Saved scenarios */}
        {savedScenarios.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Gespeicherte Szenarien</h3>
            <div className="flex flex-wrap gap-2">
              {savedScenarios.map(scenario => (
                <div 
                  key={scenario.id} 
                  className={`p-2 border rounded-md text-sm flex items-center space-x-2 ${
                    currentScenario?.id === scenario.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => loadSavedScenario(scenario)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {scenario.name}
                  </button>
                  <button
                    onClick={() => handleDeleteScenario(scenario.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Szenario löschen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {/* Projection Period */}
          <div>
            <label htmlFor="projectionMonths" className="block text-sm font-medium text-gray-700 mb-1">
              Projektionszeitraum (Monate)
            </label>
            <div className="flex items-center">
              <input
                id="projectionMonths"
                type="range"
                min="3"
                max="60"
                step="3"
                value={projectionMonths}
                onChange={(e) => setProjectionMonths(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="ml-3 w-16 text-center">{projectionMonths}</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Projektion von {format(projectionStart, 'MMM yyyy', { locale: de })} bis {format(projectionEnd, 'MMM yyyy', { locale: de })}
            </p>
          </div>
          
          {/* Simulation Selection */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Ausgewählte Simulationen</label>
              <button
                onClick={toggleAllSimulations}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {selectedSimulations.length === simulationen.length ? 'Alle abwählen' : 'Alle auswählen'}
              </button>
            </div>
            
            {loading ? (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Daten werden geladen...</p>
              </div>
            ) : simulationen.length === 0 ? (
              <div className="p-4 text-center border rounded-md">
                <p className="text-gray-500">Keine Simulationen gefunden.</p>
                <p className="mt-2 text-sm text-gray-500">
                  Erstellen Sie zuerst einige Simulationen unter "Simulationen".
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                {simulationen.map((simulation) => (
                  <div key={simulation.id} className="p-3 flex items-center">
                    <input
                      type="checkbox"
                      id={`sim-${simulation.id}`}
                      checked={selectedSimulations.includes(simulation.id)}
                      onChange={() => toggleSimulation(simulation.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`sim-${simulation.id}`} className="ml-3 block">
                      <div className="flex items-center">
                        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                          simulation.direction === 'Incoming' ? 'bg-green-500' : 'bg-red-500'
                        }`}></span>
                        <span className="font-medium">{simulation.name}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          {formatCHF(simulation.amount)}
                          {simulation.recurring && ' (wiederkehrend)'}
                        </span>
                      </div>
                      {simulation.details && (
                        <p className="text-xs text-gray-500 mt-1 ml-5">{simulation.details}</p>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Charts */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Daten werden geladen...</p>
        </div>
      ) : selectedSimulations.length === 0 ? (
        <div className="bg-white p-8 rounded-xl shadow-sm text-center">
          <p className="text-gray-500">Bitte wählen Sie mindestens eine Simulation aus, um Projektionen anzuzeigen.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Projection Chart */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="h-80">
              <ReactECharts option={monthlyChartOptions} style={{ height: '100%' }} />
            </div>
          </div>
          
          {/* Cumulative Balance Chart */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="h-80">
              <ReactECharts option={cumulativeChartOptions} style={{ height: '100%' }} />
            </div>
          </div>
          
          {/* Summary Section */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="text-lg font-medium mb-4">Zusammenfassung der Projektion</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="text-sm font-medium text-green-800">Prognostizierte Einnahmen</h4>
                <p className="text-2xl font-bold text-green-700">
                  {formatCHF(projections.reduce((sum, projection) => 
                    projection.direction === 'Incoming' ? sum + projection.amount : sum, 0))}
                </p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="text-sm font-medium text-red-800">Prognostizierte Ausgaben</h4>
                <p className="text-2xl font-bold text-red-700">
                  {formatCHF(projections.reduce((sum, projection) => 
                    projection.direction === 'Outgoing' ? sum + projection.amount : sum, 0))}
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800">Prognostizierte Bilanz</h4>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCHF(projections.reduce((sum, projection) => 
                    projection.direction === 'Incoming' ? sum + projection.amount : sum - projection.amount, 0))}
                </p>
              </div>
            </div>
          </div>
          
          {/* Detailed Monthly Projections */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="text-lg font-medium mb-4">Detaillierte monatliche Projektionen</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th className="px-3 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monat
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Einnahmen
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ausgaben
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bilanz
                    </th>
                    <th className="px-3 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gesamtbilanz
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyData.map((month, index) => {
                    // Get date in readable format
                    const [year, monthNum] = month.date.split('-');
                    const displayDate = format(new Date(parseInt(year), parseInt(monthNum) - 1, 1), 'MMMM yyyy', { locale: de });
                    
                    return (
                      <tr key={month.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {displayDate}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                          {formatCHF(month.income)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                          {formatCHF(month.expenses)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={
                            month.balance > 0 
                              ? 'text-green-600' 
                              : month.balance < 0 
                                ? 'text-red-600' 
                                : 'text-gray-600'
                          }>
                            {formatCHF(month.balance)}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={
                            cumulativeBalanceData[index]?.balance > 0 
                              ? 'text-green-600' 
                              : cumulativeBalanceData[index]?.balance < 0 
                                ? 'text-red-600' 
                                : 'text-gray-600'
                          }>
                            {formatCHF(cumulativeBalanceData[index]?.balance || 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 