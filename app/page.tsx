'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserProfile } from '@/lib/data/server-data';

export default function Home() {
  redirect('/dashboard');
  return null;
}
