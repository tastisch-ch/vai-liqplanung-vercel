'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import logger from '@/lib/logger';

/**
 * GlobalError component for displaying server-side errors
 * Used as the error.tsx file in app directory
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to our centralized error logging system
    logger.logError(error, 'Global server error', {
      digest: error.digest,
      source: 'server'
    });
  }, [error]);

  return (
    <html>
      <body className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-center text-gray-900 mb-4">
            Server Error
          </h1>
          <p className="text-gray-600 text-center mb-6">
            Sorry, something went wrong on our server. Our team has been notified.
          </p>
          <div className="space-y-3">
            <button
              onClick={reset}
              className="block w-full px-4 py-2 bg-red-600 text-white text-center font-semibold rounded-md hover:bg-red-700"
            >
              Try Again
            </button>
            <Link href="/" className="block w-full px-4 py-2 bg-gray-200 text-center font-semibold rounded-md hover:bg-gray-300">
              Go to Home Page
            </Link>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-gray-100 rounded-md">
              <p className="text-sm text-gray-700 font-semibold">Error details (development only):</p>
              <p className="text-sm text-gray-600 mt-1">{error.message}</p>
              {error.stack && (
                <pre className="mt-2 text-xs overflow-x-auto p-2 bg-gray-800 text-gray-200 rounded">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      </body>
    </html>
  );
} 