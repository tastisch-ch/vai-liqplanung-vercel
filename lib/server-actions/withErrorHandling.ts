/**
 * Higher-order function to wrap server actions with error handling
 * Logs errors and returns appropriate responses
 */

import logger from '@/lib/logger';

/**
 * Generic response type for server actions
 */
export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

/**
 * Wraps a server action function with error handling
 * @param actionName - Name of the server action (for logging)
 * @param fn - The server action function to wrap
 * @returns A wrapped function that handles errors
 */
export function withErrorHandling<T, P extends any[]>(
  actionName: string,
  fn: (...args: P) => Promise<T>
): (...args: P) => Promise<ActionResponse<T>> {
  return async (...args: P): Promise<ActionResponse<T>> => {
    try {
      // Log the server action call (debug level)
      logger.debug(`Server action called: ${actionName}`, {
        actionName,
        args: args.map(arg => 
          // Sanitize arguments for logging (remove sensitive data)
          typeof arg === 'object' ? 
            (arg && 'password' in arg ? 
              { ...arg, password: '[REDACTED]' } : arg) 
            : arg
        )
      });

      // Execute the original function
      const result = await fn(...args);

      // Log success
      logger.info(`Server action succeeded: ${actionName}`, {
        actionName,
        success: true
      });

      // Return success response
      return {
        success: true,
        data: result
      };
    } catch (error) {
      // Log the error
      logger.logError(error, `Server action failed: ${actionName}`, {
        actionName,
        args: args.map(arg => 
          typeof arg === 'object' ? 
            (arg && 'password' in arg ? 
              { ...arg, password: '[REDACTED]' } : arg) 
            : arg
        )
      });

      // Prepare error message
      let errorMessage = 'An unexpected error occurred';
      let errorCode = 'UNKNOWN_ERROR';
      let errorDetails = undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Add more specific error handling as needed
        if ('code' in error) {
          errorCode = (error as any).code;
        }
        
        // For database errors, provide more context
        if ('detail' in error) {
          errorDetails = (error as any).detail;
        }
      }

      // Return error response
      return {
        success: false,
        error: {
          message: errorMessage,
          code: errorCode,
          details: errorDetails
        }
      };
    }
  };
}

/**
 * Create a server action with automatic error handling
 * 
 * @example
 * ```
 * export const createUser = createServerAction(
 *   'createUser',
 *   async (name: string, email: string) => {
 *     // Implementation...
 *     return user;
 *   }
 * );
 * ```
 */
export function createServerAction<T, P extends any[]>(
  actionName: string,
  fn: (...args: P) => Promise<T>
): (...args: P) => Promise<ActionResponse<T>> {
  return withErrorHandling(actionName, fn);
} 