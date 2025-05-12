'use client';

import React from 'react';
import LogViewer from './LogViewer';

/**
 * DevTools component that only renders development tools in development mode
 * Conditionally includes LogViewer and other development helpers
 */
export default function DevTools() {
  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      <LogViewer />
    </>
  );
} 