import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    mode: process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://example.supabase.co' 
      ? 'demo' 
      : 'production',
    timestamp: new Date().toISOString()
  });
} 