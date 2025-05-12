'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function CreateUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setResult('Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    setResult('Creating user...');
    
    try {
      // Use environment variables or manually entered credentials
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }
      
      // Create Supabase client
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      setResult(`✅ User created successfully!\n\nUser ID: ${data.user?.id}\nEmail: ${data.user?.email}\n\nYou can now use these credentials to log in.`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult(`❌ Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Test User</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full p-2 border rounded"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (at least 6 characters)"
              className="w-full p-2 border rounded"
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>
      
      {result && (
        <div className="bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap">
          <h3 className="font-medium mb-2">Result:</h3>
          <div className="text-sm">{result}</div>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-500">
        <p>Note: This page allows you to create a test user in your Supabase database.</p>
        <p>After creating a user, you can use their credentials to log in to the application.</p>
      </div>
    </div>
  );
} 