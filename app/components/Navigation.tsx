'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100';
  };
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                VAI-Liq
              </Link>
            </div>
            <div className="ml-6 flex space-x-1">
              <Link
                href="/buchungen"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/buchungen')}`}
              >
                Buchungen
              </Link>
              <Link
                href="/fixkosten"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/fixkosten')}`}
              >
                Fixkosten
              </Link>
              <Link
                href="/mitarbeiter"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/mitarbeiter')}`}
              >
                Mitarbeiter
              </Link>
              <Link
                href="/loehne"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/loehne')}`}
              >
                Löhne
              </Link>
              <Link
                href="/simulationen"
                className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/simulationen')}`}
              >
                Simulationen
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <Link
              href="/settings"
              className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/settings')}`}
            >
              Einstellungen
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 