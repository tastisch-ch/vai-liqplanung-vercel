'use client';

import PublicNav from '@/components/layout/PublicNav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <div className="max-w-5xl mx-auto">
        {children}
        
        <div className="mt-8 p-4 bg-yellow-50 rounded border border-yellow-200 text-sm">
          <h3 className="font-medium mb-2">⚠️ Admin Tools</h3>
          <p>This section contains administrative tools that should only be used during development or by administrators.</p>
          <p className="mt-2">After you create a user, you can use their credentials to log in to the application.</p>
        </div>
      </div>
    </>
  );
} 