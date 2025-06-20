'use client';

import ClientOnly from "@/components/auth/ClientOnly";
import PublicNav from "@/components/layout/PublicNav";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientOnly>
      <div className="min-h-screen flex flex-col">
        <PublicNav />
        <main className="flex-grow container mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} vaios - Alle Rechte vorbehalten
          </div>
        </footer>
      </div>
    </ClientOnly>
  );
} 