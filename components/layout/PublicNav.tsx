'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function PublicNav() {
  return (
    <nav className="bg-white border-b border-gray-200 py-3 mb-4">
      <div className="container mx-auto flex items-center justify-center">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
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
        </div>
      </div>
    </nav>
  );
} 