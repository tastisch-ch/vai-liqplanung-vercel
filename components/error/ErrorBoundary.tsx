'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import logger from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component for catching and displaying errors
 * Prevents application crashes by containing errors to specific components
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our centralized logger
    logger.logError(error, 'Error caught by ErrorBoundary', {
      componentStack: errorInfo.componentStack
    });

    // Call the onError handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError && error) {
      // If a custom fallback is provided, use it
      if (fallback) {
        return fallback;
      }

      // Default error display
      return (
        <div className="p-4 border border-red-300 bg-red-50 rounded-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-red-600 mb-4">
            The application encountered an error. Please try refreshing the page.
          </p>
          
          {showDetails && (
            <div className="mt-4">
              <p className="font-medium text-red-700">Error details:</p>
              <pre className="mt-1 text-xs bg-gray-800 text-red-300 p-2 rounded overflow-x-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try to Recover
              </button>
            </div>
          )}
        </div>
      );
    }

    return children;
  }
} 