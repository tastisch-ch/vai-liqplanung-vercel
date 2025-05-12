'use client';

import { useEffect, useState } from 'react';

// This component ensures that its children only render on the client side
// to avoid hydration issues with authentication
export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If not mounted (i.e., server-side), render nothing
  if (!mounted) {
    return null;
  }

  // Otherwise, render the children
  return <>{children}</>;
} 