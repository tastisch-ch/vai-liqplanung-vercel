'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function PublicNav() {
  const pathname = usePathname();
  
  // Public navigation items
  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Login', path: '/login' },
    { name: 'Environment Check', path: '/env-check' },
    { name: 'Admin', path: '/admin' }
  ];
  
  return (
    <nav className="bg-white border-b border-gray-200 py-3 mb-4">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center mr-10">
            <div className="flex items-center">
              <Image
                src="/assets/vaios-logo.svg"
                alt="vaios Logo"
                width={120}
                height={30}
                priority
              />
              <span className="ml-2 text-xl font-semibold text-blue-600">Liq-Planung</span>
            </div>
          </Link>
          
          <div className="hidden md:flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === item.path
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
        
        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            className="text-gray-700 hover:text-blue-500 focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
} 