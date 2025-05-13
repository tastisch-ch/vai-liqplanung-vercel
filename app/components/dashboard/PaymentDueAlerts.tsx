import React from 'react';
import { formatCHF } from '@/lib/currency';
import Link from 'next/link';

export interface PaymentAlert {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  hint?: string;
  daysUntilDue: number;
}

interface PaymentDueAlertsProps {
  payments: PaymentAlert[];
  limit?: number;
}

export default function PaymentDueAlerts({ payments, limit = 5 }: PaymentDueAlertsProps) {
  // Sort by due date (ascending)
  const sortedPayments = [...payments].sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  const displayPayments = sortedPayments.slice(0, limit);

  // Determine urgency class based on days until due
  const getUrgencyClass = (daysUntilDue: number): string => {
    if (daysUntilDue <= 2) return 'bg-red-50 border-l-4 border-red-500';
    if (daysUntilDue <= 5) return 'bg-amber-50 border-l-4 border-amber-500';
    return 'bg-blue-50 border-l-4 border-vaios-primary';
  };

  // Format days until due
  const formatDaysUntilDue = (daysUntilDue: number): string => {
    if (daysUntilDue === 0) return 'Heute fällig';
    if (daysUntilDue === 1) return 'Morgen fällig';
    return `In ${daysUntilDue} Tagen fällig`;
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Anstehende Zahlungen</h2>
        <Link href="/planung" className="text-sm text-vaios-primary hover:text-vaios-600">
          Alle anzeigen →
        </Link>
      </div>

      {displayPayments.length === 0 ? (
        <div className="py-6 text-center text-gray-500">
          <p>Keine anstehenden Zahlungen</p>
          <p className="text-sm mt-2">Sie sind auf dem neuesten Stand!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayPayments.map((payment) => (
            <div 
              key={payment.id} 
              className={`flex justify-between items-center p-3 rounded-lg ${getUrgencyClass(payment.daysUntilDue)}`}
            >
              <div>
                <div className="flex items-center">
                  {payment.hint && <span className="mr-2">{payment.hint}</span>}
                  <p className="font-medium text-gray-800">
                    {payment.description}
                  </p>
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white bg-opacity-70 text-gray-600">
                    {payment.category}
                  </span>
                </div>
                <div className="flex text-xs mt-1">
                  <span className="text-gray-500 mr-3">
                    {new Date(payment.date).toLocaleDateString('de-CH')}
                  </span>
                  <span className="font-medium text-gray-700">
                    {formatDaysUntilDue(payment.daysUntilDue)}
                  </span>
                </div>
              </div>
              <div className={`font-medium ${payment.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {payment.type === 'income' ? '+' : '-'}{formatCHF(payment.amount)}
              </div>
            </div>
          ))}

          {payments.length > limit && (
            <Link
              href="/planung"
              className="block text-center py-2 mt-2 text-sm text-vaios-primary hover:text-vaios-600 bg-gray-50 rounded-md"
            >
              Alle {payments.length} anstehenden Zahlungen anzeigen
            </Link>
          )}
        </div>
      )}
    </div>
  );
} 