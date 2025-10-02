'use client';

import ClientOnly from "@/components/auth/ClientOnly";
import { AuthProvider } from "@/components/auth/AuthProvider";
// AuthNav header removed; sidebar hosts nav + user now
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client-auth";
import { NotificationProvider } from "@/components/ui/Notification";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authClient.getCurrentUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error("Error checking auth:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle sidebar toggle for mobile
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // During loading, show minimal content
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-white border-b border-gray-200 py-3 mb-4">
          <div className="container mx-auto">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-200 h-10 w-24"></div>
              <div className="flex-1 space-y-6 py-1">
                <div className="h-2 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <main className="flex-grow container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          </div>
        </main>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    redirect("/login");
    return null;
  }

  return (
    <ClientOnly>
      <AuthProvider>
        <NotificationProvider>
        <div className="min-h-screen flex flex-row">
          <div className="hidden md:block sticky top-0 self-start z-10">
            <Sidebar />
          </div>
          <div className="flex-grow">
            {/* Main content */}
            <main className="p-4 md:p-6 w-full pb-mobile-nav md:pb-6">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </main>
          </div>
          {/* Mobile bottom navigation */}
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
        </NotificationProvider>
      </AuthProvider>
    </ClientOnly>
  );
} 