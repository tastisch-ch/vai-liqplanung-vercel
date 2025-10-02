"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentBalance } from '@/lib/services/daily-balance';

const tabs = [
  { name: 'Dashboard', path: '/dashboard', icon: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
  )},
  { name: 'Planung', path: '/planung', icon: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  )},
  { name: 'Fixkosten', path: '/fixkosten', icon: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V5a2 2 0 0 0-2-2H6"/></svg>
  )},
  { name: 'Team', path: '/mitarbeiter', icon: (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )},
  // Import bewusst weggelassen auf Mobile
];

export default function MobileNav() {
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const b = await getCurrentBalance();
        setBalance(b.balance);
      } catch {}
    })();
    (async () => {
      try {
        const year = new Date().getFullYear();
        const res = await fetch(`/api/revenue/progress?year=${year}`, { cache: 'no-store' });
        const json = await res.json();
        if (res.ok) setProgress(Number(json.progress || 0));
      } catch {}
    })();
  }, []);

  const MiniProgress = ({ value = 0 }: { value?: number }) => {
    const size = 28; const stroke = 3; const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const pct = Math.max(0, Math.min(100, value)); const dash = (pct / 100) * c; const center = size / 2;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={center} cy={center} r={r} stroke="#E5E7EB" strokeWidth={stroke} fill="none" />
        <circle cx={center} cy={center} r={r} stroke="#CEFF65" strokeWidth={stroke} fill="none" strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform={`rotate(-90 ${center} ${center})`} />
        <text x={center} y={center+1} textAnchor="middle" fontSize="9" className="fill-gray-700 font-medium">{Math.round(pct)}%</text>
      </svg>
    );
  };
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-t border-gray-200 pb-safe-bottom">
      {/* Status row */}
      <div className="px-3 pt-1 pb-1 flex items-center justify-center gap-4 text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <MiniProgress value={progress ?? 0} />
          <span>Ertragsziel</span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Kontostand</span>
          <span className="font-medium text-gray-900">{balance !== null ? new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 2 }).format(balance) : '–'}</span>
        </div>
      </div>
      <ul className="flex items-stretch justify-around py-2">
        {tabs.map((t) => {
          const active = pathname?.startsWith(t.path);
          return (
            <li key={t.path}>
              <Link href={t.path} className={`flex flex-col items-center px-3 py-1 text-xs ${active ? 'text-[#02403D] font-medium' : 'text-gray-600'}`}>
                {t.icon}
                <span className="mt-0.5">{t.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


