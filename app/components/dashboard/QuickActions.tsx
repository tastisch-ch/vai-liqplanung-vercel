import React from 'react';
import Link from 'next/link';

interface ActionButton {
  label: string;
  href: string;
  icon: React.ReactNode;
  accent?: boolean;
}

interface QuickActionsProps {
  title?: string;
  actions: ActionButton[];
}

export default function QuickActions({ title = "Schnellzugriff", actions }: QuickActionsProps) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all transform hover:scale-105 ${
              action.accent 
                ? 'bg-vaios-primary text-white hover:bg-vaios-600' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <span className="text-sm font-medium text-center">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
} 