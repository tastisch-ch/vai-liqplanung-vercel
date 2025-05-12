import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
      <body className={`min-h-screen bg-gray-50 ${geistSans.variable} ${geistMono.variable}`}>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
