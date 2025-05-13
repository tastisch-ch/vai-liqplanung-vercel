'use client';

import { useState } from 'react';

export default function DebugImportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    
    if (!fileInput?.files?.length) {
      setError('Please select a file first.');
      setIsLoading(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      
      const res = await fetch('/api/debug/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Excel Import Debug Tool</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Excel File</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="excel-file" className="block text-sm font-medium text-gray-700 mb-1">
              Select Excel File:
            </label>
            <input
              id="excel-file"
              name="file"
              type="file"
              accept=".xlsx,.xls"
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Test Import'}
            </button>
          </div>
        </form>
      </div>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      <h2 className="text-xl font-semibold mb-4">Response:</h2>
      <div className="bg-gray-100 p-4 rounded-md border border-gray-200 whitespace-pre-wrap overflow-auto font-mono text-sm h-64">
        {response ? JSON.stringify(response, null, 2) : 'No response yet.'}
      </div>
      
      <div className="mt-6 bg-blue-50 p-4 rounded-md">
        <h3 className="text-md font-semibold mb-2">How to use this tool:</h3>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Select your Excel file</li>
          <li>Click "Test Import" to send it to the debug endpoint</li>
          <li>View the detailed response including any errors</li>
          <li>Check the console logs for additional debug information</li>
        </ol>
      </div>
    </div>
  );
} 