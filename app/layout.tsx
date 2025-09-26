import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./globals-tooltip.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VAI-Liq: Finanzplanung und Liquiditätsmanagement",
  description: "Finanzen einfach planen und verwalten",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={`min-h-screen bg-gray-50 antialiased ${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <main className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
