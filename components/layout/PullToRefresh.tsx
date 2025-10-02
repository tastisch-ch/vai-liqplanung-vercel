'use client';

import { useEffect, useRef, useState } from 'react';

export default function PullToRefresh() {
  const startYRef = useRef<number | null>(null);
  const pulledRef = useRef(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Ignore when focusing inputs/textareas or editable elements
      const target = e.target as HTMLElement | null;
      if (target && (target.closest('input, textarea, [contenteditable="true"]'))) return;

      // Only when at the very top of the page
      const scrollTop = document.scrollingElement?.scrollTop || window.scrollY || 0;
      if (scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      pulledRef.current = 0;
      setActive(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current == null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        pulledRef.current = dy;
        if (dy > 60) setActive(true);
      }
    };

    const onTouchEnd = () => {
      if (active && pulledRef.current > 60) {
        // Soft reload
        window.location.reload();
      }
      startYRef.current = null;
      pulledRef.current = 0;
      setActive(false);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart as any);
      window.removeEventListener('touchmove', onTouchMove as any);
      window.removeEventListener('touchend', onTouchEnd as any);
    };
  }, [active]);

  return null;
}


