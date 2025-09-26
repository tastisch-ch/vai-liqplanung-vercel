'use client';

import ClientOnly from "@/components/auth/ClientOnly";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <div className="min-h-screen grid place-items-center px-4 py-8">
        <main className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image src="/assets/vaios-logo.svg" alt="vaios Logo" width={140} height={40} priority />
          </div>
          {children}
        </main>
      </div>
    </ClientOnly>
  );
} 