'use client';

import { useState, useEffect } from 'react';
import { TransactionForm } from '@/components/forms/TransactionForm';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { fetchTransactions } from '@/lib/services/buchungen';

interface Transaction {
  id: string;
  date: string;
  details: string;
  amount: number;
  direction: 'Incoming' | 'Outgoing';
  kategorie?: string;
  is_simulation: boolean;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState({
    showFixkosten: true,
    showLohn: true,
    showStandard: true,
    showSimulations: true,
  });

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await fetchTransactions(filters);
        setTransactions(data);
      } catch (error) {
        console.error('Error loading transactions:', error);
      }
    };

    loadTransactions();
  }, [filters]);

  const handleAddTransaction = async (data: {
    date: string;
    amount: number;
    direction: 'Incoming' | 'Outgoing';
    details: string;
    is_simulation: boolean;
  }) => {
    try {
      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      // Refresh the transactions list
      const updatedTransactions = await fetchTransactions(filters);
      setTransactions(updatedTransactions);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction. Please try again.');
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button onClick={() => setIsFormOpen(true)}>Add Transaction</Button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="fixkosten"
            checked={filters.showFixkosten}
            onCheckedChange={(checked) =>
              setFilters({ ...filters, showFixkosten: checked })
            }
          />
          <Label htmlFor="fixkosten">Fixkosten</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="lohn"
            checked={filters.showLohn}
            onCheckedChange={(checked) =>
              setFilters({ ...filters, showLohn: checked })
            }
          />
          <Label htmlFor="lohn">Lohn</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="standard"
            checked={filters.showStandard}
            onCheckedChange={(checked) =>
              setFilters({ ...filters, showStandard: checked })
            }
          />
          <Label htmlFor="standard">Standard</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="simulations"
            checked={filters.showSimulations}
            onCheckedChange={(checked) =>
              setFilters({ ...filters, showSimulations: checked })
            }
          />
          <Label htmlFor="simulations">Simulations</Label>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b">
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(transaction.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {transaction.details}
                  {transaction.is_simulation && (
                    <span className="ml-2 text-blue-500">🔮</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={
                      transaction.direction === 'Incoming'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }
                  >
                    {transaction.direction === 'Incoming' ? '+' : '-'} CHF{' '}
                    {Math.abs(transaction.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {transaction.kategorie === 'Fixkosten' && '📌 '}
                  {transaction.kategorie === 'Lohn' && '💰 '}
                  {transaction.kategorie || 'Standard'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddTransaction}
      />
    </div>
  );
} 