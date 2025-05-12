'use client';

import { useState } from 'react';
import { Database } from '@/lib/types/supabase';
import { createBuchung, deleteBuchung } from '@/lib/actions/supabase-actions';
import { useBuchungen } from '@/lib/hooks/use-supabase-data';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type Buchung = Database['public']['Tables']['buchungen']['Row'];

interface Props {
  initialTransactions: Buchung[];
}

export default function BuchungenClient({ initialTransactions }: Props) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { data: liveTransactions, loading, error, refreshData } = useBuchungen();
  
  // Use server-delivered data initially, then live data once available
  const transactions = liveTransactions || initialTransactions;
  
  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    details: '',
    amount: '',
    direction: 'Outgoing' as 'Incoming' | 'Outgoing',
    kategorie: ''
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newBuchung = {
      date: new Date(formData.date).toISOString(),
      details: formData.details,
      amount: parseFloat(formData.amount),
      direction: formData.direction,
      modified: false,
      kategorie: formData.kategorie || null
    };
    
    try {
      const result = await createBuchung(newBuchung);
      if (result.success) {
        setIsAddingNew(false);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          details: '',
          amount: '',
          direction: 'Outgoing',
          kategorie: ''
        });
        refreshData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction. See console for details.');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        const result = await deleteBuchung(id);
        if (result.success) {
          refreshData();
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        alert('Failed to delete transaction. See console for details.');
      }
    }
  };
  
  const formatAmount = (amount: number, direction: 'Incoming' | 'Outgoing') => {
    const formatted = new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
    
    return direction === 'Incoming' ? `+${formatted}` : `-${formatted}`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd. MMMM yyyy', { locale: de });
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Alle Buchungen</h2>
        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
        >
          {isAddingNew ? 'Abbrechen' : 'Neue Buchung'}
        </button>
      </div>
      
      {isAddingNew && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Neue Buchung erstellen</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Richtung
                </label>
                <select
                  name="direction"
                  value={formData.direction}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="Outgoing">Ausgehend</option>
                  <option value="Incoming">Eingehend</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Betrag (CHF)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie
                </label>
                <input
                  type="text"
                  name="kategorie"
                  value={formData.kategorie}
                  onChange={handleChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Details
              </label>
              <textarea
                name="details"
                value={formData.details}
                onChange={handleChange}
                required
                rows={3}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="mr-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Speichern
              </button>
            </div>
          </form>
        </div>
      )}
      
      {loading && <p>Lade Buchungen...</p>}
      {error && <p className="text-red-500">Fehler: {error}</p>}
      
      {transactions && transactions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded">
          <p className="text-gray-500">Keine Buchungen vorhanden</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-sm text-gray-700 border-b">Datum</th>
                <th className="py-3 px-4 text-left font-semibold text-sm text-gray-700 border-b">Details</th>
                <th className="py-3 px-4 text-left font-semibold text-sm text-gray-700 border-b">Kategorie</th>
                <th className="py-3 px-4 text-right font-semibold text-sm text-gray-700 border-b">Betrag</th>
                <th className="py-3 px-4 text-center font-semibold text-sm text-gray-700 border-b">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b">{formatDate(transaction.date)}</td>
                  <td className="py-3 px-4 border-b">{transaction.details}</td>
                  <td className="py-3 px-4 border-b">{transaction.kategorie || '-'}</td>
                  <td className={`py-3 px-4 border-b text-right font-medium ${
                    transaction.direction === 'Incoming' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatAmount(transaction.amount, transaction.direction)}
                  </td>
                  <td className="py-3 px-4 border-b text-center">
                    <button
                      onClick={() => handleDelete(transaction.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 