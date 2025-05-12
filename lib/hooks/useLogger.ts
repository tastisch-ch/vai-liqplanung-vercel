import { useCallback, useMemo } from 'react';
import logger from '@/lib/logger';

/**
 * Custom hook for using the logger within React components
 * Provides methods for logging with component context
 * 
 * @param componentName - Name of the component for context
 * @param additionalContext - Any additional context to include in logs
 */

// Define a type for context
type LogContext = Record<string, string | number | boolean>;

export function useLogger(componentName: string, additionalContext: Record<string, any> = {}) {
  // Use useMemo to create the baseContext object to fix the dependency warnings
  const baseContext = useMemo(() => ({
    component: componentName,
    ...additionalContext
  }), [componentName, additionalContext]);

  const debug = useCallback((message: string, context?: LogContext) => {
    logger.debug(message, { ...baseContext, ...context });
  }, [baseContext]);

  const info = useCallback((message: string, context?: LogContext) => {
    logger.info(message, { ...baseContext, ...context });
  }, [baseContext]);

  const warn = useCallback((message: string, context?: LogContext) => {
    logger.warn(message, { ...baseContext, ...context });
  }, [baseContext]);

  const error = useCallback((message: string, context?: LogContext) => {
    logger.error(message, { ...baseContext, ...context });
  }, [baseContext]);

  const logError = useCallback((err: unknown, message: string, context?: LogContext) => {
    logger.logError(err, message, { ...baseContext, ...context });
  }, [baseContext]);

  const withErrorLogging = useCallback(<T>(
    fn: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> => {
    return logger.withErrorLogging(fn, { ...baseContext, ...context });
  }, [baseContext]);

  return {
    debug,
    info,
    warn,
    error,
    logError,
    withErrorLogging
  };
} 