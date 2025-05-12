/**
 * Application logger for tracking errors and events
 * Helps with debugging and testing during development
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  stack?: string;
}

// Store logs in memory for client-side access
let logHistory: LogEntry[] = [];
const MAX_LOG_ENTRIES = 1000;

/**
 * Add a log entry to the history
 */
function addLogEntry(entry: LogEntry): void {
  // Add to beginning for most recent first
  logHistory.unshift(entry);
  
  // Trim log if it gets too large
  if (logHistory.length > MAX_LOG_ENTRIES) {
    logHistory = logHistory.slice(0, MAX_LOG_ENTRIES);
  }
  
  // Always log to console for development visibility
  const { level, message, context } = entry;
  
  // Format the console output
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
  
  switch (level) {
    case 'debug':
      console.debug(`[DEBUG] ${message}${contextStr}`);
      break;
    case 'info':
      console.info(`[INFO] ${message}${contextStr}`);
      break;
    case 'warn':
      console.warn(`[WARN] ${message}${contextStr}`);
      break;
    case 'error':
      console.error(`[ERROR] ${message}${contextStr}`);
      if (entry.stack) {
        console.error(entry.stack);
      }
      break;
  }
}

/**
 * Create a log entry
 */
function createLog(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
  const timestamp = new Date().toISOString();
  
  const entry: LogEntry = {
    timestamp,
    level,
    message,
    context
  };
  
  // Add stack trace for errors
  if (level === 'error') {
    try {
      throw new Error('Stack trace');
    } catch (e) {
      entry.stack = (e as Error).stack?.split('\n').slice(2).join('\n') || '';
    }
  }
  
  // Add to log history
  addLogEntry(entry);
  
  return entry;
}

/**
 * Log a debug message
 */
export function debug(message: string, context?: Record<string, any>): void {
  createLog('debug', message, context);
}

/**
 * Log an info message
 */
export function info(message: string, context?: Record<string, any>): void {
  createLog('info', message, context);
}

/**
 * Log a warning message
 */
export function warn(message: string, context?: Record<string, any>): void {
  createLog('warn', message, context);
}

/**
 * Log an error message
 */
export function error(message: string, context?: Record<string, any>): void {
  createLog('error', message, context);
}

/**
 * Log an error object with full stack trace and details
 */
export function logError(err: unknown, message?: string, context?: Record<string, any>): void {
  let errorMessage = message || 'An error occurred';
  let errorObj: Record<string, any> = {};
  
  if (err instanceof Error) {
    errorMessage = message || err.message;
    errorObj = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      ...context
    };
  } else if (typeof err === 'string') {
    errorMessage = message || err;
    errorObj = { ...(context || {}) };
  } else {
    errorObj = {
      raw: err,
      ...context
    };
  }
  
  createLog('error', errorMessage, errorObj);
}

/**
 * Get all logs
 */
export function getLogs(): LogEntry[] {
  return [...logHistory];
}

/**
 * Get logs by level
 */
export function getLogsByLevel(level: LogLevel): LogEntry[] {
  return logHistory.filter(entry => entry.level === level);
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  logHistory = [];
}

/**
 * Export formatted logs as a string for easy copying
 */
export function exportLogs(): string {
  return logHistory
    .map(entry => {
      const { timestamp, level, message, context, stack } = entry;
      const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
      const stackStr = stack ? `\n${stack}` : '';
      
      return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}${stackStr}`;
    })
    .join('\n\n');
}

// Utility method for capturing errors in async functions
export function withErrorLogging<T>(fn: () => Promise<T>, context?: Record<string, any>): Promise<T> {
  return fn().catch(err => {
    logError(err, 'Error in async function', context);
    throw err;
  });
}

// Create a default logger instance
const logger = {
  debug,
  info,
  warn,
  error,
  logError,
  getLogs,
  getLogsByLevel,
  clearLogs,
  exportLogs,
  withErrorLogging
};

export default logger; 