'use client';

import { useAuth } from "@/components/auth/AuthProvider";

export default function DatenImport() {
  const { /* authState not used */ } = useAuth();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Datenimport</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Daten importieren</h2>
        
        <p className="mb-4">
          Hier können Sie Ihre Daten importieren und verarbeiten.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-blue-800">
            Diese Funktion ist noch in Entwicklung. Bitte versuchen Sie es später erneut.
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">CSV Import</h3>
            <p className="text-sm text-gray-600 mb-4">Laden Sie eine CSV-Datei hoch</p>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Datei hochladen</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" />
                  </label>
                  <p className="pl-1">oder hierher ziehen</p>
                </div>
                <p className="text-xs text-gray-500">CSV bis zu 10MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 