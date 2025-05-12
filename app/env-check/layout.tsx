'use client';

import PublicNav from '@/components/layout/PublicNav';

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <div className="max-w-5xl mx-auto">
        {children}
        
        <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200 text-sm">
          <h3 className="font-medium mb-2">Diagnostic Pages:</h3>
          <ul className="space-y-1">
            <li>
              <a href="/env-check" className="text-blue-600 hover:underline">Environment Check</a> - 
              Check environment variables
            </li>
            <li>
              <a href="/minimal-test" className="text-blue-600 hover:underline">Minimal Test</a> - 
              Test basic Supabase connectivity
            </li>
            <li>
              <a href="/manual-test" className="text-blue-600 hover:underline">Manual Test</a> - 
              Test with custom credentials
            </li>
            <li>
              <a href="/setup" className="text-blue-600 hover:underline">Setup Guide</a> - 
              Full setup instructions
            </li>
          </ul>
        </div>
      </div>
    </>
  );
} 