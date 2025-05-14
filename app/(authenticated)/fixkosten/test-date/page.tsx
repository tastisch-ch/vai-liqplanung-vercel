'use client';

import { useAuth } from "@/components/auth/AuthProvider";
import { useState, useEffect } from "react";
import { formatSwissDate, getNextOccurrence } from "@/lib/date-utils/format";
import { loadFixkosten, convertFixkostenToBuchungen } from "@/lib/services/fixkosten";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default function TestDateFixPage() {
  const { authState } = useAuth();
  const { user } = authState;
  
  const [isLoading, setIsLoading] = useState(true);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [fixkostenData, setFixkostenData] = useState<any[]>([]);
  
  useEffect(() => {
    async function runDateTests() {
      setIsLoading(true);
      
      const results = [];
      
      // Test the critical May 31st -> June 30th case
      const may31 = new Date('2025-05-31');
      const nextMonthAfterMay31 = getNextOccurrence(may31, 'monatlich');
      results.push({
        title: 'May 31st -> June 30th Test',
        originalDate: formatSwissDate(may31),
        nextDate: formatSwissDate(nextMonthAfterMay31),
        expectedDate: '30.06.2025',
        passed: nextMonthAfterMay31.getMonth() === 5 && nextMonthAfterMay31.getDate() === 30 // Month is zero-indexed
      });
      
      // Test February -> March case
      const feb28 = new Date('2025-02-28');
      const nextMonthAfterFeb28 = getNextOccurrence(feb28, 'monatlich');
      results.push({
        title: 'February 28th -> March 28th Test',
        originalDate: formatSwissDate(feb28),
        nextDate: formatSwissDate(nextMonthAfterFeb28),
        expectedDate: '28.03.2025',
        passed: nextMonthAfterFeb28.getMonth() === 2 && nextMonthAfterFeb28.getDate() === 28
      });
      
      // Test with actual Fixkosten data
      if (user?.id) {
        try {
          const fixkosten = await loadFixkosten(user.id);
          
          // Create a test Fixkosten with May 31st start date
          const testFixkosten = {
            id: 'test-id',
            name: 'Test May 31 Fixkosten',
            betrag: 1000,
            rhythmus: 'monatlich',
            start: new Date('2025-05-31'),
            enddatum: new Date('2026-05-31'),
            user_id: user.id,
            kategorie: 'Test',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          // Generate transactions for this test fixkosten
          const startDate = new Date('2025-05-01');
          const endDate = new Date('2026-07-31');
          const transactions = convertFixkostenToBuchungen(startDate, endDate, [testFixkosten]);
          
          // Check if we have a transaction for each month, including June 2025
          const months = {};
          transactions.forEach(tx => {
            const monthKey = `${tx.date.getFullYear()}-${tx.date.getMonth() + 1}`;
            months[monthKey] = tx;
          });
          
          // Check specifically for June 2025
          const hasJune2025 = !!months['2025-6'];
          
          results.push({
            title: 'Transaction Generation Test',
            description: 'Test if monthly Fixkosten starting on May 31, 2025 creates a June 2025 transaction',
            result: hasJune2025 ? 'June 2025 transaction found' : 'No June 2025 transaction',
            passed: hasJune2025,
            transactions: transactions.map(tx => ({
              date: formatSwissDate(tx.date),
              amount: tx.amount,
              details: tx.details
            }))
          });
          
          setFixkostenData(transactions);
        } catch (error) {
          console.error('Error loading fixkosten data:', error);
          results.push({
            title: 'Fixkosten Data Test',
            error: 'Failed to load Fixkosten data',
            passed: false
          });
        }
      }
      
      setTestResults(results);
      setIsLoading(false);
    }
    
    runDateTests();
  }, [user?.id]);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-vaios-primary">Date Fix Tests</h1>
        <Link 
          href="/fixkosten" 
          className="btn-vaios-secondary"
        >
          Back to Fixkosten
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="loader">Loading...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {testResults.map((test, index) => (
            <Card key={index} className="p-4">
              <h2 className="text-lg font-bold flex items-center">
                {test.title}
                <span className={`ml-2 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${test.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className={`h-4 w-4 rounded-full ${test.passed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </span>
              </h2>
              {test.description && <p className="text-gray-600">{test.description}</p>}
              {test.originalDate && (
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Original Date</div>
                    <div>{test.originalDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Next Date</div>
                    <div>{test.nextDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Expected</div>
                    <div>{test.expectedDate}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Result</div>
                    <div className={test.passed ? 'text-green-600' : 'text-red-600'}>
                      {test.passed ? 'Passed' : 'Failed'}
                    </div>
                  </div>
                </div>
              )}
              
              {test.result && (
                <div className="mt-2">
                  <div className="text-sm font-medium text-gray-500">Result</div>
                  <div>{test.result}</div>
                </div>
              )}
              
              {test.transactions && (
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">Generated Transactions</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {test.transactions.map((tx, idx) => (
                          <tr key={idx} className={tx.date.includes('30.06.2025') ? 'bg-yellow-50' : ''}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{tx.date}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{tx.details}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">{tx.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {test.error && (
                <div className="mt-2 text-red-500">
                  Error: {test.error}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 