'use client';

import { useState } from 'react';
import { Database } from '@/lib/types/supabase';
import { createFixkosten, deleteFixkosten } from '@/lib/actions/supabase-actions';
import { useFixkosten } from '@/lib/hooks/use-supabase-data';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

type Fixkosten = Database['public']['Tables']['fixkosten']['Row'];

interface Props {
  initialFixkosten: Fixkosten[];
}

export default function FixkostenClient({ initialFixkosten }: Props) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { data: liveFixkosten, loading, error, refreshData } = useFixkosten();
  
  // Use server-delivered data initially, then live data once available
  const fixkosten = liveFixkosten || initialFixkosten;
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    betrag: '',
    rhythmus: 'monatlich' as 'monatlich' | 'quartalsweise' | 'halbjährlich' | 'jährlich',
    start: new Date().toISOString().split('T')[0],
    enddatum: ''
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newFixkosten = {
      name: formData.name,
      betrag: parseFloat(formData.betrag),
      rhythmus: formData.rhythmus,
      start: new Date(formData.start).toISOString(),
      enddatum: formData.enddatum ? new Date(formData.enddatum).toISOString() : null
    };
    
    try {
      const result = await createFixkosten(newFixkosten);
      if (result.success) {
        setIsAddingNew(false);
        setFormData({
          name: '',
          betrag: '',
          rhythmus: 'monatlich',
          start: new Date().toISOString().split('T')[0],
          enddatum: ''
        });
        refreshData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create fixed cost:', error);
      alert('Failed to create fixed cost. See console for details.');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this fixed cost?')) {
      try {
        const result = await deleteFixkosten(id);
        if (result.success) {
          refreshData();
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error('Failed to delete fixed cost:', error);
        alert('Failed to delete fixed cost. See console for details.');
      }
    }
  };
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'dd. MMMM yyyy', { locale: de });
  };
  
  const getFrequencyLabel = (rhythmus: string) => {
    switch (rhythmus) {
      case 'monatlich': return 'Monatlich';
      case 'quartalsweise': return 'Quartalsweise';
      case 'halbjährlich': return 'Halbjährlich';
      case 'jährlich': return 'Jährlich';
      default: return rhythmus;
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Fixkosten</h2>
        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
        >
          {isAddingNew ? 'Abbrechen' : 'Neue Fixkosten'}
        </button>
      </div>
      
      {isAddingNew && (
        <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Neue Fixkosten erstellen</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Betrag (CHF)
                </label>
                <input
                  type="number"
                  name="betrag"
                  value={formData.betrag}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rhythmus
                </label>
                <select
                  name="rhythmus"
                  value={formData.rhythmus}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="monatlich">Monatlich</option>
                  <option value="quartalsweise">Quartalsweise</option>
                  <option value="halbjährlich">Halbjährlich</option>
                  <option value="jährlich">Jährlich</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  name="start"
                  value={formData.start}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enddatum (optional)
                </label>
                <input
                  type="date"
                  name="enddatum"
                  value={formData.enddatum}
                  onChange={handleChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
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
      
      {loading && <p>Lade Fixkosten...</p>}
      {error && <p className="text-red-500">Fehler: {error}</p>}
      
      {fixkosten && fixkosten.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded">
          <p className="text-gray-500">Keine Fixkosten vorhanden</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-sm text-gray-700 border-b">Name</th>
                <th className="py-3 px-4 text-left font-semibold text-sm text-gray-700 border-b">Rhythmus</th>
                <th className="py-3 px-4 text-right font-semibold text-sm text-gray-700 border-b">Betrag</th>
                <th className="py-3 px-4 text-left font-semibold text-sm text-gray-700 border-b">Startdatum</th>
                <th className="py-3 px-4 text-left font-semibold text-sm text-gray-700 border-b">Enddatum</th>
                <th className="py-3 px-4 text-center font-semibold text-sm text-gray-700 border-b">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {fixkosten.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b font-medium">{item.name}</td>
                  <td className="py-3 px-4 border-b">{getFrequencyLabel(item.rhythmus)}</td>
                  <td className="py-3 px-4 border-b text-right font-medium">
                    {formatAmount(item.betrag)}
                  </td>
                  <td className="py-3 px-4 border-b">{formatDate(item.start)}</td>
                  <td className="py-3 px-4 border-b">
                    {item.enddatum ? formatDate(item.enddatum) : '-'}
                  </td>
                  <td className="py-3 px-4 border-b text-center">
                    <button
                      onClick={() => handleDelete(item.id)}
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