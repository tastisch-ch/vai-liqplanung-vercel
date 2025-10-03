'use client';

import { useEffect, useRef, useState } from 'react';

export default function PullToRefresh() {
  const startYRef = useRef<number | null>(null);
  const pulledRef = useRef(0);
  const [active, setActive] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const threshold = 80;

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
      setPull(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current == null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        pulledRef.current = dy;
        setPull(Math.min(dy, 120));
        setActive(dy > threshold);
        // Prevent rubber-band scroll while showing indicator
        // Only when at the very top
        const scrollTop = document.scrollingElement?.scrollTop || window.scrollY || 0;
        if (scrollTop <= 0) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = () => {
      if (active && pulledRef.current > threshold) {
        setRefreshing(true);
        // Soft reload
        setTimeout(() => {
          window.location.reload();
        }, 50);
      }
      startYRef.current = null;
      pulledRef.current = 0;
      setActive(false);
      setPull(0);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    // passive: false so we can preventDefault to avoid rubber-band while pulling
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart as any);
      window.removeEventListener('touchmove', onTouchMove as any);
      window.removeEventListener('touchend', onTouchEnd as any);
    };
  }, [active]);

  const translateY = refreshing ? 68 : Math.max(0, Math.min(pull * 0.6, 68));
  const visible = refreshing || pull > 4;

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 right-0 top-0 z-[60] flex justify-center pointer-events-none select-none"
      style={{
        transform: `translateY(${translateY}px)`,
        transition: refreshing ? 'transform 150ms ease-out' : 'none',
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="mt-2 h-9 w-9 rounded-full bg-white/95 dark:bg-neutral-900/95 shadow-lg ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center">
        {refreshing ? (
          <svg className="h-5 w-5 animate-spin text-neutral-700 dark:text-neutral-200" viewBox="0 0 24 24" fill="none" aria-label="Refreshing">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <svg
            className={`h-5 w-5 text-neutral-700 dark:text-neutral-200 transition-transform duration-150 ${active ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-label="Pull to refresh"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>
    </div>
  );
}


