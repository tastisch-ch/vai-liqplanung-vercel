'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function PublicNav() {
  return (
    <nav className="bg-white border-b border-gray-200 py-3 mb-4">
      <div className="container mx-auto flex items-center justify-center">
        <Link href="/" className="flex items-center" aria-label="vaios">
          <Image
            src="/assets/vaios-logo.svg"
            alt="vaios Logo"
            width={120}
            height={30}
            priority
          />
        </Link>
      </div>
    </nav>
  );
} 